'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain, 
  Lightbulb, 
  Zap, 
  TrendingUp, 
  Target, 
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Users,
  BarChart3,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AISuggestion {
  id: string;
  type: 'feature' | 'optimization' | 'integration' | 'monetization';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  estimatedRevenue?: string;
  tags: string[];
  priority: number;
}

const mockAISuggestions: AISuggestion[] = [
  {
    id: '1',
    type: 'feature',
    title: 'Multi-language Support',
    description: 'Add support for Spanish, French, and German to reach a wider audience. This could increase your user base by 40%.',
    impact: 'high',
    effort: 'medium',
    estimatedTime: '2-3 weeks',
    estimatedRevenue: '+$500/month',
    tags: ['internationalization', 'user-experience', 'growth'],
    priority: 1
  },
  {
    id: '2',
    type: 'optimization',
    title: 'Smart Response Caching',
    description: 'Implement intelligent caching for common queries to reduce response time by 60% and improve user satisfaction.',
    impact: 'high',
    effort: 'easy',
    estimatedTime: '1 week',
    tags: ['performance', 'caching', 'user-experience'],
    priority: 2
  },
  {
    id: '3',
    type: 'integration',
    title: 'CRM Integration',
    description: 'Connect with popular CRM systems like Salesforce and HubSpot to automate lead management and follow-ups.',
    impact: 'medium',
    effort: 'hard',
    estimatedTime: '4-6 weeks',
    estimatedRevenue: '+$300/month',
    tags: ['automation', 'business', 'integration'],
    priority: 3
  },
  {
    id: '4',
    type: 'monetization',
    title: 'Premium Subscription Tiers',
    description: 'Introduce premium features like advanced analytics, priority support, and custom integrations.',
    impact: 'high',
    effort: 'medium',
    estimatedTime: '3-4 weeks',
    estimatedRevenue: '+$1000/month',
    tags: ['monetization', 'business-model', 'premium'],
    priority: 4
  },
  {
    id: '5',
    type: 'feature',
    title: 'Voice Message Support',
    description: 'Add support for voice messages to make interactions more natural and accessible.',
    impact: 'medium',
    effort: 'hard',
    estimatedTime: '5-6 weeks',
    estimatedRevenue: '+$200/month',
    tags: ['accessibility', 'user-experience', 'innovation'],
    priority: 5
  }
];

export function AIBotSuggestions() {
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>(mockAISuggestions);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null);
  const { toast } = useToast();

  const handleGenerateSuggestions = async () => {
    if (!userInput.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please describe your bot or what you\'re looking for.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate new suggestions based on input
    const newSuggestions = mockAISuggestions.map(suggestion => ({
      ...suggestion,
      priority: Math.floor(Math.random() * 5) + 1
    })).sort((a, b) => a.priority - b.priority);
    
    setSuggestions(newSuggestions);
    setIsGenerating(false);
    
    toast({
      title: 'Suggestions Generated!',
      description: 'AI has analyzed your bot and provided personalized recommendations.',
    });
  };

  const handleImplementSuggestion = (suggestion: AISuggestion) => {
    toast({
      title: 'Implementation Started',
      description: `Starting to implement: ${suggestion.title}`,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'feature': return <Sparkles className="h-4 w-4" />;
      case 'optimization': return <Zap className="h-4 w-4" />;
      case 'integration': return <MessageSquare className="h-4 w-4" />;
      case 'monetization': return <TrendingUp className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feature': return 'bg-blue-100 text-blue-800';
      case 'optimization': return 'bg-green-100 text-green-800';
      case 'integration': return 'bg-purple-100 text-purple-800';
      case 'monetization': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">AI Bot Suggestions</h2>
        <p className="text-muted-foreground text-lg">
          Get intelligent recommendations powered by AI to improve your bot
        </p>
      </div>

      {/* AI Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Describe Your Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Tell us about your bot, what it does, your target audience, or what improvements you're looking for..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              AI will analyze your input and provide personalized suggestions
            </p>
            <Button 
              onClick={handleGenerateSuggestions} 
              disabled={isGenerating || !userInput.trim()}
              className="min-w-[140px]"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">AI Recommendations</h3>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            <Sparkles className="h-3 w-3 mr-1" />
            Powered by AI
          </Badge>
        </div>

        <div className="grid gap-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-2 rounded-full ${getTypeColor(suggestion.type)}`}>
                        {getTypeIcon(suggestion.type)}
                      </div>
                      <h4 className="text-lg font-semibold">{suggestion.title}</h4>
                      <Badge variant="outline" className={getImpactColor(suggestion.impact)}>
                        {suggestion.impact} impact
                      </Badge>
                      <Badge variant="outline" className={getEffortColor(suggestion.effort)}>
                        {suggestion.effort}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground mb-4">{suggestion.description}</p>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {suggestion.estimatedTime}
                      </div>
                      {suggestion.estimatedRevenue && (
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                          <TrendingUp className="h-4 w-4" />
                          {suggestion.estimatedRevenue}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="h-4 w-4" />
                        Priority: {suggestion.priority}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {suggestion.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSuggestion(suggestion)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleImplementSuggestion(suggestion)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Implement
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Suggestion Details Modal */}
      {selectedSuggestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">{selectedSuggestion.title}</h3>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedSuggestion(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedSuggestion.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Impact</h4>
                    <Badge className={getImpactColor(selectedSuggestion.impact)}>
                      {selectedSuggestion.impact}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Effort Required</h4>
                    <Badge className={getEffortColor(selectedSuggestion.effort)}>
                      {selectedSuggestion.effort}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Estimated Time</h4>
                    <p className="text-muted-foreground">{selectedSuggestion.estimatedTime}</p>
                  </div>
                  {selectedSuggestion.estimatedRevenue && (
                    <div>
                      <h4 className="font-medium mb-2">Estimated Revenue</h4>
                      <p className="text-green-600 font-medium">{selectedSuggestion.estimatedRevenue}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSuggestion.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setSelectedSuggestion(null)}
                  >
                    Close
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      handleImplementSuggestion(selectedSuggestion);
                      setSelectedSuggestion(null);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Start Implementation
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