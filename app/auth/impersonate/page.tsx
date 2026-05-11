'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function ImpersonatePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Missing token');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'magiclink',
      });
      if (cancelled) return;
      if (error || !data.session) {
        setError(error?.message || 'Verification failed');
        return;
      }
      const role = data.user?.user_metadata?.role;
      router.replace(role === 'coach' ? '/coach' : '/athlete');
    })();
    return () => { cancelled = true; };
  }, [params, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center text-white">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-red-300 font-medium">Impersonation failed</p>
            <p className="text-sm text-teal-100 mt-2">{error}</p>
          </>
        ) : (
          <>
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-teal-200" />
            <p className="text-sm text-teal-100">Signing in…</p>
          </>
        )}
      </div>
    </div>
  );
}
