"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, RotateCcw, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export function SpeechBubbleTriggersEditor() {
  const { user } = useAuth();
  const [tags, setTags] = useState('');
  const [originalTags, setOriginalTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTriggers();
  }, []);

  const fetchTriggers = async () => {
    try {
      const response = await fetch('/api/generation-config?key=speech_bubble_triggers');
      const data = await response.json();
      
      const tagValue = data.value || '';
      setTags(tagValue);
      setOriginalTags(tagValue);
    } catch (error) {
      toast.error('Failed to load speech bubble triggers');
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
          key: 'speech_bubble_triggers',
          value: tags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save triggers');
      }

      setOriginalTags(tags);
      toast.success('Speech bubble triggers saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save triggers');
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
          <p className="text-muted-foreground">Loading triggers...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <CardTitle>Speech Bubble Triggers</CardTitle>
        </div>
        <CardDescription>
          These tags determine when the "Edit Bubbles" button is shown on an image page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Trigger Tags (comma-separated)
          </label>
          <Textarea
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="speech bubble, comic, dialogue..."
            rows={3}
            className="font-mono text-sm"
          />
        </div>

        {tagArray.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Preview ({tagArray.length} triggers)
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
            {isSaving ? 'Saving...' : 'Save Triggers'}
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
      </CardContent>
    </Card>
  );
}