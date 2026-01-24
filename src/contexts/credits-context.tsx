"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';

interface CreditsContextType {
  creditsEnabled: boolean;
  creditCost: number;
  isLoading: boolean;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const [creditsEnabled, setCreditsEnabled] = useState(false);
  const [creditCost, setCreditCost] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const refreshCredits = useCallback(async () => {
    if (!user?.id) {
      setCreditsEnabled(false);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/credits?userId=${user.id}`);
      const data = await res.json();

      if (data?.enabled) {
        setCreditsEnabled(true);
        setCreditCost(data?.config?.creditCost ?? 0);
        if (typeof data?.creditsFree === 'number') {
          updateUser({ creditsFree: data.creditsFree });
        }
      } else {
        setCreditsEnabled(false);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      setCreditsEnabled(false);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [user?.id, updateUser]);

  useEffect(() => {
    // Only fetch once per user session
    if (user?.id && !hasFetched) {
      refreshCredits();
    } else if (!user?.id) {
      setCreditsEnabled(false);
      setIsLoading(false);
      setHasFetched(false);
    }
  }, [user?.id, hasFetched, refreshCredits]);

  return (
    <CreditsContext.Provider value={{ creditsEnabled, creditCost, isLoading, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
}
