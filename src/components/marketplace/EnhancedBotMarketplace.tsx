'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  Eye, 
  Github, 
  Code, 
  Globe, 
  TrendingUp,
  Bot,
  Plus,
  FileText,
  Calendar,
  User,
  ExternalLink,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

// Simple interface for marketplace bots
interface SimpleBot {
  id: string;
  name: string;
  description: string;
  category: string[];
  language: string;
  version: string;
  githubUsername: string;
  repoLink: string;
  features: string[];
  imageUrl: string;
  zipFileUrl: string;
  tags: string[];
  views: number;
  downloads: number;
  likes: number;
  publishedAt: number;
  developer: {
    email: string;
    displayName: string;
  };
  isVerified: boolean;
  status: 'active' | 'pending' | 'rejected';
}

// Simple marketplace storage functions
const MARKETPLACE_KEY = 'simple-marketplace-bots';

function getBotsFromStorage(): SimpleBot[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(MARKETPLACE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(bot =>
      bot &&
      typeof bot.id === 'string' &&
      typeof bot.name === 'string' &&
      typeof bot.description === 'string'
    );
  } catch {
    return [];
  }
}

function saveBotsToStorage(bots: SimpleBot[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(bots));
  } catch (error) {
    console.error('Error saving bots to storage:', error);
  }
}

function initializeSampleBots(): SimpleBot[] {
  const existing = getBotsFromStorage();
  if (existing.length > 0) return existing;

  const sampleBots: SimpleBot[] = [
    {
      id: 'sample-1',
      name: 'WhatsApp Bot Template',
      description: 'A basic WhatsApp bot template to get you started.',
      category: ['Template', 'Basic'],
      language: 'Node.js',
      version: '1.0.0',
      githubUsername: 'bot-dev',
      repoLink: 'https://github.com/bot-dev/template',
      features: ['Commands', 'Media', 'Admin'],
      imageUrl: '',
      zipFileUrl: '',
      tags: ['template', 'basic'],
      views: 100,
      downloads: 50,
      likes: 10,
      publishedAt: Date.now() - 86400000,
      developer: {
        email: 'admin@bot.com',
        displayName: 'Bot Team'
      },
      isVerified: true,
      status: 'active'
    }
  ];
  saveBotsToStorage(sampleBots);
  return sampleBots;
}

