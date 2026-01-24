"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, RotateCcw, Info } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

type CreditsSettingsState = {
  creditCost: number;
  dailyFreeCredits: number;
  maxFreeCreditLimit: number;
};

const DEFAULTS: CreditsSettingsState = {
  creditCost: 1,
  dailyFreeCredits: 10,
  maxFreeCreditLimit: 50,
};

export function CreditsSettings() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const [state, setState] = useState<CreditsSettingsState>(DEFAULTS);
  const [original, setOriginal] = useState<CreditsSettingsState>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = useMemo(() => {
    return (
      state.creditCost !== original.creditCost ||
      state.dailyFreeCredits !== original.dailyFreeCredits ||
      state.maxFreeCreditLimit !== original.maxFreeCreditLimit
    );
  }, [state, original]);

  useEffect(() => {
    load();
  }, []);

  const loadOne = async (key: string): Promise<number> => {
    const res = await fetch(`/api/generation-config?key=${encodeURIComponent(key)}`);
    const data = await res.json();
    const n = Number.parseInt(String(data?.value ?? ''), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const load = async () => {
    try {
      const [enabledRes, creditCost, dailyFreeCredits, maxFreeCreditLimit] = await Promise.all([
        fetch('/api/credits').then((r) => r.json()).catch(() => ({ enabled: false })),
        loadOne('credits_credit_cost'),
        loadOne('credits_daily_free_credits'),
        loadOne('credits_max_free_credit_limit'),
      ]);

      setEnabled(Boolean(enabledRes?.enabled));

      const next: CreditsSettingsState = {
        creditCost: creditCost || DEFAULTS.creditCost,
        dailyFreeCredits: dailyFreeCredits || DEFAULTS.dailyFreeCredits,
        maxFreeCreditLimit: maxFreeCreditLimit || DEFAULTS.maxFreeCreditLimit,
      };

      setState(next);
      setOriginal(next);
    } catch (e) {
      toast.error('Failed to load credit settings');
    } finally {
      setIsLoading(false);
    }
  };

  const save = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setIsSaving(true);
    try {
      const payloads = [
        { key: 'credits_credit_cost', value: String(state.creditCost) },
        { key: 'credits_daily_free_credits', value: String(state.dailyFreeCredits) },
        { key: 'credits_max_free_credit_limit', value: String(state.maxFreeCreditLimit) },
      ];

      const results = await Promise.all(
        payloads.map((p) =>
          fetch('/api/generation-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              key: p.key,
              value: p.value,
            }),
          })
        )
      );

      const failed = results.find((r) => !r.ok);
      if (failed) {
        throw new Error('Failed to save credit settings');
      }

      setOriginal(state);
      toast.success('Credit settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save credit settings');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setState(original);
    toast.info('Changes discarded');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading credit settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credits System</CardTitle>
        <CardDescription>
          Configure free credits and the cost of manual image generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted p-4 rounded-lg flex gap-3">
          <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium">Environment toggle</p>
            <p className="text-muted-foreground">
              Credits enforcement is currently:{' '}
              <span className={enabled ? 'text-emerald-600 font-medium' : 'text-orange-600 font-medium'}>
                {enabled ? 'ENABLED' : 'DISABLED'}
              </span>
              . Set <code className="px-1 py-0.5 bg-background border rounded">CREDITS_SYSTEM_ENABLED=true</code>{' '}
              to enable it.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="creditCost">Credit cost per manual generation</Label>
            <Input
              id="creditCost"
              type="number"
              min={0}
              step={1}
              value={state.creditCost}
              onChange={(e) =>
                setState((s) => ({ ...s, creditCost: Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0) }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dailyFreeCredits">Daily free credits</Label>
            <Input
              id="dailyFreeCredits"
              type="number"
              min={0}
              step={1}
              value={state.dailyFreeCredits}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  dailyFreeCredits: Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0),
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxFreeCreditLimit">Max free credits cap</Label>
            <Input
              id="maxFreeCreditLimit"
              type="number"
              min={0}
              step={1}
              value={state.maxFreeCreditLimit}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  maxFreeCreditLimit: Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0),
                }))
              }
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={isSaving || !hasChanges} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          {hasChanges && (
            <Button onClick={reset} variant="outline" disabled={isSaving}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
