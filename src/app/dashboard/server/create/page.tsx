'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CloudCog, AlertTriangle, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getCoinBalance, setCoinBalance as setCoinBalanceStore, getServers, setServers } from '@/lib/userStorage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from 'next/link';
import { 
  Server, 
  SERVER_COST, 
  generateServerId, 
  generateServerCredentials,
  addServer 
} from '@/lib/server-utils';
import { APP_CONFIG } from '@/lib/config';

export default function CreateServerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [serverName, setServerName] = useState('');
    const [coinBalance, setCoinBalanceState] = useState(0);
    const [isClient, setIsClient] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Server credentials state
    const [serverCredentials, setServerCredentials] = useState({
        username: '',
        password: '',
        email: '',
    });

    useEffect(() => {
        const balance = getCoinBalance(user?.email || null);
        setCoinBalanceState(typeof balance === 'number' ? balance : Number.MAX_SAFE_INTEGER);
        setIsClient(true);
        
        // Generate credentials on component mount
        generateCredentials();
    }, [user?.email]);

    const generateCredentials = () => {
        const credentials = generateServerCredentials();
        setServerCredentials(credentials);
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

    const handleCreateServer = () => {
        const trimmedName = serverName.trim();
        if (trimmedName && coinBalance >= SERVER_COST) {
            setIsCreating(true);
            
            // Generate a more reliable server ID
            const serverId = generateServerId();
            
            const newServer: Server = {
                name: trimmedName,
                id: serverId,
                status: 'offline',
                credentials: serverCredentials,
            };

            try {
                const existingServers: Server[] = getServers(user?.email || null) as any;
                
                if (existingServers.some(server => server.name.toLowerCase() === trimmedName.toLowerCase())) {
                    toast({
                        variant: 'destructive',
                        title: 'Server Already Exists',
                        description: 'A server with this name already exists. Please choose a different name.',
                    });
                    setIsCreating(false);
                    return;
                }

                // Deduct coins and update balance
                const newBalance = coinBalance - SERVER_COST;
                setCoinBalanceStore(user?.email || null, newBalance);
                setCoinBalanceState(newBalance);

                // Add new server to user's servers
                const updatedServers = [...existingServers, newServer];
                setServers(user?.email || null, updatedServers as any);
                
                // Dispatch storage event to trigger dashboard refresh
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('storage'));
                }
                
                // Debug logging
                console.log('Created server:', newServer);
                
                toast({
                    title: 'Server Created!',
                    description: `Your server "${trimmedName}" is ready. ${SERVER_COST} coins have been deducted.`,
                });
                
                // Redirect to the server management page
                router.push(`/dashboard/server/${encodeURIComponent(serverId)}`);
            } catch (error) {
                console.error('Error creating server:', error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to create server. Please try again.',
                });
                setIsCreating(false);
            }
        }
    };
    
    if (!isClient) {
        return null;
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 flex items-center justify-center">
                <Card className="w-full max-w-2xl shadow-2xl">
                    <CardHeader className="items-center text-center p-6">
                        <div className="p-4 bg-primary/10 rounded-full mb-4">
                            <CloudCog className="h-12 w-12 text-primary" />
                        </div>
                        <CardTitle className="font-headline text-2xl">Create New Server</CardTitle>
                        <CardDescription>Configure your server with a unique name and credentials</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        {coinBalance < SERVER_COST ? (
                            <div className="text-center p-6 bg-destructive/10 rounded-lg border border-destructive/20">
                                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-destructive-foreground">Insufficient Coins</h3>
                                <p className="text-muted-foreground mt-2 mb-4">You need {SERVER_COST} coins to create a new server, but you only have {coinBalance}.</p>
                                <Button asChild>
                                    <Link href="/dashboard?tab=earn">Earn More Coins</Link>
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="server-name" className="text-base font-semibold">Server Name*</Label>
                                    <p className="text-sm text-muted-foreground">The name of your server (max {APP_CONFIG.maxServerNameLength} characters).</p>
                                    <Input 
                                        id="server-name" 
                                        placeholder="Enter your server name" 
                                        required 
                                        maxLength={APP_CONFIG.maxServerNameLength}
                                        value={serverName}
                                        onChange={(e) => setServerName(e.target.value)}
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="bot-language" className="text-base font-semibold">Bot Language*</Label>
                                    <p className="text-sm text-muted-foreground">Select the language your bot runs on.</p>
                                    <Select defaultValue={APP_CONFIG.defaultBotLanguage} required>
                                        <SelectTrigger id="bot-language">
                                            <SelectValue placeholder="Select a language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="nodejs">Node.js</SelectItem>
                                            <SelectItem value="python" disabled>Python (coming soon)</SelectItem>
                                            <SelectItem value="go" disabled>Go (coming soon)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="border rounded-lg p-4 space-y-4">
                                    <h3 className="font-semibold text-lg">Server Credentials</h3>
                                    <p className="text-sm text-muted-foreground">
                                        These credentials are required to access your server control panel. 
                                        Save them in a secure place.
                                    </p>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="server-username">Username</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                id="server-username" 
                                                value={serverCredentials.username} 
                                                readOnly 
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(serverCredentials.username, 'Username')}
                                            >
                                                {copiedField === 'username' ? (
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="server-password">Password</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                id="server-password" 
                                                type={showPassword ? "text" : "password"} 
                                                value={serverCredentials.password} 
                                                readOnly 
                                                className="flex-1"
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
                                                onClick={() => copyToClipboard(serverCredentials.password, 'Password')}
                                            >
                                                {copiedField === 'password' ? (
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="server-email">Email</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                id="server-email" 
                                                value={serverCredentials.email} 
                                                readOnly 
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(serverCredentials.email, 'Email')}
                                            >
                                                {copiedField === 'email' ? (
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-2">
                                        <p className="text-sm text-muted-foreground">
                                            These credentials will be needed to access your server.
                                        </p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={generateCredentials}
                                        >
                                            Regenerate
                                        </Button>
                                    </div>
                                </div>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button 
                                            type="button" 
                                            className="w-full text-lg font-bold py-6" 
                                            disabled={!serverName.trim() || isCreating}
                                        >
                                            {isCreating ? 'Creating Server...' : 'Create Server'}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirm Server Creation</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action will cost you <strong>{SERVER_COST} coins</strong>. 
                                                This amount will be deducted from your balance immediately. 
                                                Make sure you have saved your server credentials.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isCreating}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleCreateServer} disabled={isCreating}>
                                                {isCreating ? 'Creating...' : 'Continue'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </main>
            <footer className="text-center p-4 text-sm text-muted-foreground border-t">
                WhatsApp bot site hosting &copy; {new Date().getFullYear()}
            </footer>
        </div>
    );
}