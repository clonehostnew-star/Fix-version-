'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyBonusCard } from '@/components/earn/DailyBonusCard';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { resetDeploymentState, checkDeploymentExists } from '@/app/actions';
import { getServers as getScopedServers, setServers as setScopedServers, getHistory, getZips, getAllUsers, getAdmins, getOwners, addAdmin, removeAdmin, addOwner, removeOwner, grantCoinsTo, deleteAccountData, isOwner, isAdmin, getServerStatus } from '@/lib/userStorage';
import { Server as ServerType, getServersFromStorage, saveServersToStorage } from '@/lib/server-utils';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { BotTemplates } from '@/components/templates/BotTemplates';
import { EnhancedBotMarketplace } from '@/components/marketplace/EnhancedBotMarketplace';
import { PerformanceMonitor } from '@/components/monitoring/PerformanceMonitor';
import { AIBotSuggestions } from '@/components/ai/AIBotSuggestions';
import { ResponsiveTabs } from '@/components/ui/responsive-tabs';
import { EnhancedBotZips } from '@/components/ui/enhanced-bot-zips';
import { DeveloperOnboarding } from '@/components/ui/developer-onboarding';
import { 
  Server, 
  Coins, 
  History, 
  FileArchive, 
  Info, 
  BookOpen, 
  BarChart3, 
  Bot, 
  Store, 
  Activity, 
  Brain,
  Shield,
  Crown,
  User
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getCoinBalance, isSuspended, isBanned, addCoins, setBanned, setSuspended, processMonthlyBilling } from '@/lib/userStorage';
import { toast } from '@/hooks/use-toast';

