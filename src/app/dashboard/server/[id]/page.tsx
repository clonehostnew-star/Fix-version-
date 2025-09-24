'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, ChevronRight, Trash2, Server as ServerIcon, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Server } from '@/lib/server-utils';
import { getServers as getScopedServers, setServers as setScopedServers, getServerStatus, isServerSuspended } from '@/lib/userStorage';
import { useAuth } from '@/context/AuthContext';


export default function ServerManagementPage() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.id as string;
  const { toast } = useToast();
  const { user } = useAuth();

  const [server, setServer] = useState<Server | null>(null);
  const [nextBillDate, setNextBillDate] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('Calculating...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const loadServerData = () => {
      try {
        // Decode the server ID from URL
        const decodedServerId = decodeURIComponent(serverId);
        
        // Get servers from the correct storage location (user-specific)
        const userServers = getScopedServers(user?.email || null) as Server[];
        console.log('All user servers:', userServers);
        
        // Try to find server by ID first
        let foundServer = userServers.find(s => s.id === decodedServerId);
        console.log('Looking for server with ID:', decodedServerId);
        console.log('Found server by ID:', foundServer);
        
        if (!foundServer) {
          // Try to find by name as fallback
          foundServer = userServers.find(s => s.name === decodedServerId);
          if (foundServer) {
            console.log('Found server by name, redirecting to correct ID');
            router.replace(`/dashboard/server/${encodeURIComponent(foundServer.id)}`);
            return;
          }
          
          setError(`Server not found. ID: ${decodedServerId}`);
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

    if (serverId && user?.email) {
      loadServerData();
    }
  }, [serverId, router, user?.email]);

  useEffect(() => {
    if (!server) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const nextBill = new Date();
      nextBill.setDate(now.getDate() + 30); // Monthly billing (30 days)
      return nextBill;
    };

    setNextBillDate(calculateTimeLeft());
  }, [server]);

  // Listen for storage changes to update status in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      // Force a re-render to update the status
      setServer(prev => prev ? { ...prev } : null);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!nextBillDate) return;

    const timer = setInterval(() => {
      const now = new Date();
      const diff = nextBillDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Billing due');
        clearInterval(timer);
      } else {
        const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
        const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${months}m, ${days}d, ${hours}h, ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextBillDate]);

  const handleDeleteServer = () => {
    if (!server) return;

    try {
      // Get current servers from user storage
      const userServers = getScopedServers(user?.email || null) as Server[];
      
      // Remove the server
      const updatedServers = userServers.filter(s => s.id !== server.id);
      
      // Update storage
      setScopedServers(user?.email || null, updatedServers as any);
      
      // Navigate back to dashboard
      router.push('/dashboard');
      
      toast({
        title: 'Server Deleted',
        description: `${server.name} has been successfully deleted.`,
      });
    } catch (err) {
      console.error('Error deleting server:', err);
      setError('Failed to delete server');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: 'Copied!',
      description: `${field} copied to clipboard.`,
    });
    
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
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
      <div className="flex flex-col min-h-screen bg-background text-foreground">
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



  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl">
          <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Servers
          </Link>

          <Card className="shadow-2xl overflow-hidden border-border/50">
            <CardHeader className="bg-card/5">
              <CardTitle className="font-headline text-3xl">Manage Server</CardTitle>
              <CardDescription>Control and view details for your server.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4 text-base md:text-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">Server Name:</span>
                  <span className="font-bold">{server.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">Server ID:</span>
                  <span className="font-mono text-sm">{server.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">Status:</span>
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
                          return { color: 'bg-green-500', textColor: 'text-green-500', animate: 'animate-pulse' };
                        case 'deploying':
                          return { color: 'bg-blue-500', textColor: 'text-blue-500', animate: 'animate-pulse' };
                        case 'paused':
                          return { color: 'bg-yellow-500', textColor: 'text-yellow-500', animate: '' };
                        case 'failed':
                          return { color: 'bg-red-600', textColor: 'text-red-600', animate: '' };
                        case 'suspended':
                          return { color: 'bg-red-700', textColor: 'text-red-700', animate: '' };
                        case 'offline':
                        default:
                          return { color: 'bg-red-500', textColor: 'text-red-500', animate: '' };
                      }
                    };
                    
                    const statusStyle = getStatusStyle(status);
                    
                    return (
                      <span className={`flex items-center ${statusStyle.textColor}`}>
                        <span className={`h-2 w-2 rounded-full mr-2 ${statusStyle.color} ${statusStyle.animate}`} />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">Server Plan:</span>
                  <span>Starter</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">Billing Cycle:</span>
                  <span>Monthly</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">Time Until Next Bill:</span>
                  <span className="font-mono text-primary animate-pulse">{timeLeft}</span>
                </div>
              </div>

              {showCredentials && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold text-lg">Server Credentials</h3>
                  <p className="text-sm text-muted-foreground">
                    These credentials are required to access your server control panel.
                  </p>
                  
                  <div className="space-y-2">
                    <label className="font-semibold">Username</label>
                    <div className="flex gap-2">
                      <input 
                        value={server.credentials.username} 
                        readOnly 
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(server.credentials.username, 'Username')}
                      >
                        {copiedField === 'Username' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="font-semibold">Password</label>
                    <div className="flex gap-2">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={server.credentials.password} 
                        readOnly 
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(server.credentials.password, 'Password')}
                      >
                        {copiedField === 'Password' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="font-semibold">Email</label>
                    <div className="flex gap-2">
                      <input 
                        value={server.credentials.email} 
                        readOnly 
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(server.credentials.email, 'Email')}
                      >
                        {copiedField === 'Email' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-red-900/30 text-red-200 rounded-lg flex items-center gap-4 border border-red-500/50">
                <AlertCircle className="h-6 w-6 shrink-0 text-red-400" />
                <p className="text-sm">
                  You will be automatically charged <strong>50 coins</strong> every month. If you don&apos;t have enough coins, your server will be suspended.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/80 text-primary-foreground font-bold text-base" asChild>
                  <Link href={`/dashboard/server/${server.id}/panel`}>
                    View Control Panel
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                
                <Button 
                  variant="destructive" 
                  size="lg" 
                  className="font-bold text-base"
                  onClick={handleDeleteServer}
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  Delete Server
                </Button>
                
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="font-bold text-base"
                  onClick={() => setShowCredentials(!showCredentials)}
                >
                  {showCredentials ? 'Hide Credentials' : 'View Credentials'}
                </Button>
                
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="font-bold text-base"
                  asChild
                >
                  <Link href="/billing">
                    Change Plan
                  </Link>
                </Button>
              </div>

              {error && (
                <div className="p-4 bg-destructive/15 text-destructive rounded-lg border border-destructive/50">
                  <AlertCircle className="h-5 w-5 inline mr-2" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}