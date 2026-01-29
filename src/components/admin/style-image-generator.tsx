import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface StyleImageGeneratorProps {
  userId: string;
}

export function StyleImageGenerator({ userId }: StyleImageGeneratorProps) {
  const [prompt, setPrompt] = useState('A beautiful landscape with mountains and a lake');
  const [aspectRatio, setAspectRatio] = useState('1'); // Default to Square (1)
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!confirm('This will generate images for ALL styles. This process may take a while. Are you sure?')) {
      return;
    }

    setIsGenerating(true);
    setResults(null);

    try {
      const response = await fetch('/api/admin/styles/generate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          prompt,
          aspectRatio: parseInt(aspectRatio),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate images');
      }

      setResults(data);
      toast.success(`Generation complete: ${data.successCount} success, ${data.failCount} failed`);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Style Demo Images</CardTitle>
        <CardDescription>
          Batch generate preview images for all styles using a common prompt.
          This helps users visualize how each style affects the output.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt that works well across different styles..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="aspectRatio">Aspect Ratio</Label>
          <Select value={aspectRatio} onValueChange={setAspectRatio}>
            <SelectTrigger id="aspectRatio">
              <SelectValue placeholder="Select aspect ratio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Square (1:1)</SelectItem>
              <SelectItem value="2">Portrait (2:3)</SelectItem>
              <SelectItem value="3">Landscape (3:2)</SelectItem>
              <SelectItem value="4">Wide (16:9)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2">
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Images...
              </>
            ) : (
              'Generate All Style Images'
            )}
          </Button>
        </div>

        {results && (
          <div className="mt-6 space-y-4">
            <Alert variant={results.failCount > 0 ? "destructive" : "default"} className={results.failCount === 0 ? "border-green-500 text-green-700 bg-green-50" : ""}>
              {results.failCount > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <AlertTitle>Generation Complete</AlertTitle>
              <AlertDescription>
                Successfully generated {results.successCount} images. Failed: {results.failCount}.
              </AlertDescription>
            </Alert>

            {results.results && results.results.length > 0 && (
              <div className="max-h-60 overflow-y-auto border rounded-md p-2 text-sm">
                <ul className="space-y-1">
                  {results.results.map((res: any, idx: number) => (
                    <li key={idx} className={`flex items-center justify-between p-2 rounded ${res.success ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                      <span>{res.styleName}</span>
                      <span className={res.success ? 'text-green-600' : 'text-red-600'}>
                        {res.success ? 'Success' : 'Failed'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
