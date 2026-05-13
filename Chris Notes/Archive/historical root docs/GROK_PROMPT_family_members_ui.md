# Grok Task: Add Family Member Management UI to Booking Page

## File to Modify
`app/member/book/page.tsx`

## Overview
Add a "Family Members" section to the member booking page that allows users to add, view, edit, and delete family member profiles. These profiles will later be used for booking classes for different family members.

---

## Requirements

### 1. Add State Management

Add these state variables after the existing state declarations (around line 35):

```typescript
const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
const [showFamilyModal, setShowFamilyModal] = useState(false);
const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
const [familyFormData, setFamilyFormData] = useState({
  display_name: '',
  date_of_birth: '',
  relationship: 'child' as 'spouse' | 'child' | 'other'
});
```

Add this interface at the top with other interfaces:

```typescript
interface FamilyMember {
  id: string;
  display_name: string;
  date_of_birth: string | null;
  relationship: 'self' | 'spouse' | 'child' | 'other';
  account_type: 'primary' | 'family_member';
}
```

### 2. Add Fetch Function

Add this function after `fetchSessions()`:

```typescript
const fetchFamilyMembers = async () => {
  if (!user) return;

  try {
    const { data, error } = await supabase
      .from('members')
      .select('id, display_name, date_of_birth, relationship, account_type')
      .or(`id.eq.${user.id},primary_member_id.eq.${user.id}`)
      .order('account_type', { ascending: false }); // Primary first

    if (error) throw error;
    setFamilyMembers(data || []);
  } catch (error) {
    console.error('Error fetching family members:', error);
  }
};
```

Call `fetchFamilyMembers()` inside the existing `useEffect` that checks auth (after setting the user).

### 3. Add CRUD Functions

Add these functions after `fetchFamilyMembers()`:

```typescript
const handleAddFamilyMember = async () => {
  if (!user || !familyFormData.display_name.trim()) {
    alert('Please enter a name');
    return;
  }

  setProcessing('family-add');
  try {
    const { error } = await supabase
      .from('members')
      .insert({
        account_type: 'family_member',
        primary_member_id: user.id,
        display_name: familyFormData.display_name.trim(),
        date_of_birth: familyFormData.date_of_birth || null,
        relationship: familyFormData.relationship,
        status: 'active'
      });

    if (error) throw error;

    await fetchFamilyMembers();
    setShowFamilyModal(false);
    setFamilyFormData({
      display_name: '',
      date_of_birth: '',
      relationship: 'child'
    });
  } catch (error) {
    console.error('Error adding family member:', error);
    alert('Failed to add family member. Please try again.');
  } finally {
    setProcessing(null);
  }
};

const handleEditFamilyMember = async () => {
  if (!editingMember || !familyFormData.display_name.trim()) {
    alert('Please enter a name');
    return;
  }

  setProcessing('family-edit');
  try {
    const { error } = await supabase
      .from('members')
      .update({
        display_name: familyFormData.display_name.trim(),
        date_of_birth: familyFormData.date_of_birth || null,
        relationship: familyFormData.relationship
      })
      .eq('id', editingMember.id);

    if (error) throw error;

    await fetchFamilyMembers();
    setShowFamilyModal(false);
    setEditingMember(null);
    setFamilyFormData({
      display_name: '',
      date_of_birth: '',
      relationship: 'child'
    });
  } catch (error) {
    console.error('Error updating family member:', error);
    alert('Failed to update family member. Please try again.');
  } finally {
    setProcessing(null);
  }
};

const handleDeleteFamilyMember = async (memberId: string, memberName: string) => {
  if (!confirm(`Are you sure you want to remove ${memberName} from your family members?`)) {
    return;
  }

  setProcessing(memberId);
  try {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId)
      .eq('account_type', 'family_member'); // Safety check

    if (error) throw error;

    await fetchFamilyMembers();
  } catch (error) {
    console.error('Error deleting family member:', error);
    alert('Failed to delete family member. Please try again.');
  } finally {
    setProcessing(null);
  }
};

const openAddModal = () => {
  setEditingMember(null);
  setFamilyFormData({
    display_name: '',
    date_of_birth: '',
    relationship: 'child'
  });
  setShowFamilyModal(true);
};

const openEditModal = (member: FamilyMember) => {
  setEditingMember(member);
  setFamilyFormData({
    display_name: member.display_name,
    date_of_birth: member.date_of_birth || '',
    relationship: member.relationship as 'spouse' | 'child' | 'other'
  });
  setShowFamilyModal(true);
};
```

