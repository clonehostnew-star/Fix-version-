export interface MarketplaceBot {
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

const MARKETPLACE_STORAGE_KEY = 'whatsapp-bot-marketplace-simple';

// Simple, crash-proof marketplace functions
export function getPublishedBots(): MarketplaceBot[] {
  try {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(MARKETPLACE_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    
    // Validate each bot
    return parsed.filter(bot => {
      try {
        return bot && 
               typeof bot.id === 'string' && 
               typeof bot.name === 'string' && 
               typeof bot.description === 'string' &&
               Array.isArray(bot.category) &&
               Array.isArray(bot.features) &&
               Array.isArray(bot.tags) &&
               typeof bot.publishedAt === 'number';
      } catch {
        return false;
      }
    });
  } catch (error) {
    console.error('Error getting published bots:', error);
    return [];
  }
}

export function publishBot(botData: Omit<MarketplaceBot, 'id' | 'publishedAt' | 'views' | 'downloads' | 'likes' | 'status'>): MarketplaceBot {
  try {
    const bots = getPublishedBots();
    
    const newBot: MarketplaceBot = {
      ...botData,
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      publishedAt: Date.now(),
      views: 0,
      downloads: 0,
      likes: 0,
      status: 'active'
    };
    
    bots.push(newBot);
    localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(bots));
    
    console.log('Bot published successfully:', newBot);
    return newBot;
  } catch (error) {
    console.error('Error publishing bot:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to publish bot: ${message}`);
  }
}

export function updateBot(botId: string, updates: Partial<MarketplaceBot>): boolean {
  try {
    const bots = getPublishedBots();
    const index = bots.findIndex(bot => bot.id === botId);
    
    if (index >= 0) {
      bots[index] = { ...bots[index], ...updates };
      localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(bots));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating bot:', error);
    return false;
  }
}

export function deleteBot(botId: string): boolean {
  try {
    const bots = getPublishedBots();
    const filtered = bots.filter(bot => bot.id !== botId);
    localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting bot:', error);
    return false;
  }
}

export function getBotById(botId: string): MarketplaceBot | null {
  try {
    const bots = getPublishedBots();
    return bots.find(bot => bot.id === botId) || null;
  } catch (error) {
    console.error('Error getting bot by ID:', error);
    return null;
  }
}

export function incrementBotViews(botId: string): void {
  try {
    const bot = getBotById(botId);
    if (bot) {
      updateBot(botId, { views: bot.views + 1 });
    }
  } catch (error) {
    console.error('Error incrementing bot views:', error);
  }
}

export function incrementBotDownloads(botId: string): void {
  try {
    const bot = getBotById(botId);
    if (bot) {
      updateBot(botId, { downloads: bot.downloads + 1 });
    }
  } catch (error) {
    console.error('Error incrementing bot downloads:', error);
  }
}

export function toggleBotLike(botId: string, userEmail: string): void {
  try {
    const bot = getBotById(botId);
    if (bot) {
      const likedBotsKey = `liked-bots-${userEmail}`;
      const likedBots = JSON.parse(localStorage.getItem(likedBotsKey) || '[]');
      
      if (likedBots.includes(botId)) {
        // Unlike
        const newLikedBots = likedBots.filter((id: string) => id !== botId);
        localStorage.setItem(likedBotsKey, JSON.stringify(newLikedBots));
        updateBot(botId, { likes: Math.max(0, bot.likes - 1) });
      } else {
        // Like
        likedBots.push(botId);
        localStorage.setItem(likedBotsKey, JSON.stringify(likedBots));
        updateBot(botId, { likes: bot.likes + 1 });
      }
    }
  } catch (error) {
    console.error('Error toggling bot like:', error);
  }
}

export function hasUserLikedBot(botId: string, userEmail: string): boolean {
  try {
    const likedBotsKey = `liked-bots-${userEmail}`;
    const likedBots = JSON.parse(localStorage.getItem(likedBotsKey) || '[]');
    return likedBots.includes(botId);
  } catch (error) {
    console.error('Error checking if user liked bot:', error);
    return false;
  }
}

export function getBotsByDeveloper(developerEmail: string): MarketplaceBot[] {
  try {
    const bots = getPublishedBots();
    return bots.filter(bot => bot.developer.email === developerEmail);
  } catch (error) {
    console.error('Error getting bots by developer:', error);
    return [];
  }
}

// Initialize marketplace with sample data
export function initializeMarketplace(): void {
  try {
    if (typeof window === 'undefined') return;
    
    const existingBots = getPublishedBots();
    if (existingBots.length > 0) return; // Already initialized
    
    const sampleBots: MarketplaceBot[] = [
      {
        id: 'sample-bot-1',
        name: 'WhatsApp Bot Template',
        description: 'A basic WhatsApp bot template to get you started with bot development.',
        category: ['Template', 'Basic'],
        language: 'Node.js (JavaScript)',
        version: '1.0.0',
        githubUsername: 'whatsapp-bot-dev',
        repoLink: 'https://github.com/whatsapp-bot-dev/template',
        features: ['Command handling', 'Media processing', 'Admin controls'],
        imageUrl: '',
        zipFileUrl: '',
        tags: ['template', 'basic', 'starter'],
        views: 150,
        downloads: 89,
        likes: 23,
        publishedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        developer: {
          email: 'admin@whatsapp-bot.com',
          displayName: 'WhatsApp Bot Team'
        },
        isVerified: true,
        status: 'active'
      }
    ];
    
    localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(sampleBots));
    console.log('Marketplace initialized with sample data');
  } catch (error) {
    console.error('Error initializing marketplace:', error);
  }
}