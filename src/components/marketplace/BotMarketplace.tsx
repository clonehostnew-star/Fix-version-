'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  Heart, 
  Share2, 
  Eye,
  Bot,
  Users,
  Zap,
  TrendingUp,
  Clock,
  Code,
  X,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarketplaceBot {
  id: string;
  name: string;
  description: string;
  author: string;
  authorAvatar: string;
  category: string;
  tags: string[];
  rating: number;
  downloads: number;
  likes: number;
  price: number; // 0 for free
  lastUpdated: string;
  version: string;
  features: string[];
  image: string;
  codeSnippet: string;
  requirements: string[];
}

const mockMarketplaceBots: MarketplaceBot[] = [
  {
    id: '1',
    name: 'AI Chat Assistant Pro',
    description: 'Advanced AI-powered chatbot with natural language processing, sentiment analysis, and multi-language support.',
    author: 'BotMaster2024',
    authorAvatar: 'https://files.catbox.moe/j1vit2.jpg',
    category: 'AI & ML',
    tags: ['ai', 'chatbot', 'nlp', 'multilingual'],
    rating: 4.8,
    downloads: 1247,
    likes: 89,
    price: 0,
    lastUpdated: '2 days ago',
    version: '2.1.0',
    features: ['Natural Language Processing', 'Sentiment Analysis', 'Multi-language Support', 'Context Awareness'],
    image: 'https://files.catbox.moe/iytl8p.jpg',
    codeSnippet: `// AI Chat Assistant
client.on('message', async (message) => {
  const response = await aiChat(message.body);
  message.reply(response);
});`,
    requirements: ['Node.js 18+', 'OpenAI API Key', 'Database']
  },
  {
    id: '2',
    name: 'E-commerce Order Manager',
    description: 'Complete order management system for online stores with inventory tracking and customer support.',
    author: 'ShopBotDev',
    authorAvatar: 'https://files.catbox.moe/961jvj.jpg',
    category: 'E-commerce',
    tags: ['ecommerce', 'orders', 'inventory', 'support'],
    rating: 4.6,
    downloads: 892,
    likes: 67,
    price: 25,
    lastUpdated: '1 week ago',
    version: '1.5.2',
    features: ['Order Processing', 'Inventory Management', 'Customer Support', 'Payment Integration'],
    image: 'https://files.catbox.moe/6l7n1t.jpg',
    codeSnippet: `// Order Manager
client.on('message', async (message) => {
  if (message.body.includes('order')) {
    const order = await processOrder(message);
    message.reply(order);
  }
});`,
    requirements: ['Node.js 16+', 'Stripe API', 'MongoDB']
  },
  {
    id: '3',
    name: 'Gaming Community Bot',
    description: 'Interactive gaming bot with mini-games, leaderboards, and community features for gaming groups.',
    author: 'GameBotCreator',
    authorAvatar: 'https://files.catbox.moe/qig05s.jpg',
    category: 'Gaming',
    tags: ['gaming', 'community', 'leaderboards', 'minigames'],
    rating: 4.9,
    downloads: 2156,
    likes: 156,
    price: 0,
    lastUpdated: '3 days ago',
    version: '3.0.1',
    features: ['Mini-games', 'Leaderboards', 'Community Management', 'Game Statistics'],
    image: 'https://files.catbox.moe/j1vit2.jpg',
    codeSnippet: `// Gaming Bot
client.on('message', async (message) => {
  if (message.body === '!play') {
    const game = await startMiniGame(message.from);
    message.reply(game);
  }
});`,
    requirements: ['Node.js 18+', 'Redis', 'Game Logic Engine']
  },
  {
    id: '4',
    name: 'Educational Quiz Master',
    description: 'Comprehensive quiz bot with customizable questions, progress tracking, and learning analytics.',
    author: 'EduBotPro',
    authorAvatar: 'https://files.catbox.moe/iytl8p.jpg',
    category: 'Education',
    tags: ['education', 'quiz', 'learning', 'analytics'],
    rating: 4.7,
    downloads: 743,
    likes: 52,
    price: 15,
    lastUpdated: '5 days ago',
    version: '2.0.3',
    features: ['Custom Quizzes', 'Progress Tracking', 'Learning Analytics', 'Multiple Subjects'],
    image: 'https://files.catbox.moe/961jvj.jpg',
    codeSnippet: `// Quiz Bot
client.on('message', async (message) => {
  if (message.body.startsWith('!quiz')) {
    const quiz = await generateQuiz(message.body);
    message.reply(quiz);
  }
});`,
    requirements: ['Node.js 16+', 'PostgreSQL', 'Quiz Database']
  },
  {
    id: '5',
    name: 'Health & Wellness Coach',
    description: 'Personal health assistant with workout plans, nutrition tips, and wellness tracking.',
    author: 'HealthBotExpert',
    authorAvatar: 'https://files.catbox.moe/6l7n1t.jpg',
    category: 'Health',
    tags: ['health', 'wellness', 'fitness', 'nutrition'],
    rating: 4.5,
    downloads: 456,
    likes: 34,
    price: 30,
    lastUpdated: '1 week ago',
    version: '1.8.0',
    features: ['Workout Plans', 'Nutrition Tips', 'Wellness Tracking', 'Goal Setting'],
    image: 'https://files.catbox.moe/qig05s.jpg',
    codeSnippet: `// Health Bot
client.on('message', async (message) => {
  if (message.body.includes('workout')) {
    const plan = await generateWorkoutPlan(message.from);
    message.reply(plan);
  }
});`,
    requirements: ['Node.js 18+', 'Health APIs', 'User Database']
  }
];

