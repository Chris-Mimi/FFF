'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, getUserRole, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign in with Supabase
      const { user } = await signInWithEmail(email, password);

      if (!user) {
        throw new Error('Login failed');
      }

      // Get user's role and redirect appropriately
      const role = await getUserRole();

      if (role === 'coach') {
        router.push('/coach');
        return;
      } else if (role === 'athlete') {
        router.push('/athlete');
        return;
      } else {
        // Check if user is a member
        const { data: member } = await supabase
          .from('members')
          .select('id, status')
          .eq('id', user.id)
          .single();

        if (member) {
          if (member.status === 'pending') {
            // Sign out immediately (don't await to prevent navigation cascade)
            signOut();
            setError('Your account is pending approval. Please wait for coach approval.');
            setLoading(false);
            return;
          } else if (member.status === 'blocked') {
            // Sign out immediately (don't await to prevent navigation cascade)
            signOut();
            setError('Your account has been blocked. Please contact the coach.');
            setLoading(false);
            return;
          } else {
            router.push('/member/book');
            return;
          }
        } else {
          router.push('/athlete');
          return;
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sign in. Please check your credentials.';

      // If Supabase says "email not confirmed", check if this is a pending member
      if (errorMessage.toLowerCase().includes('email not confirmed')) {
        try {
          const response = await fetch('/api/members/check-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase() })
          });

          const data = await response.json();

          if (data.exists && data.status === 'pending') {
            setError('Your account is pending approval. Please wait for coach approval.');
          } else if (data.exists && data.status === 'blocked') {
            setError('Your account has been blocked. Please contact the coach.');
          } else {
            // No member record or member is active (shouldn't reach here normally)
            setError('Please check your email for a confirmation link before signing in.');
          }
        } catch (err) {
          console.error('Failed to check member status:', err);
          setError('Please check your email for a confirmation link before signing in.');
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center p-4'>
      <div className='bg-white rounded-lg shadow-2xl p-8 max-w-md w-full'>
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-gray-800 mb-2'>The Forge</h1>
          <p className='text-gray-600'>Functional Fitness</p>
        </div>

        <form onSubmit={handleLogin} className='space-y-6'>
          <div>
            <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-2'>
              Email Address
            </label>
            <input
              id='email'
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              maxLength={255}
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
              placeholder='you@example.com'
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor='password' className='block text-sm font-medium text-gray-700 mb-2'>
              Password
            </label>
            <input
              id='password'
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              maxLength={128}
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
              placeholder='Enter your password'
              disabled={loading}
            />
          </div>

          {error && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3'>
              <AlertCircle size={20} className='text-red-600 flex-shrink-0 mt-0.5' />
              <p className='text-sm text-red-800'>{error}</p>
            </div>
          )}

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-[#178da6] hover:bg-[#14758c] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {loading ? (
              <>
                <Loader2 size={20} className='animate-spin' />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className='mt-6 pt-6 border-t border-gray-200'>
          <Link
            href='/auth/register-member'
            className='block w-full text-center bg-white border-2 border-[#178da6] text-[#178da6] hover:bg-[#178da6] hover:text-white font-semibold py-3 rounded-lg transition'
          >
            <div className='text-sm'>New Member?</div>
            <div>Register for Class Booking</div>
          </Link>
        </div>

        <div className='mt-4 text-center'>
          <Link href='/forgot-password' className='text-sm text-gray-600 hover:text-gray-900'>
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
}
