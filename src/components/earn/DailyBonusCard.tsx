
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { addCoins, getCoinBalance, getAdminPermissions, isAdmin } from '@/lib/userStorage';

const COOLDOWN_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (monthly)
const COINS_TO_CLAIM = 50; 

export function DailyBonusCard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isClaiming, setIsClaiming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const checkCooldown = useCallback(() => {
    const scopeKey = (suffix: string) => `lastClaimTime__${(user?.email || 'anonymous').toLowerCase()}`;
    const lastClaimString = localStorage.getItem(scopeKey('lastClaimTime'));
    if (!lastClaimString) {
      setCanClaim(true);
      return;
    }

    const lastClaimTime = parseInt(lastClaimString, 10);
    const endTime = lastClaimTime + COOLDOWN_DURATION_MS;

    if (new Date().getTime() >= endTime) {
      setCanClaim(true);
      setCooldownEndTime(null);
    } else {
      setCanClaim(false);
      setCooldownEndTime(endTime);
    }
  }, [user?.email]);

  useEffect(() => {
    checkCooldown();
    setIsInitialized(true);
  }, [checkCooldown]);

  useEffect(() => {
    if (!cooldownEndTime || canClaim) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const diff = cooldownEndTime - now;

      if (diff <= 0) {
        setTimeLeft('');
        setCanClaim(true);
        setCooldownEndTime(null);
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`);
      }
    }, 1000); 

    return () => clearInterval(timer);
  }, [cooldownEndTime, canClaim]);

  const handleClaim = async () => {
    if (!canClaim || isClaiming) return;
    
    setIsClaiming(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const adminCanClaimAnytime = isAdmin(user?.email) && getAdminPermissions(user?.email).claimAnytime;
    addCoins(user?.email || null, COINS_TO_CLAIM);
    window.dispatchEvent(new Event('storage'));
    
    if (!adminCanClaimAnytime) {
      localStorage.setItem(`lastClaimTime__${(user?.email || 'anonymous').toLowerCase()}`, String(new Date().getTime()));
    }
    checkCooldown();

    toast({
      title: 'Success!',
      description: `You have claimed ${COINS_TO_CLAIM} coins. Current balance: ${getCoinBalance(user?.email || null)}`,
    });
    
    setIsClaiming(false);
  };
  
  if (!isInitialized) {
      return (
        <Card className="shadow-2xl bg-card/80 backdrop-blur-sm flex items-center justify-center min-h-[250px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Card>
      )
  }

  return (
    <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">Monthly Bonus</CardTitle>
        <CardDescription>Come back every 30 days to claim your free coins!</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="mb-6">
          <Gift className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
        </div>

        {canClaim ? (
            <Button onClick={handleClaim} disabled={isClaiming} size="lg" className="w-full font-bold text-lg">
                {isClaiming ? (
                    <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Coins...
                    </>
                ) : (
                    `Claim ${COINS_TO_CLAIM} Coins`
                )}
            </Button>
        ) : (
            <>
                <Button disabled={true} size="lg" className="w-full font-bold text-lg">
                    Claimed
                </Button>
                {timeLeft && (
                  <div className="mt-4 text-sm font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Next claim in: {timeLeft}</span>
                    </div>
                  </div>
                )}
            </>
        )}
      </CardContent>
    </Card>
  );
}