export function BotMarketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating' | 'price'>('popular');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [selectedBot, setSelectedBot] = useState<MarketplaceBot | null>(null);
  const { toast } = useToast();

  const categories = [
    { id: 'all', name: 'All Categories', icon: <Bot className="h-4 w-4" /> },
    { id: 'AI & ML', name: 'AI & ML', icon: <Zap className="h-4 w-4" /> },
    { id: 'E-commerce', name: 'E-commerce', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'Gaming', name: 'Gaming', icon: <Users className="h-4 w-4" /> },
    { id: 'Education', name: 'Education', icon: <Code className="h-4 w-4" /> },
    { id: 'Health', name: 'Health', icon: <Heart className="h-4 w-4" /> }
  ];

  const filteredBots = mockMarketplaceBots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bot.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || bot.category === selectedCategory;
    const matchesPrice = priceFilter === 'all' || 
                        (priceFilter === 'free' && bot.price === 0) ||
                        (priceFilter === 'paid' && bot.price > 0);
    return matchesSearch && matchesCategory && matchesPrice;
  });

  const sortedBots = [...filteredBots].sort((a, b) => {
    switch (sortBy) {
      case 'popular': return b.downloads - a.downloads;
      case 'newest': return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      case 'rating': return b.rating - a.rating;
      case 'price': return a.price - b.price;
      default: return 0;
    }
  });

  const handleDownload = (bot: MarketplaceBot) => {
    if (bot.price > 0) {
      toast({
        title: 'Premium Bot',
        description: `This bot costs ${bot.price} coins. Please purchase to download.`,
        variant: 'default'
      });
    } else {
      toast({
        title: 'Download Started',
        description: `Downloading ${bot.name}...`,
        variant: 'default'
      });
      // Here you would implement the actual download logic
    }
  };

  const handleLike = (bot: MarketplaceBot) => {
    toast({
      title: 'Liked!',
      description: `You liked ${bot.name}`,
      variant: 'default'
    });
  };

  const handleShare = (bot: MarketplaceBot) => {
    navigator.clipboard.writeText(`Check out this amazing bot: ${bot.name} - ${bot.description}`);
    toast({
      title: 'Link Copied!',
      description: 'Bot link copied to clipboard',
      variant: 'default'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Bot Marketplace</h2>
        <p className="text-muted-foreground text-lg">
          Discover, share, and download amazing bot configurations from our community
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share Bot
            </Button>
          </div>
        </div>

        {/* Category and Sort Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap"
              >
                {category.icon}
                <span className="ml-2">{category.name}</span>
              </Button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-lg bg-background text-sm"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="rating">Highest Rated</option>
              <option value="price">Price: Low to High</option>
            </select>
            
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-lg bg-background text-sm"
            >
              <option value="all">All Prices</option>
              <option value="free">Free Only</option>
              <option value="paid">Paid Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bots Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedBots.map((bot) => (
          <Card key={bot.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                <img 
                  src={bot.image} 
                  alt={bot.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{bot.name}</CardTitle>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{bot.rating}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{bot.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Author and Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img 
                    src={bot.authorAvatar} 
                    alt={bot.author}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm font-medium">{bot.author}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Download className="h-4 w-4" />
                  {bot.downloads.toLocaleString()}
                </div>
              </div>

              {/* Tags and Category */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {bot.category}
                </Badge>
                {bot.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>

              {/* Features */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Key Features:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {bot.features.slice(0, 2).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-primary" />
                      {feature}
                    </li>
                  ))}
                  {bot.features.length > 2 && (
                    <li className="text-xs text-muted-foreground">
                      +{bot.features.length - 2} more features
                    </li>
                  )}
                </ul>
              </div>

              {/* Price and Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    {bot.price === 0 ? 'Free' : `${bot.price} Coins`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    v{bot.version}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBot(bot)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLike(bot)}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(bot)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {bot.price === 0 ? 'Download' : 'Buy'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bot Details Modal */}
      {selectedBot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">{selectedBot.name}</h3>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedBot(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <img 
                    src={selectedBot.image} 
                    alt={selectedBot.name}
                    className="w-full rounded-lg mb-4"
                  />
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground">{selectedBot.description}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Features</h4>
                      <ul className="space-y-1">
                        {selectedBot.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Code Preview</h4>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{selectedBot.codeSnippet}</code>
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Requirements</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedBot.requirements.map((req, index) => (
                        <Badge key={index} variant="secondary">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1" 
                      onClick={() => handleShare(selectedBot)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button 
                      className="flex-1" 
                      size="lg"
                      onClick={() => handleDownload(selectedBot)}
                    >
                      <Download className="h-5 w-5 mr-2" />
                      {selectedBot.price === 0 ? 'Download Free' : `Buy for ${selectedBot.price} Coins`}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}