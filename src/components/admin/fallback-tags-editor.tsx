"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, RotateCcw, Info } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export function FallbackTagsEditor() {
  const { user } = useAuth();
  const [tags, setTags] = useState('');
  const [originalTags, setOriginalTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFallbackTags();
  }, []);

  const fetchFallbackTags = async () => {
    try {
      const response = await fetch('/api/generation-config?key=fallback_tags');
      const data = await response.json();
      
      const tagValue = data.value || '';
      setTags(tagValue);
      setOriginalTags(tagValue);
    } catch (error) {
      toast.error('Failed to load fallback tags');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/generation-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          key: 'fallback_tags',
          value: tags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save fallback tags');
      }

      setOriginalTags(tags);
      toast.success('Fallback tags saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save fallback tags');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTags(originalTags);
    toast.info('Changes discarded');
  };

  const tagArray = tags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const hasChanges = tags !== originalTags;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading fallback tags...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fallback Simple Tags</CardTitle>
        <CardDescription>
          These tags are used for random generation when no database tags are available
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Database tags are preferred
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              The system will first try to use simple tags from your existing images. 
              These fallback tags are only used when no database tags are found.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Tags (comma-separated)
          </label>
          <Textarea
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="standing, sitting, smiling, looking at viewer, ..."
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Enter tags separated by commas. These will be randomly selected during generation.
          </p>
        </div>

        {tagArray.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Preview ({tagArray.length} tags)
            </p>
            <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
              {tagArray.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>

          {hasChanges && (
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isSaving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </div>

        <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
          <p className="font-medium">Default fallback tags:</p>
          <p className="text-muted-foreground">
            standing, sitting, smiling, looking at viewer, outdoors, indoors, day, night, 
            solo, portrait, full body, upper body, detailed, high quality, masterpiece
          </p>
        </div>
      </CardContent>
    </Card>
  );
}