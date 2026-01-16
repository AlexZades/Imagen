"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, TrendingUp, Hash, Image as ImageIcon, Download, AlertCircle, RefreshCw } from 'lucide-react';

interface SimpleTag {
  tag: string;
  count: number;
}

export function SimpleTagsViewer() {
  const [simpleTags, setSimpleTags] = useState<SimpleTag[]>([]);
  const [filteredTags, setFilteredTags] = useState<SimpleTag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalImages, setTotalImages] = useState(0);
  const [totalUniqueTags, setTotalUniqueTags] = useState(0);

  useEffect(() => {
    fetchSimpleTags();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = simpleTags.filter((tag) =>
        tag.tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTags(filtered);
    } else {
      setFilteredTags(simpleTags);
    }
  }, [searchQuery, simpleTags]);

  const fetchSimpleTags = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching simple tags from /api/simple-tags...');
      const response = await fetch('/api/simple-tags');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to load simple tags: ${response.status}`);
      }

      const data = await response.json();
      console.log('Simple tags data:', data);

      setSimpleTags(data.simpleTags || []);
      setFilteredTags(data.simpleTags || []);
      setTotalImages(data.totalImages || 0);
      setTotalUniqueTags(data.totalUniqueTags || 0);
      
      if (data.simpleTags && data.simpleTags.length > 0) {
        toast.success(`Loaded ${data.simpleTags.length} tags`);
      }
    } catch (error: any) {
      console.error('Error fetching simple tags:', error);
      setError(error.message || 'Failed to load simple tags');
      toast.error('Failed to load simple tags');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (filteredTags.length === 0) {
      toast.error('No tags to export');
      return;
    }

    const csvContent = [
      ['Tag', 'Count', 'Percentage'],
      ...filteredTags.map((tag) => [
        tag.tag,
        tag.count.toString(),
        ((tag.count / totalImages) * 100).toFixed(2) + '%',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simple-tags-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const getPopularityBadge = (count: number) => {
    if (totalImages === 0) return <Badge variant="outline">N/A</Badge>;
    
    const percentage = (count / totalImages) * 100;
    if (percentage >= 50) return <Badge variant="default">Very Popular</Badge>;
    if (percentage >= 25) return <Badge variant="secondary">Popular</Badge>;
    if (percentage >= 10) return <Badge variant="outline">Common</Badge>;
    return <Badge variant="outline">Rare</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading simple tags...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center gap-3 text-destructive mb-4">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">Error loading simple tags</p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchSimpleTags} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Simple Tags Analytics</CardTitle>
            <CardDescription>
              View and analyze all simple tags used across images (parsed from promptTags)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={fetchSimpleTags} 
              variant="outline" 
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={exportToCSV} 
              variant="outline" 
              size="sm"
              disabled={filteredTags.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Unique Tags</span>
            </div>
            <div className="text-2xl font-bold">{totalUniqueTags.toLocaleString()}</div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Total Images</span>
            </div>
            <div className="text-2xl font-bold">{totalImages.toLocaleString()}</div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Avg Tags/Image</span>
            </div>
            <div className="text-2xl font-bold">
              {totalImages > 0
                ? (
                    simpleTags.reduce((sum, tag) => sum + tag.count, 0) / totalImages
                  ).toFixed(1)
                : '0'}
            </div>
          </div>
        </div>

        {simpleTags.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <Hash className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Simple Tags Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Simple tags will appear here once you generate or upload images with tags.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>To get started:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to the Test Generator tab</li>
                <li>Generate an image with prompt tags</li>
                <li>Click "Save to Database"</li>
                <li>Come back here and click "Refresh"</li>
              </ol>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Top Tags Preview */}
            {!searchQuery && simpleTags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Top 20 Most Used Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {simpleTags.slice(0, 20).map((tag) => (
                    <Badge
                      key={tag.tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                      onClick={() => setSearchQuery(tag.tag)}
                    >
                      {tag.tag} ({tag.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Table */}
            <div className="border rounded-lg">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Tag</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">% of Images</TableHead>
                      <TableHead>Popularity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTags.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No tags found matching your search' : 'No simple tags found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTags.map((tag, index) => (
                        <TableRow key={tag.tag}>
                          <TableCell className="font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{tag.tag}</TableCell>
                          <TableCell className="text-right">{tag.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {totalImages > 0 ? ((tag.count / totalImages) * 100).toFixed(1) : '0'}%
                          </TableCell>
                          <TableCell>{getPopularityBadge(tag.count)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                window.open(`/search?simpleTag=${encodeURIComponent(tag.tag)}`, '_blank');
                              }}
                            >
                              View Images
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Results Summary */}
            {searchQuery && (
              <p className="text-sm text-muted-foreground text-center">
                Showing {filteredTags.length} of {totalUniqueTags} tags
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}