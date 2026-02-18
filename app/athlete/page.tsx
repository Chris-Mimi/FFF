'use client';

import AthletePageWorkoutsTab from '@/components/athlete/AthletePageWorkoutsTab';
import AthletePageBenchmarksTab from '@/components/athlete/AthletePageBenchmarksTab';
import AthletePageForgeBenchmarksTab from '@/components/athlete/AthletePageForgeBenchmarksTab';
import AthletePageLiftsTab from '@/components/athlete/AthletePageLiftsTab';
import AthletePageLogbookTab from '@/components/athlete/AthletePageLogbookTab';
import AthletePagePaymentTab from '@/components/athlete/AthletePagePaymentTab';
import AthletePagePhotosTab from '@/components/athlete/AthletePagePhotosTab';
import AthletePageProfileTab from '@/components/athlete/AthletePageProfileTab';
import AthletePageRecordsTab from '@/components/athlete/AthletePageRecordsTab';
import AthletePageSecurityTab from '@/components/athlete/AthletePageSecurityTab';
import AthletePageCommunityTab from '@/components/athlete/AthletePageCommunityTab';
import AthletePageTimerTab from '@/components/athlete/AthletePageTimerTab';
import UpgradePrompt from '@/components/athlete/UpgradePrompt';
import { NotificationPrompt } from '@/components/ui/NotificationPrompt';
import { getCurrentUser, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Award,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Dumbbell,
  Image,
  LogOut,
  Shield,
  Target,
  Timer,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import NextImage from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';

type TabName = 'profile' | 'workouts' | 'community' | 'timer' | 'logbook' | 'benchmarks' | 'forge-benchmarks' | 'lifts' | 'records' | 'photos' | 'payment' | 'security';

function AthletePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabName>('profile');

  // Handle URL tab parameter (e.g., /athlete?tab=payment)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'workouts', 'community', 'timer', 'logbook', 'benchmarks', 'forge-benchmarks', 'lifts', 'records', 'photos', 'payment', 'security'].includes(tabParam)) {
      setActiveTab(tabParam as TabName);
    }
  }, [searchParams]);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(false);
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
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const tabsNavRef = useRef<HTMLDivElement>(null);

  // Check if tabs need scrolling
  useEffect(() => {
    if (loading) return; // Don't check until content is loaded

    const checkScroll = () => {
      if (tabsNavRef.current) {
        const hasScroll = tabsNavRef.current.scrollWidth > tabsNavRef.current.clientWidth;
        setShowScrollHint(hasScroll);
      }
    };

    // Check after content renders
    const timeoutId = setTimeout(checkScroll, 200);

    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkScroll);
    };
  }, [loading]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsNavRef.current) {
      tabsNavRef.current.scrollTo({
        left: direction === 'right' ? tabsNavRef.current.scrollWidth : 0,
        behavior: 'smooth'
      });
    }
  };

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
          toast.warning('Your account is pending approval. Please wait for coach approval.');
          router.push('/member/book');
          return;
        }

        // Check athlete access using RPC function (works for both primary and family members)
        const { data: subscriptionData, error: rpcError } = await supabase
          .rpc('get_primary_subscription_status', { member_uuid: user.id });

        let fullAccess = false;
        if (!rpcError && subscriptionData && subscriptionData.length > 0) {
          const { subscription_status, subscription_end } = subscriptionData[0];
          const now = new Date();
          const trialEnd = subscription_end ? new Date(subscription_end) : null;
          fullAccess =
            subscription_status === 'active' ||
            (subscription_status === 'trial' && !!trialEnd && trialEnd > now);
        }
        setHasFullAccess(fullAccess);

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
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#178da6] mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as TabName, label: 'Profile', icon: User, requiresFullAccess: false },
    { id: 'workouts' as TabName, label: 'Workouts', icon: Calendar, requiresFullAccess: true },
    { id: 'community' as TabName, label: 'Community', icon: Users, requiresFullAccess: true },
    { id: 'timer' as TabName, label: 'Timer', icon: Timer, requiresFullAccess: true },
    { id: 'logbook' as TabName, label: 'Logbook', icon: BookOpen, requiresFullAccess: true },
    { id: 'benchmarks' as TabName, label: 'Benchmarks', icon: Trophy, requiresFullAccess: true },
    { id: 'forge-benchmarks' as TabName, label: 'Forge', icon: Target, requiresFullAccess: true },
    { id: 'lifts' as TabName, label: 'Lifts', icon: Dumbbell, requiresFullAccess: true },
    { id: 'records' as TabName, label: 'Records', icon: Award, requiresFullAccess: true },
    { id: 'photos' as TabName, label: 'Whiteboard', icon: Image, requiresFullAccess: true },
    { id: 'payment' as TabName, label: 'Payment', icon: CreditCard, requiresFullAccess: false },
    { id: 'security' as TabName, label: 'Security', icon: Shield, requiresFullAccess: false },
  ];

  const renderTabContent = () => {
    if (!userId || !activeProfileId) return null;

    // Check if current tab requires full access
    const currentTab = tabs.find(t => t.id === activeTab);
    if (currentTab?.requiresFullAccess && !hasFullAccess) {
      return <UpgradePrompt onNavigateToPayment={() => setActiveTab('payment')} />;
    }

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
      case 'community':
        return <AthletePageCommunityTab userId={activeProfileId} initialDate={selectedDate} onDateChange={setSelectedDate} />;
      case 'timer':
        return <AthletePageTimerTab />;
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
      case 'photos':
        return <AthletePagePhotosTab />;
      case 'payment':
        return <AthletePagePaymentTab userId={userId} />;
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
          <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4'>
            <div className='flex-1'>
              <div className='flex items-center gap-3'>
                <NextImage src="/icon.png" alt="The Forge logo" width={48} height={48} className='w-14 h-14 sm:w-16 sm:h-16 object-contain' />
                <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>The Forge</h1>
              </div>
              <p className='text-sm text-gray-600'>Welcome back, {userName}</p>
              {/* Profile Selector */}
              {(familyMembers.length > 0 || activeProfileId) && (
                <div className='mt-2'>
                  <label className='block text-xs font-medium text-gray-500 mb-1'>Viewing as:</label>
                  <select
                    value={activeProfileId || ''}
                    onChange={(e) => handleProfileChange(e.target.value)}
                    className='w-full sm:w-auto px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-[#178da6] focus:border-transparent cursor-pointer'
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
            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3'>
              <NotificationPrompt />
              <button
                onClick={() => router.push('/member/book')}
                className='flex items-center justify-center gap-2 bg-[#178da6] hover:bg-[#14758c] text-white px-6 py-3 rounded-lg font-medium transition min-h-[44px]'
              >
                <Calendar size={18} />
                <span>Book a Class</span>
              </button>
              <button
                onClick={handleLogout}
                className='flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition text-gray-700 min-h-[44px]'
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className='bg-white border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 relative'>
          <nav ref={tabsNavRef} className='flex space-x-2 sm:space-x-4 md:space-x-8 overflow-x-auto overscroll-contain scrollbar-hide'>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isRestricted = tab.requiresFullAccess && !hasFullAccess;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition min-w-[60px] sm:min-w-0
                    ${
                      isRestricted
                        ? 'border-transparent text-gray-400 opacity-60'
                        : isActive
                          ? 'border-[#178da6] text-[#178da6]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                  title={isRestricted ? 'Subscribe to unlock' : undefined}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs md:text-sm leading-tight text-center sm:text-left">{tab.label}</span>
                </button>
              );
            })}
          </nav>
          {/* Scroll buttons - hidden on mobile, shown on desktop when overflow exists */}
          {showScrollHint && (
            <>
              <button
                onClick={() => scrollTabs('left')}
                className='hidden md:block absolute left-0 top-1/2 -translate-y-1/2 bg-gray-200/90 hover:bg-gray-300/90 p-2 rounded-full shadow-md transition z-10'
                aria-label='Scroll left'
              >
                <ChevronLeft size={20} className='text-gray-700' />
              </button>
              <button
                onClick={() => scrollTabs('right')}
                className='hidden md:block absolute right-0 top-1/2 -translate-y-1/2 bg-gray-200/90 hover:bg-gray-300/90 p-2 rounded-full shadow-md transition z-10'
                aria-label='Scroll right'
              >
                <ChevronRight size={20} className='text-gray-700' />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>{renderTabContent()}</div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function AthletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-400 flex items-center justify-center">Loading...</div>}>
      <AthletePageContent />
    </Suspense>
  );
}
