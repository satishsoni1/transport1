'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Protected route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
      <h2 className="text-2xl font-semibold text-slate-900">Something went wrong</h2>
      <p className="max-w-lg text-sm text-slate-600">
        We could not render this page. Try again once, and if it continues, check server/API logs.
      </p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
