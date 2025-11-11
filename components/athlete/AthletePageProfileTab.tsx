// ProfileTab component
'use client';

import { supabase } from '@/lib/supabase';
import { Edit2, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProfileTabProps {
  userName: string;
  userId: string;
}

export default function ProfileTab({ userName, userId }: ProfileTabProps) {
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    date_of_birth: '',
    phone_number: '',
    height_cm: '',
    weight_kg: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    avatar_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchProfile = async () => {
    console.log('Fetching profile for user:', userId);
    setLoading(true);
    try {
      // Get the most recent profile (in case there are duplicates)
      const { data, error } = await supabase
        .from('athlete_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('Profile fetch result:', { data, error });

      if (error) {
        throw error;
      }

      if (data) {
        console.log('Setting profile data from database:', data);
        setProfile({
          full_name: data.full_name || '',
          email: data.email || '',
          date_of_birth: data.date_of_birth || '',
          phone_number: data.phone_number || '',
          height_cm: data.height_cm?.toString() || '',
          weight_kg: data.weight_kg?.toString() || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          avatar_url: data.avatar_url || '',
        });
        if (data.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      } else {
        console.log('No profile data found, resetting to empty profile');
        // Reset to empty profile for new users/family members
        setProfile({
          full_name: '',
          email: '',
          date_of_birth: '',
          phone_number: '',
          height_cm: '',
          weight_kg: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          avatar_url: '',
        });
        setAvatarUrl(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Create a unique file path: userId/timestamp-filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage.from('avatars').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      setProfile({ ...profile, avatar_url: publicUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    console.log('Starting profile save for user:', userId);
    console.log('Profile data to save:', profile);

    // Verify session exists
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    console.log('Current session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      sessionError,
    });

    if (!session) {
      alert('No active session found. Please logout and login again.');
      return;
    }

    try {
      // Check if profile exists (get most recent if duplicates exist)
      const { data: existingProfile, error: fetchError } = await supabase
        .from('athlete_profiles')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('Existing profile check:', { existingProfile, fetchError });

      const profileData = {
        user_id: userId,
        full_name: profile.full_name || null,
        email: profile.email || null,
        date_of_birth: profile.date_of_birth || null,
        phone_number: profile.phone_number || null,
        height_cm: profile.height_cm ? parseInt(profile.height_cm) : null,
        weight_kg: profile.weight_kg ? parseFloat(profile.weight_kg) : null,
        emergency_contact_name: profile.emergency_contact_name || null,
        emergency_contact_phone: profile.emergency_contact_phone || null,
        avatar_url: avatarUrl || null,
      };

      console.log('Formatted profile data:', profileData);

      if (existingProfile) {
        // Update existing profile
        console.log('Updating existing profile with id:', existingProfile.id);
        const { data, error } = await supabase
          .from('athlete_profiles')
          .update({
            ...profileData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingProfile.id)
          .select();

        console.log('Update result:', { data, error });

        if (error) throw error;
        alert('Profile updated successfully!');
      } else {
        // Insert new profile
        console.log('Inserting new profile');
        const { data, error } = await supabase
          .from('athlete_profiles')
          .insert(profileData)
          .select();

        console.log('Insert result:', { data, error });

        if (error) throw error;
        alert('Profile created successfully!');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save profile: ${errorMessage}. Please check the console for details.`);
    }
  };

  if (loading) {
    return (
      <div className='bg-white rounded-lg shadow p-6 text-center text-gray-500'>
        Loading profile...
      </div>
    );
  }

  return (
    <div className='bg-white rounded-lg shadow p-6'>
      <h2 className='text-2xl font-bold text-gray-900 mb-6'>Profile</h2>

      <div className='space-y-6'>
        {/* Profile Picture */}
        <div className='flex items-center gap-4'>
          <div className='relative'>
            <div className='w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden'>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt='Profile' className='w-full h-full object-cover' />
              ) : (
                <User size={40} className='text-gray-400' />
              )}
            </div>
            <label
              htmlFor='avatar-upload'
              className='absolute bottom-0 right-0 w-8 h-8 bg-[#208479] hover:bg-[#1a6b62] rounded-full flex items-center justify-center cursor-pointer transition shadow-lg'
              title='Upload profile picture'
            >
              <Edit2 size={16} className='text-white' />
              <input
                id='avatar-upload'
                type='file'
                accept='image/*'
                onChange={handleAvatarUpload}
                className='hidden'
                disabled={uploading}
              />
            </label>
          </div>
          <div>
            <h3 className='text-xl font-semibold text-gray-900'>{profile.full_name || userName}</h3>
            <p className='text-gray-600'>Athlete</p>
            {uploading && <p className='text-sm text-[#208479] mt-1'>Uploading...</p>}
          </div>
        </div>

        {/* Profile Information */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Full Name</label>
            <input
              type='text'
              value={profile.full_name}
              onChange={e => setProfile({ ...profile, full_name: e.target.value })}
              placeholder='John Doe'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Email</label>
            <input
              type='email'
              value={profile.email}
              onChange={e => setProfile({ ...profile, email: e.target.value })}
              placeholder='john@example.com'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Date of Birth</label>
            <input
              type='date'
              value={profile.date_of_birth}
              onChange={e => setProfile({ ...profile, date_of_birth: e.target.value })}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Phone Number</label>
            <input
              type='tel'
              value={profile.phone_number}
              onChange={e => setProfile({ ...profile, phone_number: e.target.value })}
              placeholder='+49 123 456789'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Height (cm)</label>
            <input
              type='number'
              value={profile.height_cm}
              onChange={e => setProfile({ ...profile, height_cm: e.target.value })}
              placeholder='175'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Weight (kg)</label>
            <input
              type='number'
              step='0.1'
              value={profile.weight_kg}
              onChange={e => setProfile({ ...profile, weight_kg: e.target.value })}
              placeholder='70.5'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Emergency Contact Name</label>
            <input
              type='text'
              value={profile.emergency_contact_name}
              onChange={e => setProfile({ ...profile, emergency_contact_name: e.target.value })}
              placeholder='Jane Doe'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Contact Phone</label>
            <input
              type='tel'
              value={profile.emergency_contact_phone}
              onChange={e => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
              placeholder='+49 123 456789'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>
        </div>

        {/* Save Button */}
        <div className='flex justify-end'>
          <button
            onClick={handleSaveProfile}
            className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