### 4. Add UI Section

Insert this section AFTER the week navigation controls (around line 370, after the "Previous Week / Next Week" buttons) and BEFORE the sessions list:

```tsx
{/* Family Members Section */}
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-xl font-bold text-white">Family Members</h2>
        <p className="text-gray-400 text-sm mt-1">Manage family member profiles for booking</p>
      </div>
      <button
        onClick={openAddModal}
        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
      >
        + Add Family Member
      </button>
    </div>

    {familyMembers.length === 0 ? (
      <p className="text-gray-400 text-center py-8">No family members added yet</p>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {familyMembers.map((member) => (
          <div
            key={member.id}
            className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-teal-500 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg">
                  {member.display_name}
                  {member.account_type === 'primary' && (
                    <span className="ml-2 text-xs bg-teal-500/20 text-teal-300 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </h3>
                {member.date_of_birth && (
                  <p className="text-gray-400 text-sm mt-1">
                    Born: {new Date(member.date_of_birth).toLocaleDateString()}
                  </p>
                )}
                <p className="text-gray-400 text-sm capitalize mt-1">
                  {member.relationship}
                </p>
              </div>
            </div>

            {member.account_type === 'family_member' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-600">
                <button
                  onClick={() => openEditModal(member)}
                  className="flex-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteFamilyMember(member.id, member.display_name)}
                  disabled={processing === member.id}
                  className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                >
                  {processing === member.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
</div>
```

### 5. Add Modal Component

Add this modal at the end of the return statement, just before the closing `</div>` (around line 450):

```tsx
{/* Family Member Modal */}
{showFamilyModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">
            {editingMember ? 'Edit Family Member' : 'Add Family Member'}
          </h3>
          <button
            onClick={() => {
              setShowFamilyModal(false);
              setEditingMember(null);
            }}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={familyFormData.display_name}
              onChange={(e) => setFamilyFormData({ ...familyFormData, display_name: e.target.value })}
              placeholder="e.g., Emma, Liam"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date of Birth (Optional)
            </label>
            <input
              type="date"
              value={familyFormData.date_of_birth}
              onChange={(e) => setFamilyFormData({ ...familyFormData, date_of_birth: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Relationship
            </label>
            <select
              value={familyFormData.relationship}
              onChange={(e) => setFamilyFormData({ ...familyFormData, relationship: e.target.value as 'spouse' | 'child' | 'other' })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
            >
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              setShowFamilyModal(false);
              setEditingMember(null);
            }}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={editingMember ? handleEditFamilyMember : handleAddFamilyMember}
            disabled={processing === 'family-add' || processing === 'family-edit'}
            className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {processing === 'family-add' || processing === 'family-edit'
              ? 'Saving...'
              : editingMember
              ? 'Update'
              : 'Add'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## Important Notes

1. **Use existing patterns** - Follow the same styling, state management, and error handling patterns already in the file
2. **Icons** - X icon is already imported, reuse it
3. **Colors** - Use the existing color scheme (teal for primary actions, red for delete, gray for backgrounds)
4. **Responsive** - The grid layout should work on mobile (1 col), tablet (2 cols), and desktop (3 cols)
5. **Primary member** - Display "You" badge for the primary member, don't allow editing/deleting them
6. **Error handling** - Use try/catch blocks and show user-friendly alerts

---

## Testing Checklist

After implementation, verify:
- ✅ Family members section appears between week navigation and sessions list
- ✅ "Add Family Member" button opens modal
- ✅ Can add a new family member with name, DOB, and relationship
- ✅ Primary member (yourself) shows with "You" badge
- ✅ Can edit family member (opens pre-filled modal)
- ✅ Can delete family member (shows confirmation)
- ✅ Cannot edit/delete primary member
- ✅ UI matches existing booking page styling
- ✅ Responsive on mobile/tablet/desktop
