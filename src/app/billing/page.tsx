'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Coins, 
  Calendar, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  ArrowLeft,
  Crown,
  Shield,
  Zap,
  Server,
  Gift
} from 'lucide-react';
import { getCoinBalance } from '@/lib/userStorage';

export default function BillingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [lastClaimTime, setLastClaimTime] = useState<number>(0);
  const [canClaim, setCanClaim] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
    if (user?.email) {
      loadBillingData();
      startTimer();
    }
  }, [user?.email]);

  const loadBillingData = () => {
    if (!user?.email) return;
    
    const balance = getCoinBalance(user.email);
    setCoinBalance(typeof balance === 'number' ? balance : Number.MAX_SAFE_INTEGER);
    
    // Check last claim time from the same storage key used in DailyBonusCard
    const lastClaim = localStorage.getItem(`lastClaimTime__${user.email.toLowerCase()}`);
    if (lastClaim) {
      const lastClaimDate = parseInt(lastClaim);
      setLastClaimTime(lastClaimDate);
      
      // Check if 30 days have passed (monthly claiming)
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const canClaimNow = Date.now() - lastClaimDate >= thirtyDaysInMs;
      setCanClaim(canClaimNow);
    } else {
      setCanClaim(true);
    }
  };

  const startTimer = () => {
    if (!user?.email) return;
    
    const lastClaim = localStorage.getItem(`lastClaimTime__${user.email.toLowerCase()}`);
    if (!lastClaim) return;
    
    const lastClaimTime = parseInt(lastClaim);
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const endTime = lastClaimTime + thirtyDaysInMs;
    
    const updateTimer = () => {
      const now = Date.now();
      const diff = endTime - now;
      
      if (diff <= 0) {
        setTimeLeft('');
        setCanClaim(true);
        setLastClaimTime(0);
      } else {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      }
    };
    
    updateTimer();
    const timer = setInterval(updateTimer, 60000); // Update every minute
    
    return () => clearInterval(timer);
  };

  const formatTimeUntilNextClaim = () => {
    if (!lastClaimTime) return "Available now";
    
    if (canClaim) return "Available now";
    
    return timeLeft || "Calculating...";
  };

  if (!isClient) return null;

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <h1 className="text-3xl font-bold text-green-800 mb-2">Billing & Coins</h1>
          <p className="text-green-600">View your account billing and coin status</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Balance */}
          <Card className="bg-white border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Coins className="w-5 h-5 mr-2 text-yellow-500" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-800 mb-2">
                  {coinBalance}
                </div>
                <p className="text-green-600">Coins Available</p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Claim Status */}
          <Card className="bg-white border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Gift className="w-5 h-5 mr-2 text-blue-500" />
                Monthly Claim Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold text-green-800">
                  {canClaim ? "50 Coins" : "0 Coins"}
                </div>
                <p className="text-green-600">
                  {canClaim ? "Available to claim" : "Next claim available"}
                </p>
                <div className="text-sm text-gray-500">
                  {formatTimeUntilNextClaim()}
                </div>
                <Button
                  onClick={() => router.push('/dashboard?tab=earn')}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Go to Claim Page
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing Plan */}
          <Card className="bg-white border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <CreditCard className="w-5 h-5 mr-2 text-purple-500" />
                Billing Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold text-green-800">
                  Free Plan
                </div>
                <p className="text-green-600">No monthly fees</p>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-green-800 mb-6 text-center">What's Included</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-white border-green-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-green-800 mb-2">Monthly Coins</h3>
                <p className="text-green-600 text-sm">Claim 50 coins every 30 days</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-green-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Server className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-green-800 mb-2">Bot Hosting</h3>
                <p className="text-green-600 text-sm">Host unlimited WhatsApp bots</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-green-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-green-800 mb-2">Instant Deploy</h3>
                <p className="text-green-600 text-sm">Deploy bots in seconds</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-green-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-green-800 mb-2">Secure Hosting</h3>
                <p className="text-green-600 text-sm">Enterprise-grade security</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-green-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-green-800 mb-2">Premium Support</h3>
                <p className="text-green-600 text-sm">24/7 customer support</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-green-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-green-800 mb-2">Flexible Billing</h3>
                <p className="text-green-600 text-sm">Pay only for what you use</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-green-800 mb-3">How It Works</h3>
              <div className="space-y-2 text-sm text-green-700">
                <p>• <strong>Free Plan:</strong> No monthly subscription fees</p>
                <p>• <strong>Monthly Coins:</strong> Claim 50 coins every 30 days from the Earn page</p>
                <p>• <strong>Bot Hosting:</strong> Each bot costs 50 coins per day</p>
                <p>• <strong>Automatic Billing:</strong> Coins are deducted daily for active bots</p>
                <p>• <strong>No Hidden Fees:</strong> Transparent pricing structure</p>
                <p>• <strong>Claim Coins:</strong> Go to Dashboard → Earn tab to claim your monthly coins</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}