"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Play, CheckCircle, XCircle, Clock, Sparkles, Shuffle, Target } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface GenerationResult {
  success: boolean;
  imageId?: string;
  error?: string;
  generationType: string;
  userId: string;
  prompt: string;
  tags: string[];
  style: string;
}

interface GenerationReport {
  totalUsers: number;
  totalImagesGenerated: number;
  successCount: number;
  failureCount: number;
  results: GenerationResult[];
  errors: string[];
  startTime: string;
  endTime: string;
  durationMs: number;
}

export function AutoGenerationTest() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<GenerationReport | null>(null);
  
  // Configuration state
  const [imagesPerUser, setImagesPerUser] = useState(6);
  const [closeCount, setCloseCount] = useState(2);
  const [mixedCount, setMixedCount] = useState(2);
  const [randomCount, setRandomCount] = useState(2);

  const handleTestGeneration = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setIsGenerating(true);
    setReport(null);

    try {
      console.log('Starting test generation via API...');

      // Call the API endpoint
      const response = await fetch('/api/auto-generate/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          config: {
            imagesPerUser,
            closeRecommendationsCount: closeCount,
            mixedRecommendationsCount: mixedCount,
            randomCount,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Generation failed');
      }

      const data = await response.json();
      setReport(data.report);

      if (data.report.successCount > 0) {
        toast.success(`Generated ${data.report.successCount} image(s) successfully!`);
      } else {
        toast.error('All generations failed');
      }
    } catch (error: any) {
      console.error('Test generation error:', error);
      toast.error(error.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const getGenerationTypeIcon = (type: string) => {
    switch (type) {
      case 'close':
        return <Target className="w-4 h-4 text-blue-600" />;
      case 'mixed':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'random':
        return <Shuffle className="w-4 h-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getGenerationTypeColor = (type: string) => {
    switch (type) {
      case 'close':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'mixed':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'random':
        return 'bg-green-500/10 border-green-500/20';
      default:
        return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Generation Test (Full Algorithm)</CardTitle>
        <CardDescription>
          Test the complete auto-generation system with close recommendations, mixed recommendations, and random generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="imagesPerUser">Total Images Per User</Label>
              <Input
                id="imagesPerUser"
                type="number"
                min="1"
                max="20"
                value={imagesPerUser}
                onChange={(e) => setImagesPerUser(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="closeCount">Close Recommendations</Label>
              <Input
                id="closeCount"
                type="number"
                min="0"
                max="10"
                value={closeCount}
                onChange={(e) => setCloseCount(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mixedCount">Mixed Recommendations</Label>
              <Input
                id="mixedCount"
                type="number"
                min="0"
                max="10"
                value={mixedCount}
                onChange={(e) => setMixedCount(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="randomCount">Random Images</Label>
              <Input
                id="randomCount"
                type="number"
                min="0"
                max="10"
                value={randomCount}
                onChange={(e) => setRandomCount(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Generation Types:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="gap-1">
                <Target className="w-3 h-3" />
                Close: Similar to liked images
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Mixed: Novel combinations
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Shuffle className="w-3 h-3" />
                Random: Pure exploration
              </Badge>
            </div>
          </div>

          <Button
            onClick={handleTestGeneration}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating... (this may take several minutes)
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Test Generation for Current User
              </>
            )}
          </Button>
        </div>

        {report && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Generation Report</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-2xl font-bold">{report.totalUsers}</div>
                <div className="text-xs text-muted-foreground">Users</div>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <div className="text-2xl font-bold">{report.totalImagesGenerated}</div>
                <div className="text-xs text-muted-foreground">Total Images</div>
              </div>

              <div className="bg-green-500/10 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{report.successCount}</div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>

              <div className="bg-red-500/10 p-3 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{report.failureCount}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Duration: {(report.durationMs / 1000).toFixed(2)}s</span>
            </div>

            {report.results.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Results:</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {report.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.success
                          ? `${getGenerationTypeColor(result.generationType)}`
                          : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                {getGenerationTypeIcon(result.generationType)}
                              </>
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <Badge variant="outline" className="capitalize">
                              {result.generationType}
                            </Badge>
                          </div>
                          
                          {result.success ? (
                            <>
                              <p className="text-sm">
                                <span className="font-medium">Style:</span> {result.style}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Tags:</span> {result.tags.join(', ')}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {result.prompt}
                              </p>
                              {result.imageId && (
                                <a
                                  href={`/image/${result.imageId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  View Image →
                                </a>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-red-600">{result.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Errors:</h4>
                <div className="space-y-1">
                  {report.errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-600 bg-red-500/5 p-2 rounded">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}