'use client';

import { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/app/context/auth-context';
import { AppSettingsProvider } from '@/app/context/app-settings-context';
import { apiClient } from '@/app/services/api-client';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => apiClient.get(url),
        revalidateOnFocus: false,
        shouldRetryOnError: true,
        errorRetryCount: 2,
        errorRetryInterval: 1500,
      }}
    >
      <AppSettingsProvider>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </AppSettingsProvider>
    </SWRConfig>
  );
}

