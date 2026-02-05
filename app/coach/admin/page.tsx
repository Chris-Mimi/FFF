'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminToolsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check role from user_metadata
      const role = user.user_metadata?.role;
      if (role !== 'coach') {
        router.push('/login');
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-4xl mx-auto p-6'>
        {/* Header */}
        <div className='mb-6'>
          <Link
            href='/coach'
            className='inline-flex items-center gap-2 text-[#208479] hover:text-[#1a6b62] mb-4'
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
          <h1 className='text-3xl font-bold text-gray-900'>Admin Tools</h1>
          <p className='text-gray-600 mt-2'>Manage coach accounts and system settings</p>
        </div>

        {/* Admin Actions */}
        <div className='grid gap-4'>
          {/* Create Coach Account */}
          <Link
            href='/signup'
            className='bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-2 border-transparent hover:border-[#208479]'
          >
            <div className='flex items-start gap-4'>
              <div className='bg-[#208479] text-white p-3 rounded-lg'>
                <UserPlus size={24} />
              </div>
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                  Create New Coach Account
                </h2>
                <p className='text-gray-600'>
                  Register a new coach to give them access to the coaching dashboard and all admin
                  features.
                </p>
              </div>
            </div>
          </Link>

          {/* Placeholder for future admin tools */}
          <div className='bg-gray-100 rounded-lg p-6 border-2 border-dashed border-gray-300'>
            <p className='text-gray-500 text-center'>
              Additional admin tools will be added here as needed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