interface Server extends ServerType {}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'servers';
  const [servers, setServers] = useState<Server[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeveloperOnboarding, setShowDeveloperOnboarding] = useState(false);
  const { user } = useAuth();

  // Migration function to add IDs to existing servers
  const migrateOldServers = (oldServers: any[]): Server[] => {
    return oldServers.map(server => {
      // If server already has the new structure, return it as is
      if (server.id && server.credentials) {
        return server as Server;
      }
      
      // Migrate old server structure to new structure
      return {
        name: server.name,
        id: server.id || Math.random().toString(36).substring(2, 15), // Generate ID if missing
        status: server.status || 'offline',
        credentials: server.credentials || {
          username: `user${Math.floor(1000 + Math.random() * 9000)}`,
          password: Math.random().toString(36).slice(-10) + Math.floor(10 + Math.random() * 90),
          email: `user${Math.floor(1000 + Math.random() * 9000)}@botserver.com`
        },
        deploymentId: server.deploymentId,
        lastActive: server.lastActive
      };
    });
  };

  const handleServerClick = async (server: Server) => {
    // Check if server is suspended
    const derivedStatus = user ? (getServerStatus(user.email, server.id) as any) : null;
    if (derivedStatus === 'suspended') {
      toast({
        title: 'Server Suspended',
        description: 'This server has been suspended and cannot be accessed.',
        variant: 'destructive',
      });
      return;
    }
    
    // Navigate to server management page using server ID
    router.push(`/dashboard/server/${encodeURIComponent(server.id)}`);
  };

  // Load servers and clean up stale deployments
  useEffect(() => {
    setIsClient(true);
    
    // Check if this is a new user and show developer onboarding
    if (user?.email) {
      const hasSeenOnboarding = localStorage.getItem(`developer-onboarding-${user.email}`);
      if (!hasSeenOnboarding) {
        setShowDeveloperOnboarding(true);
      }
    }
    
    const loadServers = async () => {
      try {
        let parsedServers: any = getScopedServers(user?.email || null) as any;
        if (parsedServers) {
          
          // Migrate old server structure to new structure if needed
          if (parsedServers.length > 0 && (!parsedServers[0].id || !parsedServers[0].credentials)) {
            parsedServers = migrateOldServers(parsedServers);
            setScopedServers(user?.email || null, parsedServers as any);
          }
          
          setServers(parsedServers);
          
          // Clean up deployments for inactive servers and verify online servers
          const cleanupPromises = parsedServers.map(async (server: Server) => {
            if (server.status === 'offline' && server.deploymentId) {
              // Preserve deployment files/state for offline bots. No auto-reset here.
            } else if (server.status === 'online' && server.deploymentId) {
              // Verify that online servers actually have active deployments
              try {
                const exists = await checkDeploymentExists(server.id, server.deploymentId);
                if (!exists) {
                  // Update server status to offline
                  const updatedServers = parsedServers.map((s: Server) => 
                    s.id === server.id ? {...s, status: 'offline', deploymentId: undefined} : s
                  );
                  setServers(updatedServers);
                  setScopedServers(user?.email || null, updatedServers as any);
                }
              } catch (err) {
                console.error('Error verifying server deployment:', err);
              }
            }
          });
          
          await Promise.all(cleanupPromises);
          
          // Check for monthly billing and auto-suspend if needed
          if (user?.email && parsedServers.length > 0) {
            const lastBillingCheck = localStorage.getItem(`lastBillingCheck__${user.email.toLowerCase()}`);
            const now = Date.now();
            const MONTHLY_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
            
            if (!lastBillingCheck || (now - parseInt(lastBillingCheck)) >= MONTHLY_INTERVAL) {
              const billingResult = processMonthlyBilling(user.email);
              
              if (billingResult.serversSuspended > 0) {
                toast({
                  title: 'Monthly Billing Failed',
                  description: billingResult.message,
                  variant: 'destructive',
                });
              } else if (billingResult.success) {
                toast({
                  title: 'Monthly Billing Successful',
                  description: billingResult.message,
                });
              }
              
              // Update last billing check time
              localStorage.setItem(`lastBillingCheck__${user.email.toLowerCase()}`, now.toString());
              
              // Refresh servers to show updated status
              const updatedServers = getScopedServers(user.email) as any[];
              setServers(updatedServers);
            }
          }
        } else {
          console.log('No servers found for user');
          setServers([]);
        }
      } catch (err) {
        console.error('Error loading servers:', err);
        setError('Failed to load servers');
        setServers([]);
      }
    };
    loadServers();

    // Real-time sync: listen to storage updates from other tabs/windows
    function handleStorage(e: StorageEvent) {
      if (!user?.email) return;
      const keyPrefix = `userServers__${user.email.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_')}`;
      if (e.key && e.key.includes(keyPrefix)) {
        try {
          const latest = getScopedServers(user.email) as any[];
          setServers(latest as Server[]);
        } catch {}
      }
      // Also refresh when status keys change
      if (e.key && e.key.startsWith('serverStatus_')) {
        try {
          const latest = getScopedServers(user.email) as any[];
          setServers(latest as Server[]);
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [user?.email]);

  const handleTabChange = (value: string) => {
    router.push(`/dashboard?tab=${value}`, { scroll: false });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      let parsedServers = getScopedServers(user?.email || null) as any;
      if (parsedServers) {
        
        // Verify status and preserve offline deployments
        const cleanupPromises = (parsedServers as Server[]).map(async (server: Server) => {
          if (server.deploymentId) {
            if (server.status === 'offline') {
              // Do not reset offline deployments automatically
            } else if (server.status === 'online') {
              // For online servers, verify the deployment still exists
              try {
                const exists = await checkDeploymentExists(server.id, server.deploymentId);
                if (!exists) {
                  server.status = 'offline';
                  server.deploymentId = undefined;
                }
              } catch (err) {
                console.error('Error verifying deployment:', err);
                server.status = 'offline';
                server.deploymentId = undefined;
              }
            }
          }
        });
        
        await Promise.all(cleanupPromises);
        
        // Update localStorage with potentially corrected server status
        setScopedServers(user?.email || null, parsedServers as any);
        setServers(parsedServers);
      }
    } catch (error) {
      console.error('Error refreshing servers:', error);
      setError('Failed to refresh servers');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
      {/* Developer Onboarding Modal */}
      {showDeveloperOnboarding && (
        <DeveloperOnboarding 
          onComplete={() => {
            setShowDeveloperOnboarding(false);
            if (user?.email) {
              localStorage.setItem(`developer-onboarding-${user.email}`, 'true');
            }
          }} 
        />
      )}
      
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <ResponsiveTabs
              tabs={[
                { value: "servers", label: "Servers", icon: <Server className="h-4 w-4" /> },
                { value: "earn", label: "Earn Coins", icon: <Coins className="h-4 w-4 text-yellow-500" /> },
                { value: "history", label: "History", icon: <History className="h-4 w-4" /> },
                { value: "zips", label: "Bot Zips", icon: <FileArchive className="h-4 w-4" /> },
                { value: "about", label: "About", icon: <Info className="h-4 w-4" /> },
                { value: "docs", label: "Docs", icon: <BookOpen className="h-4 w-4" /> },
                { value: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
                { value: "templates", label: "Bot Templates", icon: <Bot className="h-4 w-4" /> },
                { value: "marketplace", label: "Marketplace", icon: <Store className="h-4 w-4" /> },
                { value: "monitoring", label: "Monitoring", icon: <Activity className="h-4 w-4" /> },
                { value: "ai-suggestions", label: "AI Suggestions", icon: <Brain className="h-4 w-4" /> },
                { value: "admin", label: "Admin", icon: <Shield className="h-4 w-4" />, adminOnly: true },
                { value: "owner", label: "Owner", icon: <Crown className="h-4 w-4" />, ownerOnly: true }
              ]}
              activeTab={tab}
              onTabChange={handleTabChange}
              isAdmin={user ? (isAdmin(user.email) || isOwner(user.email)) : false}
              isOwner={user ? isOwner(user.email) : false}
            />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className={tab === 'servers' ? 'block' : 'hidden'}>
            <Button asChild>
              <Link href="/dashboard/server/create">
                <PlusCircle className="mr-2 h-5 w-5" />
                Create New Server
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/15 text-destructive rounded-lg border border-destructive/50 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <TabsContent value="servers">
          {isClient && servers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {servers.map((server) => (
                <div
                  key={server.id}
                  className="block cursor-pointer"
                  onClick={() => handleServerClick(server)}
                >
                  <Card className="hover:bg-card-foreground/5 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Server className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <h3 className="font-bold">{server.name}</h3>
                          {(() => {
                            const derived = user ? (getServerStatus(user.email, server.id) as any) : null;
                            // Check if server has an active deployment
                            const hasActiveDeployment = server.deploymentId && derived && derived !== 'offline';
                            // Check if server is suspended first
                            let status;
                            if (server.status === 'suspended') {
                              status = 'suspended';
                            } else {
                              status = hasActiveDeployment ? derived : (server.status === 'online' ? 'active' : 'offline');
                            }
                            
                            // Get status color and animation
                            const getStatusStyle = (status: string) => {
                              switch (status) {
                                case 'active':
                                  return { color: 'bg-green-500', animate: 'animate-pulse' };
                                case 'deploying':
                                  return { color: 'bg-blue-500', animate: 'animate-pulse' };
                                case 'paused':
                                  return { color: 'bg-yellow-500', animate: '' };
                                case 'failed':
                                  return { color: 'bg-red-600', animate: '' };
                                case 'suspended':
                                  return { color: 'bg-red-700', animate: '' };
                                case 'offline':
                                default:
                                  return { color: 'bg-red-500', animate: '' };
                              }
                            };
                            
                            const statusStyle = getStatusStyle(status);
                            
                            return (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className={cn(
                                  "h-2 w-2 rounded-full",
                                  statusStyle.color,
                                  statusStyle.animate
                                )} />
                                <span className="capitalize">{status}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : isClient ? (
            <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-lg min-h-[300px]">
              <Server className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Servers Yet</h2>
              <p className="text-muted-foreground mb-4">Get started by creating your first bot server.</p>
              <Button variant="outline" asChild>
                <Link href="/dashboard/server/create">Create Your First Server</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </TabsContent>
        {(user && (isAdmin(user.email) || isOwner(user.email))) && (
          <TabsContent value="admin">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">Admins can grant coins.</div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget as any; const email = form.email.value; const amount = Number(form.amount.value || '0'); grantCoinsTo(email, amount); form.reset(); }}>
                <input name="email" placeholder="user email" className="border px-2 py-1 rounded w-64 bg-background" />
                <input name="amount" type="number" placeholder="amount" className="border px-2 py-1 rounded w-32 bg-background" />
                <button className="px-3 py-1 border rounded">Give Coins</button>
              </form>
            </div>
          </TabsContent>
        )}
        {(user && isOwner(user.email)) && (
          <TabsContent value="owner">
            <div className="space-y-6">
              <div className="p-3 border rounded text-sm bg-green-50 border-green-200">
                Welcome owner {user.email}. You can manage admins, users, and coins.
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="font-semibold text-lg">Users Management</div>
                  {getAllUsers().map(u => (
                    <div key={u.email} className="p-3 border rounded-lg bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">{u.email}</div>
                        <div className="flex gap-1">
                          {u.suspended && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded border border-yellow-200">
                              Suspended
                            </span>
                          )}
                          {u.banned && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded border border-red-200">
                              Banned
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button 
                          className="px-3 py-1 border rounded text-xs bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                          onClick={() => {
                            if (confirm(`Are you sure you want to ${u.suspended ? 'unsuspend' : 'suspend'} ${u.email}?`)) {
                              setSuspended(u.email, !u.suspended);
                              // Force refresh
                              if (typeof window !== 'undefined') {
                                setTimeout(() => window.location.reload(), 100);
                              }
                            }
                          }}
                        >
                          {u.suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button 
                          className="px-3 py-1 border rounded text-xs bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                          onClick={() => {
                            if (confirm(`Are you sure you want to ${u.banned ? 'unban' : 'ban'} ${u.email}?`)) {
                              setBanned(u.email, !u.banned);
                              // Force refresh
                              if (typeof window !== 'undefined') {
                                setTimeout(() => window.location.reload(), 100);
                              }
                            }
                          }}
                        >
                          {u.banned ? 'Unban' : 'Ban'}
                        </button>
                        <button 
                          className="px-3 py-1 border rounded text-xs bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                          onClick={() => {
                            if (confirm(`Are you sure you want to DELETE ${u.email}? This action cannot be undone.`)) {
                              deleteAccountData(u.email);
                              // Force refresh
                              if (typeof window !== 'undefined') {
                                setTimeout(() => window.location.reload(), 100);
                              }
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="font-semibold text-lg">Admin Management</div>
                    <div className="text-sm text-muted-foreground">
                      Current admins: {Object.keys(getAdmins()).join(', ') || 'none'}
                    </div>
                    <form className="flex gap-2" onSubmit={(e) => { 
                      e.preventDefault(); 
                      const form = e.currentTarget as any; 
                      const email = form.email.value; 
                      if (email) {
                        addAdmin(email);
                        form.reset();
                        alert(`Admin ${email} added successfully!`);
                      }
                    }}>
                      <input name="email" placeholder="email to add admin" className="border px-3 py-2 rounded bg-background flex-1" />
                      <button className="px-4 py-2 border rounded bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100">
                        Add Admin
                      </button>
                    </form>
                    <form className="flex gap-2" onSubmit={(e) => { 
                      e.preventDefault(); 
                      const form = e.currentTarget as any; 
                      const email = form.email.value; 
                      if (email) {
                        removeAdmin(email);
                        form.reset();
                        alert(`Admin ${email} removed successfully!`);
                      }
                    }}>
                      <input name="email" placeholder="email to remove admin" className="border px-3 py-2 rounded bg-background flex-1" />
                      <button className="px-4 py-2 border rounded bg-red-50 text-red-700 border-red-300 hover:bg-red-100">
                        Remove Admin
                      </button>
                    </form>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="font-semibold text-lg">Owner Management</div>
                    <div className="text-sm text-muted-foreground">
                      Extra owners: {getOwners().join(', ') || 'none'}
                    </div>
                    <form className="flex gap-2" onSubmit={(e) => { 
                      e.preventDefault(); 
                      const form = e.currentTarget as any; 
                      const email = form.email.value; 
                      if (email) {
                        addOwner(email);
                        form.reset();
                        alert(`Owner ${email} added successfully!`);
                      }
                    }}>
                      <input name="email" placeholder="email to add owner" className="border px-3 py-2 rounded bg-background flex-1" />
                      <button className="px-4 py-2 border rounded bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100">
                        Add Owner
                      </button>
                    </form>
                    <form className="flex gap-2" onSubmit={(e) => { 
                      e.preventDefault(); 
                      const form = e.currentTarget as any; 
                      const email = form.email.value; 
                      if (email) {
                        removeOwner(email);
                        form.reset();
                        alert(`Owner ${email} removed successfully!`);
                      }
                    }}>
                      <input name="email" placeholder="email to remove owner" className="border px-3 py-2 rounded bg-background flex-1" />
                      <button className="px-4 py-2 border rounded bg-red-50 text-red-700 border-red-300 hover:bg-red-100">
                        Remove Owner
                      </button>
                    </form>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="font-semibold text-lg">Grant Coins</div>
                    <form className="flex gap-2" onSubmit={(e) => { 
                      e.preventDefault(); 
                      const form = e.currentTarget as any; 
                      const email = form.email.value; 
                      const amount = Number(form.amount.value || '0'); 
                      if (email && amount > 0) {
                        grantCoinsTo(email, amount);
                        form.reset();
                        alert(`Granted ${amount} coins to ${email}!`);
                        // Force refresh to show updated data
                        if (typeof window !== 'undefined') {
                          setTimeout(() => window.location.reload(), 100);
                        }
                      } else {
                        alert('Please enter valid email and amount');
                      }
                    }}>
                      <input name="email" placeholder="user email" className="border px-3 py-2 rounded bg-background flex-1" />
                      <input name="amount" type="number" placeholder="amount" className="border px-3 py-2 rounded bg-background w-24" />
                      <button className="px-4 py-2 border rounded bg-green-50 text-green-700 border-green-300 hover:bg-green-100">
                        Give Coins
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              
              {/* Owner viewer for user data */}
              <div className="space-y-3 pt-4">
                <div className="font-semibold text-lg">View User Data</div>
                <UserViewer />
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="earn">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <DailyBonusCard />
          </div>
        </TabsContent>
        <TabsContent value="history">
          <div className="space-y-3">
            {(getHistory(user?.email || null)).map(h => (
              <div key={h.id} className="p-3 border rounded-md flex items-center justify-between">
                <div>
                  <div className="font-medium">{h.serverName}</div>
                  <div className="text-xs text-muted-foreground">{new Date(h.timestamp).toLocaleString()} — {h.fileName || 'n/a'}</div>
                </div>
                <div className="text-sm capitalize">{h.status}</div>
              </div>
            ))}
            {getHistory(user?.email || null).length === 0 && (
              <div className="text-sm text-muted-foreground">No history yet.</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="profile">
          <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-lg min-h-[300px]">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Profile Information</h2>
            <p className="text-muted-foreground mb-4">View your detailed profile information and account stats.</p>
            <Button asChild>
              <Link href="/profile">View Full Profile</Link>
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="zips">
          <EnhancedBotZips />
        </TabsContent>
        <TabsContent value="about">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>WhatsApp bot site hosting helps you deploy and manage WhatsApp bots with a live control panel, logs, and file manager.</div>
            <div>Uptime-focused infrastructure with isolated sandboxes and simple one-click deploy from a ZIP file.</div>
          </div>
        </TabsContent>
        <TabsContent value="docs">
          <div className="space-y-2 text-sm">
            <ol className="list-decimal list-inside space-y-1">
              <li>Zip your bot source (must include package.json with a start script).</li>
              <li>Create a server and open its Control Panel.</li>
              <li>Upload the ZIP and watch deployment logs.</li>
              <li>Scan the QR printed by your bot to go online.</li>
            </ol>
          </div>
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>
        <TabsContent value="templates">
          <BotTemplates />
        </TabsContent>
        <TabsContent value="marketplace">
          <EnhancedBotMarketplace />
        </TabsContent>
        <TabsContent value="monitoring">
          <PerformanceMonitor />
        </TabsContent>
        <TabsContent value="ai-suggestions">
          <AIBotSuggestions />
        </TabsContent>
      </Tabs>
    </main>
  );
}

// Inline component: owner-only user viewer
function UserViewer() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [zips, setZips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('users');

  // Check if user is owner
  if (!user || !isOwner(user.email)) return null;

  const tabs = [
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'servers', label: 'Servers', icon: '🖥️' },
    { id: 'history', label: 'History', icon: '📜' },
    { id: 'zips', label: 'Bot Zips', icon: '📦' },
  ];

  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Safely get all users
      let allUsers: any[] = [];
      try {
        allUsers = getAllUsers();
        if (!Array.isArray(allUsers)) {
          allUsers = [];
        }
      } catch (err) {
        console.error('Error getting users:', err);
        allUsers = [];
      }
      
      setUsers(allUsers);
      
      if (allUsers.length > 0) {
        const selectedEmail = selected || allUsers[0]?.email || '';
        setSelected(selectedEmail);
        
        // Safely get user data
        try {
          const userServers = getScopedServers(selectedEmail);
          setServers(Array.isArray(userServers) ? userServers : []);
        } catch (err) {
          console.error('Error getting servers:', err);
          setServers([]);
        }
        
        try {
          const userHistory = getHistory(selectedEmail);
          setHistory(Array.isArray(userHistory) ? userHistory : []);
        } catch (err) {
          console.error('Error getting history:', err);
          setHistory([]);
        }
        
        try {
          const userZips = getZips(selectedEmail);
          setZips(Array.isArray(userZips) ? userZips : []);
        } catch (err) {
          console.error('Error getting zips:', err);
          setZips([]);
        }
      }
      
    } catch (err) {
      console.error('Error in UserViewer:', err);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  }, [selected]);

  const handleUserChange = (email: string) => {
    try {
      setSelected(email);
      setError(null);
      
      // Get data for selected user
      const userServers = getScopedServers(email);
      setServers(Array.isArray(userServers) ? userServers : []);
      
      const userHistory = getHistory(email);
      setHistory(Array.isArray(userHistory) ? userHistory : []);
      
      const userZips = getZips(email);
      setZips(Array.isArray(userZips) ? userZips : []);
      
    } catch (err) {
      console.error('Error changing user:', err);
      setError('Failed to load user data');
    }
  };

  const handleAdminAction = async (action: string, targetEmail: string, value: any) => {
    try {
      setError(null);
      
      // Confirm action
      const confirmMessage = `Are you sure you want to ${action} ${targetEmail}?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
      
      // Perform action
      switch (action) {
        case 'ban':
          setBanned(targetEmail, true);
          break;
        case 'unban':
          setBanned(targetEmail, false);
          break;
        case 'suspend':
          setSuspended(targetEmail, true);
          break;
        case 'unsuspend':
          setSuspended(targetEmail, false);
          break;
        case 'grantCoins':
          if (typeof value === 'number' && value > 0) {
            addCoins(targetEmail, value);
            // Force sync to other browsers
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('storage'));
            }
          }
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      // Refresh user data
      handleUserChange(selected);
      
      // Show success message
      toast({
        title: 'Success',
        description: `${action} completed for ${targetEmail}`,
      });
      
      // Force sync to other browsers
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
      
    } catch (err) {
      console.error('Error performing admin action:', err);
      setError(`Failed to ${action}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      toast({
        title: 'Error',
        description: `Failed to ${action}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded p-3 space-y-3">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading user data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border rounded p-3 space-y-3">
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">⚠️ Error loading data</div>
          <div className="text-sm text-muted-foreground mb-4">{error}</div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-3 space-y-3">
      {/* User selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">View user:</label>
        <select 
          value={selected} 
          onChange={(e) => handleUserChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm bg-background"
        >
          {users.map(u => (
            <option key={u.email} value={u.email}>
              {u.email} {u.banned ? '(BANNED)' : u.suspended ? '(SUSPENDED)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Quick actions */}
      {selected && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAdminAction('grantCoins', selected, 100)}
          >
            Grant 100 Coins
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAdminAction('suspend', selected, true)}
          >
            Suspend
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAdminAction('unsuspend', selected, false)}
          >
            Unsuspend
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAdminAction('ban', selected, true)}
          >
            Ban
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAdminAction('unban', selected, false)}
          >
            Unban
          </Button>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {activeTab === 'users' && (
          <div className="space-y-2">
            <h4 className="font-medium">User Information</h4>
            {selected && users.find(u => u.email === selected) && (
              <div className="text-sm space-y-1">
                <div>Email: {selected}</div>
                <div>Coins: {getCoinBalance(selected)}</div>
                <div>Status: {isBanned(selected) ? 'BANNED' : isSuspended(selected) ? 'SUSPENDED' : 'ACTIVE'}</div>
                <div>Admin: {isAdmin(selected) ? 'YES' : 'NO'}</div>
                <div>Owner: {isOwner(selected) ? 'YES' : 'NO'}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'servers' && (
          <div className="space-y-2">
            <h4 className="font-medium">Servers ({servers.length})</h4>
            {servers.length === 0 ? (
              <div className="text-sm text-muted-foreground">No servers found</div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {servers.map(server => (
                  <div key={server.id} className="p-2 border rounded text-sm">
                    <div className="font-medium">{server.name}</div>
                    <div>Status: {server.status}</div>
                    {server.deploymentId && <div>Deployment: {server.deploymentId}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            <h4 className="font-medium">History ({history.length})</h4>
            {history.length === 0 ? (
              <div className="text-sm text-muted-foreground">No history found</div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {history.slice(0, 10).map((item, index) => (
                  <div key={index} className="p-2 border rounded text-sm">
                    <div className="font-medium">{item.serverName}</div>
                    <div>Status: {item.status}</div>
                    <div>File: {item.fileName || 'N/A'}</div>
                    <div>Time: {new Date(item.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'zips' && (
          <div className="space-y-2">
            <h4 className="font-medium">Bot Zips ({zips.length})</h4>
            {zips.length === 0 ? (
              <div className="text-sm text-muted-foreground">No bot zips found</div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {zips.map((zip, index) => (
                  <div key={index} className="p-2 border rounded text-sm">
                    <div className="font-medium">{zip.name}</div>
                    <div>Size: {zip.size}</div>
                    <div>Uploaded: {new Date(zip.uploadedAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </div>
  );
}