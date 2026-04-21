'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, KeyRound, Loader2 } from 'lucide-react';

export default function CoachProfilePage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState<string>('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user.user_metadata?.role !== 'coach') {
        router.replace('/login');
        return;
      }
      setEmail(user.email ?? '');
      setAuthLoading(false);
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (verifyError) {
        setError('Current password is incorrect.');
        setSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) throw updateError;

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      setError('Failed to update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <Loader2 size={32} className='animate-spin text-[#178da6]' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-2xl mx-auto p-6'>
        <div className='mb-6'>
          <Link href='/coach/admin' className='inline-flex items-center gap-2 text-[#178da6] hover:text-[#14758c] mb-4'>
            <ArrowLeft size={20} />
            Back to Admin
          </Link>
          <h1 className='text-3xl font-bold text-gray-900'>Coach Profile</h1>
          <p className='text-gray-600 mt-2'>Signed in as <span className='font-semibold text-[#178da6]'>{email}</span></p>
        </div>

        <div className='bg-white rounded-lg shadow-md p-6'>
          <div className='flex items-center gap-3 mb-6'>
            <div className='bg-[#178da6] text-white p-2.5 rounded-lg'>
              <KeyRound size={22} />
            </div>
            <h2 className='text-xl font-semibold text-gray-900'>Change Password</h2>
          </div>

          {success ? (
            <div className='bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3'>
              <CheckCircle size={22} className='text-green-600 flex-shrink-0 mt-0.5' />
              <div>
                <p className='font-semibold text-green-900'>Password updated</p>
                <p className='text-sm text-green-800 mt-1'>
                  Your new password is now active. Next time you log in, use the new password.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className='mt-3 text-sm font-medium text-[#178da6] hover:text-[#14758c]'
                >
                  Change password again
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='space-y-5'>
              <div>
                <label htmlFor='currentPassword' className='block text-sm font-medium text-gray-700 mb-2'>
                  Current password
                </label>
                <input
                  id='currentPassword'
                  type='password'
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  maxLength={128}
                  autoComplete='current-password'
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                  disabled={submitting}
                />
              </div>

              <div>
                <label htmlFor='newPassword' className='block text-sm font-medium text-gray-700 mb-2'>
                  New password
                </label>
                <input
                  id='newPassword'
                  type='password'
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={128}
                  autoComplete='new-password'
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                  placeholder='At least 6 characters'
                  disabled={submitting}
                />
              </div>

              <div>
                <label htmlFor='confirmPassword' className='block text-sm font-medium text-gray-700 mb-2'>
                  Confirm new password
                </label>
                <input
                  id='confirmPassword'
                  type='password'
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  maxLength={128}
                  autoComplete='new-password'
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                  placeholder='Re-enter your new password'
                  disabled={submitting}
                />
              </div>

              {error && (
                <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
                  <p className='text-sm text-red-800'>{error}</p>
                </div>
              )}

              <button
                type='submit'
                disabled={submitting}
                className='w-full bg-[#178da6] hover:bg-[#14758c] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} className='animate-spin' />
                    Updating…
                  </>
                ) : (
                  'Update password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
