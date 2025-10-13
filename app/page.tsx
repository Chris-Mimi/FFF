'use client';

import { useState } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (role: 'coach' | 'athlete') => {
    // For now, just store in sessionStorage (we'll add proper auth later)
    sessionStorage.setItem('userRole', role);
    sessionStorage.setItem('userName', role === 'coach' ? 'Demo Coach' : 'Demo Athlete');
    
    // Redirect to appropriate dashboard
    router.push(role === 'coach' ? '/coach' : '/athlete');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">The Forge</h1>
          <p className="text-gray-600">Functional Fitness</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => handleLogin('coach')}
            className="w-full bg-[#208479] hover:bg-[#1a6b62] text-white font-semibold py-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Users size={20} />
            Login as Coach
          </button>
          
          <button
            onClick={() => handleLogin('athlete')}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <TrendingUp size={20} />
            Login as Athlete
          </button>
        </div>
      </div>
    </div>
  );
}