'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

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
        <Image src='/icon-512.png' alt='The Forge Functional Fitness' width={180} height={180} priority className="mx-auto mb-4" />
        <Loader2 size={32} className="animate-spin mx-auto mb-2 text-teal-200" />
      </div>
    </div>
  );
}
