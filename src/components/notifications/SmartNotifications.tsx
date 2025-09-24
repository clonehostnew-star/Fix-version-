'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellOff, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  X,
  Zap,
  Server,
  Coins,
  Shield,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  category: 'system' | 'server' | 'billing' | 'security';
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Server Online',
    message: 'Your bot server "ChatBot-Pro" is now online and responding to messages.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    read: false,
    category: 'server',
    action: {
      label: 'View Server',
      onClick: () => console.log('View server clicked')
    }
  },
  {
    id: '2',
    type: 'warning',
    title: 'Low Coin Balance',
    message: 'You have only 25 coins remaining. Add more coins to keep your servers running.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    read: false,
    category: 'billing',
    action: {
      label: 'Buy Coins',
      onClick: () => console.log('Buy coins clicked')
    }
  },
  {
    id: '3',
    type: 'info',
    title: 'System Update',
    message: 'New features have been added to your dashboard. Check out the new analytics!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: true,
    category: 'system'
  },
  {
    id: '4',
    type: 'error',
    title: 'Server Error',
    message: 'Server "TestBot" encountered an error and has been restarted automatically.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    read: false,
    category: 'server',
    action: {
      label: 'Check Logs',
      onClick: () => console.log('Check logs clicked')
    }
  }
];

export function SmartNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [settings, setSettings] = useState({
    email: true,
    push: true,
    sound: true,
    autoRead: false
  });
  const { toast } = useToast();

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Simulate new notifications
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of new notification
        const newNotification: Notification = {
          id: Date.now().toString(),
          type: ['info', 'success', 'warning'][Math.floor(Math.random() * 3)] as any,
          title: 'New Activity',
          message: 'Your bot has received new messages and is processing them.',
          timestamp: new Date(),
          read: false,
          category: 'server'
        };
        setNotifications(prev => [newNotification, ...prev]);
        
        // Show toast for new notifications
        toast({
          title: newNotification.title,
          description: newNotification.message,
          variant: newNotification.type === 'error' ? 'destructive' : 'default'
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [toast]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'server': return <Server className="h-4 w-4" />;
      case 'billing': return <Coins className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      case 'system': return <Zap className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'server': return 'bg-blue-100 text-blue-800';
      case 'billing': return 'bg-yellow-100 text-yellow-800';
      case 'security': return 'bg-red-100 text-red-800';
      case 'system': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="outline"
        size="icon"
        className="relative"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Mobile Overlay */}
      {showNotifications && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={() => setShowNotifications(false)}
        />
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed sm:absolute top-12 left-1/2 transform -translate-x-1/2 sm:left-auto sm:right-0 sm:transform-none w-80 sm:w-96 bg-background border rounded-lg shadow-lg z-50 max-h-[600px] overflow-hidden">
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm sm:text-base">Notifications</h3>
              <div className="flex gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Mark all read</span>
                  <span className="sm:hidden">Read All</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                  className="px-2 sm:px-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notifications yet</p>
                <p className="text-sm">We'll notify you about important updates</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 sm:p-4 hover:bg-muted/50 transition-colors ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getCategoryColor(notification.category)} w-fit`}
                          >
                            <span className="mr-1">{getCategoryIcon(notification.category)}</span>
                            <span className="hidden sm:inline">{notification.category}</span>
                            <span className="sm:hidden">{notification.category.charAt(0).toUpperCase()}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                          <span className="text-xs text-muted-foreground">
                            {notification.timestamp.toLocaleTimeString()}
                          </span>
                          <div className="flex gap-1 sm:gap-2">
                            {notification.action && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={notification.action.onClick}
                                className="text-xs px-2 sm:px-3"
                              >
                                <span className="hidden sm:inline">{notification.action.label}</span>
                                <span className="sm:hidden">Action</span>
                              </Button>
                            )}
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs px-2 sm:px-3"
                              >
                                <span className="hidden sm:inline">Mark read</span>
                                <span className="sm:hidden">Read</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="text-xs px-2 sm:px-3"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="p-3 sm:p-4 border-t bg-muted/30">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-sm"
              onClick={() => setShowNotifications(false)}
            >
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Notification Settings</span>
              <span className="sm:hidden">Settings</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}