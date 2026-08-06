// AthletePageProfileTab component
'use client';

import { supabase } from '@/lib/supabase';
import { Edit2, User } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AthletePageProfileTabProps {
  userName: string;
  userId: string;
}

export default function AthletePageProfileTab({ userName, userId }: AthletePageProfileTabProps) {
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
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Get the most recent profile (in case there are duplicates)
      const { data, error } = await supabase
        .from('athlete_profiles')
        .select('full_name, email, date_of_birth, phone_number, height_cm, weight_kg, emergency_contact_name, emergency_contact_phone, avatar_url')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // Fetch gender from members table
      const { data: memberGender } = await supabase
        .from('members')
        .select('gender')
        .eq('id', userId)
        .single();
      if (memberGender?.gender) setGender(memberGender.gender);

      if (data) {
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
        // No athlete_profiles - might be a family member, get name from members table
        const { data: memberData } = await supabase
          .from('members')
          .select('name, email, date_of_birth, phone')
          .eq('id', userId)
          .single();

        if (memberData) {
          setProfile({
            full_name: memberData.name || '',
            email: memberData.email || '',
            date_of_birth: memberData.date_of_birth || '',
            phone_number: memberData.phone || '',
            height_cm: '',
            weight_kg: '',
            emergency_contact_name: '',
            emergency_contact_phone: '',
            avatar_url: '',
          });
        } else {
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
      toast.warning('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.warning('File size must be less than 5MB');
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
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    // Verify session exists
    const {
      data: { session },
      error: _sessionError,
    } = await supabase.auth.getSession();
    if (!session) {
      toast.warning('No active session found. Please logout and login again.');
      return;
    }

    // Guard against the top-of-list year mistap: a current-year (or future) DOB
    // is always a typo (it filed adults under Kids on the Workouts filter). The
    // youngest genuine members are born in prior years, so this never blocks a
    // real birthday.
    if (profile.date_of_birth) {
      const dobYear = parseInt(profile.date_of_birth.slice(0, 4), 10);
      if (dobYear >= new Date().getFullYear()) {
        toast.warning('Please check the date of birth — the year can’t be this year or later.');
        return;
      }
    }

    try {
      // Check if profile exists (get most recent if duplicates exist)
      const { data: existingProfile, error: _fetchError } = await supabase
        .from('athlete_profiles')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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

      // Always update members table for consistency. Keep display_name (what the
      // "Viewing as" selector + Book-a-class filters actually render) in sync with
      // name — otherwise a rename shows the old name everywhere but the profile form.
      const memberUpdate: Record<string, string | null> = {};
      if (profile.full_name) {
        memberUpdate.name = profile.full_name;
        memberUpdate.display_name = profile.full_name;
      }
      memberUpdate.gender = gender || null;
      memberUpdate.date_of_birth = profile.date_of_birth || null;
      if (Object.keys(memberUpdate).length > 0) {
        await supabase
          .from('members')
          .update(memberUpdate)
          .eq('id', userId);
      }

      if (existingProfile) {
        // Update existing profile (for primary account holder)
        const { data: _data, error } = await supabase
          .from('athlete_profiles')
          .update({
            ...profileData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingProfile.id)
          .select();

        if (error) throw error;
        toast.success('Profile updated successfully!');
      } else {
        // No existing profile - this is a family member without auth account
        // Just update members table (already done above)
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className='bg-white rounded-lg shadow p-6 text-center text-gray-500'>
        Loading profile...
      </div>
    );
  }

  // DOB is stored as 'YYYY-MM-DD'. Split into parts for the three dropdowns so
  // mobile users can jump straight to a birth year instead of scrolling the
  // native date picker month-by-month.
  const [dobYear, dobMonth, dobDay] = profile.date_of_birth
    ? profile.date_of_birth.split('-')
    : ['', '', ''];
  const updateDob = (part: 'y' | 'm' | 'd', value: string) => {
    const y = part === 'y' ? value : dobYear;
    const m = part === 'm' ? value : dobMonth;
    const d = part === 'd' ? value : dobDay;
    // Only store a real date once all three parts are chosen; otherwise clear
    // it so the save logic writes null rather than a malformed string.
    const composed = y && m && d ? `${y}-${m}-${d}` : '';
    setProfile({ ...profile, date_of_birth: composed });
  };
  const currentYear = new Date().getFullYear();
  // Youngest selectable birth year = last year. A current-year/future DOB is
  // always a top-of-list mistap (the "2026" typos that hid adults under Kids).
  const maxDobYear = currentYear - 1;
  const maxDobDate = `${maxDobYear}-12-31`;
  const dobYears = Array.from({ length: maxDobYear - 1929 }, (_, i) => maxDobYear - i);
  const dobMonths = [
    { v: '01', label: 'January' },
    { v: '02', label: 'February' },
    { v: '03', label: 'March' },
    { v: '04', label: 'April' },
    { v: '05', label: 'May' },
    { v: '06', label: 'June' },
    { v: '07', label: 'July' },
    { v: '08', label: 'August' },
    { v: '09', label: 'September' },
    { v: '10', label: 'October' },
    { v: '11', label: 'November' },
    { v: '12', label: 'December' },
  ];
  const dobDays = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  return (
    <div className='bg-white rounded-lg shadow p-6'>
      <h2 className='text-2xl font-bold text-gray-900 mb-6'>Profile</h2>

      <div className='space-y-6'>
        {/* Profile Picture */}
        <div className='flex items-center gap-4'>
          <div className='relative'>
            <div className='relative w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden'>
              {avatarUrl ? (
                <Image src={avatarUrl} alt='Profile' fill className='object-cover' />
              ) : (
                <User size={40} className='text-gray-400' />
              )}
            </div>
            <label
              htmlFor='avatar-upload'
              className='absolute bottom-0 right-0 w-8 h-8 bg-[#178da6] hover:bg-[#14758c] rounded-full flex items-center justify-center cursor-pointer transition shadow-lg'
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
            {uploading && <p className='text-sm text-[#178da6] mt-1'>Uploading...</p>}
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
              maxLength={100}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Email</label>
            <input
              type='email'
              value={profile.email}
              onChange={e => setProfile({ ...profile, email: e.target.value })}
              placeholder='john@example.com'
              maxLength={255}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Date of Birth</label>
            {/* Desktop: native date picker (calendar popover works fine with a mouse) */}
            <input
              type='date'
              value={profile.date_of_birth}
              max={maxDobDate}
              onChange={e => setProfile({ ...profile, date_of_birth: e.target.value })}
              className='hidden sm:block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
            {/* Mobile: three dropdowns so users can jump straight to a birth year */}
            <div className='grid grid-cols-3 gap-2 sm:hidden'>
              <select
                value={dobDay}
                onChange={e => updateDob('d', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                aria-label='Day'
              >
                <option value=''>Day</option>
                {dobDays.map(d => (
                  <option key={d} value={d}>
                    {Number(d)}
                  </option>
                ))}
              </select>
              <select
                value={dobMonth}
                onChange={e => updateDob('m', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                aria-label='Month'
              >
                <option value=''>Month</option>
                {dobMonths.map(m => (
                  <option key={m.v} value={m.v}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={dobYear}
                onChange={e => updateDob('y', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                aria-label='Year'
              >
                <option value=''>Year</option>
                {dobYears.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Gender</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value as 'M' | 'F' | '')}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            >
              <option value=''>Not set</option>
              <option value='M'>Male</option>
              <option value='F'>Female</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Phone Number</label>
            <input
              type='tel'
              value={profile.phone_number}
              onChange={e => setProfile({ ...profile, phone_number: e.target.value })}
              placeholder='+49 123 456789'
              maxLength={30}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Height (cm)</label>
            <input
              type='number'
              value={profile.height_cm}
              onChange={e => setProfile({ ...profile, height_cm: e.target.value })}
              placeholder='175'
              min={50}
              max={250}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
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
              min={20}
              max={300}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Emergency Contact Name</label>
            <input
              type='text'
              value={profile.emergency_contact_name}
              onChange={e => setProfile({ ...profile, emergency_contact_name: e.target.value })}
              placeholder='Jane Doe'
              maxLength={100}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Contact Phone</label>
            <input
              type='tel'
              value={profile.emergency_contact_phone}
              onChange={e => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
              placeholder='+49 123 456789'
              maxLength={30}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
          </div>
        </div>

        {/* Save Button */}
        <div className='flex justify-end'>
          <button
            onClick={handleSaveProfile}
            className='px-6 py-2 bg-[#178da6] hover:bg-[#14758c] text-white font-medium rounded-lg transition'
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
