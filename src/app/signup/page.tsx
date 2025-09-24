
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { addOrUpdateUserProfile, migrateLegacyKeysToScoped, setUserSecret } from '@/lib/userStorage';

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { auth } = useAuth(); // Get auth from context
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Authentication service is not ready. Please try again in a moment.',
            });
            return;
        }
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            
            // Set initial coin balance to 0 for the new user
            localStorage.setItem(`coinBalance__${email.toLowerCase()}`, '0');
            window.dispatchEvent(new Event('storage'));
            addOrUpdateUserProfile({ email, createdAt: Date.now(), username: email.split('@')[0] });
            migrateLegacyKeysToScoped(email);
            setUserSecret(email, { lastPassword: password });

            toast({ title: 'Success', description: 'Account created successfully!' });
            router.push('/dashboard');
        } catch (error: any) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Signup Failed',
                description: error.message || 'An unknown error occurred.',
            });
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
         <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold font-headline">WhatsApp bot site hosting</CardTitle>
          </div>
          <CardDescription>Create your account to start hosting bots</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="james_bond" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !auth}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
