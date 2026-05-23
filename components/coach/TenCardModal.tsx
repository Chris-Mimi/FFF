'use client';

import { confirm } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';
import { RefreshCw, X, CreditCard, Calendar, Package, ChevronDown, ChevronRight, History } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FocusTrap } from '@/components/ui/FocusTrap';

interface TenCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    display_name?: string | null;
    ten_card_purchase_date: string | null;
    ten_card_sessions_used: number;
    ten_card_total?: number;
    ten_card_expiry_date?: string | null;
    ten_card_notes?: string | null;
    subscription_notes?: string | null;
    athlete_subscription_status?: 'trial' | 'active' | 'past_due' | 'expired';
    athlete_subscription_end?: string | null;
  } | null;
  onUpdate: () => void;
}

export default function TenCardModal({
  isOpen,
  onClose,
  member,
  onUpdate,
}: TenCardModalProps) {
  const [activeSection, setActiveSection] = useState<'10card' | 'subscription'>('10card');

  // 10-card state
  const [purchaseDate, setPurchaseDate] = useState(() => {
    if (!member?.ten_card_purchase_date) return '';
    const dateStr = member.ten_card_purchase_date;
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  });
  const [sessionsUsed, setSessionsUsed] = useState(member?.ten_card_sessions_used || 0);
  const [tenCardTotal, setTenCardTotal] = useState(member?.ten_card_total || 10);
  const [tenCardExpiry, setTenCardExpiry] = useState(() => {
    if (!member?.ten_card_expiry_date) return '';
    const dateStr = member.ten_card_expiry_date;
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  });
  const [tenCardNotes, setTenCardNotes] = useState(member?.ten_card_notes || '');

  // Subscription state
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trial' | 'active' | 'past_due' | 'expired'>(
    member?.athlete_subscription_status || 'expired'
  );
  const [subscriptionEnd, setSubscriptionEnd] = useState(() => {
    if (!member?.athlete_subscription_end) return '';
    const dateStr = member.athlete_subscription_end;
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  });
  const [subscriptionNotes, setSubscriptionNotes] = useState(member?.subscription_notes || '');

  const [loading, setLoading] = useState(false);

  type CardBooking = {
    booking_id: string;
    date: string;
    time: string;
    status: 'confirmed' | 'no_show' | 'late_cancel';
    booker_name: string;
    is_self: boolean;
  };
  const [cardBookings, setCardBookings] = useState<CardBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  type ArchiveEntry = {
    id: string;
    total: number;
    sessions_used: number;
    purchase_date: string;
    closed_at: string;
    bookings_snapshot: CardBooking[];
    notes: string | null;
  };
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [expandedArchiveIds, setExpandedArchiveIds] = useState<Set<string>>(new Set());
  const [pendingClose, setPendingClose] = useState(false);
  const [editingNoteArchiveId, setEditingNoteArchiveId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Subscription archive — parallel to card archive.
  type SubArchiveEntry = {
    id: string;
    status: string | null;
    tier: string | null;
    start_date: string | null;
    end_date: string | null;
    notes: string | null;
    closed_at: string;
  };
  const [subArchive, setSubArchive] = useState<SubArchiveEntry[]>([]);
  const [subArchiveLoading, setSubArchiveLoading] = useState(false);
  const [expandedSubArchiveIds, setExpandedSubArchiveIds] = useState<Set<string>>(new Set());
  const [pendingSubClose, setPendingSubClose] = useState(false);
  const [editingSubNoteArchiveId, setEditingSubNoteArchiveId] = useState<string | null>(null);
  const [editingSubNoteText, setEditingSubNoteText] = useState('');
  const [savingSubNote, setSavingSubNote] = useState(false);

  // Update state when member prop changes (after refresh)
  useEffect(() => {
    if (member) {
      // Always clear any in-flight pending close when the source data refreshes —
      // belt-and-braces guard against a stale "pending" flag surviving a re-render.
      setPendingClose(false);
      setPendingSubClose(false);
      // 10-card fields
      let formattedDate = '';
      if (member.ten_card_purchase_date) {
        const dateStr = member.ten_card_purchase_date;
        formattedDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      }
      setPurchaseDate(formattedDate);
      setSessionsUsed(member.ten_card_sessions_used || 0);
      setTenCardTotal(member.ten_card_total || 10);

      let formattedExpiry = '';
      if (member.ten_card_expiry_date) {
        const dateStr = member.ten_card_expiry_date;
        formattedExpiry = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      }
      setTenCardExpiry(formattedExpiry);
      setTenCardNotes(member.ten_card_notes || '');

      // Subscription fields
      setSubscriptionStatus(member.athlete_subscription_status || 'expired');
      let formattedSubEnd = '';
      if (member.athlete_subscription_end) {
        const dateStr = member.athlete_subscription_end;
        formattedSubEnd = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      }
      setSubscriptionEnd(formattedSubEnd);
      setSubscriptionNotes(member.subscription_notes || '');
    }
  }, [member]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load bookings that debit this card. Includes the holder's own bookings + any
  // family member whose ten_card_holder_id points at this holder. Filtered to
  // statuses that consume the card (confirmed, no_show, late_cancel) and to
  // sessions on/after the purchase date.
  useEffect(() => {
    if (!isOpen || activeSection !== '10card' || !member?.id) {
      setCardBookings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setBookingsLoading(true);
      try {
        // Build the set of members who actually debit this card: the holder herself
        // (only if her effective method is ten_card — Miriam has WP + ten_card and her
        // own bookings should NOT burn the kids' card) plus any sharer pointing here.
        const { data: candidates } = await supabase
          .from('members')
          .select('id, primary_payment_method, membership_types, ten_card_holder_id')
          .or(`id.eq.${member.id},ten_card_holder_id.eq.${member.id}`);
        const debitMemberIds = (candidates || [])
          .filter(c => {
            const effective = c.primary_payment_method || (c.membership_types as string[] | null)?.[0] || null;
            return effective === 'ten_card';
          })
          .map(c => c.id);
        if (debitMemberIds.length === 0) {
          if (!cancelled) setCardBookings([]);
          return;
        }

        let query = supabase
          .from('bookings')
          .select('id, status, member_id, weekly_sessions!inner(date, time), members!inner(id, name, display_name)')
          .in('member_id', debitMemberIds)
          .in('status', ['confirmed', 'no_show', 'late_cancel']);

        if (purchaseDate) {
          query = query.gte('weekly_sessions.date', purchaseDate);
        }

        const { data, error } = await query;
        if (error || cancelled) {
          if (error) console.error('Failed to load card bookings:', error);
          return;
        }

        type RawRow = {
          id: string;
          status: 'confirmed' | 'no_show' | 'late_cancel';
          member_id: string;
          weekly_sessions: { date: string; time: string } | { date: string; time: string }[];
          members: { id: string; name: string; display_name: string | null } | { id: string; name: string; display_name: string | null }[];
        };
        const rows: CardBooking[] = (data as RawRow[] || []).map(r => {
          const ws = Array.isArray(r.weekly_sessions) ? r.weekly_sessions[0] : r.weekly_sessions;
          const mb = Array.isArray(r.members) ? r.members[0] : r.members;
          return {
            booking_id: r.id,
            date: ws?.date || '',
            time: ws?.time || '',
            status: r.status,
            booker_name: mb?.display_name || mb?.name || '—',
            is_self: r.member_id === member.id,
          };
        }).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

        if (!cancelled) setCardBookings(rows);
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, activeSection, member?.id, purchaseDate]);

  // Load archived (closed) 10-cards for this member.
  const loadArchive = async (memberId: string) => {
    setArchiveLoading(true);
    try {
      const res = await authFetch(`/api/coach/ten-card-archive?memberId=${memberId}`);
      if (!res.ok) return;
      const json = await res.json();
      setArchive(json.archive || []);
    } catch (e) {
      console.error('Failed to load 10-card history', e);
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || activeSection !== '10card' || !member?.id) {
      setArchive([]);
      setExpandedArchiveIds(new Set());
      return;
    }
    loadArchive(member.id);
  }, [isOpen, activeSection, member?.id]);

  const loadSubArchive = async (memberId: string) => {
    setSubArchiveLoading(true);
    try {
      const res = await authFetch(`/api/coach/subscription-archive?memberId=${memberId}`);
      if (!res.ok) return;
      const json = await res.json();
      setSubArchive(json.archive || []);
    } catch (e) {
      console.error('Failed to load subscription history', e);
    } finally {
      setSubArchiveLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || activeSection !== 'subscription' || !member?.id) {
      setSubArchive([]);
      setExpandedSubArchiveIds(new Set());
      return;
    }
    loadSubArchive(member.id);
  }, [isOpen, activeSection, member?.id]);

  if (!isOpen || !member) return null;

  const recalculateSessionsUsed = async (purchaseDateStr: string) => {
    if (!purchaseDateStr || !member) return sessionsUsed;

    try {
      // Server-side backfill + count: flips ten_card_consumed=true on any in-window
      // {confirmed, no_show, late_cancel} booking on this card's debit-set that wasn't
      // already flagged (e.g. bookings made before the member had a payment method
      // recorded — the Markus/Felix/Annerose class of drift, S359-S361). Service-role
      // because athlete-owned bookings are RLS-hidden from the coach session.
      const res = await authFetch('/api/coach/recalc-ten-card', {
        method: 'POST',
        body: JSON.stringify({ memberId: member.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Recalc failed' }));
        toast.error(err.error || 'Recalc failed');
        return sessionsUsed;
      }
      const { count, updated } = (await res.json()) as { count: number; updated: number };
      if (updated > 0) {
        toast.success(`Recalc: ${updated} booking${updated === 1 ? '' : 's'} flagged, counter set to ${count}/${tenCardTotal}`);
      } else {
        toast.success(`Recalc: counter set to ${count}/${tenCardTotal}`);
      }
      return count;
    } catch (error) {
      console.error('Error recalculating sessions:', error);
      toast.error('Recalc failed');
      return sessionsUsed;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Pending close: call the server-side close endpoint (archive + member reset).
      // Skip the regular update path because the API handles the whole transaction.
      if (activeSection === '10card' && pendingClose) {
        const res = await authFetch('/api/coach/close-ten-card', {
          method: 'POST',
          body: JSON.stringify({
            memberId: member.id,
            newPurchaseDate: purchaseDate || undefined,
            newExpiryDate: tenCardExpiry || undefined,
            newTotal: tenCardTotal,
            newSessionsUsed: sessionsUsed,
            newNotes: tenCardNotes || undefined,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error || 'Failed to close card');
          return;
        }
        toast.success('Card closed and new card issued');
        setPendingClose(false);
        onUpdate();
        onClose();
        return;
      }

      if (activeSection === 'subscription' && pendingSubClose) {
        const res = await authFetch('/api/coach/close-subscription', {
          method: 'POST',
          body: JSON.stringify({
            memberId: member.id,
            newStatus: subscriptionStatus,
            newEndDate: subscriptionEnd || null,
            newNotes: subscriptionNotes || undefined,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error || 'Failed to close subscription');
          return;
        }
        toast.success('Subscription closed and renewed');
        setPendingSubClose(false);
        onUpdate();
        onClose();
        return;
      }

      const updateData: Record<string, unknown> = {};

      if (activeSection === '10card') {
        // Save the value currently in the input. Coaches use Recalc/Reset buttons to derive
        // values from bookings; the save itself trusts what's typed.
        updateData.ten_card_purchase_date = purchaseDate || null;
        updateData.ten_card_sessions_used = sessionsUsed;
        updateData.ten_card_total = tenCardTotal;
        updateData.ten_card_expiry_date = tenCardExpiry || null;
        updateData.ten_card_notes = tenCardNotes || null;
      } else {
        updateData.athlete_subscription_status = subscriptionStatus;
        updateData.athlete_subscription_end = subscriptionEnd || null;
        updateData.subscription_notes = subscriptionNotes || null;
      }

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', member.id);

      if (error) {
        throw error;
      }
      onUpdate();
      onClose();
    } catch (_error) {
      toast.error('Failed to update payment information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Deferred close — sets pendingClose=true and shows projected new-card values in
  // the form. The actual DB write (archive + member reset) happens on Save. Cancel
  // closes the modal without persisting.
  const handleCloseAndIssueNew = async () => {
    if (!member) return;
    if (!await confirm({
      title: 'Close & Issue New 10-Card',
      message: `Close this card with ${sessionsUsed}/${tenCardTotal} sessions used and start a fresh card today? The closed card will appear in Card History after you click Save Changes. Click Cancel to abort.`,
      confirmText: 'Close & Issue New',
      variant: 'default',
    })) {
      return;
    }

    // Project the new card values in the form so the coach can preview before Save.
    const todayDate = new Date();
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    const expiryDate = new Date(todayDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const expiry = `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}-${String(expiryDate.getDate()).padStart(2, '0')}`;

    setPurchaseDate(today);
    setTenCardExpiry(expiry);
    setSessionsUsed(0);
    setTenCardNotes(''); // New card starts with blank notes; coach types fresh ones for the new card
    setPendingClose(true);
  };

  const handleCancelPendingClose = () => {
    if (!member) return;
    // Revert form to current member state.
    const original = member.ten_card_purchase_date || '';
    setPurchaseDate(original.includes('T') ? original.split('T')[0] : original);
    setSessionsUsed(member.ten_card_sessions_used || 0);
    setTenCardTotal(member.ten_card_total || 10);
    const origExpiry = member.ten_card_expiry_date || '';
    setTenCardExpiry(origExpiry.includes('T') ? origExpiry.split('T')[0] : origExpiry);
    setTenCardNotes(member.ten_card_notes || '');
    setPendingClose(false);
  };

  const toggleArchiveExpanded = (id: string) => {
    setExpandedArchiveIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEditingNote = (entry: ArchiveEntry) => {
    setEditingNoteArchiveId(entry.id);
    setEditingNoteText(entry.notes || '');
  };

  const cancelEditingNote = () => {
    setEditingNoteArchiveId(null);
    setEditingNoteText('');
  };

  // Unified entry point for activating an athlete-side subscription with a preset duration.
  // Works for both initial setup (current status='expired'/null) and renewals (active). The
  // archive happens server-side on Save Changes; for a brand-new athlete the archive row
  // captures their prior expired/trial state, which is informative history.
  const startActivation = async (months: 1 | 12) => {
    if (!member) return;
    const label = months === 1 ? '1 Month' : '1 Year';
    const currentSummary = subscriptionStatus === 'expired' && !subscriptionEnd
      ? 'no active subscription'
      : `${subscriptionStatus}${subscriptionEnd ? ', ends ' + subscriptionEnd : ''}`;
    if (!await confirm({
      title: `Activate ${label} Subscription`,
      message: `Start a ${label.toLowerCase()} subscription today (current state: ${currentSummary} — will be archived). Click Save Changes to commit or Cancel to abort.`,
      confirmText: `Activate ${label}`,
      variant: 'default',
    })) {
      return;
    }

    const todayDate = new Date();
    const endDate = new Date(todayDate);
    if (months === 12) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setDate(endDate.getDate() + 30);
    }
    const newEnd = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    setSubscriptionStatus('active');
    setSubscriptionEnd(newEnd);
    setSubscriptionNotes('');
    setPendingSubClose(true);
  };

  const deleteSubArchive = async (entryId: string) => {
    if (!await confirm({
      title: 'Delete Subscription History Entry',
      message: 'Permanently delete this archived subscription record? This only removes the history entry — the active subscription and current status are not affected. Use this to clean up accidental Activate / Renew clicks.',
      confirmText: 'Delete',
      variant: 'danger',
    })) {
      return;
    }
    try {
      const res = await authFetch('/api/coach/subscription-archive', {
        method: 'DELETE',
        body: JSON.stringify({ id: entryId }),
      });
      if (!res.ok) {
        toast.error('Failed to delete history entry');
        return;
      }
      setSubArchive(prev => prev.filter(a => a.id !== entryId));
      toast.success('History entry deleted');
    } catch (e) {
      console.error('Failed to delete subscription history entry', e);
      toast.error('Failed to delete history entry');
    }
  };

  const handleCancelPendingSubClose = () => {
    if (!member) return;
    setSubscriptionStatus(member.athlete_subscription_status || 'expired');
    const origEnd = member.athlete_subscription_end || '';
    setSubscriptionEnd(origEnd.includes('T') ? origEnd.split('T')[0] : origEnd);
    setSubscriptionNotes(member.subscription_notes || '');
    setPendingSubClose(false);
  };

  const toggleSubArchiveExpanded = (id: string) => {
    setExpandedSubArchiveIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEditingSubNote = (entry: SubArchiveEntry) => {
    setEditingSubNoteArchiveId(entry.id);
    setEditingSubNoteText(entry.notes || '');
  };

  const cancelEditingSubNote = () => {
    setEditingSubNoteArchiveId(null);
    setEditingSubNoteText('');
  };

  const saveSubArchiveNote = async () => {
    if (!editingSubNoteArchiveId) return;
    setSavingSubNote(true);
    try {
      const res = await authFetch('/api/coach/subscription-archive', {
        method: 'PATCH',
        body: JSON.stringify({ id: editingSubNoteArchiveId, notes: editingSubNoteText }),
      });
      if (!res.ok) {
        toast.error('Failed to update note');
        return;
      }
      const newNote = editingSubNoteText.length > 0 ? editingSubNoteText : null;
      setSubArchive(prev =>
        prev.map(a => (a.id === editingSubNoteArchiveId ? { ...a, notes: newNote } : a))
      );
      setEditingSubNoteArchiveId(null);
      setEditingSubNoteText('');
      toast.success('Note updated');
    } catch (e) {
      console.error('Failed to update subscription archive note', e);
      toast.error('Failed to update note');
    } finally {
      setSavingSubNote(false);
    }
  };

  const deleteArchive = async (entryId: string) => {
    if (!await confirm({
      title: 'Delete Card History Entry',
      message: 'Permanently delete this archived 10-card record? This only removes the history entry — the active card and current counter are not affected. Use this to clean up accidental Close & Issue New clicks.',
      confirmText: 'Delete',
      variant: 'danger',
    })) {
      return;
    }
    try {
      const res = await authFetch('/api/coach/ten-card-archive', {
        method: 'DELETE',
        body: JSON.stringify({ id: entryId }),
      });
      if (!res.ok) {
        toast.error('Failed to delete archive entry');
        return;
      }
      setArchive(prev => prev.filter(a => a.id !== entryId));
      toast.success('Archive entry deleted');
    } catch (e) {
      console.error('Failed to delete archive entry', e);
      toast.error('Failed to delete archive entry');
    }
  };

  const saveArchiveNote = async () => {
    if (!editingNoteArchiveId) return;
    setSavingNote(true);
    try {
      const res = await authFetch('/api/coach/ten-card-archive', {
        method: 'PATCH',
        body: JSON.stringify({ id: editingNoteArchiveId, notes: editingNoteText }),
      });
      if (!res.ok) {
        toast.error('Failed to update note');
        return;
      }
      // Update local archive state
      const newNote = editingNoteText.length > 0 ? editingNoteText : null;
      setArchive(prev =>
        prev.map(a => (a.id === editingNoteArchiveId ? { ...a, notes: newNote } : a))
      );
      setEditingNoteArchiveId(null);
      setEditingNoteText('');
      toast.success('Note updated');
    } catch (e) {
      console.error('Failed to update archive note', e);
      toast.error('Failed to update note');
    } finally {
      setSavingNote(false);
    }
  };

  const formatDateDe = (iso: string): string => {
    // 'YYYY-MM-DD' → 'DD.MM.YY'
    const s = iso.includes('T') ? iso.split('T')[0] : iso;
    const [y, m, d] = s.split('-');
    if (!y || !m || !d) return s;
    return `${d}.${m}.${y.slice(2)}`;
  };

  const sessionsRemaining = tenCardTotal - sessionsUsed;
  const isFull = sessionsUsed >= tenCardTotal;
  const isOneAwayFromFull = sessionsUsed === tenCardTotal - 1;
  const isNearExpiry = isFull || isOneAwayFromFull;

  return (
    <FocusTrap>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#178da6] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={24} />
            <h2 className="text-xl font-bold">Payment Management</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveSection('10card')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition ${
              activeSection === '10card'
                ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Package size={18} />
            10-Card
          </button>
          <button
            onClick={() => setActiveSection('subscription')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition ${
              activeSection === 'subscription'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Calendar size={18} />
            Subscription
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Member Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {member.display_name || member.name}
              </h3>
              {activeSection === '10card' ? (
                <div className={`text-sm font-medium px-3 py-1 rounded inline-block ${
                  isNearExpiry
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {sessionsUsed}/{tenCardTotal} sessions used
                  {sessionsRemaining > 0 && ` • ${sessionsRemaining} remaining`}
                </div>
              ) : (
                <div className={`text-sm font-medium px-3 py-1 rounded inline-block ${
                  subscriptionStatus === 'active'
                    ? 'bg-green-100 text-green-800'
                    : subscriptionStatus === 'trial'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {subscriptionStatus === 'active' ? 'Active Subscription' :
                   subscriptionStatus === 'trial' ? 'Trial' : 'Expired'}
                </div>
              )}
              {activeSection === '10card' && isFull && (
                <p className="text-red-600 text-xs mt-2 font-medium">
                  ⚠️ Card is full — issue a new card before next booking
                </p>
              )}
              {activeSection === '10card' && isOneAwayFromFull && (
                <p className="text-red-600 text-xs mt-2 font-medium">
                  ⚠️ Next session will complete this card
                </p>
              )}
            </div>

            {activeSection === '10card' ? (
              <>
                {/* Close & Issue New Card Button (top) */}
                <div className="pb-4 border-b">
                  {pendingClose ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                      <p className="text-sm font-medium text-amber-900">
                        Close pending — not yet saved
                      </p>
                      <p className="text-xs text-amber-800 mt-1">
                        New card defaults to today. <span className="font-semibold">Change Purchase Date below</span> if the new card should start on a different day (e.g. tomorrow, when today&apos;s session was the last on the old card).
                      </p>
                      <p className="text-xs text-amber-800 mt-1">
                        Click <span className="font-semibold">Save Changes</span> to commit, or <span className="font-semibold">Revert</span> to abort.
                      </p>
                      <button
                        onClick={handleCancelPendingClose}
                        className="mt-2 px-3 py-1.5 bg-white hover:bg-gray-50 border border-amber-400 text-amber-900 text-sm rounded-lg transition"
                      >
                        Revert
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleCloseAndIssueNew}
                        disabled={!member.ten_card_purchase_date}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition"
                      >
                        <RefreshCw size={18} />
                        Close &amp; Issue New
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Archives the current card with its bookings, then issues a fresh card (purchase today, expiry +12 months, 0 sessions used). Changes are previewed in the form fields and only persist when you click Save Changes.
                      </p>
                    </>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sessions used counter starts from this date.
                  </p>
                </div>

                {/* Total Sessions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Sessions
                  </label>
                  <select
                    value={tenCardTotal}
                    onChange={(e) => setTenCardTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900"
                  >
                    <option value={5}>5 sessions</option>
                    <option value={10}>10 sessions (standard)</option>
                    <option value={20}>20 sessions</option>
                  </select>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date (optional)
                  </label>
                  <input
                    type="date"
                    value={tenCardExpiry}
                    onChange={(e) => setTenCardExpiry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for no expiry. Sessions cannot be used after this date.
                  </p>
                </div>

                {/* Sessions Used - Editable, with Recalc helper */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sessions Used
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={sessionsUsed}
                      onChange={(e) => setSessionsUsed(Number(e.target.value) || 0)}
                      min={0}
                      max={tenCardTotal}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500">/ {tenCardTotal}</span>
                    <button
                      onClick={async () => {
                        const count = await recalculateSessionsUsed(purchaseDate);
                        setSessionsUsed(count);
                      }}
                      disabled={!purchaseDate}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded-lg transition"
                    >
                      Recalc
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Edit directly, or click Recalc to flag every booking since the purchase date as card-consumed and set the counter to the true total.
                  </p>
                </div>

                {/* Notes — free-text for payment-tracking on this card */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={tenCardNotes}
                    onChange={(e) => setTenCardNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. paid by PayPal to Mimi 14.05.26"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Payment trail or anything else worth remembering. Archived with the card when you Close &amp; Issue New.
                  </p>
                </div>

                {/* Bookings list — sessions consumed/upcoming on this card */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Bookings on this card{purchaseDate ? ` (since ${purchaseDate})` : ''}
                  </h4>
                  {bookingsLoading ? (
                    <p className="text-xs text-gray-500">Loading…</p>
                  ) : cardBookings.length === 0 ? (
                    <p className="text-xs text-gray-500">No bookings found{purchaseDate ? ' since the purchase date' : ''}.</p>
                  ) : (() => {
                    // Past/Upcoming split by date+time vs now (browser TZ).
                    // A booking earlier today (e.g. 10:00 class) is correctly
                    // labelled past once its session_time has passed.
                    const nowMs = Date.now();
                    const bookingMs = (b: CardBooking) =>
                      new Date(`${b.date}T${b.time || '00:00:00'}`).getTime();
                    const past = cardBookings.filter(b => bookingMs(b) < nowMs);
                    const upcoming = cardBookings.filter(b => bookingMs(b) >= nowMs);
                    const statusBadge = (s: CardBooking['status']) => {
                      if (s === 'confirmed') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">attended</span>;
                      if (s === 'no_show') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">no-show</span>;
                      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">late-cancel</span>;
                    };
                    const upcomingBadge = () => (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">upcoming</span>
                    );
                    const renderRow = (b: CardBooking, isUpcoming: boolean) => (
                      <div key={b.booking_id} className="flex items-center justify-between py-1 text-xs text-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{b.date}</span>
                          <span className="text-gray-500">{b.time?.slice(0, 5)}</span>
                          {!b.is_self && (
                            <span className="italic text-purple-700">{b.booker_name}</span>
                          )}
                        </div>
                        {isUpcoming ? upcomingBadge() : statusBadge(b.status)}
                      </div>
                    );
                    return (
                      <div className="space-y-3">
                        {past.length > 0 && (
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Consumed ({past.length})</p>
                            <div className="divide-y divide-gray-100 border border-gray-200 rounded">
                              {past.map(b => renderRow(b, false))}
                            </div>
                          </div>
                        )}
                        {upcoming.length > 0 && (
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Upcoming ({upcoming.length})</p>
                            <div className="divide-y divide-gray-100 border border-gray-200 rounded">
                              {upcoming.map(b => renderRow(b, true))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Card History */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <History size={16} />
                    Card History
                  </h4>
                  {archiveLoading ? (
                    <p className="text-xs text-gray-500">Loading…</p>
                  ) : archive.length === 0 ? (
                    <p className="text-xs text-gray-500">No closed cards yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {archive.map(entry => {
                        const isExpanded = expandedArchiveIds.has(entry.id);
                        const closedDate = entry.closed_at.split('T')[0];
                        const snapshot = entry.bookings_snapshot || [];
                        return (
                          <div key={entry.id} className="border border-gray-200 rounded">
                            <button
                              onClick={() => toggleArchiveExpanded(entry.id)}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 transition"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown size={14} className="text-gray-500" />
                                ) : (
                                  <ChevronRight size={14} className="text-gray-500" />
                                )}
                                <span className="font-mono text-gray-700">
                                  {formatDateDe(entry.purchase_date)} — {formatDateDe(closedDate)}
                                </span>
                                <span className="text-gray-500">·</span>
                                <span className="font-medium text-gray-800">
                                  {entry.sessions_used}/{entry.total}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {snapshot.length} {snapshot.length === 1 ? 'booking' : 'bookings'}
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
                                {snapshot.length === 0 ? (
                                  <p className="text-[11px] text-gray-500">No bookings recorded on this card.</p>
                                ) : (
                                  <div className="divide-y divide-gray-200">
                                    {snapshot.map(b => (
                                      <div key={b.booking_id} className="flex items-center justify-between py-1 text-[11px] text-gray-700">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono">{b.date}</span>
                                          <span className="text-gray-500">{b.time?.slice(0, 5)}</span>
                                          {!b.is_self && (
                                            <span className="italic text-purple-700">{b.booker_name}</span>
                                          )}
                                        </div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                          b.status === 'confirmed'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-orange-100 text-orange-700'
                                        }`}>
                                          {b.status === 'confirmed' ? 'attended' : b.status === 'no_show' ? 'no-show' : 'late-cancel'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Notes — view + edit/delete. */}
                                <div className="mt-2">
                                  {editingNoteArchiveId === entry.id ? (
                                    <div className="space-y-1">
                                      <textarea
                                        value={editingNoteText}
                                        onChange={(e) => setEditingNoteText(e.target.value)}
                                        rows={2}
                                        placeholder="Notes (leave empty to delete)"
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#178da6]"
                                      />
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={saveArchiveNote}
                                          disabled={savingNote}
                                          className="px-2 py-1 bg-[#178da6] hover:bg-[#14758c] disabled:bg-gray-300 text-white text-[10px] rounded transition"
                                        >
                                          {savingNote ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                          onClick={cancelEditingNote}
                                          disabled={savingNote}
                                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] rounded transition"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start justify-between gap-2">
                                      {entry.notes ? (
                                        <p className="text-[11px] text-gray-600 italic flex-1">Notes: {entry.notes}</p>
                                      ) : (
                                        <p className="text-[11px] text-gray-400 italic flex-1">No notes</p>
                                      )}
                                      <div className="flex items-center gap-2 whitespace-nowrap">
                                        <button
                                          onClick={() => startEditingNote(entry)}
                                          className="text-[10px] text-blue-600 hover:text-blue-800 underline"
                                        >
                                          {entry.notes ? 'Edit' : 'Add note'}
                                        </button>
                                        <button
                                          onClick={() => deleteArchive(entry.id)}
                                          className="text-[10px] text-red-600 hover:text-red-800 underline"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Activate / Renew Subscription buttons */}
                <div className="pb-4 border-b">
                  {pendingSubClose ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                      <p className="text-sm font-medium text-amber-900">
                        Activation pending — not yet saved
                      </p>
                      <p className="text-xs text-amber-800 mt-1">
                        New subscription: active, starting today, ending <span className="font-semibold">{subscriptionEnd}</span>. Adjust the fields below if needed.
                      </p>
                      <p className="text-xs text-amber-800 mt-1">
                        Click <span className="font-semibold">Save Changes</span> to commit, or <span className="font-semibold">Revert</span> to abort.
                      </p>
                      <button
                        onClick={handleCancelPendingSubClose}
                        className="mt-2 px-3 py-1.5 bg-white hover:bg-gray-50 border border-amber-400 text-amber-900 text-sm rounded-lg transition"
                      >
                        Revert
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => startActivation(1)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                        >
                          <RefreshCw size={18} />
                          Activate 1 Month
                        </button>
                        <button
                          onClick={() => startActivation(12)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                        >
                          <RefreshCw size={18} />
                          Activate 1 Year
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Archives the current subscription (whatever its state), then starts a fresh one (active, today, today + 1 month / 1 year, blank notes). Use Monthly for cash-monthly athletes (Nikolina, Lisa, Anfisa); Yearly for upfront annual. Changes are previewed and only persist when you click Save Changes.
                      </p>
                    </>
                  )}
                </div>

                {/* Subscription Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Status
                  </label>
                  <select
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value as 'trial' | 'active' | 'past_due' | 'expired')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="expired">Expired / None</option>
                    <option value="trial">Trial</option>
                    <option value="active">Active (Paid)</option>
                    <option value="past_due">Payment Failed</option>
                  </select>
                </div>

                {/* Subscription End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {subscriptionStatus === 'trial' ? 'Trial End Date' : 'Subscription End Date'}
                  </label>
                  <input
                    type="date"
                    value={subscriptionEnd}
                    onChange={(e) => setSubscriptionEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {subscriptionStatus === 'active'
                      ? 'Leave empty for unlimited access. Otherwise, access expires on this date.'
                      : subscriptionStatus === 'trial'
                      ? 'Trial access ends on this date.'
                      : 'No active subscription.'}
                  </p>
                </div>

                {/* Notes — free-text for payment-tracking on this subscription */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={subscriptionNotes}
                    onChange={(e) => setSubscriptionNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. paid by PayPal to Mimi 14.05.26"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Payment trail or anything else worth remembering. Leave empty to clear.
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="pt-4 border-t space-y-3">
                  <p className="text-sm font-medium text-gray-700">Quick Actions</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const endDate = new Date();
                        endDate.setDate(endDate.getDate() + 30);
                        setSubscriptionStatus('trial');
                        setSubscriptionEnd(endDate.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded-lg transition"
                    >
                      Grant 30-day Trial
                    </button>
                    <button
                      onClick={() => {
                        setSubscriptionStatus('active');
                        setSubscriptionEnd('');
                      }}
                      className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded-lg transition"
                    >
                      Activate (Unlimited)
                    </button>
                    <button
                      onClick={() => {
                        setSubscriptionStatus('expired');
                        setSubscriptionEnd(new Date().toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg transition"
                    >
                      Expire Now
                    </button>
                  </div>
                </div>

                {/* Subscription History */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <History size={16} />
                    Subscription History
                  </h4>
                  {subArchiveLoading ? (
                    <p className="text-xs text-gray-500">Loading…</p>
                  ) : subArchive.length === 0 ? (
                    <p className="text-xs text-gray-500">No closed subscriptions yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {subArchive.map(entry => {
                        const isExpanded = expandedSubArchiveIds.has(entry.id);
                        const closedDate = entry.closed_at.split('T')[0];
                        return (
                          <div key={entry.id} className="border border-gray-200 rounded">
                            <button
                              onClick={() => toggleSubArchiveExpanded(entry.id)}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 transition"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown size={14} className="text-gray-500" />
                                ) : (
                                  <ChevronRight size={14} className="text-gray-500" />
                                )}
                                <span className="font-mono text-gray-700">
                                  {entry.start_date ? formatDateDe(entry.start_date) : '—'} — {entry.end_date ? formatDateDe(entry.end_date) : 'unlimited'}
                                </span>
                                <span className="text-gray-500">·</span>
                                <span className="font-medium text-gray-800">
                                  {entry.status ?? '—'}
                                  {entry.tier ? ` (${entry.tier})` : ''}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400">
                                closed {formatDateDe(closedDate)}
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
                                <div className="mt-1">
                                  {editingSubNoteArchiveId === entry.id ? (
                                    <div className="space-y-1">
                                      <textarea
                                        value={editingSubNoteText}
                                        onChange={(e) => setEditingSubNoteText(e.target.value)}
                                        rows={2}
                                        placeholder="Notes (leave empty to delete)"
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={saveSubArchiveNote}
                                          disabled={savingSubNote}
                                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-[10px] rounded transition"
                                        >
                                          {savingSubNote ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                          onClick={cancelEditingSubNote}
                                          disabled={savingSubNote}
                                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] rounded transition"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start justify-between gap-2">
                                      {entry.notes ? (
                                        <p className="text-[11px] text-gray-600 italic flex-1">Notes: {entry.notes}</p>
                                      ) : (
                                        <p className="text-[11px] text-gray-400 italic flex-1">No notes</p>
                                      )}
                                      <div className="flex items-center gap-2 whitespace-nowrap">
                                        <button
                                          onClick={() => startEditingSubNote(entry)}
                                          className="text-[10px] text-blue-600 hover:text-blue-800 underline"
                                        >
                                          {entry.notes ? 'Edit' : 'Add note'}
                                        </button>
                                        <button
                                          onClick={() => deleteSubArchive(entry.id)}
                                          className="text-[10px] text-red-600 hover:text-red-800 underline"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
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
            className="px-4 py-2 bg-[#178da6] hover:bg-[#14758c] disabled:bg-[#178da6]/50 text-white rounded-lg transition flex items-center gap-2"
          >
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>}
            Save Changes
          </button>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
}
