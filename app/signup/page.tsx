'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'athlete' | 'coach'>('athlete');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Sign up with Supabase
      const { user } = await signUpWithEmail(email, password, fullName, role);

      if (!user) {
        throw new Error('Signup failed');
      }

      // Create athlete profile if role is athlete
      if (role === 'athlete') {
        const { error: profileError } = await supabase.from('athlete_profiles').insert([
          {
            user_id: user.id,
            full_name: fullName,
            email: email,
          },
        ]);

        if (profileError) {
          console.error('Error creating athlete profile:', profileError);
          // Don't fail signup if profile creation fails
        }
      }

      setSuccess(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        if (role === 'coach') {
          router.push('/coach');
        } else {
          router.push('/athlete');
        }
      }, 3000);
    } catch (err) {
      console.error('Signup error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create account. Please try again.';
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

        {success ? (
          <div className='text-center py-8'>
            <CheckCircle size={64} className='text-green-500 mx-auto mb-4' />
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>Account Created!</h2>
            <p className='text-gray-600'>Redirecting you to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSignup} className='space-y-6'>
            <div>
              <label htmlFor='fullName' className='block text-sm font-medium text-gray-700 mb-2'>
                Full Name
              </label>
              <input
                id='fullName'
                type='text'
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                placeholder='John Doe'
                disabled={loading}
              />
            </div>

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
                minLength={6}
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                placeholder='At least 6 characters'
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor='confirmPassword'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Confirm Password
              </label>
              <input
                id='confirmPassword'
                type='password'
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                placeholder='Re-enter your password'
                disabled={loading}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-3'>I am a...</label>
              <div className='space-y-2'>
                <label className='flex items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-[#208479] transition'>
                  <input
                    type='radio'
                    name='role'
                    value='athlete'
                    checked={role === 'athlete'}
                    onChange={e => setRole(e.target.value as 'athlete')}
                    className='w-4 h-4 text-[#208479] focus:ring-[#208479]'
                    disabled={loading}
                  />
                  <span className='ml-3 text-gray-900 font-medium'>Athlete</span>
                </label>
                <label className='flex items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-[#208479] transition'>
                  <input
                    type='radio'
                    name='role'
                    value='coach'
                    checked={role === 'coach'}
                    onChange={e => setRole(e.target.value as 'coach')}
                    className='w-4 h-4 text-[#208479] focus:ring-[#208479]'
                    disabled={loading}
                  />
                  <span className='ml-3 text-gray-900 font-medium'>Coach</span>
                </label>
              </div>
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
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}

        {!success && (
          <div className='mt-6 text-center'>
            <p className='text-gray-600'>
              Already have an account?{' '}
              <Link href='/login' className='text-[#208479] hover:text-[#1a6b62] font-medium'>
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
