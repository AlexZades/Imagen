"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Copy, Plus, RefreshCw } from 'lucide-react';

interface AccessKey {
  id: string;
  key: string;
  isRedeemed: boolean;
  redeemedBy: string | null;
  redeemedAt: string | null;
  createdAt: string;
  redeemer?: {
    username: string;
  };
}

export function AccessKeysManager() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(1);

  const fetchKeys = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/access-keys?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch keys');
      const data = await res.json();
      setKeys(data.keys);
    } catch (error) {
      toast.error('Failed to load access keys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [user]);

  const handleGenerate = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/access-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, count: generateCount }),
      });
      if (!res.ok) throw new Error('Failed to generate keys');
      toast.success(`${generateCount} key(s) generated`);
      fetchKeys();
    } catch (error) {
      toast.error('Failed to generate keys');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this key?')) return;
    try {
      const res = await fetch(`/api/admin/access-keys?userId=${user.id}&keyId=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete key');
      toast.success('Key deleted');
      setKeys(keys.filter((k) => k.id !== id));
    } catch (error) {
      toast.error('Failed to delete key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Access Keys</CardTitle>
            <CardDescription>
              Manage access keys for user registration.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
             <Input
                type="number"
                min="1"
                max="50"
                value={generateCount}
                onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                className="w-20"
             />
            <Button onClick={handleGenerate} disabled={isGenerating}>
              <Plus className="w-4 h-4 mr-2" />
              Generate
            </Button>
            <Button variant="outline" size="icon" onClick={fetchKeys} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Redeemed By</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No access keys found.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-mono text-xs">
                    {key.key}
                  </TableCell>
                  <TableCell>
                    {key.isRedeemed ? (
                      <Badge variant="secondary">Redeemed</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">Available</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {key.redeemer ? key.redeemer.username : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(key.key)}
                        title="Copy Key"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(key.id)}
                        title="Delete Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
