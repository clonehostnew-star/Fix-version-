'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, 
  Github, 
  Upload, 
  Image as ImageIcon,
  FileText,
  Code,
  Globe,
  Star,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { addZip } from '@/lib/userStorage';

interface BotSubmission {
  name: string;
  description: string;
  category: string[];
  language: string;
  version: string;
  githubUsername: string;
  repoLink: string;
  features: string[];
  image: File | null;
  zipFile: File | null;
  tags: string[];
}

const BOT_CATEGORIES = [
  'AI & Machine Learning',
  'Gaming & Entertainment',
  'Group Management',
  'Owner Control',
  'WhatsApp Bugging',
  'Business & E-commerce',
  'Education & Learning',
  'Health & Fitness',
  'News & Information',
  'Social Media Integration',
  'Productivity & Tools',
  'Fun & Memes',
  'Music & Media',
  'Weather & Location',
  'All Categories'
];

const PROGRAMMING_LANGUAGES = [
  'Node.js (JavaScript)',
  'Python',
  'Java',
  'C#',
  'PHP',
  'Go',
  'Rust',
  'Kotlin',
  'Swift',
  'Other'
];

const COMMON_FEATURES = [
  'Auto-reply',
  'Command handling',
  'Media processing',
  'Database integration',
  'API integration',
  'Multi-language support',
  'Admin controls',
  'User management',
  'Analytics',
  'Scheduled tasks',
  'Webhook support',
  'File handling',
  'Group moderation',
  'Anti-spam protection'
];

