'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { Loader2, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;
      setSuccess(true);

      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      console.error('Password update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center p-4'>
      <div className='bg-white rounded-lg shadow-2xl p-8 max-w-md w-full'>
        <div className='flex justify-center mb-8'>
          <Image src='/logo.png' alt='The Forge Functional Fitness' width={220} height={220} priority />
        </div>

        {success ? (
          <div className='text-center'>
            <div className='mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4'>
              <CheckCircle size={24} className='text-green-600' />
            </div>
            <h2 className='text-xl font-semibold text-gray-900 mb-2'>Password updated!</h2>
            <p className='text-gray-600'>Redirecting to login...</p>
          </div>
        ) : (
          <>
            <h2 className='text-xl font-semibold text-gray-900 text-center mb-2'>Set new password</h2>
            <p className='text-sm text-gray-600 text-center mb-6'>
              Enter your new password below.
            </p>

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div>
                <label htmlFor='password' className='block text-sm font-medium text-gray-700 mb-2'>
                  New Password
                </label>
                <input
                  id='password'
                  type='password'
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={128}
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                  placeholder='At least 6 characters'
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor='confirmPassword' className='block text-sm font-medium text-gray-700 mb-2'>
                  Confirm Password
                </label>
                <input
                  id='confirmPassword'
                  type='password'
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  maxLength={128}
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                  placeholder='Re-enter your password'
                  disabled={loading}
                />
              </div>

              {error && (
                <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
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
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
