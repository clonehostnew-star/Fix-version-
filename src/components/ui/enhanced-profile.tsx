'use client';

import { useState } from 'react';
import { User, Settings, Edit, Shield, Crown, Bot, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { isOwner, isAdmin, getCoinBalance } from '@/lib/userStorage';

interface ProfileProps {
  onSettingsClick: () => void;
}

export function EnhancedProfile({ onSettingsClick }: ProfileProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!user) return null;

  const userRole = isOwner(user.email) ? 'Owner' : isAdmin(user.email) ? 'Admin' : 'User';
  const coinBalance = getCoinBalance(user.email);
  const isOwnerUser = isOwner(user.email);
  const isAdminUser = isAdmin(user.email);

  return (
    <Card className="w-full max-w-md bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="text-center pb-4">
        <div className="relative mx-auto mb-4">
          {/* Profile Avatar */}
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          {/* Role Badge */}
          <div className="absolute -bottom-2 -right-2">
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
        </div>
        
        <CardTitle className="text-xl font-bold text-green-800">
          {user.displayName || user.email?.split('@')[0] || 'User'}
        </CardTitle>
        <p className="text-green-600 text-sm">{user.email}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border border-green-200">
            <div className="flex items-center justify-center mb-2">
              <Coins className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-green-800">
              {typeof coinBalance === 'number' ? coinBalance : '∞'}
            </p>
            <p className="text-xs text-green-600">Coins</p>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border border-green-200">
            <div className="flex items-center justify-center mb-2">
              <Bot className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-800">0</p>
            <p className="text-xs text-green-600">Bots</p>
          </div>
        </div>

        {/* Account Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
            <span className="text-sm text-green-700">Account Status</span>
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              Active
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
            <span className="text-sm text-green-700">Member Since</span>
            <span className="text-sm text-green-600">
              {user.metadata?.creationTime 
                ? new Date(user.metadata.creationTime).toLocaleDateString()
                : 'Recently'
              }
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
            <span className="text-sm text-green-700">Last Sign In</span>
            <span className="text-sm text-green-600">
              {user.metadata?.lastSignInTime 
                ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                : 'Today'
              }
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button 
            onClick={onSettingsClick}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Settings className="w-4 h-4 mr-2" />
            Account Settings
          </Button>
          
          {isOwnerUser && (
            <Button 
              variant="outline"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 transition-all duration-200"
            >
              <Crown className="w-4 h-4 mr-2" />
              Owner Panel
            </Button>
          )}
          
          {isAdminUser && !isOwnerUser && (
            <Button 
              variant="outline"
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200"
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin Panel
            </Button>
          )}
        </div>

        {/* Expandable Additional Info */}
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Edit className="w-4 h-4 mr-2" />
            {isExpanded ? 'Show Less' : 'Show More'}
          </Button>
          
          {isExpanded && (
            <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
              <div className="p-3 bg-white rounded-lg border border-green-200">
                <p className="text-xs text-green-600 mb-1">User ID</p>
                <p className="text-xs font-mono text-green-800 break-all">
                  {user.uid}
                </p>
              </div>
              
              <div className="p-3 bg-white rounded-lg border border-green-200">
                <p className="text-xs text-green-600 mb-1">Email Verified</p>
                <Badge variant={user.emailVerified ? "default" : "destructive"} className="text-xs">
                  {user.emailVerified ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}