export function EnhancedBotMarketplace() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Simple state management
  const [bots, setBots] = useState<SimpleBot[]>([]);
  const [filteredBots, setFilteredBots] = useState<SimpleBot[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'name'>('popular');
  const [isLoading, setIsLoading] = useState(true);

  // Load bots safely
  useEffect(() => {
    try {
      setIsLoading(true);
      const sampleBots = initializeSampleBots();
      setBots(sampleBots);
      setFilteredBots(sampleBots);
    } catch (error) {
      console.error('Error loading bots:', error);
      setBots([]);
      setFilteredBots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter and sort bots safely
  useEffect(() => {
    try {
      let filtered = bots.filter(bot => {
        const matchesSearch = bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             bot.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || bot.category.includes(selectedCategory);
        return matchesSearch && matchesCategory;
      });

      filtered.sort((a, b) => {
        try {
          let aValue: any, bValue: any;
          switch (sortBy) {
            case 'popular':
              aValue = (a.views || 0) + (a.downloads || 0) + (a.likes || 0);
              bValue = (b.views || 0) + (b.downloads || 0) + (b.likes || 0);
              break;
            case 'newest':
              aValue = a.publishedAt || 0;
              bValue = b.publishedAt || 0;
              break;
            case 'name':
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
              break;
            default:
              aValue = (a.views || 0) + (a.downloads || 0) + (a.likes || 0);
              bValue = (b.views || 0) + (b.downloads || 0) + (b.likes || 0);
          }
          if (aValue < bValue) return -1;
          if (aValue > bValue) return 1;
          return 0;
        } catch {
          return 0;
        }
      });
      setFilteredBots(filtered);
    } catch (error) {
      console.error('Error filtering bots:', error);
      setFilteredBots([]);
    }
  }, [bots, searchTerm, selectedCategory, sortBy]);

  // Safe bot interaction functions
  const handleBotView = (botId: string) => {
    try {
      const updatedBots = bots.map(bot =>
        bot.id === botId ? { ...bot, views: (bot.views || 0) + 1 } : bot
      );
      setBots(updatedBots);
      saveBotsToStorage(updatedBots);
    } catch (error) {
      console.error('Error updating bot views:', error);
    }
  };

  const handleBotDownload = (botId: string) => {
    try {
      const updatedBots = bots.map(bot =>
        bot.id === botId ? { ...bot, downloads: (bot.downloads || 0) + 1 } : bot
      );
      setBots(updatedBots);
      saveBotsToStorage(updatedBots);
    } catch (error) {
      console.error('Error updating bot downloads:', error);
    }
  };

  const handleBotLike = (botId: string) => {
    try {
      const updatedBots = bots.map(bot =>
        bot.id === botId ? { ...bot, likes: (bot.likes || 0) + 1 } : bot
      );
      setBots(updatedBots);
      saveBotsToStorage(updatedBots);
    } catch (error) {
      console.error('Error updating bot likes:', error);
    }
  };

  const handleBotDelete = (botId: string) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to delete a bot.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updatedBots = bots.filter(bot => bot.id !== botId);
      setBots(updatedBots);
      setFilteredBots(updatedBots);
      saveBotsToStorage(updatedBots);
      
      toast({
        title: 'Bot deleted',
        description: `Bot "${bots.find(bot => bot.id === botId)?.name}" deleted successfully.`,
      });
    } catch (error) {
      console.error('Error deleting bot:', error);
      toast({
        title: 'Delete failed',
        description: 'An error occurred while deleting the bot.',
        variant: 'destructive',
      });
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  // Render empty state
  if (filteredBots.length === 0) {
    return (
      <div className="text-center py-12">
        <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No bots found</h3>
        <p className="text-muted-foreground mb-4">
          {searchTerm || selectedCategory !== 'all'
            ? 'Try adjusting your search or filters'
            : 'Be the first to publish a bot!'
          }
        </p>
        {!searchTerm && selectedCategory === 'all' && (
          <Button onClick={() => router.push('/dashboard/submit-bot')}>
            <Plus className="w-4 h-4 mr-2" />
            Publish Your First Bot
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search bots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Categories</option>
          <option value="Template">Template</option>
          <option value="Basic">Basic</option>
          <option value="Advanced">Advanced</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest</option>
          <option value="name">Name</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBots.map((bot) => (
          <Card key={bot.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              {/* Bot Image */}
              {bot.imageUrl && bot.imageUrl !== 'stored' && (
                <div className="mb-4">
                  <img 
                    src={bot.imageUrl} 
                    alt={bot.name}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{bot.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {bot.description}
                  </p>
                </div>
                {bot.isVerified && (
                  <Badge variant="secondary" className="ml-2">
                    <Star className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {bot.category.slice(0, 2).map((cat) => (
                  <Badge key={cat} variant="outline" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Language</span>
                  <span className="font-medium">{bot.language}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">{bot.version}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Developer</span>
                  <span className="font-medium">{bot.developer.displayName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Published</span>
                  <span className="font-medium">
                    {new Date(bot.publishedAt).toLocaleDateString()}
                  </span>
                </div>
                
                {/* Repository Link */}
                {bot.repoLink && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Repository</span>
                    <a 
                      href={bot.repoLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Github className="w-3 h-3" />
                      View Code
                    </a>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stats</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {bot.views || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {bot.downloads || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {bot.likes || 0}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleBotView(bot.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleBotDownload(bot.id)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBotLike(bot.id)}
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                  
                  {/* Delete Button for Bot Publisher */}
                  {user && bot.developer.email === user.email && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleBotDelete(bot.id)}
                      className="ml-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-center pt-6">
        <Button
          onClick={() => router.push('/dashboard/submit-bot')}
          className="px-8"
        >
          <Plus className="w-4 h-4 mr-2" />
          Publish Your Bot
        </Button>
      </div>
    </div>
  );
}