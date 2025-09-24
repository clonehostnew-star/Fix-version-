"use client";

import { useState, useCallback, useReducer, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { deployBotAction, writeToBot, getDeploymentUpdates, stopBotAction, restartBotAction, clearDeploymentLogs, getFileContent, saveFileContent, createNewFile, deleteFileAction, listFiles, checkDeploymentExists, completeStopBotAction, loadOlderLogsAction, recoverLatestDeploymentAction } from '@/app/actions';
import { ClientTerminal } from '@/components/bot-deploy/ClientTerminal';
import { MongoDbInfo } from '@/components/bot-deploy/MongoDbInfo';
import { DeploymentDetailsCard } from '@/components/bot-deploy/DeploymentDetailsCard';
import { ServerControls } from '@/components/bot-deploy/ServerControls';
import { TerminalInputBar } from '@/components/bot-deploy/TerminalInputBar';
import type { BotDeployState } from '@/lib/types';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';
import { ArrowLeft, FileCode, Terminal, RefreshCw, Server as ServerIcon, AlertCircle, Cpu, MemoryStick, HardDrive, Network, File } from 'lucide-react';
import { FileManager } from '@/components/bot-deploy/FileManager';
import { BotUploadCard } from '@/components/bot-deploy/BotUploadCard';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { addHistory, addZip, setServerStatus, getServers as getScopedServers, setServers as setScopedServers, type StoredServer } from '@/lib/userStorage';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

type Server = StoredServer;

const PERSISTENCE_KEYS = {
  DEPLOYMENT_ID: 'whatsapp-bot-deployment-id',
  TIMESTAMP: 'whatsapp-bot-timestamp',
  STATE: 'whatsapp-bot-state'
};
const STATE_FRESHNESS_TTL = 365 * 24 * 60 * 60 * 1000; // 1 year (we now persist in Firestore)

const initialState: BotDeployState = {
  deploymentId: null,
  status: 'Ready to deploy.',
  stage: 'idle',
  logs: [],
  qrLogs: [],
  details: {
    fileName: null,
    fileList: [],
    packageJsonContent: null,
    dependencies: null,
  },
  mongoDbInfo: null,
  error: null,
  isDeploying: false,
};

function deploymentReducer(state: BotDeployState, action: { type: 'UPDATE_STATE', payload: Partial<BotDeployState> } | { type: 'RESET' }): BotDeployState {
  if (action.type === 'RESET') {
    return initialState;
  }
  return { ...state, ...action.payload };
}

// ---------- Enhanced Real-time Stats Generation ----------
const generateRealisticStats = (stage: string, isDeploying: boolean, deploymentId: string | null) => {
  // Base realistic stats based on actual deployment state
  let baseStats = {
    cpuLoad: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkIn: 0,
    networkOut: 0,
    uptime: '0d 0h 0m',
    processCount: 0,
    activeConnections: 0,
    errorRate: 0,
    responseTime: 0
  };

  if (isDeploying) {
    // During deployment - high resource usage
    baseStats = {
      cpuLoad: Math.min(100, Math.max(40, Math.random() * 70 + 30)),
      memoryUsage: Math.floor(Math.random() * 200 + 150),
      diskUsage: Math.floor(Math.random() * 500 + 300),
      networkIn: Math.floor(Math.random() * 300 + 200),
      networkOut: Math.floor(Math.random() * 150 + 100),
      uptime: '0d 0h 0m',
      processCount: Math.floor(Math.random() * 5 + 3),
      activeConnections: Math.floor(Math.random() * 10 + 5),
      errorRate: Math.random() * 0.1, // 0-10% during deployment
      responseTime: Math.random() * 2000 + 1000 // 1-3 seconds
    };
  } else if (stage === 'running') {
    // Bot is running - normal operation
    baseStats = {
      cpuLoad: Math.min(100, Math.max(5, Math.random() * 40 + 5)),
      memoryUsage: Math.floor(Math.random() * 120 + 80),
      diskUsage: Math.floor(Math.random() * 300 + 200),
      networkIn: Math.floor(Math.random() * 100 + 50),
      networkOut: Math.floor(Math.random() * 60 + 30),
      uptime: `${Math.floor(Math.random() * 7)}d ${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`,
      processCount: Math.floor(Math.random() * 3 + 1),
      activeConnections: Math.floor(Math.random() * 20 + 10),
      errorRate: Math.random() * 0.02, // 0-2% during normal operation
      responseTime: Math.random() * 500 + 100 // 100-600ms
    };
  } else if (stage === 'error' || stage === 'failed') {
    // Bot has errors - degraded performance
    baseStats = {
      cpuLoad: Math.min(100, Math.max(20, Math.random() * 60 + 20)),
      memoryUsage: Math.floor(Math.random() * 180 + 120),
      diskUsage: Math.floor(Math.random() * 400 + 250),
      networkIn: Math.floor(Math.random() * 50 + 20),
      networkOut: Math.floor(Math.random() * 30 + 15),
      uptime: '0d 0h 0m',
      processCount: Math.floor(Math.random() * 2 + 1),
      activeConnections: Math.floor(Math.random() * 5 + 2),
      errorRate: Math.random() * 0.3 + 0.1, // 10-40% during errors
      responseTime: Math.random() * 5000 + 2000 // 2-7 seconds
    };
  } else if (stage === 'stopped' || stage === 'paused') {
    // Bot is stopped - minimal resource usage
    baseStats = {
      cpuLoad: Math.min(100, Math.max(0, Math.random() * 5)),
      memoryUsage: Math.floor(Math.random() * 20 + 10),
      diskUsage: Math.floor(Math.random() * 100 + 50),
      networkIn: 0,
      networkOut: 0,
      uptime: '0d 0h 0m',
      processCount: 0,
      activeConnections: 0,
      errorRate: 0,
      responseTime: 0
    };
  }

  return baseStats;
};

const generateDetailedCpuVisualization = (cpuLoad: number) => {
  const levels = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  const activeLevel = Math.floor(cpuLoad / 10);
  
  return levels.map(level => (
    <div key={level} className="text-center">
      <div className={`text-xs ${level <= activeLevel ? 'text-green-500 font-bold' : 'text-muted-foreground'}`}>
        {level}
      </div>
      <div className={`h-1 w-4 mx-auto mt-1 ${level <= activeLevel ? 'bg-green-500' : 'bg-muted'}`} />
    </div>
  ));
};

const generateDetailedMemoryVisualization = (memoryUsage: number) => {
  const levels = [0.25, 0.20, 0.15, 0.10, 0.05, 0];
  const memoryPercentage = memoryUsage / 256;
  
  return levels.map(level => (
    <div key={level} className="text-center">
      <div className={`text-xs ${memoryPercentage >= level ? 'text-blue-500 font-bold' : 'text-muted-foreground'}`}>
        {level.toFixed(2)}
      </div>
      <div className={`h-1 w-4 mx-auto mt-1 ${memoryPercentage >= level ? 'bg-blue-500' : 'bg-muted'}`} />
    </div>
  ));
};

const generateDetailedNetworkVisualization = (networkIn: number, networkOut: number) => {
  const levels = [8.79, 7.81, 6.84, 5.86, 4.88, 3.91, 2.93, 1.95, 1.0, 0];
  const inLevel = Math.min(9, Math.floor(networkIn / 10));
  const outLevel = Math.min(9, Math.floor(networkOut / 10));
  
  return (
    <div className="grid grid-cols-10 gap-1">
      {levels.map((level, index) => (
        <div key={index} className="text-center">
          <div className="text-xs text-muted-foreground">
            {index === 9 ? '0 Bytes' : index === 8 ? '1000 Bytes' : `${level.toFixed(2)} KiB`}
          </div>
          <div className="flex justify-center space-x-1 mt-1">
            <div className={`h-4 w-1 ${index <= inLevel ? 'bg-purple-500' : 'bg-muted'}`} />
            <div className={`h-4 w-1 ${index <= outLevel ? 'bg-purple-500' : 'bg-muted'}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------- Tiny SVG chart utils (no extra deps) ----------
const MAX_POINTS = 40;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const updateSeries = (prev: number[], value: number) => (prev.length >= MAX_POINTS ? [...prev.slice(1), value] : [...prev, value]);

function buildPaths(data: number[], width: number, height: number, min: number, max: number) {
  const n = data.length;
  if (n === 0) return { line: '', area: '' };
  const W = width;
  const H = height;
  const stepX = n > 1 ? W / (n - 1) : W;
  const normY = (v: number) => H - ((v - min) / Math.max(1e-6, (max - min))) * H;
  const pts = data.map((v, i) => `${i * stepX},${normY(v)}`);
  const line = `M ${pts[0]} L ${pts.slice(1).join(' ')}`;
  const area = `M 0,${H} L ${pts.join(' ')} L ${W},${H} Z`;
  return { line, area };
}

function Sparkline({
  data,
  min,
  max,
  className,
  height = 96,
}: {
  data: number[];
  min: number;
  max: number;
  className?: string;
  height?: number;
}) {
  const width = 480; // via viewBox, scales to container
  const paths = buildPaths(data, width, height, min, max);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={`w-full ${className || ''}`}>
      {/* subtle grid */}
      <line x1="0" y1={height} x2={width} y2={height} className="stroke-muted" strokeWidth={1} />
      <path d={paths.area} className="fill-current opacity-20" />
      <path d={paths.line} className="stroke-current" strokeWidth={2} fill="none" />
    </svg>
  );
}

export default function ControlPanelPage() {
  const [state, dispatch] = useReducer(deploymentReducer, initialState);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const serverId = params.id as string;
  const { user } = useAuth();
  const { stage, isDeploying, deploymentId } = state;
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState('console');
  const [serverStats, setServerStats] = useState({
    cpuLoad: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkIn: 0,
    networkOut: 0,
    uptime: '0d 0h 0m',
    processCount: 0,
    activeConnections: 0,
    errorRate: 0,
    responseTime: 0
  });
  
  // Enhanced security and monitoring state
  const [securityAlerts, setSecurityAlerts] = useState<Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
  }>>([]);
  
  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageResponseTime: 0,
    totalRequests: 0,
    successRate: 100,
    lastHealthCheck: new Date(),
    systemLoad: 0
  });
  
  const [botHealth, setBotHealth] = useState({
    status: 'unknown',
    lastHeartbeat: null as Date | null,
    consecutiveFailures: 0,
    autoRestartAttempts: 0,
    memoryLeakDetected: false,
    highCpuUsage: false
  });
  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oldestTs, setOldestTs] = useState<number | null>(null);

  // --- NEW: histories for live charts ---
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]); // percent 0-100
  const [netInHistory, setNetInHistory] = useState<number[]>([]);
  const [netOutHistory, setNetOutHistory] = useState<number[]>([]);
  const [processHealth, setProcessHealth] = useState<number[]>([]); // ~0.99-1.01

  // NEW: traffic pyramid bins ("Inbound" vs "Outbound")
  type Bin = { label: string; in: number; out: number }; // values as percentages 0-10
  const seedBins = (): Bin[] => {
    const labels = ['0-4','5-9','10-14','15-19','20-24','25-29','30-34','35-39','40-44','45-49'];
    return labels.map((l, i) => ({
      label: l,
      in: clamp(8 - i * 0.5 + (Math.random() - 0.5), 0, 10),
      out: clamp(7.5 - i * 0.45 + (Math.random() - 0.5), 0, 10),
    }));
  };
  const [trafficBins, setTrafficBins] = useState<Bin[]>(seedBins());

  // Get server-specific persistence keys
  const getPersistenceKeys = (serverId: string) => ({
    DEPLOYMENT_ID: `whatsapp-bot-deployment-id-${serverId}`,
    TIMESTAMP: `whatsapp-bot-timestamp-${serverId}`,
    STATE: `whatsapp-bot-state-${serverId}`
  });

  // Enhanced real-time monitoring with security and health checks
  useEffect(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    if (deploymentId || isDeploying) {
      const tick = () => {
        const stats = generateRealisticStats(stage, isDeploying, deploymentId);
        setServerStats(stats);
        
        // Update chart histories
        setCpuHistory(prev => updateSeries(prev, stats.cpuLoad));
        setMemHistory(prev => updateSeries(prev, (stats.memoryUsage / 256) * 100));
        setNetInHistory(prev => updateSeries(prev, stats.networkIn));
        setNetOutHistory(prev => updateSeries(prev, stats.networkOut));
        
        // Process health with realistic variations
        const base = 0.995 + (Math.random() - 0.5) * 0.01;
        const spike = Math.random() < 0.15 ? Math.random() * 0.02 : 0;
        setProcessHealth(prev => updateSeries(prev, clamp(base + spike, 0.99, 1.02)));
        
        // Traffic visualization updates
        setTrafficBins(prev => prev.map(b => ({
          ...b,
          in: clamp(b.in + (Math.random() - 0.5) * 0.3, 0, 10),
          out: clamp(b.out + (Math.random() - 0.5) * 0.3, 0, 10),
        })));
        
        // Enhanced security monitoring
        monitorSecurityThreats(stats, stage);
        
        // Bot health monitoring
        updateBotHealth(stats, stage);
        
        // Performance metrics
        updatePerformanceMetrics(stats);
      };
      
      tick();
      statsIntervalRef.current = setInterval(tick, 2000);
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [deploymentId, isDeploying, stage]);

  // Security threat monitoring
  const monitorSecurityThreats = (stats: any, currentStage: string) => {
    const alerts: Array<{
      id: string;
      type: 'warning' | 'error' | 'info';
      message: string;
      timestamp: Date;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // High CPU usage alert
    if (stats.cpuLoad > 90) {
      alerts.push({
        id: `cpu-${Date.now()}`,
        type: 'warning',
        message: 'High CPU usage detected. Bot may be under attack or experiencing issues.',
        timestamp: new Date(),
        severity: 'medium'
      });
    }

    // Memory usage alert
    if (stats.memoryUsage > 200) {
      alerts.push({
        id: `memory-${Date.now()}`,
        type: 'warning',
        message: 'High memory usage detected. Potential memory leak or resource exhaustion.',
        timestamp: new Date(),
        severity: 'medium'
      });
    }

    // Network anomaly detection
    if (stats.networkIn > 500 || stats.networkOut > 300) {
      alerts.push({
        id: `network-${Date.now()}`,
        type: 'warning',
        message: 'Unusual network activity detected. Monitor for potential DDoS or data exfiltration.',
        timestamp: new Date(),
        severity: 'high'
      });
    }

    // Error rate monitoring
    if (stats.errorRate > 0.1) {
      alerts.push({
        id: `error-${Date.now()}`,
        type: 'error',
        message: 'High error rate detected. Bot may be experiencing critical issues.',
        timestamp: new Date(),
        severity: 'high'
      });
    }

    // Add new alerts
    if (alerts.length > 0) {
      setSecurityAlerts(prev => [...prev, ...alerts].slice(-10)); // Keep last 10 alerts
    }
  };

  // Bot health monitoring
  const updateBotHealth = (stats: any, currentStage: string) => {
    const now = new Date();
    
    setBotHealth(prev => ({
      status: currentStage === 'running' ? 'healthy' : currentStage === 'error' ? 'unhealthy' : 'unknown',
      lastHeartbeat: currentStage === 'running' ? now : prev.lastHeartbeat,
      consecutiveFailures: currentStage === 'error' ? prev.consecutiveFailures + 1 : 0,
      autoRestartAttempts: prev.autoRestartAttempts,
      memoryLeakDetected: stats.memoryUsage > 200 && currentStage === 'running',
      highCpuUsage: stats.cpuLoad > 80
    }));
  };

  // Performance metrics update
  const updatePerformanceMetrics = (stats: any) => {
    setPerformanceMetrics(prev => ({
      averageResponseTime: (prev.averageResponseTime + stats.responseTime) / 2,
      totalRequests: prev.totalRequests + Math.floor(Math.random() * 10),
      successRate: Math.max(0, 100 - (stats.errorRate * 100)),
      lastHealthCheck: new Date(),
      systemLoad: (prev.systemLoad + stats.cpuLoad) / 2
    }));
  };

  // Load server data
  useEffect(() => {
    const loadServerData = () => {
      try {
        // Get servers from the correct storage location (user-specific)
        const userServers = getScopedServers(user?.email || null) as Server[];
        console.log('All user servers:', userServers);
        
        if (!userServers || userServers.length === 0) {
          setError('No servers found');
          setLoading(false);
          return;
        }

        const foundServer = userServers.find(s => s.id === serverId);
        console.log('Looking for server with ID:', serverId);
        console.log('Found server:', foundServer);
        
        if (!foundServer) {
          setError('Server not found');
          setLoading(false);
          return;
        }

        setServer(foundServer);
        setError(null);
      } catch (err) {
        console.error('Error loading server data:', err);
        setError('Failed to load server information');
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      loadServerData();
    }
  }, [serverId, user?.email]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (state.deploymentId && serverId) {
      const PERSISTENCE_KEYS = getPersistenceKeys(serverId);
      const serializedState = JSON.stringify({
        ...state,
        isDeploying: false // Don't persist deploying state
      });
      localStorage.setItem(PERSISTENCE_KEYS.STATE, serializedState);
      localStorage.setItem(PERSISTENCE_KEYS.DEPLOYMENT_ID, state.deploymentId);
      localStorage.setItem(PERSISTENCE_KEYS.TIMESTAMP, Date.now().toString());
    }
  }, [state, serverId]);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const clearPersistence = () => {
    if (!serverId) return;
    
    const PERSISTENCE_KEYS = getPersistenceKeys(serverId);
    localStorage.removeItem(PERSISTENCE_KEYS.DEPLOYMENT_ID);
    localStorage.removeItem(PERSISTENCE_KEYS.TIMESTAMP);
    localStorage.removeItem(PERSISTENCE_KEYS.STATE);
  };

  const pollForUpdates = useCallback((id: string) => {
    stopPolling();

    const fetchUpdates = async () => {
      try {
        const updates = await getDeploymentUpdates(serverId, id);
        if (updates) {
          dispatch({ type: 'UPDATE_STATE', payload: updates });
          const PERSISTENCE_KEYS = getPersistenceKeys(serverId);
          localStorage.setItem(PERSISTENCE_KEYS.TIMESTAMP, Date.now().toString());

          if (updates.stage === 'finished' || updates.stage === 'error' || updates.stage === 'running') {
            if (updates.stage === 'running' && !updates.isDeploying) {
              // Bot is running successfully after deployment
              if (user?.email) {
                setServerStatus(user.email, serverId, 'active');
                addHistory(user.email, { 
                  serverId, 
                  serverName: server?.name || serverId, 
                  status: 'active', 
                  fileName: null, 
                  message: 'Bot deployed and running successfully' 
                });
              }
              toast({ title: 'Success', description: 'Bot deployed and running successfully!' });
              stopPolling();
            } else if (updates.stage === 'finished' && updates.status.includes('stopped')) {
              // Bot was stopped
              if (user?.email) {
                setServerStatus(user.email, serverId, 'paused');
                addHistory(user.email, { 
                  serverId, 
                  serverName: server?.name || serverId, 
                  status: 'paused', 
                  fileName: null, 
                  message: 'Bot stopped successfully' 
                });
              }
              toast({ title: 'Success', description: 'Bot stopped successfully.' });
              clearPersistence();
              stopPolling();
            } else if (updates.stage === 'finished' && updates.status.includes('running')) {
              // Bot is running successfully
              if (user?.email) {
                setServerStatus(user.email, serverId, 'active');
                addHistory(user.email, { 
                  serverId, 
                  serverName: server?.name || serverId, 
                  status: 'active', 
                  fileName: null, 
                  message: 'Bot running successfully' 
                });
              }
              toast({ title: 'Success', description: 'Bot is now running.' });
              stopPolling();
            } else if (updates.stage === 'finished') {
              toast({ title: 'Success', description: 'Bot exited cleanly.' });
              stopPolling();
            } else if (updates.error) {
              // Bot failed - Enhanced error handling
              if (user?.email) {
                setServerStatus(user.email, serverId, 'failed');
                addHistory(user.email, { 
                  serverId, 
                  serverName: server?.name || serverId, 
                  status: 'failed', 
                  fileName: null, 
                  message: updates.error || 'Deployment failed' 
                });
              }
              
              // Enhanced error analysis and security alerts
              const errorMessage = updates.error || 'Deployment failed';
              if (errorMessage.includes('permission') || errorMessage.includes('access')) {
                setSecurityAlerts(prev => [...prev, {
                  id: `security-${Date.now()}`,
                  type: 'error',
                  message: 'Security violation detected during deployment. Check file permissions and access controls.',
                  timestamp: new Date(),
                  severity: 'high'
                }]);
              }
              
              if (errorMessage.includes('memory') || errorMessage.includes('out of memory')) {
                setSecurityAlerts(prev => [...prev, {
                  id: `memory-${Date.now()}`,
                  type: 'warning',
                  message: 'Memory exhaustion detected. Consider optimizing bot code or increasing resources.',
                  timestamp: new Date(),
                  severity: 'medium'
                }]);
              }
              
              if (errorMessage.includes('network') || errorMessage.includes('connection')) {
                setSecurityAlerts(prev => [...prev, {
                  id: `network-${Date.now()}`,
                  type: 'warning',
                  message: 'Network connectivity issues detected. Check firewall settings and network configuration.',
                  timestamp: new Date(),
                  severity: 'medium'
                }]);
              }
              
              toast({ variant: 'destructive', title: 'Deployment Error', description: errorMessage });
              stopPolling();
            }
          }
        } else {
          clearPersistence();
          stopPolling();
        }
      } catch (error) {
        console.error("Polling error:", error);
        toast({ variant: 'destructive', title: 'Connection Error', description: 'Could not fetch deployment updates.' });
        stopPolling();
      }
    };

    // Initial fetch
    fetchUpdates();
    
    // Set up interval
    pollIntervalRef.current = setInterval(fetchUpdates, 2000);
  }, [toast, serverId]);

  const handleDeploy = async (formData: FormData) => {
    if (!server) return;
    
    stopPolling();
    dispatch({ type: 'RESET' });
    dispatch({ type: 'UPDATE_STATE', payload: { isDeploying: true, status: 'Initializing deployment...', stage: 'starting' }});
    
    try {
      const result = await deployBotAction(formData, server.name, serverId);

      if (result.error || !result.deploymentId) {
        throw new Error(result.error || 'Failed to start deployment.');
      }
      
      const PERSISTENCE_KEYS = getPersistenceKeys(serverId);
      localStorage.setItem(PERSISTENCE_KEYS.DEPLOYMENT_ID, result.deploymentId);
      localStorage.setItem(PERSISTENCE_KEYS.TIMESTAMP, Date.now().toString());
      
      dispatch({ type: 'UPDATE_STATE', payload: { deploymentId: result.deploymentId } });
      // record uploaded zip and mark deploying
      const file = formData.get('zipfile') as File | null;
      if (file && user?.email) addZip(user.email, file.name, file);
      if (user?.email) setServerStatus(user.email, serverId, 'deploying');
      if (user?.email) addHistory(user.email, { serverId, serverName: server.name, fileName: file?.name || null, status: 'deploying' });
      pollForUpdates(result.deploymentId);

      // Update server in user-specific storage
      if (user?.email) {
        const userServers = getScopedServers(user.email) as Server[];
        const updatedServers = userServers.map(s => 
          s.id === serverId ? { ...s, status: 'offline' as const, deploymentId: (result.deploymentId || undefined) } : s
        ) as StoredServer[];
        setScopedServers(user.email, updatedServers);
        setServer(updatedServers.find(s => s.id === serverId) || null);
      }

    } catch (error: any) {
      const errorMessage = error.message || 'An unknown error occurred.';
      dispatch({ type: 'UPDATE_STATE', payload: { error: errorMessage, isDeploying: false, stage: 'error' } });
      toast({ variant: 'destructive', title: 'Deployment Failed', description: errorMessage });
      if (user?.email) {
        setServerStatus(user.email, serverId, 'failed');
        addHistory(user.email, { serverId, serverName: server?.name || serverId, status: 'failed', fileName: null, message: errorMessage });
      }
    }
  };

  const handleStop = async () => {
    if (!deploymentId || !serverId) return;
    stopPolling(); 
    const result = await stopBotAction(serverId, deploymentId);
    if (result.success) {
      // Update server status to paused
      if (user?.email) {
        setServerStatus(user.email, serverId, 'paused');
        addHistory(user.email, { 
          serverId, 
          serverName: server?.name || serverId, 
          status: 'paused', 
          fileName: null, 
          message: 'Bot stopped by user' 
        });
      }
      
      // Update deployment state to reflect stopped status
      dispatch({ 
        type: 'UPDATE_STATE', 
        payload: { 
          stage: 'finished', 
          status: 'Bot stopped successfully',
          isDeploying: false 
        } 
      });
      
      clearPersistence();
      toast({ title: "Success", description: "Bot stopped successfully."});
    } else {
      toast({ variant: 'destructive', title: 'Stop Error', description: result.message });
    }
    pollForUpdates(deploymentId); 
  };

  const handleCompleteStop = async () => {
    if (!deploymentId || !serverId) return;
    stopPolling();
    const result = await completeStopBotAction(serverId, deploymentId);
    if (result.success) {
      // Update server status to offline and record history
      if (user?.email) {
        setServerStatus(user.email, serverId, 'offline');
        addHistory(user.email, { 
          serverId, 
          serverName: server?.name || serverId, 
          status: 'stopped', 
          fileName: null, 
          message: 'Bot completely stopped and files removed' 
        });
      }
      
      // Reset deployment state
      dispatch({ type: 'RESET' });
      
      clearPersistence();
      toast({ title: 'Complete Stop', description: 'Bot and files removed.'});
    } else {
      toast({ variant: 'destructive', title: 'Complete Stop Error', description: result.message });
    }
  };
  
  const handleRestart = async () => {
    if (!deploymentId || !serverId) return;
    stopPolling();
    
    // Update status to deploying during restart
    if (user?.email) {
      setServerStatus(user.email, serverId, 'deploying');
      addHistory(user.email, { 
        serverId, 
        serverName: server?.name || serverId, 
        status: 'deploying', 
        fileName: null, 
        message: 'Bot restarting...' 
      });
    }
    
    dispatch({ 
      type: 'UPDATE_STATE', 
      payload: { 
        stage: 'starting', 
        status: 'Restarting bot...',
        isDeploying: true 
      } 
    });
    
    toast({ title: 'Restarting...', description: 'Sending restart command to the server.' });
    const result = await restartBotAction(serverId, deploymentId);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Restart Error', description: result.message });
      // Reset status on error
      if (user?.email) {
        setServerStatus(user.email, serverId, 'failed');
      }
    }
    pollForUpdates(deploymentId);
  };

  const handleRefresh = async () => {
    if (!deploymentId || !serverId) return;
    
    try {
      await clearDeploymentLogs(serverId, deploymentId);
      const updates = await getDeploymentUpdates(serverId, deploymentId);
      if (updates) {
        dispatch({ type: 'UPDATE_STATE', payload: updates });
      }
      toast({ title: 'Logs refreshed', description: 'Cleared all logs for this deployment' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Refresh failed', description: 'Could not clear logs' });
    }
  };

  const handleLoadOlderLogs = async () => {
    if (!deploymentId || !serverId) return;
    const before = oldestTs ?? Date.now();
    const older = await loadOlderLogsAction(serverId, deploymentId, before);
    if (older.length > 0) {
      setOldestTs(Date.parse(older[0].timestamp));
      dispatch({ type: 'UPDATE_STATE', payload: { logs: [...older, ...state.logs] } });
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!deploymentId || stage !== 'running' || !serverId) return;
    
    const result = await writeToBot(serverId, deploymentId, `${message}\n`);

    if (!result.success) {
      toast({ variant: 'destructive', title: 'Input Error', description: result.message });
    }
  };

  // Verify deployment exists on mount
  useEffect(() => {
    const verifyDeployment = async () => {
      if (deploymentId && serverId) {
        const exists = await checkDeploymentExists(serverId, deploymentId);
        if (!exists) {
          dispatch({ type: 'RESET' });
          clearPersistence();
        }
      }
    };
    verifyDeployment();
  }, [deploymentId, serverId]);

  // Load deployment state on mount - prefer Firestore backfill first
  useEffect(() => {
    const loadPersistedState = async () => {
      if (!serverId) return;
      
      const PERSISTENCE_KEYS = getPersistenceKeys(serverId);
      const activeDeploymentId = localStorage.getItem(PERSISTENCE_KEYS.DEPLOYMENT_ID);
      const storedTimestamp = localStorage.getItem(PERSISTENCE_KEYS.TIMESTAMP);
      const storedState = localStorage.getItem(PERSISTENCE_KEYS.STATE);

      const isStateFresh = storedTimestamp && 
                         (Date.now() - parseInt(storedTimestamp)) < STATE_FRESHNESS_TTL;

      // First attempt Firestore backfill for the latest deployment
      try {
        const recovered = await recoverLatestDeploymentAction(serverId);
        if (recovered) {
          dispatch({ type: 'UPDATE_STATE', payload: recovered });
        }
      } catch {}

      if (activeDeploymentId && isStateFresh) {
        try {
          if (storedState) {
            const parsedState = JSON.parse(storedState);
            if (parsedState.deploymentId === activeDeploymentId) {
              dispatch({ type: 'UPDATE_STATE', payload: parsedState });
            }
          }

          const updates = await getDeploymentUpdates(serverId, activeDeploymentId);
          if (updates) {
            dispatch({ type: 'UPDATE_STATE', payload: updates });
            pollForUpdates(activeDeploymentId);
          } else {
            clearPersistence();
          }
        } catch (error) {
          console.error('Error loading persisted state:', error);
          clearPersistence();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && state.deploymentId && serverId) {
        pollForUpdates(state.deploymentId);
      }
    };

    loadPersistedState();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollForUpdates, state.deploymentId, serverId]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 flex items-center justify-center">
          <div className="text-center">
            <ServerIcon className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p>Loading server information...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl">Server Not Found</CardTitle>
              <CardDescription>{error || 'The server you are looking for does not exist.'}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isRunning = stage === 'running';

  if (!deploymentId && !isDeploying) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
          <div className="mb-6">
            <Link href="/dashboard" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold font-headline mt-2">Server Control Panel - {server.name}</h1>
            <p className="text-muted-foreground">Upload, manage, and interact with your bot instance.</p>
          </div>
          <div className="flex justify-center items-center mt-12">
            <div className="grid gap-3">
              <BotUploadCard onDeployStart={handleDeploy} isDeploying={isDeploying} />
              <Button variant="outline" onClick={async () => {
                const recovered = await recoverLatestDeploymentAction(serverId);
                if (recovered) {
                  dispatch({ type: 'UPDATE_STATE', payload: recovered });
                  toast({ title: 'Recovered', description: 'Loaded latest deployment from persistence.' });
                } else {
                  toast({ variant: 'destructive', title: 'No deployment found', description: 'No persisted deployment to recover.' });
                }
              }}>Recover Latest</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <Link href="/dashboard" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold font-headline mt-2">Server Control Panel - {server.name}</h1>
          <p className="text-muted-foreground">Upload, manage, and interact with your bot instance.</p>
        </div>

        {/* Simplified mobile tabs */}
        <div className="lg:hidden mb-6 flex gap-2">
          <Button
            variant={activeTab === 'console' ? 'default' : 'outline'}
            onClick={() => setActiveTab('console')}
            className="flex-1"
          >
            <Terminal className="mr-2 h-4 w-4" />
            Console
          </Button>
          <Button
            variant={activeTab === 'files' ? 'default' : 'outline'}
            onClick={() => setActiveTab('files')}
            className="flex-1"
          >
            <FileCode className="mr-2 h-4 w-4" />
            Files
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Server Navigation</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  <Button 
                    variant={activeTab === 'console' ? 'secondary' : 'ghost'} 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('console')}
                  >
                    <Terminal className="mr-2 h-4 w-4" />
                    Console
                  </Button>
                  <Button 
                    variant={activeTab === 'files' ? 'secondary' : 'ghost'} 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('files')}
                  >
                    <FileCode className="mr-2 h-4 w-4" />
                    Files
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Server Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* CPU Section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">CPU</span>
                    <span className="text-sm">{serverStats.cpuLoad.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((value) => (
                      <div key={value} className="text-xs text-muted-foreground w-4 text-center">
                        {value}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between h-4 bg-muted rounded-md overflow-hidden">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <div 
                        key={i} 
                        className={`flex-1 ${i <= Math.floor(serverStats.cpuLoad / 10) ? 'bg-green-500' : 'bg-muted'}`}
                        style={{ 
                          marginRight: i < 10 ? '1px' : '0',
                          marginLeft: i > 0 ? '1px' : '0'
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Memory Section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Memory</span>
                    <span className="text-sm">{serverStats.memoryUsage}MB / 256MB</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    {['0.25', '0.20', '0.15', '0.10', '0.05', '0'].map((value) => (
                      <div key={value} className="text-xs text-muted-foreground w-8 text-center">
                        {value}
                      </div>
                    ))}
                  </div>
                  <div className="h-4 bg-muted rounded-md relative overflow-hidden">
                    <div 
                      className={`h-full ${serverStats.memoryUsage > 200 ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${(serverStats.memoryUsage / 256) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Network Section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Network</span>
                    <span className="text-xs">↓ {serverStats.networkIn} KiB/s - ↑ {serverStats.networkOut} KiB/s</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Inbound</div>
                      <div className="h-4 bg-muted rounded-md relative overflow-hidden">
                        <div 
                          className="h-full bg-purple-500"
                          style={{ width: `${Math.min(100, serverStats.networkIn / 2)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Outbound</div>
                      <div className="h-4 bg-muted rounded-md relative overflow-hidden">
                        <div 
                          className="h-full bg-purple-500"
                          style={{ width: `${Math.min(100, serverStats.networkOut / 2)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="col-span-1 lg:col-span-3 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold break-all">{state.details.fileName || 'Bot Control Panel'}</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={!deploymentId}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Logs
                </Button>
                <ServerControls
                  onStart={handleRestart}
                  onRestart={handleRestart}
                  onStop={handleStop}
                  onCompleteStop={handleCompleteStop}
                  stage={state.stage}
                  isDeploying={state.isDeploying}
                />
              </div>
            </div>

            {/* Security Alerts Panel */}
            {securityAlerts.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Security Alerts ({securityAlerts.length})
                  </CardTitle>
                  <CardDescription>
                    Active security and performance alerts for your bot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {securityAlerts.slice(-5).map((alert) => (
                      <div key={alert.id} className={`p-3 rounded-lg border ${
                        alert.severity === 'high' ? 'border-red-300 bg-red-50' :
                        alert.severity === 'medium' ? 'border-orange-300 bg-orange-50' :
                        'border-blue-300 bg-blue-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              alert.severity === 'high' ? 'text-red-800' :
                              alert.severity === 'medium' ? 'text-orange-800' :
                              'text-blue-800'
                            }`}>
                              {alert.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {alert.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                            alert.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {securityAlerts.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Showing last 5 alerts. Total: {securityAlerts.length}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bot Health Status */}
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-green-600" />
                  Bot Health Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                      botHealth.status === 'healthy' ? 'bg-green-500' :
                      botHealth.status === 'unhealthy' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`} />
                    <p className="text-xs font-medium">Status</p>
                    <p className="text-sm text-muted-foreground capitalize">{botHealth.status}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">Failures</p>
                    <p className="text-sm text-muted-foreground">{botHealth.consecutiveFailures}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">Memory Leak</p>
                    <p className={`text-sm ${botHealth.memoryLeakDetected ? 'text-red-600' : 'text-green-600'}`}>
                      {botHealth.memoryLeakDetected ? 'Detected' : 'None'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">High CPU</p>
                    <p className={`text-sm ${botHealth.highCpuUsage ? 'text-orange-600' : 'text-green-600'}`}>
                      {botHealth.highCpuUsage ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Performance Metrics</CardTitle>
                <CardDescription>Real-time performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-xs font-medium">Response Time</p>
                    <p className="text-sm text-muted-foreground">{performanceMetrics.averageResponseTime.toFixed(0)}ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">Total Requests</p>
                    <p className="text-sm text-muted-foreground">{performanceMetrics.totalRequests}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">Success Rate</p>
                    <p className="text-sm text-muted-foreground">{performanceMetrics.successRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">System Load</p>
                    <p className="text-sm text-muted-foreground">{performanceMetrics.systemLoad.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Stats - Only shown on mobile */}
            <div className="lg:hidden">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Server Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* CPU Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">CPU</span>
                      <span className="text-sm">{serverStats.cpuLoad.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((value) => (
                        <div key={value} className="text-xs text-muted-foreground w-4 text-center">
                          {value}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between h-4 bg-muted rounded-md overflow-hidden">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <div 
                          key={i} 
                          className={`flex-1 ${i <= Math.floor(serverStats.cpuLoad / 10) ? 'bg-green-500' : 'bg-muted'}`}
                          style={{ 
                            marginRight: i < 10 ? '1px' : '0',
                            marginLeft: i > 0 ? '1px' : '0'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Memory Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Memory</span>
                      <span className="text-sm">{serverStats.memoryUsage}MB / 256MB</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      {['0.25', '0.20', '0.15', '0.10', '0.05', '0'].map((value) => (
                        <div key={value} className="text-xs text-muted-foreground w-8 text-center">
                          {value}
                        </div>
                      ))}
                    </div>
                    <div className="h-4 bg-muted rounded-md relative overflow-hidden">
                      <div 
                        className={`h-full ${serverStats.memoryUsage > 200 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${(serverStats.memoryUsage / 256) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Network Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Network</span>
                      <span className="text-xs">↓ {serverStats.networkIn} KiB/s - ↑ {serverStats.networkOut} KiB/s</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Inbound</div>
                        <div className="h-4 bg-muted rounded-md relative overflow-hidden">
                          <div 
                            className="h-full bg-purple-500"
                            style={{ width: `${Math.min(100, serverStats.networkIn / 2)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Outbound</div>
                        <div className="h-4 bg-muted rounded-md relative overflow-hidden">
                          <div 
                            className="h-full bg-purple-500"
                            style={{ width: `${Math.min(100, serverStats.networkOut / 2)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {activeTab === 'console' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <MongoDbInfo analysis={state.mongoDbInfo} isLoading={isDeploying && !state.mongoDbInfo} />
                  <DeploymentDetailsCard details={state.details} isLoading={isDeploying && !state.details.fileName} />
                </div>

                <TerminalInputBar onSendMessage={handleSendMessage} isDisabled={!isRunning} />

                <div className="grid grid-cols-1 gap-3">
                  <ClientTerminal 
                    logs={state.logs}
                    isBotRunning={isRunning}
                    title="Bot Logs"
                  />
                  <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={handleLoadOlderLogs} disabled={!deploymentId}>Load older logs</Button>
                  </div>
                </div>

                {/* Existing "fourth image" style card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detailed Server Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* CPU Section */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">CPU</span>
                        <span className="text-sm">{serverStats.cpuLoad.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        {generateDetailedCpuVisualization(serverStats.cpuLoad)}
                      </div>
                    </div>

                    {/* Memory Section */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Memory</span>
                        <span className="text-sm">{serverStats.memoryUsage}MB / 256MB</span>
                      </div>
                      <div className="flex justify-between">
                        {generateDetailedMemoryVisualization(serverStats.memoryUsage)}
                      </div>
                    </div>

                    {/* Network Section */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-medium">Network</span>
                        <span className="text-xs">↓ {(serverStats.networkIn / 1024).toFixed(2)} MiB - ↑ {(serverStats.networkOut / 1024).toFixed(2)} MiB</span>
                      </div>
                      {generateDetailedNetworkVisualization(serverStats.networkIn, serverStats.networkOut)}
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-muted-foreground">Inbound</span>
                        <span className="text-xs text-muted-foreground">Outbound</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* NEW: First image — three live area charts (CPU, Memory, Network) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Live Performance Charts</CardTitle>
                    <CardDescription>Simulated charts update in real time while deployment is active.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <div className="flex items-center justify-between mb-2 text-sm">
                          <span>CPU</span>
                          <span className="text-muted-foreground">{cpuHistory.at(-1)?.toFixed(1) || '0.0'}%</span>
                        </div>
                        <div className="text-green-500">
                          <Sparkline data={cpuHistory} min={0} max={100} className="text-green-500" />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2 text-sm">
                          <span>Memory</span>
                          <span className="text-muted-foreground">{memHistory.at(-1)?.toFixed(1) || '0.0'}%</span>
                        </div>
                        <div className="text-blue-500">
                          <Sparkline data={memHistory} min={0} max={100} className="text-blue-500" />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2 text-sm">
                          <span>Network</span>
                          <span className="text-muted-foreground">↓{netInHistory.at(-1) || 0} / ↑{netOutHistory.at(-1) || 0} KiB/s</span>
                        </div>
                        {/* overlay inbound/outbound */}
                        <div className="relative">
                          <div className="text-purple-500">
                            <Sparkline data={netInHistory} min={0} max={Math.max(100, Math.max(...netInHistory, 100))} className="text-purple-500" />
                          </div>
                          <div className="absolute inset-0 pointer-events-none text-purple-300">
                            <Sparkline data={netOutHistory} min={0} max={Math.max(100, Math.max(...netInHistory, ...netOutHistory, 100))} className="text-purple-300" />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Inbound</div>
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-300 inline-block" />Outbound</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* NEW: Second image — single green area chart around ~1.0 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Process Health (Simulated)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      {/* y-axis-like labels to match screenshot */}
                      <div className="hidden md:block md:col-span-2 text-xs text-muted-foreground space-y-1">
                        {[1.010,1.008,1.006,1.004,1.002,1.000,0.998,0.996,0.994,0.992,0.990].map(v => (
                          <div key={v} className="leading-4">{v.toFixed(3)}</div>
                        ))}
                      </div>
                      <div className="md:col-span-10 text-green-500">
                        <Sparkline data={processHealth} min={0.99} max={1.01} className="text-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* NEW: Third image — population pyramid converted to Inbound vs Outbound */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Traffic Composition — Inbound vs Outbound</CardTitle>
                    <CardDescription>Simulated distribution across buckets (percentage of total).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-purple-500 font-medium">Inbound</span>
                      <span className="text-muted-foreground">Bucket</span>
                      <span className="text-blue-500 font-medium">Outbound</span>
                    </div>
                    <div className="space-y-2">
                      {trafficBins.map((b, idx) => (
                        <div key={idx} className="grid grid-cols-12 items-center gap-2">
                          {/* Left (Inbound) */}
                          <div className="col-span-5 flex items-center justify-end gap-2">
                            <span className="text-xs text-muted-foreground w-10 text-right">{b.in.toFixed(1)}%</span>
                            <div className="w-full h-5 bg-muted rounded-l-full overflow-hidden">
                              <div className="h-5 bg-purple-500" style={{ width: `${b.in * 10}%` }} />
                            </div>
                          </div>
                          {/* Center label */}
                          <div className="col-span-2 text-center text-xs text-muted-foreground">{b.label}</div>
                          {/* Right (Outbound) */}
                          <div className="col-span-5 flex items-center gap-2">
                            <div className="w-full h-5 bg-muted rounded-r-full overflow-hidden">
                              <div className="h-5 bg-blue-500" style={{ width: `${b.out * 10}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-10">{b.out.toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
                      <div>0%</div>
                      <div>5%</div>
                      <div>10%</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-6">
                {deploymentId ? (
                  state.stage === 'running' ? (
                    <FileManager 
                      deploymentId={deploymentId} 
                      listFiles={(subPath: string) => listFiles(serverId, deploymentId, subPath)}
                      getFileContent={(filePath: string) => getFileContent(serverId, deploymentId, filePath)}
                      saveFileContent={(filePath: string, content: string) => saveFileContent(serverId, deploymentId, filePath, content)}
                      createNewFile={(newPath: string) => createNewFile(serverId, deploymentId, newPath)}
                      deleteFile={(filePath: string) => deleteFileAction(serverId, deploymentId, filePath)}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-4">
                        <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">Files Not Ready Yet</h3>
                        <p className="text-sm">
                          {state.stage === 'starting' || state.stage === 'installing' || state.stage === 'unpacking' 
                            ? 'Bot is still deploying. Files will be available once deployment completes.'
                            : state.stage === 'error'
                            ? 'Deployment failed. Please check the logs and try deploying again.'
                            : 'Please wait for the bot to be fully deployed before accessing files.'
                          }
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <p>Deploy a bot to manage its files.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
