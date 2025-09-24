
'use client';

import { Bot, LogOut, User, Coins, Loader2, Home, LayoutDashboard, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { getCoinBalance, isOwner } from '@/lib/userStorage';
import { SmartNotifications } from '@/components/notifications/SmartNotifications';

export function Header() {
  const { user, loading, auth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [coinBalance, setCoinBalance] = useState<number | 'unlimited'>(0);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  useEffect(() => {
    const updateBalance = () => {
      setCoinBalance(getCoinBalance(user?.email || null));
    };
    updateBalance();
    window.addEventListener('storage', updateBalance);
    return () => window.removeEventListener('storage', updateBalance);
  }, [user?.email]);
  
  const isDashboardPage = pathname.startsWith('/dashboard');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
             <Link href="/" className="flex items-center space-x-2">
                <Bot className="h-6 w-6 text-primary" />
                <span className="font-headline text-xl font-bold hidden sm:inline-block">WhatsApp bot site hosting</span>
            </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end gap-4">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : user ? (
            <>
              {isDashboardPage ? (
                 <Button variant="outline" size="sm" asChild>
                    <Link href="/">
                      <Home className="mr-2 h-4 w-4" />
                      Back to Home
                    </Link>
                 </Button>
              ) : (
                 <Button variant="default" size="sm" asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Go to Dashboard
                    </Link>
                 </Button>
              )}
              
              {/* Smart Notifications */}
              {isDashboardPage && <SmartNotifications />}
              

              
              <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold">{coinBalance === 'unlimited' ? '∞ Coins' : `${coinBalance} Coins`}</span>
              </div>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full">
                      <User className="h-5 w-5" />
                      <span className="sr-only">Toggle user menu</span>
                  </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {isOwner(user?.email) ? 'Owner: ' : ''}{user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/dashboard?tab=profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/billing')}>
                    <Coins className="mr-2 h-4 w-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/security')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Security
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                  </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
             <nav className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                    <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Register</Link>
                </Button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