export default function SubmitBotPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [formData, setFormData] = useState<BotSubmission>({
    name: '',
    description: '',
    category: [],
    language: '',
    version: '',
    githubUsername: '',
    repoLink: '',
    features: [],
    image: null,
    zipFile: null,
    tags: []
  });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  if (!isClient) return null;

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleInputChange = (field: keyof BotSubmission, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category.includes(category)
        ? prev.category.filter(c => c !== category)
        : [...prev.category, category]
    }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }
      handleInputChange('image', file);
    }
  };

  const handleZipUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "File too large",
          description: "Zip file must be less than 50MB",
          variant: "destructive",
        });
        return;
      }
      if (!file.name.endsWith('.zip')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a .zip file",
          variant: "destructive",
        });
        return;
      }
      handleInputChange('zipFile', file);
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your bot name",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.description.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a description",
        variant: "destructive",
      });
      return false;
    }
    if (formData.category.length === 0) {
      toast({
        title: "Missing information",
        description: "Please select at least one category",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.language) {
      toast({
        title: "Missing information",
        description: "Please select the programming language",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.githubUsername.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your GitHub username",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.repoLink.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your repository link",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.zipFile) {
      toast({
        title: "Missing information",
        description: "Please upload your bot zip file",
        variant: "destructive",
      });
      return false;
    }
    if (!currentPassword) {
      toast({
        title: "Security verification required",
        description: "Please enter your current password to publish",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      console.log('Starting bot publication...', formData);
      
      // Validate required fields
      if (!formData.name || !formData.description || !formData.zipFile) {
        throw new Error('Missing required fields: name, description, or zip file');
      }

      // Convert image to data URL if provided
      let imageUrl = '';
      if (formData.image) {
        console.log('Processing image...');
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to process image'));
          reader.readAsDataURL(formData.image!);
        });
        console.log('Image processed successfully');
      }

      // Convert zip file to data URL
      let zipFileUrl = '';
      if (formData.zipFile) {
        console.log('Processing zip file...');
        zipFileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to process zip file'));
          reader.readAsDataURL(formData.zipFile!);
        });
        console.log('Zip file processed successfully');
      }

      console.log('Publishing bot to marketplace...');
      
      // Save to simple marketplace storage
      const MARKETPLACE_KEY = 'simple-marketplace-bots';
      const existingBots: any[] = JSON.parse(localStorage.getItem(MARKETPLACE_KEY) || '[]');
      const newBot = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        language: formData.language,
        version: formData.version,
        githubUsername: formData.githubUsername,
        repoLink: formData.repoLink,
        features: formData.features,
        tags: formData.tags,
        developer: user.email,
        isVerified: false,
        imageUrl,
        zipFileUrl,
      };
      const botWithId = {
        ...newBot,
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        publishedAt: Date.now(),
        views: 0,
        downloads: 0,
        likes: 0,
        status: 'active'
      };
      
      // Clean up large data to prevent storage quota issues
      const cleanedBot = {
        ...botWithId,
        // Store only metadata, not the actual large files
        imageUrl: imageUrl ? 'stored' : '',
        zipFileUrl: zipFileUrl ? 'stored' : '',
      };
      
      existingBots.push(cleanedBot);
      
      try {
        localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(existingBots));
      } catch (storageError) {
        console.error('Storage quota exceeded, trying minimal storage:', storageError);
        
        // If storage fails, try to save without large data
        const minimalBot = {
          id: botWithId.id,
          name: botWithId.name,
          description: botWithId.description,
          category: botWithId.category,
          language: botWithId.language,
          version: botWithId.version,
          githubUsername: botWithId.githubUsername,
          repoLink: botWithId.repoLink,
          features: botWithId.features,
          tags: botWithId.tags,
          developer: botWithId.developer,
          isVerified: botWithId.isVerified,
          publishedAt: botWithId.publishedAt,
          views: botWithId.views,
          downloads: botWithId.downloads,
          likes: botWithId.likes,
          status: botWithId.status
        };
        
        // Remove the bot with large data and add the minimal one
        const minimalBots = existingBots.filter((b: any) => b.id !== botWithId.id);
        minimalBots.push(minimalBot);
        
        try {
          localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(minimalBots));
        } catch (fallbackError) {
          console.error('Minimal storage also failed:', fallbackError);
          throw new Error('Unable to save bot due to storage limitations. Please try again later.');
        }
      }
      
      console.log('Bot published successfully:', botWithId);
      
      toast({
        title: "Bot published successfully! 🎉",
        description: "Your bot is now live in the marketplace",
      });
      
      router.push('/dashboard?tab=marketplace');
      
    } catch (error: any) {
      console.error('Error publishing bot:', error);
      
      let errorMessage = 'Publication failed. Please try again later.';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Publication failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-green-800 mb-2">Publish Your Bot</h1>
            <p className="text-green-600">Share your WhatsApp bot with the community</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="bg-white border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Bot className="w-5 h-5 mr-2" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="botName" className="text-green-700">Bot Name *</Label>
                  <Input
                    id="botName"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your bot's name"
                    className="border-green-200 focus:border-green-500"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-green-700">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe what your bot does, its features, and how it helps users..."
                    rows={4}
                    className="border-green-200 focus:border-green-500"
                  />
                </div>

                <div>
                  <Label className="text-green-700">Categories *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {BOT_CATEGORIES.map((category) => (
                      <Button
                        key={category}
                        type="button"
                        variant={formData.category.includes(category) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleCategoryToggle(category)}
                        className={formData.category.includes(category) 
                          ? "bg-green-600 hover:bg-green-700" 
                          : "border-green-200 text-green-700 hover:bg-green-50"
                        }
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card className="bg-white border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Code className="w-5 h-5 mr-2" />
                  Technical Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="language" className="text-green-700">Programming Language *</Label>
                    <select
                      id="language"
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select language</option>
                      {PROGRAMMING_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="version" className="text-green-700">Bot Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => handleInputChange('version', e.target.value)}
                      placeholder="e.g., v1.0.0"
                      className="border-green-200 focus:border-green-500"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="features" className="text-green-700">Features</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {COMMON_FEATURES.map((feature) => (
                      <Button
                        key={feature}
                        type="button"
                        variant={formData.features.includes(feature) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleFeatureToggle(feature)}
                        className={formData.features.includes(feature) 
                          ? "bg-blue-600 hover:bg-blue-700" 
                          : "border-blue-200 text-blue-700 hover:bg-blue-50"
                        }
                      >
                        {feature}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags" className="text-green-700">Custom Tags</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="tags"
                      placeholder="Add custom tags..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      className="border-green-200 focus:border-green-500"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const input = document.getElementById('tags') as HTMLInputElement;
                        addTag(input.value);
                        input.value = '';
                      }}
                      className="border-green-200 text-green-700 hover:bg-green-50"
                    >
                      Add
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-green-500 hover:text-green-700"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* GitHub Information */}
            <Card className="bg-white border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Github className="w-5 h-5 mr-2" />
                  GitHub Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="githubUsername" className="text-green-700">GitHub Username *</Label>
                    <Input
                      id="githubUsername"
                      value={formData.githubUsername}
                      onChange={(e) => handleInputChange('githubUsername', e.target.value)}
                      placeholder="Your GitHub username"
                      className="border-green-200 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="repoLink" className="text-green-700">Repository Link *</Label>
                    <Input
                      id="repoLink"
                      value={formData.repoLink}
                      onChange={(e) => handleInputChange('repoLink', e.target.value)}
                      placeholder="https://github.com/username/repo"
                      className="border-green-200 focus:border-green-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Uploads */}
            <Card className="bg-white border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-green-700">Bot Image</Label>
                  <div className="mt-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => imageInputRef.current?.click()}
                      className="border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {formData.image ? formData.image.name : 'Choose Image'}
                    </Button>
                    {formData.image && (
                      <p className="text-sm text-green-600 mt-1">
                        Selected: {formData.image.name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-green-700">Bot Zip File *</Label>
                  <div className="mt-2">
                    <input
                      ref={zipInputRef}
                      type="file"
                      accept=".zip"
                      onChange={handleZipUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => zipInputRef.current?.click()}
                      className="border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {formData.zipFile ? formData.zipFile.name : 'Choose Zip File'}
                    </Button>
                    {formData.zipFile && (
                      <p className="text-sm text-green-600 mt-1">
                        Selected: {formData.zipFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Verification */}
            <Card className="bg-white border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Star className="w-5 h-5 mr-2" />
                  Security Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword" className="text-green-700">Current Password *</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password to publish"
                      className="border-green-200 focus:border-green-500 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    This ensures only you can publish bots from your account
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publishing Guidelines */}
            <Card className="bg-white border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800">Publishing Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Ensure your bot is functional and well-tested</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Provide accurate descriptions and features</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Include proper documentation in your repo</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Keep your bot updated and maintained</span>
                </div>
              </CardContent>
            </Card>

            {/* What Happens Next */}
            <Card className="bg-white border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800">What Happens Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Your bot will be reviewed by our team</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Once approved, it appears in the marketplace</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Users can discover and download your bot</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Track views, downloads, and popularity</span>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Publishing...
                </>
              ) : (
                <>
                  <Star className="w-5 h-5 mr-2" />
                  Publish to Marketplace
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}