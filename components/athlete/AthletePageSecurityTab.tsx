// AthletePageSecurityTab component
'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AthletePageSecurityTab() {
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchAccountInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Member since from members table
      const { data: member } = await supabase
        .from('members')
        .select('created_at')
        .eq('id', user.id)
        .single();

      if (member?.created_at) {
        setMemberSince(new Date(member.created_at).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }));
      }

      // Last login from Supabase Auth
      if (user.last_sign_in_at) {
        setLastLogin(new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }));
      }
    };

    fetchAccountInfo();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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

    setSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      setError('Failed to update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPasswordForm = () => {
    setShowPasswordForm(false);
    setSuccess(false);
    setError('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className='bg-white rounded-lg shadow p-6'>
      <h2 className='text-2xl font-bold text-gray-900 mb-6'>Access & Security</h2>

      <div className='space-y-6'>
        {/* Password Change */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Change Password</h3>

          {success ? (
            <div className='bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3'>
              <CheckCircle size={22} className='text-green-600 flex-shrink-0 mt-0.5' />
              <div>
                <p className='font-semibold text-green-900'>Password updated</p>
                <p className='text-sm text-green-800 mt-1'>
                  Your new password is now active. Next time you log in, use the new password.
                </p>
                <button
                  onClick={resetPasswordForm}
                  className='mt-3 text-sm font-medium text-[#178da6] hover:text-[#14758c]'
                >
                  Done
                </button>
              </div>
            </div>
          ) : showPasswordForm ? (
            <form onSubmit={handlePasswordSubmit} className='space-y-4'>
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

              <div className='flex gap-3'>
                <button
                  type='submit'
                  disabled={submitting}
                  className='px-6 py-2 bg-[#178da6] hover:bg-[#14758c] text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className='animate-spin' />
                      Updating…
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
                <button
                  type='button'
                  onClick={resetPasswordForm}
                  disabled={submitting}
                  className='px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition disabled:opacity-50'
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className='text-gray-600 mb-4'>Update your password to keep your account secure.</p>
              <button
                onClick={() => setShowPasswordForm(true)}
                className='px-6 py-2 bg-[#178da6] hover:bg-[#14758c] text-white font-medium rounded-lg transition'
              >
                Change Password
              </button>
            </>
          )}
        </div>

        {/* Two-Factor Authentication */}
        <div className='pt-6 border-t border-gray-200'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Two-Factor Authentication</h3>
          <p className='text-gray-600 mb-4'>Add an extra layer of security to your account.</p>
          <button className='px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition'>
            Enable 2FA
          </button>
        </div>

        {/* Account Information */}
        <div className='pt-6 border-t border-gray-200'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Account Information</h3>
          <div className='space-y-3'>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Account Type</label>
              <p className='text-gray-900'>Athlete</p>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Member Since</label>
              <p className='text-gray-900'>{memberSince || 'Not available'}</p>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Last Login</label>
              <p className='text-gray-900'>{lastLogin || 'Not available'}</p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className='pt-6 border-t border-red-200'>
          <h3 className='text-lg font-semibold text-red-900 mb-4'>Danger Zone</h3>
          <p className='text-red-600 mb-4'>
            These actions are permanent and cannot be undone.
          </p>
          <button className='px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition'>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
