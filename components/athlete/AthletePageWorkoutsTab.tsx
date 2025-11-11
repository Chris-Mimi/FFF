// AthleteWorkoutsTab component
'use client';

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
  User
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type TabName = 'profile' | 'workouts' | 'logbook' | 'benchmarks' | 'forge-benchmarks' | 'lifts' | 'records' | 'security';

export default function AthleteWorkoutsTab() {
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
    const initializeUser = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }

        setUserId(user.id);
        setUserName(user.user_metadata?.full_name || user.email || 'User');

        // Check subscription status
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('athlete_subscriptions')
          .select('subscription_status, subscription_end')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (subscriptionError) {
          console.error('Error checking subscription:', subscriptionError);
          alert('Unable to verify subscription status. Please contact the coach.');
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

        // Set initial active profile to current user
        setActiveProfileId(user.id);
        setSelectedProfileName(user.user_metadata?.full_name || user.email || 'User');

        // Fetch family members
        const { data: familyData, error: familyError } = await supabase
          .from('family_members')
          .select('id, display_name, relationship')
          .eq('parent_user_id', user.id);

        if (!familyError && familyData) {
          setFamilyMembers(familyData);
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfileChange = (profileId: string) => {
    if (profileId === userId) {
      setActiveProfileId(userId);
      setSelectedProfileName(userName);
    } else {
      const familyMember = familyMembers.find(member => member.id === profileId);
      if (familyMember) {
        setActiveProfileId(profileId);
        setSelectedProfileName(familyMember.display_name);
      }
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-400 flex items-center justify-center'>
        <div className='text-white text-xl'>Loading...</div>
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
      case 'forge-benchmarks':
        return <ForgeBenchmarksTab userId={activeProfileId} />;
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
                    value={activeProfileId || userId || ''}
                    onChange={(e) => handleProfileChange(e.target.value)}
                    className='text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-900'
                  >
                    <option value={userId || ''}>{userName} (You)</option>
                    {familyMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.display_name} ({member.relationship})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition'
            >
              <LogOut size={18} />
              Sign Out
            </button>
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

// Placeholder components - these would need to be implemented
function ProfileTab({ userName, userId }: { userName: string; userId: string }) {
  return <div>Profile Tab for {userName}</div>;
}

function LogbookTab({ userId, initialDate }: { userId: string; initialDate?: Date }) {
  return <div>Logbook Tab for {userId}</div>;
}

function BenchmarksTab({ userId }: { userId: string }) {
  return <div>Benchmarks Tab for {userId}</div>;
}

function ForgeBenchmarksTab({ userId }: { userId: string }) {
  return <div>Forge Benchmarks Tab for {userId}</div>;
}

function LiftsTab({ userId }: { userId: string }) {
  return <div>Lifts Tab for {userId}</div>;
}

function RecordsTab({ userId }: { userId: string }) {
  return <div>Records Tab for {userId}</div>;
}

function SecurityTab() {
  return <div>Security Tab</div>;
}
