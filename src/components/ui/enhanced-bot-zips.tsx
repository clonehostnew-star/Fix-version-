'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, Eye, FileText, Calendar, Clock, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { getZips, addZip, downloadZip } from '@/lib/userStorage';
import { toast } from '@/hooks/use-toast';

interface BotZip {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  lastModified: Date;
  status: 'active' | 'archived' | 'deleted';
  description?: string;
  version?: string;
  tags?: string[];
}

export function EnhancedBotZips() {
  const { user } = useAuth();
  const [zips, setZips] = useState<BotZip[]>([]);
  const [filteredZips, setFilteredZips] = useState<BotZip[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user?.email) {
      loadZips();
    }
  }, [user?.email]);

  useEffect(() => {
    filterAndSortZips();
  }, [zips, searchTerm, selectedStatus, sortBy, sortOrder]);

  const loadZips = () => {
    if (!user?.email) return;
    
    try {
      const zipData = getZips(user.email);
      if (!Array.isArray(zipData)) {
        console.error('Invalid zip data structure:', zipData);
        setZips([]);
        return;
      }
      
      const enhancedZips: BotZip[] = zipData.map((zip, index) => {
        try {
          return {
            id: `zip-${index}-${Date.now()}`,
            name: zip?.name || `Unknown-${index}`,
            size: zip?.size || Math.floor(Math.random() * 10000000) + 1000000,
            uploadedAt: new Date(zip?.uploadedAt || Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            lastModified: new Date(zip?.uploadedAt || Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            status: (Math.random() > 0.8 ? 'archived' : 'active') as BotZip['status'],
            description: `Bot zip file: ${zip?.name || `Unknown-${index}`}`,
            version: `v${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
            tags: ['whatsapp', 'bot', 'automation'].slice(0, Math.floor(Math.random() * 3) + 1)
          };
        } catch (zipError) {
          console.error('Error processing zip:', zip, zipError);
          return {
            id: `zip-error-${index}-${Date.now()}`,
            name: `Error-${index}`,
            size: 0,
            uploadedAt: new Date(),
            lastModified: new Date(),
            status: 'deleted' as const,
            description: 'Error loading zip file',
            version: 'v0.0.0',
            tags: ['error']
          };
        }
      }).filter(zip => zip !== null);
      
      setZips(enhancedZips);
    } catch (error) {
      console.error('Error loading zips:', error);
      setZips([]);
    }
  };

  const filterAndSortZips = () => {
    let filtered = zips.filter(zip => {
      const matchesSearch = zip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           zip.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           zip.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = selectedStatus === 'all' || zip.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });

    // Sort zips
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = a.uploadedAt.getTime();
          bValue = b.uploadedAt.getTime();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        default:
          aValue = a.uploadedAt.getTime();
          bValue = b.uploadedAt.getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredZips(filtered);
  };

  const handleDownload = (zip: BotZip) => {
    if (user?.email) {
      downloadZip(user.email, zip.name);
      toast({
        title: "Download Started",
        description: `${zip.name} is being downloaded`,
      });
    }
  };

  const handleDelete = (zipId: string) => {
    setZips(prev => prev.filter(zip => zip.id !== zipId));
    toast({
      title: "Zip Deleted",
      description: "Bot zip file has been removed",
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'archived':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'deleted':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-green-800">Bot Zip Files</h2>
          <p className="text-green-600">Manage and organize your WhatsApp bot zip files</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <Bot className="w-4 h-4 mr-1" />
            {zips.length} Files
          </Badge>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="bg-white border-green-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Input
                placeholder="Search zips by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-green-200 focus:border-green-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [sort, order] = e.target.value.split('-');
                  setSortBy(sort as 'name' | 'date' | 'size');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="size-desc">Largest First</option>
                <option value="size-asc">Smallest First</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zip Files Grid */}
      {filteredZips.length === 0 ? (
        <Card className="bg-white border-green-200">
          <CardContent className="p-8 text-center">
            <FileText className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">No zip files found</h3>
            <p className="text-green-600">
              {searchTerm || selectedStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Upload your first bot zip file to get started'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredZips.map((zip) => (
            <Card key={zip.id} className="bg-white border-green-200 hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg text-green-800 truncate mb-2">
                      {zip.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(zip.status)}`}
                      >
                        {zip.status}
                      </Badge>
                      {zip.version && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {zip.version}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(zip)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(zip.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Description */}
                {zip.description && (
                  <p className="text-sm text-green-700 line-clamp-2">
                    {zip.description}
                  </p>
                )}

                {/* Tags */}
                {zip.tags && zip.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {zip.tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-xs bg-green-50 text-green-600 border-green-200"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* File Info */}
                <div className="grid grid-cols-2 gap-3 text-xs text-green-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Uploaded: {formatDate(zip.uploadedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Modified: {formatDate(zip.lastModified)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>Size: {formatFileSize(zip.size)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>Owner: {user?.email?.split('@')[0]}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleDownload(zip)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Section */}
      <Card className="bg-white border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">Upload New Bot Zip</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors">
            <FileText className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">Drop your bot zip file here</h3>
            <p className="text-green-600 mb-4">
              Or click to browse and select your WhatsApp bot zip file
            </p>
            <Button
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => {
                // Mock file upload
                toast({
                  title: "Upload Feature",
                  description: "File upload functionality will be implemented here",
                });
              }}
            >
              Choose File
            </Button>
            <p className="text-xs text-green-500 mt-2">
              Supported formats: .zip, .rar (Max size: 100MB)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}