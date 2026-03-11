'use client';

import { AlertTriangle, Check, Clock, X } from 'lucide-react';
import {
  MemberStatus,
  MembershipType,
  ClassType,
  Member,
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_TYPE_COLORS,
  CLASS_TYPE_LABELS,
  CLASS_TYPE_COLORS,
  getAge,
  formatMemberDate,
  getTrialStatus,
} from '@/types/member';

interface MemberCardProps {
  member: Member;
  activeTab: MemberStatus;
  processingMemberId: string | null;
  onApprove: (memberId: string) => void;
  onBlock: (memberId: string) => void;
  onUnapprove: (memberId: string) => void;
  onUnblock: (memberId: string) => void;
  onStartTrial: (memberId: string, days?: number) => void;
  onExtendTrial: (memberId: string, days?: number) => void;
  onActivateSubscription: (memberId: string) => void;
  onToggleMembershipType: (memberId: string, type: MembershipType, currentTypes: MembershipType[]) => void;
  onToggleClassType: (memberId: string, type: ClassType, currentClassTypes: ClassType[]) => void;
  onSetGender: (memberId: string, gender: 'M' | 'F' | null) => void;
  onOpenTenCard: (member: Member) => void;
}

function formatLastAttended(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(dateStr);
  last.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - last.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  const months = Math.floor(diffDays / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

export default function MemberCard({
  member,
  activeTab,
  processingMemberId,
  onApprove,
  onBlock,
  onUnapprove,
  onUnblock,
  onStartTrial,
  onExtendTrial,
  onActivateSubscription,
  onToggleMembershipType,
  onToggleClassType,
  onSetGender,
  onOpenTenCard,
}: MemberCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold text-white">{member.display_name || member.name}</h3>
            {activeTab === 'at-risk' && (
              <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-300 text-xs rounded-full flex items-center gap-1">
                <AlertTriangle size={10} />
                At-Risk
              </span>
            )}
            {member.account_type === 'family_member' && (
              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                Family
              </span>
            )}
            {member.membership_types?.includes('ten_card') && (
              <button
                onClick={() => onOpenTenCard(member)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer ${
                  member.ten_card_sessions_used >= 9
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
                title="Manage 10-card"
              >
                {member.ten_card_sessions_used || 0}/10
              </button>
            )}
            {member.membership_types?.includes('wellpass') && (
              <button
                onClick={() => onOpenTenCard(member)}
                className="px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer bg-orange-600 text-white hover:bg-orange-700"
                title="Manage Wellpass"
              >
                Wp
              </button>
            )}
            {member.membership_types?.includes('member') && (
              <button
                onClick={() => onOpenTenCard(member)}
                className="px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                title="Manage Membership"
              >
                Mb
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Email:</span>{' '}
              <span className="text-white">{member.email}</span>
            </div>
            {member.phone && (
              <div>
                <span className="text-gray-400">Phone:</span>{' '}
                <span className="text-white">{member.phone}</span>
              </div>
            )}
            <div>
              <span className="text-gray-400">Registered:</span>{' '}
              <span className="text-white">{formatMemberDate(member.created_at)}</span>
            </div>
            {activeTab === 'active' && (
              <>
                <div>
                  <span className="text-gray-400">Attendance:</span>{' '}
                  <span className="font-medium text-white">
                    {member.attendance_count}x
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Athlete App:</span>{' '}
                  <span className={`font-medium ${
                    member.athlete_subscription_status === 'trial' ? 'text-teal-400' :
                    member.athlete_subscription_status === 'active' ? 'text-green-400' :
                    'text-gray-500'
                  }`}>
                    {getTrialStatus(member)}
                  </span>
                </div>
              </>
            )}
            {activeTab === 'at-risk' && (
              <div className="md:col-span-2">
                <span className="text-gray-400">Last attended:</span>{' '}
                <span className="font-medium text-orange-400">
                  {member.last_attendance_date
                    ? formatLastAttended(member.last_attendance_date)
                    : 'Never attended'}
                </span>
              </div>
            )}
          </div>

          {/* Membership Type Checkboxes */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {(Object.keys(MEMBERSHIP_TYPE_LABELS) as MembershipType[]).map(type => {
              const isChecked = member.membership_types?.includes(type) || false;
              return (
                <label
                  key={type}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition ${
                    isChecked
                      ? MEMBERSHIP_TYPE_COLORS[type].active
                      : MEMBERSHIP_TYPE_COLORS[type].inactive
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleMembershipType(member.id, type, member.membership_types || [])}
                    className="w-3 h-3 rounded"
                  />
                  <span>{MEMBERSHIP_TYPE_LABELS[type]}</span>
                </label>
              );
            })}
          </div>

          {/* Gender Toggle */}
          <div className="flex gap-2 mt-2 items-center">
            <span className="text-xs text-gray-400 font-medium">Gender:</span>
            {(['M', 'F'] as const).map(g => (
              <button
                key={g}
                onClick={() => onSetGender(member.id, member.gender === g ? null : g)}
                className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition ${
                  member.gender === g
                    ? g === 'M' ? 'bg-blue-200 text-blue-800' : 'bg-pink-200 text-pink-800'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Class Type Buttons (only for kids <16) */}
          {(() => {
            const age = getAge(member.date_of_birth);
            return age !== null && age < 16;
          })() && (
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs text-gray-400 font-medium self-center">Class:</span>
              {(Object.keys(CLASS_TYPE_LABELS) as ClassType[]).map(type => {
                const isSelected = member.class_types?.includes(type) || false;
                return (
                  <button
                    key={type}
                    onClick={() => onToggleClassType(member.id, type, member.class_types || [])}
                    className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition ${
                      isSelected
                        ? CLASS_TYPE_COLORS[type].active
                        : CLASS_TYPE_COLORS[type].inactive
                    }`}
                  >
                    {CLASS_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        {activeTab === 'pending' && (
          <div className="flex gap-2 ml-3">
            <button
              onClick={() => onApprove(member.id)}
              disabled={processingMemberId === member.id}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 text-sm"
            >
              <Check size={16} />
              Approve
            </button>
            <button
              onClick={() => onBlock(member.id)}
              disabled={processingMemberId === member.id}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 text-sm"
            >
              <X size={16} />
              Block
            </button>
          </div>
        )}
        {activeTab === 'active' && (
          <div className="flex flex-col gap-2 ml-3">
            <div className="flex gap-2">
              <button
                onClick={() => onUnapprove(member.id)}
                disabled={processingMemberId === member.id}
                className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-orange-400 hover:text-orange-300 rounded transition-colors duration-200 text-xs"
                title="Move back to pending"
              >
                <Clock size={12} />
                Unapprove
              </button>
            </div>

            {/* Athlete Subscription Management */}
            {member.account_type === 'primary' && (
              <div className="flex gap-2 pt-1 border-t border-gray-700">
                {(!member.athlete_subscription_status || member.athlete_subscription_status === 'expired') && (
                  <button
                    onClick={() => onStartTrial(member.id, 30)}
                    disabled={processingMemberId === member.id}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded transition-colors duration-200 text-xs"
                    title="Start 30-day athlete trial"
                  >
                    Start Trial
                  </button>
                )}
                {member.athlete_subscription_status === 'trial' && (
                  <button
                    onClick={() => onExtendTrial(member.id, 30)}
                    disabled={processingMemberId === member.id}
                    className="flex items-center gap-1 px-2 py-1 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded transition-colors duration-200 text-xs"
                    title="Add 30 days to trial"
                  >
                    +30d Trial
                  </button>
                )}
                {(member.athlete_subscription_status === 'trial' || member.athlete_subscription_status === 'expired') && (
                  <button
                    onClick={() => onActivateSubscription(member.id)}
                    disabled={processingMemberId === member.id}
                    className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded transition-colors duration-200 text-xs"
                    title="Activate full subscription (no expiry)"
                  >
                    <Check size={12} />
                    Activate
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'blocked' && (
          <div className="flex gap-2 ml-3">
            <button
              onClick={() => onUnblock(member.id)}
              disabled={processingMemberId === member.id}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 text-sm"
            >
              <Check size={16} />
              Unblock
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
