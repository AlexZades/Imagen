"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StorageMigrationProps {
  userId: string;
}

export function StorageMigration({ userId }: StorageMigrationProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    skipped: number;
    errors: number;
  } | null>(null);

  const handleMigrate = async () => {
    if (!confirm('This will migrate all local images to S3. Ensure S3 is configured correctly. Continue?')) {
      return;
    }

    setIsMigrating(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/migrate-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Migration failed');
      }

      setResult({
        processed: data.processed,
        skipped: data.skipped,
        errors: data.errors,
      });

      if (data.errors > 0) {
        toast.warning(`Migration complete with errors. Processed: ${data.processed}, Errors: ${data.errors}`);
      } else {
        toast.success(`Migration complete! Processed: ${data.processed}, Skipped: ${data.skipped}`);
      }

    } catch (error: any) {
      toast.error(`Migration error: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="space-y-1">
        <h3 className="font-medium flex items-center gap-2">
          <UploadCloud className="w-5 h-5" />
          Migrate Local to S3
        </h3>
        <p className="text-sm text-muted-foreground">
          Move images from local storage to the configured S3 bucket. 
          Use this after setting up S3 and setting STORAGE_PROVIDER=s3.
        </p>
        {result && (
          <div className="text-sm mt-2 p-2 bg-muted rounded text-foreground">
            <span className="font-medium text-green-600">Processed: {result.processed}</span> •{' '}
            <span className="text-blue-600">Skipped: {result.skipped}</span> •{' '}
            <span className="text-red-600">Errors: {result.errors}</span>
          </div>
        )}
      </div>
      <Button 
        onClick={handleMigrate} 
        disabled={isMigrating}
        variant="outline"
      >
        {isMigrating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Migrating...
          </>
        ) : (
          'Start Migration'
        )}
      </Button>
    </div>
  );
}
