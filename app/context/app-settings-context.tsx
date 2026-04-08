'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AppSettings {
  company_name: string;
  company_tagline: string;
  app_title: string;
  support_email: string;
  [key: string]: any;
}

interface AppSettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  company_name: 'TRIMURTI Transport',
  company_tagline: 'Transport Management System',
  app_title: 'TRIMURTI TMS',
  support_email: 'support@trimurti.com',
};

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/app-settings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch app settings');
      }
      
      const { settings: fetchedSettings } = await response.json();
      setSettings({
        ...DEFAULT_SETTINGS,
        ...fetchedSettings,
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching app settings:', err);
      setSettings(DEFAULT_SETTINGS);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <AppSettingsContext.Provider 
      value={{ 
        settings: settings || DEFAULT_SETTINGS, 
        loading, 
        error,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
}
