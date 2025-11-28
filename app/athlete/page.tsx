'use client';

import AthletePageWorkoutsTab from '@/components/athlete/AthletePageWorkoutsTab';
import AthletePageBenchmarksTab from '@/components/athlete/AthletePageBenchmarksTab';
import AthletePageForgeBenchmarksTab from '@/components/athlete/AthletePageForgeBenchmarksTab';
import AthletePageLiftsTab from '@/components/athlete/AthletePageLiftsTab';
import AthletePageLogbookTab from '@/components/athlete/AthletePageLogbookTab';
import AthletePageProfileTab from '@/components/athlete/AthletePageProfileTab';
import AthletePageRecordsTab from '@/components/athlete/AthletePageRecordsTab';
import AthletePageSecurityTab from '@/components/athlete/AthletePageSecurityTab';
import { getCurrentUser, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  Award,
  BookOpen,
  Calendar,
  Dumbbell,
  LogOut,
  Shield,
  Target,
  Trophy,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type TabName = 'profile' | 'workouts' | 'logbook' | 'benchmarks' | 'forge-benchmarks' | 'lifts' | 'records' | 'security';

export default function AthletePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabName>('profile');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Initialize from localStorage if available - shared between Logbook and Workouts tabs
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('athleteSelectedDate');
      if (saved) {
        return new Date(saved);
      }
    }
    return new Date();
  });
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Array<{id: string, display_name: string, relationship: string}>>([]);
  const [selectedProfileName, setSelectedProfileName] = useState('');

  // Persist selectedDate to localStorage (shared between Logbook and Workouts)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('athleteSelectedDate', selectedDate.toISOString());
    }
  }, [selectedDate]);

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
        .select('id, name, status, display_name')
        .eq('id', user.id)
        .single();

      // If they're a member, check their status and athlete access
      if (member) {
        if (member.status !== 'active') {
          alert('Your account is pending approval. Please wait for coach approval.');
          router.push('/member/book');
          return;
        }

        // Check athlete access using RPC function (works for both primary and family members)
        const { data: subscriptionData, error: rpcError } = await supabase
          .rpc('get_primary_subscription_status', { member_uuid: user.id });

        if (rpcError) {
          console.error('RPC Error:', rpcError);
          alert(`Subscription check error: ${rpcError.message}`);
          router.push('/member/book');
          return;
        }

        if (!subscriptionData || subscriptionData.length === 0) {
          alert('Unable to verify subscription status. Please contact the coach.');
          router.push('/member/book');
          return;
        }

        const { subscription_status, subscription_end } = subscriptionData[0];
        const now = new Date();
        const trialEnd = subscription_end ? new Date(subscription_end) : null;
        const hasAccess =
          subscription_status === 'active' ||
          (subscription_status === 'trial' && trialEnd && trialEnd > now);

        if (!hasAccess) {
          alert('Your athlete page access has expired. Please contact the coach to renew.');
          router.push('/member/book');
          return;
        }

        setUserName(member.display_name || member.name);
        setUserId(user.id);
        setActiveProfileId(user.id);
        setSelectedProfileName(member.display_name || member.name);

        // Fetch family members
        const { data: family } = await supabase
          .from('members')
          .select('id, display_name, relationship')
          .eq('primary_member_id', user.id)
          .eq('status', 'active');

        if (family && family.length > 0) {
          setFamilyMembers(family as Array<{id: string, display_name: string, relationship: string}>);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-400'>
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
    { id: 'forge-benchmarks' as TabName, label: 'Forge Benchmarks', icon: Target },
    { id: 'lifts' as TabName, label: 'Barbell Lifts', icon: Dumbbell },
    { id: 'records' as TabName, label: 'Personal Records', icon: Award },
    { id: 'security' as TabName, label: 'Access & Security', icon: Shield },
  ];

  const renderTabContent = () => {
    if (!userId || !activeProfileId) return null;

    switch (activeTab) {
      case 'profile':
        return <AthletePageProfileTab userName={selectedProfileName} userId={activeProfileId} />;
      case 'workouts':
        return <AthletePageWorkoutsTab
          userId={activeProfileId}
          initialDate={selectedDate}
          onDateChange={setSelectedDate}
          onNavigateToLogbook={(date) => {
            setSelectedDate(date);
            setActiveTab('logbook');
          }}
        />;
      case 'logbook':
        return (
          <AthletePageLogbookTab
            userId={activeProfileId}
            initialDate={selectedDate}
            initialViewMode='day'
            onDateChange={setSelectedDate}
          />
        );
      case 'benchmarks':
        return <AthletePageBenchmarksTab userId={activeProfileId} />;
      case 'forge-benchmarks':
        return <AthletePageForgeBenchmarksTab userId={activeProfileId} />;
      case 'lifts':
        return <AthletePageLiftsTab userId={activeProfileId} />;
      case 'records':
        return <AthletePageRecordsTab userId={activeProfileId} />;
      case 'security':
        return <AthletePageSecurityTab />;
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
    <div className='min-h-screen bg-gray-400'>
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
                    value={activeProfileId || ''}
                    onChange={(e) => handleProfileChange(e.target.value)}
                    className='px-3 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-[#208479] focus:border-transparent cursor-pointer'
                  >
                    <option value={userId || ''}>{userName}</option>
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
