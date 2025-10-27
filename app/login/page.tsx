'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, getUserRole } from '@/lib/auth';
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
      } else if (role === 'athlete') {
        router.push('/athlete');
      } else {
        // Check if user is a member
        const { supabase } = await import('@/lib/supabase');
        const { data: member } = await supabase
          .from('members')
          .select('id, status')
          .eq('id', user.id)
          .single();

        if (member) {
          if (member.status === 'pending') {
            setError('Your account is pending approval. Please wait for coach approval.');
            await signOut();
            return;
          } else if (member.status === 'blocked') {
            setError('Your account has been blocked. Please contact the coach.');
            await signOut();
            return;
          } else {
            router.push('/member/book');
          }
        } else {
          router.push('/athlete');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sign in. Please check your credentials.';
      setError(errorMessage);
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
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
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
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
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
            className='w-full bg-[#208479] hover:bg-[#1a6b62] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
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

        <div className='mt-6 text-center'>
          <p className='text-gray-600'>
            Don&apos;t have an account?{' '}
            <Link href='/signup' className='text-[#208479] hover:text-[#1a6b62] font-medium'>
              Sign up
            </Link>
          </p>
        </div>

        <div className='mt-4 text-center'>
          <p className='text-gray-600 text-sm'>
            New member?{' '}
            <Link href='/auth/register-member' className='text-[#208479] hover:text-[#1a6b62] font-medium'>
              Register for class booking
            </Link>
          </p>
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
