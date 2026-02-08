// AthletePageSecurityTab component
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AthletePageSecurityTab() {
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);

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

  return (
    <div className='bg-white rounded-lg shadow p-6'>
      <h2 className='text-2xl font-bold text-gray-900 mb-6'>Access & Security</h2>

      <div className='space-y-6'>
        {/* Password Change */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Change Password</h3>
          <p className='text-gray-600 mb-4'>Update your password to keep your account secure.</p>
          <button className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'>
            Change Password
          </button>
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
