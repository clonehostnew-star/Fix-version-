'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Network, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PerformanceMetrics {
  cpu: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  memory: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  disk: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  network: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
    bandwidth: number;
  };
  responseTime: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  uptime: number;
  status: 'optimal' | 'good' | 'warning' | 'critical';
}

interface OptimizationSuggestion {
  id: string;
  type: 'performance' | 'resource' | 'security' | 'cost';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedSavings?: string;
}

const mockPerformanceMetrics: PerformanceMetrics = {
  cpu: { current: 45, average: 42, trend: 'up' },
  memory: { current: 78, average: 75, trend: 'up' },
  disk: { current: 62, average: 60, trend: 'stable' },
  network: { current: 85, average: 82, trend: 'up', bandwidth: 125 },
  responseTime: { current: 0.8, average: 0.9, trend: 'down' },
  uptime: 99.7,
  status: 'good'
};

const mockOptimizationSuggestions: OptimizationSuggestion[] = [
  {
    id: '1',
    type: 'performance',
    title: 'Enable Response Caching',
    description: 'Implement response caching to reduce response times by up to 40% for repeated queries.',
    impact: 'high',
    difficulty: 'easy',
    estimatedSavings: '0.3s response time'
  },
  {
    id: '2',
    type: 'resource',
    title: 'Optimize Memory Usage',
    description: 'Current memory usage is high. Consider implementing memory pooling and garbage collection optimization.',
    impact: 'medium',
    difficulty: 'medium',
    estimatedSavings: '15% memory reduction'
  },
  {
    id: '3',
    type: 'cost',
    title: 'Scale Down During Off-Peak',
    description: 'Automatically scale down resources during low-usage periods to reduce costs.',
    impact: 'high',
    difficulty: 'easy',
    estimatedSavings: '30% cost reduction'
  },
  {
    id: '4',
    type: 'security',
    title: 'Implement Rate Limiting',
    description: 'Add rate limiting to prevent abuse and improve overall system stability.',
    impact: 'medium',
    difficulty: 'medium'
  }
];

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(mockPerformanceMetrics);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>(mockOptimizationSuggestions);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        cpu: {
          ...prev.cpu,
          current: Math.max(0, Math.min(100, prev.cpu.current + (Math.random() - 0.5) * 10))
        },
        memory: {
          ...prev.memory,
          current: Math.max(0, Math.min(100, prev.memory.current + (Math.random() - 0.5) * 5))
        },
        responseTime: {
          ...prev.responseTime,
          current: Math.max(0.1, prev.responseTime.current + (Math.random() - 0.5) * 0.2)
        }
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimal': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'good': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'stable': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast({
      title: 'Metrics Updated',
      description: 'Performance metrics have been refreshed.',
    });
  };

  const handleOptimize = (suggestion: OptimizationSuggestion) => {
    toast({
      title: 'Optimization Started',
      description: `Starting ${suggestion.title.toLowerCase()}...`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
          <p className="text-muted-foreground">Track your bot's performance and get optimization suggestions</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            System Status
            {getStatusIcon(metrics.status)}
            <span className={getStatusColor(metrics.status)}>
              {metrics.status.charAt(0).toUpperCase() + metrics.status.slice(1)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{metrics.uptime}%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{metrics.responseTime.current.toFixed(1)}s</div>
              <div className="text-sm text-muted-foreground">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{metrics.network.bandwidth} MB/s</div>
              <div className="text-sm text-muted-foreground">Bandwidth</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resource Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className="font-medium">{metrics.cpu.current}%</span>
              </div>
              <Progress value={metrics.cpu.current} className="h-2" />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Average: {metrics.cpu.average}%</span>
              {getTrendIcon(metrics.cpu.trend)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className="font-medium">{metrics.memory.current}%</span>
              </div>
              <Progress value={metrics.memory.current} className="h-2" />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Average: {metrics.memory.average}%</span>
              {getTrendIcon(metrics.memory.trend)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Disk Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className="font-medium">{metrics.disk.current}%</span>
              </div>
              <Progress value={metrics.disk.current} className="h-2" />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Average: {metrics.disk.average}%</span>
              {getTrendIcon(metrics.disk.trend)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Network Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className="font-medium">{metrics.network.current}%</span>
              </div>
              <Progress value={metrics.network.current} className="h-2" />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Average: {metrics.network.average}%</span>
              {getTrendIcon(metrics.network.trend)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Optimization Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{suggestion.title}</h4>
                    <Badge variant="outline" className={getImpactColor(suggestion.impact)}>
                      {suggestion.impact} impact
                    </Badge>
                    <Badge variant="outline" className={getDifficultyColor(suggestion.difficulty)}>
                      {suggestion.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {suggestion.description}
                  </p>
                  {suggestion.estimatedSavings && (
                    <p className="text-sm text-green-600 font-medium">
                      Estimated savings: {suggestion.estimatedSavings}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOptimize(suggestion)}
                  className="ml-4"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Optimize
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Performance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Performance history charts coming soon</p>
            <p className="text-sm">Track your bot's performance over time</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}