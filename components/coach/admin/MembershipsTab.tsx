'use client';

import { useEffect, useMemo, useState } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { supabase } from '@/lib/supabase';
import { confirm } from '@/lib/confirm';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import {
  CONTRACT_TYPE_LABELS,
  computeContractEndDate,
  type GymContractType,
  type GymMembership,
  type GymMembershipStatus,
} from '@/types/membership';

type Filter = GymMembershipStatus | 'all';

type Row = GymMembership & {
  members: {
    id: string;
    name: string | null;
    display_name: string | null;
  } | null;
};

interface MemberOpt { id: string; label: string }

export default function MembershipsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const [showAdd, setShowAdd] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [members, setMembers] = useState<MemberOpt[]>([]);

  const fetchRows = async (f: Filter) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/coach/memberships?status=${f}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'fetch failed');
      setRows(json.memberships || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load memberships');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(filter); }, [filter]);

  // Member dropdown options — load once, primary accounts only.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('members')
        .select('id, name, display_name, status')
        .in('status', ['active', 'pending'])
        .neq('account_type', 'family_member')
        .order('name');
      setMembers((data ?? []).map(m => ({
        id: m.id,
        label: (m.display_name || m.name || '?').trim(),
      })));
    })();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!await confirm({
      title: 'Delete membership',
      message: `Delete the membership row for ${name}? This is permanent. Use cancellation instead if the contract was actually started.`,
      confirmText: 'Delete',
      variant: 'danger',
    })) return;

    const res = await authFetch(`/api/coach/memberships/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Delete failed');
      return;
    }
    toast.success('Deleted');
    fetchRows(filter);
  };

  return (
    <div>
      {/* Filter pills + Add button */}
      <div className='flex items-center gap-2 mb-4 flex-wrap'>
        {(['active', 'expired', 'cancelled', 'all'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === f
                ? 'bg-[#178da6] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className='ml-auto'>
          <button
            onClick={() => setShowAdd(true)}
            className='flex items-center gap-1.5 px-3 py-1.5 bg-[#178da6] hover:bg-[#14758c] text-white text-sm rounded-md transition'
          >
            <Plus size={16} /> Add Membership
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className='text-sm text-gray-500'>Loading…</p>
      ) : rows.length === 0 ? (
        <p className='text-sm text-gray-500'>
          No {filter === 'all' ? '' : filter} memberships.
          {filter === 'active' && ' Add one with the button above when an athlete signs a contract.'}
        </p>
      ) : (
        <div className='space-y-2'>
          {rows.map(r => (
            <MembershipRow
              key={r.id}
              row={r}
              onDelete={handleDelete}
              onEdit={() => setEditingRow(r)}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <AddMembershipModal
          members={members}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            fetchRows(filter);
          }}
        />
      )}

      {/* Edit modal */}
      {editingRow && (
        <EditMembershipModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSaved={() => {
            setEditingRow(null);
            fetchRows(filter);
          }}
        />
      )}
    </div>
  );
}

function MembershipRow({ row, onDelete, onEdit }: { row: Row; onDelete: (id: string, name: string) => void; onEdit: () => void }) {
  const name = row.members?.display_name || row.members?.name || '?';
  const today = new Date().toISOString().slice(0, 10);
  const daysLeft = Math.ceil(
    (new Date(row.end_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24),
  );

  // Color band: red ≤14d, amber ≤30d, gray otherwise. Only for active rows.
  const bandClass = row.status !== 'active'
    ? 'bg-gray-50 border-gray-200'
    : daysLeft <= 14
    ? 'bg-red-50 border-red-300'
    : daysLeft <= 30
    ? 'bg-amber-50 border-amber-300'
    : 'bg-white border-gray-200';

  const statusBadge =
    row.status === 'active'
      ? <span className='text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700'>active</span>
      : row.status === 'expired'
      ? <span className='text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700'>expired</span>
      : <span className='text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700'>cancelled</span>;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded border ${bandClass}`}>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <span className='font-medium text-sm text-gray-900 truncate'>{name}</span>
          {statusBadge}
        </div>
        <div className='text-xs text-gray-600 mt-0.5'>
          {CONTRACT_TYPE_LABELS[row.contract_type]} · {row.start_date} → {row.end_date}
          {row.status === 'active' && (
            <>
              {' '}·{' '}
              <span className={daysLeft <= 14 ? 'text-red-700 font-semibold' : daysLeft <= 30 ? 'text-amber-700 font-semibold' : ''}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? 'expires today' : `${daysLeft} days left`}
              </span>
            </>
          )}
        </div>
        {row.notes && <div className='text-xs text-gray-500 mt-0.5 italic'>{row.notes}</div>}
      </div>
      <button
        onClick={onEdit}
        className='p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition'
        title='Edit'
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={() => onDelete(row.id, name)}
        className='p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition'
        title='Delete row'
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function EditMembershipModal({
  row,
  onClose,
  onSaved,
}: {
  row: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [contractType, setContractType] = useState<GymContractType>(row.contract_type);
  const [startDate, setStartDate] = useState(row.start_date);
  const [notes, setNotes] = useState(row.notes ?? '');
  const [status, setStatus] = useState<GymMembershipStatus>(row.status);
  const [saving, setSaving] = useState(false);

  const previewEnd = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
    ? computeContractEndDate(startDate, contractType)
    : null;

  const memberName = row.members?.display_name || row.members?.name || '?';

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/coach/memberships/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          contractType,
          startDate,
          notes: notes.trim() || null,
          status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'save failed');
      toast.success('Membership updated');
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update membership');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col'>
        <div className='bg-[#178da6] text-white p-4 flex items-center justify-between'>
          <h2 className='text-lg font-bold'>Edit Membership</h2>
          <button onClick={onClose} className='p-1 hover:bg-white/20 rounded' aria-label='Close'>
            <X size={20} />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-5 space-y-4'>
          <div className='bg-gray-50 px-3 py-2 rounded text-sm font-medium text-gray-800'>
            {memberName}
          </div>

          {/* Contract type */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Contract type</label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value as GymContractType)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
            >
              {(Object.keys(CONTRACT_TYPE_LABELS) as GymContractType[]).map(t => (
                <option key={t} value={t}>{CONTRACT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Start date</label>
            <input
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
            />
            {previewEnd && (
              <p className='text-xs text-gray-500 mt-1'>
                End date: <span className='font-medium'>{previewEnd}</span>
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GymMembershipStatus)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
            >
              <option value='active'>Active</option>
              <option value='cancelled'>Cancelled</option>
              <option value='expired'>Expired</option>
            </select>
            <p className='text-xs text-gray-500 mt-1'>
              Use Cancelled for early termination. Expired auto-applies daily once end_date passes.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder='Anything to remember about this contract…'
              className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
            />
          </div>
        </div>

        <div className='border-t p-4 flex justify-end gap-2'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-md transition'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className='px-4 py-2 bg-[#178da6] hover:bg-[#14758c] disabled:bg-[#178da6]/50 text-white text-sm rounded-md transition'
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMembershipModal({
  members,
  onClose,
  onAdded,
}: {
  members: MemberOpt[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [contractType, setContractType] = useState<GymContractType>('monthly_1_year');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members.slice(0, 10);
    const q = search.toLowerCase();
    return members.filter(m => m.label.toLowerCase().includes(q)).slice(0, 10);
  }, [search, members]);

  const previewEnd = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
    ? computeContractEndDate(startDate, contractType)
    : null;

  const selectedLabel = members.find(m => m.id === memberId)?.label;

  const handleSave = async () => {
    if (!memberId || !startDate) {
      toast.error('Select a member and start date');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/coach/memberships', {
        method: 'POST',
        body: JSON.stringify({
          memberId,
          contractType,
          startDate,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'save failed');
      toast.success('Membership added');
      onAdded();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add membership');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col'>
        <div className='bg-[#178da6] text-white p-4 flex items-center justify-between'>
          <h2 className='text-lg font-bold'>Add Membership</h2>
          <button onClick={onClose} className='p-1 hover:bg-white/20 rounded' aria-label='Close'>
            <X size={20} />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-5 space-y-4'>
          {/* Member */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Member</label>
            {selectedLabel ? (
              <div className='flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded'>
                <span className='text-sm'>{selectedLabel}</span>
                <button
                  onClick={() => { setMemberId(null); setSearch(''); }}
                  className='text-xs text-blue-600 hover:underline'
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type='text'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search by name…'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
                />
                <div className='mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded'>
                  {filteredMembers.length === 0 ? (
                    <p className='text-xs text-gray-400 p-2'>No matches</p>
                  ) : filteredMembers.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setMemberId(m.id); setSearch(''); }}
                      className='w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100'
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Contract type */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Contract type</label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value as GymContractType)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
            >
              {(Object.keys(CONTRACT_TYPE_LABELS) as GymContractType[]).map(t => (
                <option key={t} value={t}>{CONTRACT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Start date</label>
            <input
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
            />
            {previewEnd && (
              <p className='text-xs text-gray-500 mt-1'>
                End date: <span className='font-medium'>{previewEnd}</span>
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
            />
          </div>
        </div>

        <div className='border-t p-4 flex justify-end gap-2'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-md transition'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !memberId}
            className='px-4 py-2 bg-[#178da6] hover:bg-[#14758c] disabled:bg-[#178da6]/50 text-white text-sm rounded-md transition'
          >
            {saving ? 'Saving…' : 'Add Membership'}
          </button>
        </div>
      </div>
    </div>
  );
}
