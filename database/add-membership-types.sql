-- Add membership_types column to members table
-- This allows tracking multiple membership types per member (e.g., monthly member + 10-card)

ALTER TABLE members
ADD COLUMN IF NOT EXISTS membership_types TEXT[] DEFAULT '{}';

-- Add comment explaining the field
COMMENT ON COLUMN members.membership_types IS 'Array of membership types: member, drop_in, ten_card, wellpass, hansefit, trial';

-- Create index for faster queries on membership types
CREATE INDEX IF NOT EXISTS idx_members_membership_types ON members USING GIN (membership_types);
