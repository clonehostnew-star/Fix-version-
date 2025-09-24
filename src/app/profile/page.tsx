'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Crown, 
  Bot, 
  Coins, 
  ArrowLeft,
  Edit,
  CheckCircle,
  Clock
} from 'lucide-react';
import { isOwner, isAdmin, getCoinBalance, getHistory, getZips } from '@/lib/userStorage';

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [userZips, setUserZips] = useState<any[]>([]);

  useEffect(() => {
    setIsClient(true);
    if (user?.email) {
      loadUserData();
    }
  }, [user?.email]);

  const loadUserData = () => {
    if (!user?.email) return;
    
    const balance = getCoinBalance(user.email);
    setCoinBalance(typeof balance === 'number' ? balance : Number.MAX_SAFE_INTEGER);
    
    const history = getHistory(user.email);
    setUserHistory(history);
    
    const zips = getZips(user.email);
    setUserZips(zips);
  };

  if (!isClient) return null;

  if (!user) {
    router.push('/login');
    return null;
  }

  const userRole = isOwner(user.email) ? 'Owner' : isAdmin(user.email) ? 'Admin' : 'User';
  const isOwnerUser = isOwner(user.email);
  const isAdminUser = isAdmin(user.email);

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
          
          <h1 className="text-3xl font-bold text-green-800 mb-2">User Profile</h1>
          <p className="text-green-600">View and manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="bg-white border-green-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <User className="w-5 h-5 mr-2" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Display Name</span>
                  <span className="text-sm font-medium text-green-800">
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Email Address</span>
                  <span className="text-sm font-medium text-green-800">{user.email}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">User ID</span>
                  <span className="text-sm font-mono text-green-800 break-all">{user.uid}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Email Verified</span>
                  <Badge variant={user.emailVerified ? "default" : "destructive"} className="text-xs">
                    {user.emailVerified ? 'Yes' : 'No'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Member Since</span>
                  <span className="text-sm text-green-800">
                    {user.metadata?.creationTime 
                      ? new Date(user.metadata.creationTime).toLocaleDateString()
                      : 'Recently'
                    }
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Last Sign In</span>
                  <span className="text-sm text-green-800">
                    {user.metadata?.lastSignInTime 
                      ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                      : 'Today'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card className="bg-white border-green-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Shield className="w-5 h-5 mr-2" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Account Type</span>
                  <Badge 
                    variant={isOwnerUser ? "default" : isAdminUser ? "secondary" : "outline"}
                    className={`px-3 py-1 text-xs font-semibold ${
                      isOwnerUser 
                        ? 'bg-amber-500 text-white border-amber-500' 
                        : isAdminUser 
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-green-500 text-white border-green-500'
                    }`}
                  >
                    {isOwnerUser && <Crown className="w-3 h-3 mr-1" />}
                    {isAdminUser && <Shield className="w-3 h-3 mr-1" />}
                    {!isOwnerUser && !isAdminUser && <User className="w-3 h-3 mr-1" />}
                    {userRole}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Account Status</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card className="bg-white border-green-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Clock className="w-5 h-5 mr-2" />
                  Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-800">{userHistory.length}</div>
                    <div className="text-sm text-green-600">Deployments</div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-800">{userZips.length}</div>
                    <div className="text-sm text-green-600">Bot Zips</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Avatar */}
            <Card className="bg-white border-green-200 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mx-auto mb-4">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  {user.displayName || user.email?.split('@')[0] || 'User'}
                </h3>
                
                <p className="text-green-600 text-sm mb-4">{user.email}</p>
                
                <Button
                  onClick={() => router.push('/settings')}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-white border-green-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-green-800">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center">
                    <Coins className="w-4 h-4 text-yellow-500 mr-2" />
                    <span className="text-sm text-green-700">Coins</span>
                  </div>
                  <span className="text-sm font-bold text-green-800">{coinBalance}</span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center">
                    <Bot className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-700">Bots</span>
                  </div>
                  <span className="text-sm font-bold text-green-800">0</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white border-green-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-green-800">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/server/create')}
                  className="w-full border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Create Bot
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/billing')}
                  className="w-full border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Claim Coins
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}