'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) throw error;
      setSent(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
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

        {sent ? (
          <div className='text-center'>
            <div className='mx-auto w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-4'>
              <Mail size={24} className='text-[#178da6]' />
            </div>
            <h2 className='text-xl font-semibold text-gray-900 mb-2'>Check your email</h2>
            <p className='text-gray-600 mb-6'>
              We sent a password reset link to <span className='font-medium'>{email}</span>
            </p>
            <Link
              href='/login'
              className='inline-flex items-center gap-2 text-[#178da6] hover:text-[#14758c] font-medium'
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h2 className='text-xl font-semibold text-gray-900 text-center mb-2'>Reset your password</h2>
            <p className='text-sm text-gray-600 text-center mb-6'>
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className='space-y-6'>
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
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <div className='mt-6 text-center'>
              <Link
                href='/login'
                className='inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900'
              >
                <ArrowLeft size={16} />
                Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
