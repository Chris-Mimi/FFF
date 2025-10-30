'use client';

import { supabase } from '@/lib/supabase';
import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

interface TenCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    ten_card_purchase_date: string | null;
    ten_card_sessions_used: number;
  };
  onUpdate: () => void;
}

export default function TenCardModal({
  isOpen,
  onClose,
  member,
  onUpdate,
}: TenCardModalProps) {
  const [purchaseDate, setPurchaseDate] = useState(member.ten_card_purchase_date || '');
  const [sessionsUsed, setSessionsUsed] = useState(member.ten_card_sessions_used);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({
          ten_card_purchase_date: purchaseDate || null,
          ten_card_sessions_used: sessionsUsed
        })
        .eq('id', member.id);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating 10-card info:', error);
      alert('Failed to update 10-card information');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCard = () => {
    if (!confirm('Reset this 10-card? Sessions used will be set to 0 and purchase date will be set to today.')) {
      return;
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    setPurchaseDate(today);
    setSessionsUsed(0);
  };

  const sessionsRemaining = 10 - sessionsUsed;
  const isNearExpiry = sessionsUsed >= 9;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#208479] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={24} />
            <h2 className="text-xl font-bold">10-Card Management</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Member Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {member.name}
              </h3>
              <div className={`text-sm font-medium px-3 py-1 rounded inline-block ${
                isNearExpiry
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {sessionsUsed}/10 sessions used
                {sessionsRemaining > 0 && ` • ${sessionsRemaining} remaining`}
              </div>
              {isNearExpiry && (
                <p className="text-red-600 text-xs mt-2 font-medium">
                  ⚠️ Next session will complete this card
                </p>
              )}
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                10-Card Purchase/Activation Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#208479] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Sessions used counter starts from this date.
              </p>
            </div>

            {/* Sessions Used */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sessions Used (0-10)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={sessionsUsed}
                onChange={(e) => setSessionsUsed(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#208479] focus:border-transparent"
              />
            </div>

            {/* Reset Button */}
            <div className="pt-4 border-t">
              <button
                onClick={handleResetCard}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                <RefreshCw size={18} />
                Reset Card
              </button>
              <p className="text-xs text-gray-500 mt-2">
                This will set purchase date to today and reset sessions to 0.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:text-gray-500 text-gray-700 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] disabled:bg-[#208479]/50 text-white rounded-lg transition flex items-center gap-2"
          >
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
