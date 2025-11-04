'use client';

import AthleteWorkoutsTab from '@/components/AthleteWorkoutsTab';
import { getCurrentUser, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  Award,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Edit2,
  LogOut,
  Shield,
  Trash2,
  Trophy,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TabName = 'profile' | 'workouts' | 'logbook' | 'benchmarks' | 'lifts' | 'records' | 'security';

export default function AthleteDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabName>('profile');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logbookDate, setLogbookDate] = useState(new Date());
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Array<{id: string, display_name: string, relationship: string}>>([]);
  const [selectedProfileName, setSelectedProfileName] = useState('');

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const user = await getCurrentUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // First check if user is an active member with athlete access
      const { data: member } = await supabase
        .from('members')
        .select('id, name, status, athlete_subscription_status, athlete_subscription_end, display_name')
        .eq('id', user.id)
        .single();

      // If they're a member, check their status and athlete access
      if (member) {
        if (member.status !== 'active') {
          alert('Your account is pending approval. Please wait for coach approval.');
          router.push('/member/book');
          return;
        }

        // Check athlete access
        const now = new Date();
        const trialEnd = member.athlete_subscription_end ? new Date(member.athlete_subscription_end) : null;
        const hasAccess =
          member.athlete_subscription_status === 'active' ||
          (member.athlete_subscription_status === 'trial' && trialEnd && trialEnd > now);

        if (!hasAccess) {
          alert('Your athlete page access has expired. Please contact the coach to renew.');
          router.push('/member/book');
          return;
        }

        // Member has access - allow them to use athlete page
        setUserName(member.display_name || user.user_metadata?.full_name || user.email || 'Athlete');
        setUserId(user.id);
        setActiveProfileId(user.id); // Default to primary user
        setSelectedProfileName(member.display_name || user.user_metadata?.full_name || user.email || 'Athlete');

        // Fetch family members
        const { data: familyMembersData } = await supabase
          .from('members')
          .select('id, display_name, relationship')
          .eq('primary_member_id', user.id)
          .eq('account_type', 'family_member')
          .order('display_name');

        setFamilyMembers(familyMembersData || []);
        setLoading(false);
        return;
      }

      // If not a member, check if they're a coach (redirect coaches who aren't members)
      const role = user.user_metadata?.role;
      if (role === 'coach') {
        router.push('/coach');
        return;
      }

      // Not a member and not a coach - redirect to login
      router.push('/login');
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#208479] mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as TabName, label: 'Profile', icon: User },
    { id: 'workouts' as TabName, label: 'Workouts', icon: Calendar },
    { id: 'logbook' as TabName, label: 'Athlete Logbook', icon: BookOpen },
    { id: 'benchmarks' as TabName, label: 'Benchmark Workouts', icon: Trophy },
    { id: 'lifts' as TabName, label: 'Barbell Lifts', icon: Dumbbell },
    { id: 'records' as TabName, label: 'Personal Records', icon: Award },
    { id: 'security' as TabName, label: 'Access & Security', icon: Shield },
  ];

  const renderTabContent = () => {
    if (!userId || !activeProfileId) return null;

    switch (activeTab) {
      case 'profile':
        return <ProfileTab userName={selectedProfileName} userId={activeProfileId} />;
      case 'workouts':
        return <AthleteWorkoutsTab
          userId={activeProfileId}
          onNavigateToLogbook={(date) => {
            setLogbookDate(date);
            setActiveTab('logbook');
          }}
        />;
      case 'logbook':
        return <LogbookTab userId={activeProfileId} initialDate={logbookDate} />;
      case 'benchmarks':
        return <BenchmarksTab userId={activeProfileId} />;
      case 'lifts':
        return <LiftsTab userId={activeProfileId} />;
      case 'records':
        return <RecordsTab userId={activeProfileId} />;
      case 'security':
        return <SecurityTab />;
      default:
        return null;
    }
  };

  // Handle profile selection
  const handleProfileChange = (profileId: string) => {
    setActiveProfileId(profileId);
    const selectedMember = familyMembers.find(m => m.id === profileId);
    if (selectedMember) {
      setSelectedProfileName(selectedMember.display_name);
    } else if (profileId === userId) {
      setSelectedProfileName(userName);
    }
  };

  return (
    <div className='min-h-screen bg-gray-100'>
      {/* Header */}
      <div className='bg-white shadow'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>The Forge</h1>
              <p className='text-sm text-gray-600'>Welcome back, {userName}</p>
              {/* Profile Selector */}
              {(familyMembers.length > 0 || activeProfileId) && (
                <div className='mt-2'>
                  <label className='block text-xs font-medium text-gray-500 mb-1'>Viewing as:</label>
                  <select
                    value={activeProfileId || userId || ''}
                    onChange={(e) => handleProfileChange(e.target.value)}
                    className='px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#208479] focus:border-transparent'
                  >
                    <option value={userId}>{userName}</option>
                    {familyMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => router.push('/member/book')}
                className='flex items-center gap-2 bg-[#208479] hover:bg-[#1a6b62] text-white px-6 py-3 rounded-lg font-medium transition'
              >
                <Calendar size={18} />
                Book a Class
              </button>
              <button
                onClick={handleLogout}
                className='flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition text-gray-700'
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className='bg-white border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <nav className='flex space-x-8 overflow-x-auto'>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition
                    ${
                      isActive
                        ? 'border-[#208479] text-[#208479]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>{renderTabContent()}</div>
    </div>
  );
}

// Profile Tab Component
function ProfileTab({ userName, userId }: { userName: string; userId: string }) {
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
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
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
      alert('Avatar uploaded successfully! Click "Save Changes" to update your profile.');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to upload avatar: ${errorMessage}`);
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
              placeholder='180'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Weight (kg)</label>
            <input
              type='number'
              value={profile.weight_kg}
              onChange={e => setProfile({ ...profile, weight_kg: e.target.value })}
              placeholder='75'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Emergency Contact</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Contact Name</label>
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

// Logbook Tab Component
function LogbookTab({ userId, initialDate }: { userId: string; initialDate?: Date }) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [attendedWorkouts, setAttendedWorkouts] = useState<WOD[]>([]);

  const fetchAttendedWorkoutsForPeriod = async (startDate: Date, endDate: Date) => {
    setLoading(true);
    try {
      // Format dates in local timezone to avoid UTC conversion issues
      const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      // Fetch published WODs in date range
      const { data: wodsData, error: wodsError } = await supabase
        .from('wods')
        .select(
          `*, tracks (name, color), workout_types (name)`
        )
        .gte('date', startStr)
        .lte('date', endStr)
        .eq('is_published', true)
        .order('date', { ascending: true });

      if (wodsError) throw wodsError;

      // Filter to only workouts user attended (confirmed bookings)
      const attendedWods = await Promise.all(
        (wodsData || []).map(async (wod) => {
          const { data: session } = await supabase
            .from('weekly_sessions')
            .select('id')
            .eq('workout_id', wod.id)
            .maybeSingle();

          if (!session) return null;

          const { data: booking } = await supabase
            .from('bookings')
            .select('status')
            .eq('session_id', session.id)
            .eq('member_id', userId)
            .eq('status', 'confirmed')
            .maybeSingle();

          return booking ? wod : null;
        })
      );

      const filteredWorkouts = attendedWods.filter((w): w is WOD => w !== null);
      setAttendedWorkouts(filteredWorkouts);

      // Fetch logs for attended workouts
      const { data: logsData } = await supabase
        .from('workout_logs')
        .select('*')
        .gte('workout_date', startStr)
        .lte('workout_date', endStr)
        .eq('user_id', userId);

      const logsMap: Record<string, { result: string; notes: string; date: string }> = {};
      (logsData || []).forEach((log) => {
        if (log.wod_id) {
          logsMap[log.wod_id] = {
            result: log.result || '',
            notes: log.notes || '',
            date: log.workout_date,
          };
        }
      });
      setWorkoutLogs(logsMap);
    } catch (error) {
      console.error('Error fetching attended workouts:', error);
      setAttendedWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);
  interface WOD {
    id: string;
    title: string;
    date: string;
    tracks?: { name: string; color: string };
    workout_types?: { name: string };
    sections: Array<{ id: string; type: string; content: string; duration?: string }>;
    published_section_ids?: string[];
  }

  const [wods, setWods] = useState<WOD[]>([]);
  const [loading, setLoading] = useState(true);
  const [workoutLogs, setWorkoutLogs] = useState<
    Record<string, { result: string; notes: string; date: string }>
  >({});

  useEffect(() => {
    if (viewMode === 'day') {
      fetchWODsForDate(selectedDate);
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates(selectedDate);
      fetchAttendedWorkoutsForPeriod(weekDates[0], weekDates[6]);
    } else if (viewMode === 'month') {
      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      fetchAttendedWorkoutsForPeriod(monthStart, monthEnd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, userId, viewMode]);

  const fetchWODsForDate = async (date: Date) => {
    setLoading(true);
    const dateStr = date.toISOString().split('T')[0];

    try {
      // Fetch published WODs for this date
      const { data: wodsData, error: wodsError } = await supabase
        .from('wods')
        .select(
          `
          *,
          tracks (name, color),
          workout_types (name)
        `
        )
        .eq('date', dateStr)
        .eq('is_published', true);

      if (wodsError) throw wodsError;

      // Filter to only workouts user attended (confirmed bookings)
      const attendedWods = await Promise.all(
        (wodsData || []).map(async (wod) => {
          // Get session for this workout
          const { data: session } = await supabase
            .from('weekly_sessions')
            .select('id')
            .eq('workout_id', wod.id)
            .maybeSingle();

          if (!session) return null;

          const { data: booking } = await supabase
            .from('bookings')
            .select('status')
            .eq('session_id', session.id)
            .eq('member_id', userId)
            .eq('status', 'confirmed')
            .maybeSingle();

          return booking ? wod : null;
        })
      );

      const filteredWorkouts = attendedWods.filter((w): w is WOD => w !== null);
      setWods(filteredWorkouts);

      // Fetch existing workout logs for attended workouts for this user
      const { data: logsData, error: logsError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('workout_date', dateStr)
        .eq('user_id', userId);

      if (logsError) throw logsError;

      // Convert logs array to object keyed by wod_id
      interface WorkoutLog {
        wod_id: string | null;
        result: string | null;
        notes: string | null;
        workout_date: string;
      }
      const logsMap: Record<string, { result: string; notes: string; date: string }> = {};
      (logsData || []).forEach((log: WorkoutLog) => {
        if (log.wod_id) {
          logsMap[log.wod_id] = {
            result: log.result || '',
            notes: log.notes || '',
            date: log.workout_date || dateStr,
          };
        }
      });
      setWorkoutLogs(logsMap);
    } catch (error) {
      console.error('Error fetching WODs:', error);
      setWods([]);
      setWorkoutLogs({});
    } finally {
      setLoading(false);
    }
  };

  const getPublishedSections = (wod: WOD) => {
    if (!wod.published_section_ids || wod.published_section_ids.length === 0) {
      return wod.sections;
    }
    return wod.sections.filter(section =>
      wod.published_section_ids?.includes(section.id)
    );
  };

  const handleSaveWorkoutLog = async (wodId: string) => {
    const log = workoutLogs[wodId];
    if (!log || (!log.result && !log.notes)) return;

    try {
      const dateStr = log.date;

      // Check if a log already exists for this WOD and user
      const { data: existingLogs, error: fetchError } = await supabase
        .from('workout_logs')
        .select('id')
        .eq('wod_id', wodId)
        .eq('workout_date', dateStr)
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        throw fetchError;
      }

      if (existingLogs) {
        // Update existing log
        const { error } = await supabase
          .from('workout_logs')
          .update({
            result: log.result || null,
            notes: log.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLogs.id);

        if (error) throw error;
      } else {
        // Insert new log
        const { error } = await supabase.from('workout_logs').insert({
          user_id: userId,
          wod_id: wodId,
          workout_date: dateStr,
          result: log.result || null,
          notes: log.notes || null,
        });

        if (error) throw error;
      }

      alert('Workout log saved successfully!');
    } catch (error) {
      console.error('Error saving workout log:', error);
      alert('Failed to save workout log. Please try again.');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getWeekDates = (date: Date): Date[] => {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay() + 1; // Monday
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr);
      d.setDate(first + i);
      dates.push(d);
    }
    return dates;
  };

  const previousPeriod = () => {
    if (viewMode === 'week') {
      previousWeek();
    } else if (viewMode === 'day') {
      previousDay();
    } else if (viewMode === 'month') {
      previousMonth();
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'week') {
      nextWeek();
    } else if (viewMode === 'day') {
      nextDay();
    } else if (viewMode === 'month') {
      nextMonth();
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const previousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const previousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const previousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const weekDates = getWeekDates(selectedDate);
  const weekLabel = `${weekDates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className='space-y-6'>
      {/* Date Navigation */}
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex items-center justify-between mb-4'>
          <button
            onClick={previousPeriod}
            className='p-2 hover:bg-gray-100 rounded-lg transition text-gray-700'
          >
            <ChevronLeft size={24} />
          </button>

          <div className='text-center'>
            {viewMode === 'week' ? (
              <>
                <h2 className='text-xl font-bold text-gray-900'>{weekLabel}</h2>
                <p className='text-sm text-gray-600'>Week View</p>
              </>
            ) : viewMode === 'month' ? (
              <>
                <h2 className='text-xl font-bold text-gray-900'>
                  {selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </h2>
                <p className='text-sm text-gray-600'>Month View</p>
              </>
            ) : (
              <>
                <h2 className='text-xl font-bold text-gray-900'>{formatDate(selectedDate)}</h2>
                {isToday(selectedDate) && (
                  <span className='text-sm text-[#208479] font-medium'>Today</span>
                )}
              </>
            )}
          </div>

          <button
            onClick={nextPeriod}
            className='p-2 hover:bg-gray-100 rounded-lg transition text-gray-700'
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className='flex justify-center mb-4'>
          <div className='inline-flex rounded-lg border border-gray-300 p-1 bg-gray-50'>
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
                viewMode === 'day'
                  ? 'bg-[#208479] text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
                viewMode === 'week'
                  ? 'bg-[#208479] text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
                viewMode === 'month'
                  ? 'bg-[#208479] text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {!isToday(selectedDate) && (
          <div className='text-center'>
            <button
              onClick={goToToday}
              className='text-[#208479] hover:text-[#1a6b62] font-medium text-sm'
            >
              Go to Today
            </button>
          </div>
        )}
      </div>

      {/* WODs Display */}
      {/* Day View - Keep existing */}
      {viewMode === 'day' && (
        loading ? (
          <div className='bg-white rounded-lg shadow p-6 text-center text-gray-500'>
            Loading workouts...
          </div>
        ) : wods.length === 0 ? (
          <div className='bg-white rounded-lg shadow p-6 text-center text-gray-500'>
            No workouts scheduled for this day
          </div>
        ) : (
          <div className='space-y-4'>
            {wods.map(wod => (
              <div key={wod.id} className='bg-white rounded-lg shadow p-6'>
                {/* WOD Header */}
                <div className='flex items-start justify-between mb-4'>
                  <div>
                    <h3 className='text-xl font-bold text-gray-900'>{wod.title}</h3>
                    <div className='flex items-center gap-3 mt-2 text-sm text-gray-600'>
                      {wod.tracks && (
                        <span
                          className='px-2 py-1 rounded text-white'
                          style={{ backgroundColor: wod.tracks.color }}
                        >
                          {wod.tracks.name}
                        </span>
                      )}
                      {wod.workout_types && (
                        <span className='px-2 py-1 bg-gray-200 rounded text-gray-700'>
                          {wod.workout_types.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* WOD Sections */}
                <div className='space-y-4'>
                  {getPublishedSections(wod).map((section, index: number) => (
                    <div key={section.id || index} className='border-l-4 border-[#208479] pl-4'>
                      <div className='flex items-center gap-2 mb-2'>
                        <h4 className='font-semibold text-gray-900'>{section.type}</h4>
                        {section.duration && (
                          <span className='text-sm text-gray-600 flex items-center gap-1'>
                            <Clock size={14} />
                            {section.duration} min
                          </span>
                        )}
                      </div>
                      <p className='text-gray-700 whitespace-pre-wrap'>{section.content}</p>
                    </div>
                  ))}
                </div>

                {/* Workout Notes Section */}
                <div className='mt-6 pt-6 border-t border-gray-200'>
                  <h4 className='font-semibold text-gray-900 mb-3'>My Notes & Results</h4>

                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
                      <input
                        type='date'
                        value={workoutLogs[wod.id]?.date || selectedDate.toISOString().split('T')[0]}
                        onChange={e =>
                          setWorkoutLogs({
                            ...workoutLogs,
                            [wod.id]: {
                              result: workoutLogs[wod.id]?.result || '',
                              notes: workoutLogs[wod.id]?.notes || '',
                              date: e.target.value,
                            },
                          })
                        }
                        className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Result/Time
                      </label>
                      <input
                        type='text'
                        value={workoutLogs[wod.id]?.result || ''}
                        onChange={e =>
                          setWorkoutLogs({
                            ...workoutLogs,
                            [wod.id]: {
                              result: e.target.value,
                              notes: workoutLogs[wod.id]?.notes || '',
                              date:
                                workoutLogs[wod.id]?.date || selectedDate.toISOString().split('T')[0],
                            },
                          })
                        }
                        placeholder='e.g., 12:45, 15 rounds, 100 kg'
                        className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>Notes</label>
                      <textarea
                        value={workoutLogs[wod.id]?.notes || ''}
                        onChange={e =>
                          setWorkoutLogs({
                            ...workoutLogs,
                            [wod.id]: {
                              result: workoutLogs[wod.id]?.result || '',
                              notes: e.target.value,
                              date:
                                workoutLogs[wod.id]?.date || selectedDate.toISOString().split('T')[0],
                            },
                          })
                        }
                        placeholder='How did it feel? Any modifications? What went well?'
                        rows={4}
                        className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none'
                      />
                    </div>

                    <div className='flex justify-end'>
                      <button
                        onClick={() => handleSaveWorkoutLog(wod.id)}
                        className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
                      >
                        Save Log Entry
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Week View - Accordion List */}
      {viewMode === 'week' && (
        loading ? (
          <div className='bg-white rounded-lg shadow p-6 text-center text-gray-500'>Loading...</div>
        ) : attendedWorkouts.length === 0 ? (
          <div className='bg-white rounded-lg shadow p-6 text-center text-gray-500'>
            No attended workouts this week
          </div>
        ) : (
          <div className='space-y-3'>
            {attendedWorkouts.map((wod) => {
              const isExpanded = expandedWorkoutId === wod.id;
              return (
                <div key={wod.id} className='bg-white rounded-lg shadow overflow-hidden'>
                  {/* Clickable Header */}
                  <button
                    onClick={() => setExpandedWorkoutId(isExpanded ? null : wod.id)}
                    className='w-full p-4 flex items-center justify-between hover:bg-gray-50 transition text-left'
                  >
                    <div className='flex items-center gap-3'>
                      {wod.tracks && (
                        <div className='w-3 h-3 rounded-full flex-shrink-0' style={{ backgroundColor: wod.tracks.color }} />
                      )}
                      <div>
                        <h3 className='font-bold text-gray-900'>{wod.title}</h3>
                        <p className='text-sm text-gray-600'>
                          {new Date(wod.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={20} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className='p-4 border-t border-gray-200'>
                      {/* Workout Sections */}
                      <div className='space-y-4 mb-6'>
                        {getPublishedSections(wod).map((section, index) => (
                          <div key={section.id || index} className='border-l-4 border-[#208479] pl-4'>
                            <div className='flex items-center gap-2 mb-2'>
                              <h4 className='font-semibold text-gray-900'>{section.type}</h4>
                              {section.duration && (
                                <span className='text-sm text-gray-600 flex items-center gap-1'>
                                  <Clock size={14} />
                                  {section.duration} min
                                </span>
                              )}
                            </div>
                            <p className='text-gray-700 whitespace-pre-wrap'>{section.content}</p>
                          </div>
                        ))}
                      </div>

                      {/* Log Entry Form */}
                      <div className='pt-6 border-t border-gray-200'>
                        <h4 className='font-semibold text-gray-900 mb-3'>My Notes & Results</h4>
                        <div className='space-y-4'>
                          <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
                            <input
                              type='date'
                              value={workoutLogs[wod.id]?.date || wod.date}
                              onChange={e =>
                                setWorkoutLogs({
                                  ...workoutLogs,
                                  [wod.id]: {
                                    result: workoutLogs[wod.id]?.result || '',
                                    notes: workoutLogs[wod.id]?.notes || '',
                                    date: e.target.value,
                                  },
                                })
                              }
                              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479]
  focus:border-transparent text-gray-900'
                            />
                          </div>
                          <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Result/Time</label>
                            <input
                              type='text'
                              value={workoutLogs[wod.id]?.result || ''}
                              onChange={e =>
                                setWorkoutLogs({
                                  ...workoutLogs,
                                  [wod.id]: {
                                    result: e.target.value,
                                    notes: workoutLogs[wod.id]?.notes || '',
                                    date: workoutLogs[wod.id]?.date || wod.date,
                                  },
                                })
                              }
                              placeholder='e.g., 12:45, 15 rounds, 100 kg'
                              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479]
  focus:border-transparent text-gray-900'
                            />
                          </div>
                          <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Notes</label>
                            <textarea
                              value={workoutLogs[wod.id]?.notes || ''}
                              onChange={e =>
                                setWorkoutLogs({
                                  ...workoutLogs,
                                  [wod.id]: {
                                    result: workoutLogs[wod.id]?.result || '',
                                    notes: e.target.value,
                                    date: workoutLogs[wod.id]?.date || wod.date,
                                  },
                                })
                              }
                              placeholder='How did it feel? Any modifications?'
                              rows={4}
                              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479]
  focus:border-transparent text-gray-900 resize-none'
                            />
                          </div>
                          <div className='flex justify-end'>
                            <button
                              onClick={() => handleSaveWorkoutLog(wod.id)}
                              className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
                            >
                              Save Log Entry
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Month View - Calendar Grid */}
      {viewMode === 'month' && (
        loading ? (
          <div className='bg-white rounded-lg shadow p-6 text-center text-gray-500'>Loading...</div>
        ) : (
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='grid grid-cols-7 gap-2'>
              {/* Day headers */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className='text-center text-xs font-semibold text-gray-600 p-2'>{day}</div>
              ))}

              {/* Calendar days */}
              {(() => {
                const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
                const startDay = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1; // Monday = 0
                const days = [];

                // Empty cells before month starts
                for (let i = 0; i < startDay; i++) {
                  days.push(<div key={`empty-${i}`} className='p-2' />);
                }

                // Month days
                for (let day = 1; day <= monthEnd.getDate(); day++) {
                  const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                  // Format date in local timezone to avoid UTC conversion issues
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  const workout = attendedWorkouts.find(w => w.date === dateStr);
                  const isToday = new Date().toDateString() === date.toDateString();

                  days.push(
                    <div
                      key={day}
                      onClick={() => workout && setExpandedWorkoutId(workout.id)}
                      className={`p-2 min-h-[60px] rounded-lg border transition ${
                        workout
                          ? 'border-[#208479] bg-teal-50 cursor-pointer hover:bg-teal-100'
                          : 'border-gray-200 bg-gray-50'
                      } ${isToday ? 'ring-2 ring-[#7dd3c0]' : ''}`}
                    >
                      <div className={`text-sm font-semibold ${workout ? 'text-[#208479]' : 'text-gray-400'}`}>
                        {day}
                      </div>
                      {workout && (
                        <div className='mt-1 text-xs text-gray-700 truncate'>{workout.title}</div>
                      )}
                    </div>
                  );
                }

                return days;
              })()}
            </div>

            {/* Expanded workout details below calendar */}
            {expandedWorkoutId && attendedWorkouts.find(w => w.id === expandedWorkoutId) && (
              <div className='mt-6 pt-6 border-t border-gray-200'>
                {(() => {
                  const wod = attendedWorkouts.find(w => w.id === expandedWorkoutId)!;
                  return (
                    <div>
                      <div className='flex items-center justify-between mb-4'>
                        <div className='flex items-center gap-3'>
                          {wod.tracks && (
                            <div className='w-3 h-3 rounded-full' style={{ backgroundColor: wod.tracks.color }} />
                          )}
                          <div>
                            <h3 className='text-xl font-bold text-gray-900'>{wod.title}</h3>
                            <p className='text-sm text-gray-600'>
                              {new Date(wod.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setExpandedWorkoutId(null)}
                          className='text-gray-400 hover:text-gray-600'
                        >
                          ✕
                        </button>
                      </div>

                      {/* Workout sections */}
                      <div className='space-y-4 mb-6'>
                        {getPublishedSections(wod).map((section, index) => (
                          <div key={section.id || index} className='border-l-4 border-[#208479] pl-4'>
                            <div className='flex items-center gap-2 mb-2'>
                              <h4 className='font-semibold text-gray-900'>{section.type}</h4>
                              {section.duration && (
                                <span className='text-sm text-gray-600 flex items-center gap-1'>
                                  <Clock size={14} />
                                  {section.duration} min
                                </span>
                              )}
                            </div>
                            <p className='text-gray-700 whitespace-pre-wrap'>{section.content}</p>
                          </div>
                        ))}
                      </div>

                      {/* Log form - same as week view */}
                      <div className='pt-6 border-t border-gray-200'>
                        <h4 className='font-semibold text-gray-900 mb-3'>My Notes & Results</h4>
                        <div className='space-y-4'>
                          <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
                            <input
                              type='date'
                              value={workoutLogs[wod.id]?.date || wod.date}
                              onChange={e =>
                                setWorkoutLogs({
                                  ...workoutLogs,
                                  [wod.id]: {
                                    result: workoutLogs[wod.id]?.result || '',
                                    notes: workoutLogs[wod.id]?.notes || '',
                                    date: e.target.value,
                                  },
                                })
                              }
                              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479]
  focus:border-transparent text-gray-900'
                            />
                          </div>
                          <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Result/Time</label>
                            <input
                              type='text'
                              value={workoutLogs[wod.id]?.result || ''}
                              onChange={e =>
                                setWorkoutLogs({
                                  ...workoutLogs,
                                  [wod.id]: {
                                    result: e.target.value,
                                    notes: workoutLogs[wod.id]?.notes || '',
                                    date: workoutLogs[wod.id]?.date || wod.date,
                                  },
                                })
                              }
                              placeholder='e.g., 12:45, 15 rounds, 100 kg'
                              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479]
  focus:border-transparent text-gray-900'
                            />
                          </div>
                          <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Notes</label>
                            <textarea
                              value={workoutLogs[wod.id]?.notes || ''}
                              onChange={e =>
                                setWorkoutLogs({
                                  ...workoutLogs,
                                  [wod.id]: {
                                    result: workoutLogs[wod.id]?.result || '',
                                    notes: e.target.value,
                                    date: workoutLogs[wod.id]?.date || wod.date,
                                  },
                                })
                              }
                              placeholder='How did it feel? Any modifications?'
                              rows={4}
                              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479]
  focus:border-transparent text-gray-900 resize-none'
                            />
                          </div>
                          <div className='flex justify-end'>
                            <button
                              onClick={() => handleSaveWorkoutLog(wod.id)}
                              className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
                            >
                              Save Log Entry
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

// Benchmarks Tab Component
function BenchmarksTab({ userId }: { userId: string }) {
  interface BenchmarkResult {
    id: string;
    benchmark_name: string;
    result: string;
    notes?: string;
    workout_date: string;
    scaling?: string;
  }

  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);
  const [chartBenchmark, setChartBenchmark] = useState<string | null>(null);
  const [newTime, setNewTime] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newScaling, setNewScaling] = useState<'Rx' | 'Sc1' | 'Sc2' | 'Sc3'>('Rx');
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkResult[]>([]);
  const [editingBenchmarkId, setEditingBenchmarkId] = useState<string | null>(null);

  useEffect(() => {
    fetchBenchmarkHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const benchmarks = [
    {
      name: 'Fran',
      type: 'For Time',
      description: '21-15-9 reps of:\nThrusters (43/29 kg)\nPull-ups',
    },
    {
      name: 'Helen',
      type: 'For Time',
      description: '3 rounds for time:\n400m Run\n21 KB Swings (24/16 kg)\n12 Pull-ups',
    },
    {
      name: 'Cindy',
      type: 'AMRAP 20',
      description: 'AMRAP in 20 minutes:\n5 Pull-ups\n10 Push-ups\n15 Air Squats',
    },
    {
      name: 'Grace',
      type: 'For Time',
      description: 'For time:\n30 Clean & Jerks (61/43 kg)',
    },
    {
      name: 'Isabel',
      type: 'For Time',
      description: 'For time:\n30 Snatches (61/43 kg)',
    },
    {
      name: 'Annie',
      type: 'For Time',
      description: '50-40-30-20-10 reps of:\nDouble Unders\nSit-ups',
    },
    {
      name: 'Diane',
      type: 'For Time',
      description: '21-15-9 reps of:\nDeadlifts (102/70 kg)\nHandstand Push-ups',
    },
    {
      name: 'Elizabeth',
      type: 'For Time',
      description: '21-15-9 reps of:\nCleans (61/43 kg)\nRing Dips',
    },
    {
      name: 'Kelly',
      type: 'For Time',
      description: '5 rounds for time:\n400m Run\n30 Box Jumps (60/50 cm)\n30 Wall Balls (9/6 kg)',
    },
    {
      name: 'Nancy',
      type: 'For Time',
      description: '5 rounds for time:\n400m Run\n15 Overhead Squats (43/29 kg)',
    },
    {
      name: 'Jackie',
      type: 'For Time',
      description: 'For time:\n1000m Row\n50 Thrusters (20/16 kg)\n30 Pull-ups',
    },
    {
      name: 'Mary',
      type: 'AMRAP 20',
      description:
        'AMRAP in 20 minutes:\n5 Handstand Push-ups\n10 Pistols (alternating)\n15 Pull-ups',
    },
  ];

  const fetchBenchmarkHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('benchmark_results')
        .select('*')
        .eq('user_id', userId)
        .order('workout_date', { ascending: false });

      if (error) throw error;
      setBenchmarkHistory(data || []);
    } catch (error) {
      console.error('Error fetching benchmark history:', error);
    }
  };

  const handleSaveBenchmark = async () => {
    if (!selectedBenchmark || !newTime) return;

    try {
      if (editingBenchmarkId) {
        // Update existing entry
        const { error } = await supabase
          .from('benchmark_results')
          .update({
            benchmark_name: selectedBenchmark,
            result: newTime,
            notes: newNotes || null,
            workout_date: newDate,
            scaling: newScaling,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBenchmarkId);

        if (error) throw error;
      } else {
        // Insert new entry
        const { error } = await supabase.from('benchmark_results').insert({
          user_id: userId,
          benchmark_name: selectedBenchmark,
          result: newTime,
          notes: newNotes || null,
          workout_date: newDate,
          scaling: newScaling,
        });

        if (error) throw error;
      }

      // Refresh the history
      await fetchBenchmarkHistory();

      // Clear form
      setNewTime('');
      setNewNotes('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewScaling('Rx');
      setSelectedBenchmark(null);
      setEditingBenchmarkId(null);
    } catch (error) {
      console.error('Error saving benchmark:', error);
      alert('Failed to save benchmark result. Please try again.');
    }
  };

  const handleEditBenchmark = (entry: BenchmarkResult) => {
    setSelectedBenchmark(entry.benchmark_name);
    setNewTime(entry.result);
    setNewNotes(entry.notes || '');
    setNewDate(entry.workout_date);
    setNewScaling((entry.scaling as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3') || 'Rx');
    setEditingBenchmarkId(entry.id);
  };

  const handleDeleteBenchmark = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this benchmark result? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from('benchmark_results').delete().eq('id', id);

      if (error) throw error;

      // Refresh the history
      await fetchBenchmarkHistory();
    } catch (error) {
      console.error('Error deleting benchmark:', error);
      alert('Failed to delete benchmark result. Please try again.');
    }
  };

  const getBestTime = (benchmarkName: string) => {
    const entries = benchmarkHistory.filter(e => e.benchmark_name === benchmarkName);
    if (entries.length === 0) return null;
    return entries[0].result;
  };

  // Helper function to convert benchmark result strings to numeric values for charting
  const parseResultToNumber = (result: string): number | null => {
    if (!result) return null;

    // Handle time formats: "5:42", "10:30" (minutes:seconds)
    if (result.includes(':')) {
      const [mins, secs] = result.split(':').map(parseFloat);
      return mins + secs / 60; // Convert to decimal minutes
    }

    // Handle rounds + reps format with "+" sign: "5+28", "15+10", "15 rounds + 5"
    if (result.includes('+')) {
      // Extract numbers around the "+" sign
      const plusMatch = result.match(/(\d+)\s*\+\s*(\d+)/);
      if (plusMatch) {
        const rounds = parseInt(plusMatch[1]);
        const reps = parseInt(plusMatch[2]);
        return rounds + reps / 100; // 5+28 = 5.28
      }
    }

    // Handle decimal time format: "10.00", "5.5" (already in decimal minutes for time-based WODs)
    const decimal = parseFloat(result);
    if (!isNaN(decimal) && result.match(/^\d+\.?\d*$/)) {
      return decimal;
    }

    // If we can't parse it, return null (won't show on chart)
    return null;
  };

  const getBenchmarkChartData = (benchmarkName: string) => {
    return benchmarkHistory
      .filter(e => e.benchmark_name === benchmarkName)
      .sort((a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime())
      .map(entry => {
        const numericValue = parseResultToNumber(entry.result);
        return {
          date: new Date(entry.workout_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          result: numericValue,
          resultDisplay: entry.result, // Keep original string for tooltip
          scaling: entry.scaling || 'Rx', // Include scaling for tooltip
          fullDate: entry.workout_date,
        };
      })
      .filter(entry => entry.result !== null); // Only include entries we could parse
  };

  const benchmarksWithHistory = benchmarks
    .map(b => ({
      ...b,
      count: benchmarkHistory.filter(e => e.benchmark_name === b.name).length,
    }))
    .filter(b => b.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className='space-y-6'>
      <div className='bg-white rounded-lg shadow p-6'>
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>Benchmark Workouts</h2>
        <p className='text-gray-600 mb-6'>
          Track your performance on classic CrossFit benchmark WODs.
        </p>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {benchmarks.map(benchmark => {
            const bestTime = getBestTime(benchmark.name);
            return (
              <div
                key={benchmark.name}
                onClick={() => setSelectedBenchmark(benchmark.name)}
                className='border border-gray-300 rounded-lg p-4 hover:border-[#208479] hover:bg-gray-50 cursor-pointer transition'
              >
                <div className='flex items-start justify-between mb-2'>
                  <h3 className='text-lg font-bold text-gray-900'>{benchmark.name}</h3>
                  <Trophy size={20} className='text-[#208479]' />
                </div>
                <p className='text-sm text-gray-600 mb-2'>{benchmark.type}</p>
                <p className='text-sm text-gray-700 whitespace-pre-line mb-3'>
                  {benchmark.description}
                </p>
                {bestTime && (
                  <div className='pt-2 border-t border-gray-200'>
                    <p className='text-xs text-gray-600'>Personal Best:</p>
                    <p className='text-sm font-semibold text-[#208479]'>{bestTime}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Log New Benchmark Modal */}
      {selectedBenchmark && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-lg shadow-xl max-w-md w-full p-6'>
            <h3 className='text-xl font-bold text-gray-900 mb-4'>
              {editingBenchmarkId ? 'Edit' : 'Log'} {selectedBenchmark}
            </h3>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
                <input
                  type='date'
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Time/Result
                  </label>
                  <input
                    type='text'
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    placeholder='e.g., 5:42, 15 rounds + 5'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                    autoFocus
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Scaling</label>
                  <select
                    value={newScaling}
                    onChange={e => setNewScaling(e.target.value as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3')}
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                  >
                    <option value='Rx'>Rx</option>
                    <option value='Sc1'>Sc1</option>
                    <option value='Sc2'>Sc2</option>
                    <option value='Sc3'>Sc3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Notes (optional)
                </label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder='How did it feel? Any modifications?'
                  rows={3}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none'
                />
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                  onClick={() => {
                    setSelectedBenchmark(null);
                    setNewTime('');
                    setNewNotes('');
                    setNewDate(new Date().toISOString().split('T')[0]);
                    setNewScaling('Rx');
                    setEditingBenchmarkId(null);
                  }}
                  className='flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBenchmark}
                  disabled={!newTime}
                  className='flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {editingBenchmarkId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent History */}
      {benchmarkHistory.length > 0 && (
        <div className='bg-white rounded-lg shadow p-6'>
          <h3 className='text-xl font-bold text-gray-900 mb-4'>Recent Benchmark Results</h3>
          <div className='space-y-3'>
            {benchmarkHistory.slice(0, 10).map(entry => (
              <div
                key={entry.id}
                className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
              >
                <div className='flex-1'>
                  <p className='font-semibold text-gray-900'>{entry.benchmark_name}</p>
                  <p className='text-sm text-gray-600'>
                    {new Date(entry.workout_date).toLocaleDateString()}
                  </p>
                </div>
                <div className='text-right flex-1'>
                  <div className='flex items-center justify-end gap-2'>
                    <p className='font-semibold text-[#208479]'>{entry.result}</p>
                    <span className='px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded'>
                      {entry.scaling || 'Rx'}
                    </span>
                  </div>
                  {entry.notes && <p className='text-sm text-gray-600'>{entry.notes}</p>}
                </div>
                <div className='flex items-center gap-2 ml-4'>
                  <button
                    onClick={() => handleEditBenchmark(entry)}
                    className='p-2 text-gray-600 hover:text-[#208479] hover:bg-gray-200 rounded transition'
                    title='Edit entry'
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteBenchmark(entry.id)}
                    className='p-2 text-gray-600 hover:text-red-600 hover:bg-gray-200 rounded transition'
                    title='Delete entry'
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Charts */}
      {benchmarksWithHistory.length > 0 && (
        <div className='bg-white rounded-lg shadow p-6'>
          <h3 className='text-xl font-bold text-gray-900 mb-4'>Progress Charts</h3>
          <p className='text-sm text-gray-600 mb-4'>
            Select a benchmark to view your progress over time
          </p>

          <div className='flex flex-wrap gap-2 mb-6'>
            {benchmarksWithHistory.map(benchmark => (
              <button
                key={benchmark.name}
                onClick={() =>
                  setChartBenchmark(chartBenchmark === benchmark.name ? null : benchmark.name)
                }
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  chartBenchmark === benchmark.name
                    ? 'bg-[#208479] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {benchmark.name} ({benchmark.count})
              </button>
            ))}
          </div>

          {chartBenchmark && (
            <div className='mt-4'>
              <h4 className='text-lg font-semibold text-gray-900 mb-4'>
                {chartBenchmark} Progress
              </h4>
              <ResponsiveContainer width='100%' height={300}>
                <LineChart data={getBenchmarkChartData(chartBenchmark)}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className='bg-white p-3 border border-gray-300 rounded shadow-lg'>
                            <p className='text-sm text-gray-900 font-semibold'>
                              {payload[0].payload.date}
                            </p>
                            <p className='text-sm text-[#208479] font-semibold'>
                              Result: {payload[0].payload.resultDisplay}
                            </p>
                            <p className='text-sm text-gray-600'>
                              Scaling: {payload[0].payload.scaling}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey='result'
                    stroke='#208479'
                    strokeWidth={2}
                    name='Result'
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className='text-xs text-gray-600 mt-2 text-center'>
                * Chart shows all recorded results for {chartBenchmark}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Lifts Tab Component
function LiftsTab({ userId }: { userId: string }) {
  const [selectedLift, setSelectedLift] = useState<string | null>(null);
  const [chartLift, setChartLift] = useState<string | null>(null);
  const [chartRepMaxType, setChartRepMaxType] = useState<'1RM' | '3RM' | '5RM' | '10RM'>('1RM');
  interface LiftRecord {
    id: string;
    lift_name: string;
    weight_kg: number;
    reps: number;
    calculated_1rm?: number;
    rep_max_type?: string;
    notes?: string;
    lift_date: string;
  }

  const [newWeight, setNewWeight] = useState('');
  const [newRepMaxType, setNewRepMaxType] = useState<'1RM' | '3RM' | '5RM' | '10RM'>('1RM');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [liftHistory, setLiftHistory] = useState<LiftRecord[]>([]);
  const [editingLiftId, setEditingLiftId] = useState<string | null>(null);

  useEffect(() => {
    fetchLiftHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const lifts = [
    { name: 'Back Squat', category: 'Squat' },
    { name: 'Front Squat', category: 'Squat' },
    { name: 'Overhead Squat', category: 'Squat' },
    { name: 'Deadlift', category: 'Pull' },
    { name: 'Sumo Deadlift', category: 'Pull' },
    { name: 'Bench Press', category: 'Press' },
    { name: 'Shoulder Press', category: 'Press' },
    { name: 'Push Press', category: 'Press' },
    { name: 'Jerk', category: 'Press' },
    { name: 'Clean', category: 'Olympic' },
    { name: 'Snatch', category: 'Olympic' },
    { name: 'Clean & Jerk', category: 'Olympic' },
  ];

  const fetchLiftHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('lift_records')
        .select('*')
        .eq('user_id', userId)
        .order('lift_date', { ascending: false });

      if (error) throw error;
      setLiftHistory(data || []);
    } catch (error) {
      console.error('Error fetching lift history:', error);
    }
  };

  const handleSaveLift = async () => {
    if (!selectedLift || !newWeight) return;

    const weight = parseFloat(newWeight);
    // Get reps from rep max type (1RM = 1 rep, 3RM = 3 reps, etc.)
    const reps = parseInt(newRepMaxType.replace('RM', ''));
    const calculated1RM = calculate1RM(weight, reps);

    try {
      if (editingLiftId) {
        // Update existing entry
        const { error } = await supabase
          .from('lift_records')
          .update({
            lift_name: selectedLift,
            weight_kg: weight,
            reps: reps,
            calculated_1rm: calculated1RM,
            rep_max_type: newRepMaxType,
            notes: newNotes || null,
            lift_date: newDate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLiftId);

        if (error) throw error;
      } else {
        // Insert new entry
        const { error } = await supabase.from('lift_records').insert({
          user_id: userId,
          lift_name: selectedLift,
          weight_kg: weight,
          reps: reps,
          calculated_1rm: calculated1RM,
          rep_max_type: newRepMaxType,
          notes: newNotes || null,
          lift_date: newDate,
        });

        if (error) throw error;
      }

      // Refresh the history
      await fetchLiftHistory();

      // Clear form
      setNewWeight('');
      setNewRepMaxType('1RM');
      setNewNotes('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setSelectedLift(null);
      setEditingLiftId(null);
    } catch (error) {
      console.error('Error saving lift:', error);
      alert('Failed to save lift record. Please try again.');
    }
  };

  const handleEditLift = (entry: LiftRecord) => {
    setSelectedLift(entry.lift_name);
    setNewWeight(entry.weight_kg.toString());
    setNewRepMaxType((entry.rep_max_type as '1RM' | '3RM' | '5RM' | '10RM') || '1RM');
    setNewNotes(entry.notes || '');
    setNewDate(entry.lift_date);
    setEditingLiftId(entry.id);
  };

  const handleDeleteLift = async (id: string) => {
    if (
      !confirm('Are you sure you want to delete this lift record? This action cannot be undone.')
    ) {
      return;
    }

    try {
      const { error } = await supabase.from('lift_records').delete().eq('id', id);

      if (error) throw error;

      // Refresh the history
      await fetchLiftHistory();
    } catch (error) {
      console.error('Error deleting lift:', error);
      alert('Failed to delete lift record. Please try again.');
    }
  };

  const getRepMaxPR = (liftName: string, repMaxType: '1RM' | '3RM' | '5RM' | '10RM') => {
    const entries = liftHistory.filter(
      e => e.lift_name === liftName && e.rep_max_type === repMaxType
    );
    if (entries.length === 0) return null;
    // Return the highest weight for this rep max type
    return Math.max(...entries.map(e => e.weight_kg));
  };

  const getAllRepMaxPRs = (liftName: string) => {
    return {
      '1RM': getRepMaxPR(liftName, '1RM'),
      '3RM': getRepMaxPR(liftName, '3RM'),
      '5RM': getRepMaxPR(liftName, '5RM'),
      '10RM': getRepMaxPR(liftName, '10RM'),
    };
  };

  const calculate1RM = (weight: number, reps: number) => {
    if (reps === 1) return weight;
    // Brzycki Formula: 1RM = weight × (36 / (37 - reps))
    return Math.round(weight * (36 / (37 - reps)));
  };

  const groupedLifts = lifts.reduce(
    (acc, lift) => {
      if (!acc[lift.category]) acc[lift.category] = [];
      acc[lift.category].push(lift);
      return acc;
    },
    {} as Record<string, typeof lifts>
  );

  const getLiftChartData = (liftName: string, repMaxType: '1RM' | '3RM' | '5RM' | '10RM') => {
    return liftHistory
      .filter(e => e.lift_name === liftName && e.rep_max_type === repMaxType)
      .sort((a, b) => new Date(a.lift_date).getTime() - new Date(b.lift_date).getTime())
      .map(entry => ({
        date: new Date(entry.lift_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        weight: entry.weight_kg,
        fullDate: entry.lift_date,
      }));
  };

  const liftsWithHistory = lifts
    .map(lift => {
      const repMaxCounts = {
        '1RM': liftHistory.filter(e => e.lift_name === lift.name && e.rep_max_type === '1RM')
          .length,
        '3RM': liftHistory.filter(e => e.lift_name === lift.name && e.rep_max_type === '3RM')
          .length,
        '5RM': liftHistory.filter(e => e.lift_name === lift.name && e.rep_max_type === '5RM')
          .length,
        '10RM': liftHistory.filter(e => e.lift_name === lift.name && e.rep_max_type === '10RM')
          .length,
      };
      const totalCount = Object.values(repMaxCounts).reduce((sum, count) => sum + count, 0);
      return {
        ...lift,
        repMaxCounts,
        totalCount,
      };
    })
    .filter(lift => lift.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount);

  return (
    <div className='space-y-6'>
      <div className='bg-white rounded-lg shadow p-6'>
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>Barbell Lifts</h2>
        <p className='text-gray-600 mb-6'>
          Track your strength progress on major barbell movements.
        </p>

        {Object.entries(groupedLifts).map(([category, categoryLifts]) => (
          <div key={category} className='mb-6'>
            <h3 className='text-lg font-semibold text-gray-900 mb-3'>{category}</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {categoryLifts.map(lift => {
                const prs = getAllRepMaxPRs(lift.name);
                const hasAnyPR = Object.values(prs).some(pr => pr !== null);
                return (
                  <div
                    key={lift.name}
                    onClick={() => setSelectedLift(lift.name)}
                    className='border border-gray-300 rounded-lg p-4 hover:border-[#208479] hover:bg-gray-50 cursor-pointer transition'
                  >
                    <div className='flex items-start justify-between mb-2'>
                      <h4 className='text-base font-bold text-gray-900'>{lift.name}</h4>
                      <Dumbbell size={18} className='text-[#208479]' />
                    </div>
                    {hasAnyPR ? (
                      <div className='mt-2 grid grid-cols-2 gap-2'>
                        {(['1RM', '3RM', '5RM', '10RM'] as const).map(
                          type =>
                            prs[type] !== null && (
                              <div key={type}>
                                <p className='text-xs text-gray-600'>{type}:</p>
                                <p className='text-sm font-semibold text-[#208479]'>
                                  {prs[type]} kg
                                </p>
                              </div>
                            )
                        )}
                      </div>
                    ) : (
                      <p className='text-sm text-gray-500 mt-2'>No records yet</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Log New Lift Modal */}
      {selectedLift && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-lg shadow-xl max-w-md w-full p-6'>
            <h3 className='text-xl font-bold text-gray-900 mb-4'>
              {editingLiftId ? 'Edit' : 'Log'} {selectedLift}
            </h3>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
                <input
                  type='date'
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Weight (kg)
                  </label>
                  <input
                    type='number'
                    value={newWeight}
                    onChange={e => setNewWeight(e.target.value)}
                    placeholder='100'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                    autoFocus
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Rep Max Type
                  </label>
                  <select
                    value={newRepMaxType}
                    onChange={e =>
                      setNewRepMaxType(e.target.value as '1RM' | '3RM' | '5RM' | '10RM')
                    }
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                  >
                    <option value='1RM'>1RM</option>
                    <option value='3RM'>3RM</option>
                    <option value='5RM'>5RM</option>
                    <option value='10RM'>10RM</option>
                  </select>
                </div>
              </div>

              {newWeight && newRepMaxType !== '1RM' && (
                <div className='bg-gray-50 p-3 rounded-lg'>
                  <p className='text-sm text-gray-600'>Estimated 1RM:</p>
                  <p className='text-lg font-semibold text-[#208479]'>
                    {calculate1RM(parseFloat(newWeight), parseInt(newRepMaxType.replace('RM', '')))}{' '}
                    kg
                  </p>
                </div>
              )}

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Notes (optional)
                </label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder='How did it feel? Any form notes?'
                  rows={3}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none'
                />
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                  onClick={() => {
                    setSelectedLift(null);
                    setNewWeight('');
                    setNewRepMaxType('1RM');
                    setNewNotes('');
                    setNewDate(new Date().toISOString().split('T')[0]);
                    setEditingLiftId(null);
                  }}
                  className='flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLift}
                  disabled={!newWeight}
                  className='flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {editingLiftId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent History */}
      {liftHistory.length > 0 && (
        <div className='bg-white rounded-lg shadow p-6'>
          <h3 className='text-xl font-bold text-gray-900 mb-4'>Recent Lift History</h3>
          <div className='space-y-3'>
            {liftHistory.slice(0, 10).map(entry => (
              <div
                key={entry.id}
                className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
              >
                <div className='flex-1'>
                  <p className='font-semibold text-gray-900'>{entry.lift_name}</p>
                  <p className='text-sm text-gray-600'>
                    {new Date(entry.lift_date).toLocaleDateString()}
                  </p>
                </div>
                <div className='text-right flex-1'>
                  <p className='font-semibold text-[#208479]'>
                    {entry.weight_kg} kg ({entry.rep_max_type || `${entry.reps} reps`})
                  </p>
                  {entry.reps > 1 && (
                    <p className='text-xs text-gray-600'>Est. 1RM: {entry.calculated_1rm} kg</p>
                  )}
                  {entry.notes && <p className='text-sm text-gray-600 mt-1'>{entry.notes}</p>}
                </div>
                <div className='flex items-center gap-2 ml-4'>
                  <button
                    onClick={() => handleEditLift(entry)}
                    className='p-2 text-gray-600 hover:text-[#208479] hover:bg-gray-200 rounded transition'
                    title='Edit entry'
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteLift(entry.id)}
                    className='p-2 text-gray-600 hover:text-red-600 hover:bg-gray-200 rounded transition'
                    title='Delete entry'
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Charts */}
      {liftsWithHistory.length > 0 && (
        <div className='bg-white rounded-lg shadow p-6'>
          <h3 className='text-xl font-bold text-gray-900 mb-4'>Progress Charts</h3>
          <p className='text-sm text-gray-600 mb-4'>
            Select a lift and rep max type to view your progress over time
          </p>

          <div className='mb-6'>
            <div className='flex flex-wrap gap-2 mb-4'>
              {liftsWithHistory.map(lift => (
                <button
                  key={lift.name}
                  onClick={() => {
                    setChartLift(chartLift === lift.name ? null : lift.name);
                    if (chartLift !== lift.name) {
                      // Reset rep max type when switching lifts
                      setChartRepMaxType('1RM');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    chartLift === lift.name
                      ? 'bg-[#208479] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {lift.name} ({lift.totalCount})
                </button>
              ))}
            </div>

            {chartLift && (
              <div className='flex gap-2 mb-4'>
                {(['1RM', '3RM', '5RM', '10RM'] as const).map(type => {
                  const currentLift = liftsWithHistory.find(l => l.name === chartLift);
                  const count = currentLift?.repMaxCounts[type] || 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={type}
                      onClick={() => setChartRepMaxType(type)}
                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                        chartRepMaxType === type
                          ? 'bg-[#1a6b62] text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {type} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {chartLift && (
            <div className='mt-4'>
              <h4 className='text-lg font-semibold text-gray-900 mb-4'>
                {chartLift} - {chartRepMaxType} Progress
              </h4>
              <ResponsiveContainer width='100%' height={300}>
                <LineChart data={getLiftChartData(chartLift, chartRepMaxType)}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey='weight'
                    stroke='#208479'
                    strokeWidth={2}
                    name='Weight (kg)'
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className='text-xs text-gray-600 mt-2 text-center'>
                * Chart shows all recorded {chartRepMaxType} attempts for {chartLift}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Records Tab Component
function RecordsTab({ userId }: { userId: string }) {
  const [benchmarkPRs, setBenchmarkPRs] = useState<BenchmarkResult[]>([]);
  const [liftPRs, setLiftPRs] = useState<LiftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  interface BenchmarkResult {
    id: string;
    benchmark_name: string;
    result: string;
    workout_date: string;
  }

  interface LiftRecord {
    id: string;
    lift_name: string;
    weight_kg: number;
    calculated_1rm?: number;
    lift_date: string;
  }

  useEffect(() => {
    fetchPersonalRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchPersonalRecords = async () => {
    setLoading(true);
    try {
      // Fetch benchmark PRs (best result per benchmark) for this user
      const { data: benchmarkData, error: benchmarkError } = await supabase
        .from('benchmark_results')
        .select('*')
        .eq('user_id', userId)
        .order('workout_date', { ascending: false });

      if (benchmarkError) throw benchmarkError;

      // Group by benchmark_name and keep only the most recent (which we'll assume is the best)
      const benchmarkMap = new Map<string, BenchmarkResult>();
      (benchmarkData || []).forEach((entry: BenchmarkResult) => {
        if (!benchmarkMap.has(entry.benchmark_name)) {
          benchmarkMap.set(entry.benchmark_name, entry);
        }
      });
      setBenchmarkPRs(Array.from(benchmarkMap.values()));

      // Fetch lift PRs (highest 1RM per lift) for this user
      const { data: liftData, error: liftError } = await supabase
        .from('lift_records')
        .select('*')
        .eq('user_id', userId)
        .order('calculated_1rm', { ascending: false });

      if (liftError) throw liftError;

      // Group by lift_name and keep only the highest 1RM
      const liftMap = new Map<string, LiftRecord>();
      (liftData || []).forEach((entry: LiftRecord) => {
        const current1RM = entry.calculated_1rm || entry.weight_kg;
        const existing = liftMap.get(entry.lift_name);

        if (!existing || current1RM > (existing.calculated_1rm || existing.weight_kg)) {
          liftMap.set(entry.lift_name, entry);
        }
      });
      setLiftPRs(Array.from(liftMap.values()));
    } catch (error) {
      console.error('Error fetching personal records:', error);
      setBenchmarkPRs([]);
      setLiftPRs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='bg-white rounded-lg shadow p-6 text-center text-gray-500'>
        Loading personal records...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='bg-white rounded-lg shadow p-6'>
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>Personal Records</h2>
        <p className='text-gray-600 mb-6'>All your personal bests in one place.</p>

        {/* Summary Stats */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
          <div className='bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200'>
            <p className='text-sm text-teal-700 font-medium mb-1'>Total PRs</p>
            <p className='text-3xl font-bold text-teal-900'>
              {benchmarkPRs.length + liftPRs.length}
            </p>
          </div>
          <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200'>
            <p className='text-sm text-blue-700 font-medium mb-1'>Benchmark WODs</p>
            <p className='text-3xl font-bold text-blue-900'>{benchmarkPRs.length}</p>
          </div>
          <div className='bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200'>
            <p className='text-sm text-purple-700 font-medium mb-1'>Barbell Lifts</p>
            <p className='text-3xl font-bold text-purple-900'>{liftPRs.length}</p>
          </div>
        </div>

        {/* Benchmark WODs Section */}
        <div className='mb-8'>
          <div className='flex items-center gap-2 mb-4'>
            <Trophy size={24} className='text-[#208479]' />
            <h3 className='text-xl font-bold text-gray-900'>Benchmark WODs</h3>
          </div>
          {benchmarkPRs.length === 0 ? (
            <p className='text-gray-500 text-center py-8'>
              No benchmark PRs yet. Complete a benchmark workout to see it here!
            </p>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {benchmarkPRs.map(benchmark => (
                <div
                  key={benchmark.id}
                  className='border border-gray-300 rounded-lg p-4 hover:border-[#208479] transition'
                >
                  <div className='flex items-start justify-between'>
                    <div>
                      <h4 className='text-lg font-bold text-gray-900'>
                        {benchmark.benchmark_name}
                      </h4>
                      <p className='text-sm text-gray-600 mt-1'>
                        {new Date(benchmark.workout_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-2xl font-bold text-[#208479]'>{benchmark.result}</p>
                      <p className='text-xs text-gray-600 mt-1'>Personal Best</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Barbell Lifts Section */}
        <div>
          <div className='flex items-center gap-2 mb-4'>
            <Dumbbell size={24} className='text-[#208479]' />
            <h3 className='text-xl font-bold text-gray-900'>Barbell Lifts (1RM)</h3>
          </div>
          {liftPRs.length === 0 ? (
            <p className='text-gray-500 text-center py-8'>
              No lift PRs yet. Log a lift to see it here!
            </p>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {liftPRs.map(lift => (
                <div
                  key={lift.id}
                  className='border border-gray-300 rounded-lg p-4 hover:border-[#208479] transition'
                >
                  <div className='flex items-start justify-between'>
                    <div>
                      <h4 className='text-lg font-bold text-gray-900'>{lift.lift_name}</h4>
                      <p className='text-sm text-gray-600 mt-1'>
                        {new Date(lift.lift_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-2xl font-bold text-[#208479]'>
                        {Math.round(lift.calculated_1rm || lift.weight_kg)} kg
                      </p>
                      <p className='text-xs text-gray-600 mt-1'>1 Rep Max</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress Note */}
      <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
        <p className='text-sm text-blue-900'>
          <strong>Note:</strong> Your PRs are automatically tracked from the Benchmark Workouts and
          Barbell Lifts tabs. Keep logging your workouts to see your progress here!
        </p>
      </div>
    </div>
  );
}

// Security Tab Component
function SecurityTab() {
  return (
    <div className='bg-white rounded-lg shadow p-6'>
      <h2 className='text-2xl font-bold text-gray-900 mb-6'>Access & Security</h2>

      <div className='space-y-6'>
        {/* Change Password */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Change Password</h3>
          <div className='space-y-4 max-w-md'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Current Password
              </label>
              <input
                type='password'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>New Password</label>
              <input
                type='password'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Confirm New Password
              </label>
              <input
                type='password'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
              />
            </div>
            <button className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'>
              Update Password
            </button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className='pt-6 border-t border-gray-200'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Two-Factor Authentication</h3>
          <p className='text-gray-600 mb-4'>Add an extra layer of security to your account.</p>
          <button className='px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition'>
            Enable 2FA
          </button>
        </div>

        {/* Delete Account */}
        <div className='pt-6 border-t border-gray-200'>
          <h3 className='text-lg font-semibold text-red-600 mb-4'>Danger Zone</h3>
          <p className='text-gray-600 mb-4'>
            Once you delete your account, there is no going back.
          </p>
          <button className='px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition'>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
