'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  MessageSquare, 
  ShoppingCart, 
  Gamepad2, 
  BookOpen, 
  Heart,
  Star,
  Download,
  Eye,
  Zap,
  Users,
  Shield,
  Clock,
  X,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BotTemplate {
  id: string;
  name: string;
  description: string;
  category: 'customer-support' | 'e-commerce' | 'entertainment' | 'education' | 'healthcare';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  features: string[];
  estimatedTime: string;
  popularity: number;
  image: string;
  codePreview: string;
  requirements: string[];
  tags: string[];
}

const botTemplates: BotTemplate[] = [
  {
    id: 'customer-support-bot',
    name: 'Customer Support Bot',
    description: 'Automated customer service bot with ticket management, FAQ responses, and human handoff capabilities.',
    category: 'customer-support',
    difficulty: 'beginner',
    features: [
      'Auto-response to common questions',
      'Ticket creation and tracking',
      'Human agent handoff',
      'Multi-language support',
      'Analytics dashboard'
    ],
    estimatedTime: '15-30 minutes',
    popularity: 95,
    image: 'https://files.catbox.moe/j1vit2.jpg',
    codePreview: `client.on('message', async (message) => {
  const response = await handleCustomerQuery(message.body);
  message.reply(response);
});`,
    requirements: ['Node.js', 'WhatsApp Business API', 'Database'],
    tags: ['support', 'automation', 'customer-service']
  },
  {
    id: 'ecommerce-bot',
    name: 'E-commerce Assistant',
    description: 'Shopping bot that helps customers browse products, place orders, and track deliveries.',
    category: 'e-commerce',
    difficulty: 'intermediate',
    features: [
      'Product catalog browsing',
      'Shopping cart management',
      'Order tracking',
      'Payment integration',
      'Inventory updates'
    ],
    estimatedTime: '45-60 minutes',
    popularity: 88,
    image: 'https://files.catbox.moe/iytl8p.jpg',
    codePreview: `client.on('message', async (message) => {
  if (message.body.includes('product')) {
    const products = await searchProducts(message.body);
    message.reply(formatProductList(products));
  }
});`,
    requirements: ['Node.js', 'E-commerce API', 'Payment gateway', 'Database'],
    tags: ['shopping', 'ecommerce', 'retail']
  },
  {
    id: 'entertainment-bot',
    name: 'Entertainment Bot',
    description: 'Fun bot with games, jokes, music recommendations, and interactive entertainment features.',
    category: 'entertainment',
    difficulty: 'beginner',
    features: [
      'Mini-games (quiz, trivia)',
      'Joke generator',
      'Music recommendations',
      'Meme sharing',
      'Group activities'
    ],
    estimatedTime: '20-40 minutes',
    popularity: 92,
    image: 'https://files.catbox.moe/961jvj.jpg',
    codePreview: `client.on('message', async (message) => {
  if (message.body === '!joke') {
    const joke = await getRandomJoke();
    message.reply(joke);
  }
});`,
    requirements: ['Node.js', 'Entertainment APIs', 'Basic game logic'],
    tags: ['fun', 'games', 'entertainment']
  },
  {
    id: 'education-bot',
    name: 'Learning Assistant',
    description: 'Educational bot that provides study materials, quizzes, and learning progress tracking.',
    category: 'education',
    difficulty: 'intermediate',
    features: [
      'Study material delivery',
      'Interactive quizzes',
      'Progress tracking',
      'Homework reminders',
      'Subject-specific help'
    ],
    estimatedTime: '60-90 minutes',
    popularity: 78,
    image: 'https://files.catbox.moe/6l7n1t.jpg',
    codePreview: `client.on('message', async (message) => {
  if (message.body.startsWith('!quiz')) {
    const quiz = await generateQuiz(message.body);
    message.reply(quiz);
  }
});`,
    requirements: ['Node.js', 'Educational content', 'Database', 'Quiz engine'],
    tags: ['education', 'learning', 'study']
  },
  {
    id: 'healthcare-bot',
    name: 'Health Assistant',
    description: 'Healthcare bot for appointment scheduling, symptom checking, and health information.',
    category: 'healthcare',
    difficulty: 'advanced',
    features: [
      'Appointment scheduling',
      'Symptom checker',
      'Health tips',
      'Medication reminders',
      'Emergency contacts'
    ],
    estimatedTime: '90-120 minutes',
    popularity: 82,
    image: 'https://files.catbox.moe/qig05s.jpg',
    codePreview: `client.on('message', async (message) => {
  if (message.body.includes('symptom')) {
    const assessment = await assessSymptoms(message.body);
    message.reply(assessment);
  }
});`,
    requirements: ['Node.js', 'Healthcare APIs', 'Security compliance', 'Database'],
    tags: ['health', 'medical', 'wellness']
  }
];

export function BotTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const categories = [
    { id: 'all', name: 'All Templates', icon: <Bot className="h-4 w-4" /> },
    { id: 'customer-support', name: 'Customer Support', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'e-commerce', name: 'E-commerce', icon: <ShoppingCart className="h-4 w-4" /> },
    { id: 'entertainment', name: 'Entertainment', icon: <Gamepad2 className="h-4 w-4" /> },
    { id: 'education', name: 'Education', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'healthcare', name: 'Healthcare', icon: <Heart className="h-4 w-4" /> }
  ];

  const filteredTemplates = botTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'customer-support': return 'bg-blue-100 text-blue-800';
      case 'e-commerce': return 'bg-green-100 text-green-800';
      case 'entertainment': return 'bg-purple-100 text-purple-800';
      case 'education': return 'bg-orange-100 text-orange-800';
      case 'healthcare': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUseTemplate = (template: BotTemplate) => {
    toast({
      title: 'Template Selected!',
      description: `Starting with ${template.name} template. Redirecting to server creation...`,
    });
    // Here you would redirect to server creation with template pre-filled
    console.log('Using template:', template);
  };

  const handlePreviewTemplate = (template: BotTemplate) => {
    setSelectedTemplate(template);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Bot Templates</h2>
        <p className="text-muted-foreground text-lg">
          Choose from our pre-built templates to get started quickly
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-background"
          />
        </div>
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
      </div>

      {/* Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                <img 
                  src={template.image} 
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{template.popularity}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tags and Difficulty */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={getCategoryColor(template.category)}>
                  {template.category.replace('-', ' ')}
                </Badge>
                <Badge variant="outline" className={getDifficultyColor(template.difficulty)}>
                  {template.difficulty}
                </Badge>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {template.estimatedTime}
                </Badge>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Key Features:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {template.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-primary" />
                      {feature}
                    </li>
                  ))}
                  {template.features.length > 3 && (
                    <li className="text-xs text-muted-foreground">
                      +{template.features.length - 3} more features
                    </li>
                  )}
                </ul>
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Requirements:</h4>
                <div className="flex flex-wrap gap-1">
                  {template.requirements.map((req, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {req}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePreviewTemplate(template)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUseTemplate(template)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">{selectedTemplate.name}</h3>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedTemplate(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <img 
                    src={selectedTemplate.image} 
                    alt={selectedTemplate.name}
                    className="w-full rounded-lg mb-4"
                  />
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground">{selectedTemplate.description}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Features</h4>
                      <ul className="space-y-1">
                        {selectedTemplate.features.map((feature, index) => (
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
                      <code>{selectedTemplate.codePreview}</code>
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Requirements</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.requirements.map((req, index) => (
                        <Badge key={index} variant="secondary">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => handleUseTemplate(selectedTemplate)}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Use This Template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}