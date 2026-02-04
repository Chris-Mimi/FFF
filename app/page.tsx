'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Process any hash tokens (e.g., email confirmation) then redirect to login
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN') {
          // Sign out so user must log in properly via /login
          await supabase.auth.signOut();
        }
        router.replace('/login');
      }
    );

    // Fallback if no auth event fires
    const timeout = setTimeout(() => {
      router.replace('/login');
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center">
      <div className="text-center text-white">
        <Loader2 size={40} className="animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-bold">The Forge</h1>
        <p className="text-teal-200 mt-1">Functional Fitness</p>
      </div>
    </div>
  );
}
