-- Add 10-card tracking columns to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS ten_card_purchase_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ten_card_sessions_used INTEGER DEFAULT 0 CHECK (ten_card_sessions_used >= 0 AND ten_card_sessions_used <= 10);

-- Add comment explaining the fields
COMMENT ON COLUMN members.ten_card_purchase_date IS 'Date when current 10-card was purchased/activated';
COMMENT ON COLUMN members.ten_card_sessions_used IS 'Number of sessions used on current 10-card (0-10)';

-- Create index for faster 10-card user queries
CREATE INDEX IF NOT EXISTS idx_members_ten_card_date ON members(ten_card_purchase_date) WHERE ten_card_purchase_date IS NOT NULL;
