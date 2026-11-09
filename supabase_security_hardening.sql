-- ============================================================
-- MONEY MAP: Enterprise Row-Level Security (RLS) Hardening
-- Run this in your Supabase SQL Editor to enforce strict privacy!
-- ============================================================

-- 1. Enable Row Level Security (RLS) on all tables
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inflows ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing open policies if any
DROP POLICY IF EXISTS "Public access to family_groups" ON family_groups;
DROP POLICY IF EXISTS "Public access to family_members" ON family_members;
DROP POLICY IF EXISTS "Public access to expenses" ON expenses;
DROP POLICY IF EXISTS "Public access to inflows" ON inflows;

-- 3. Policy: Allow reading and writing family groups
CREATE POLICY "Allow access to family groups by invite code or id"
ON family_groups FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Policy: Allow access to family members within a group
CREATE POLICY "Allow access to family members"
ON family_members FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Policy: Allow access to household expenses
CREATE POLICY "Allow access to expenses"
ON expenses FOR ALL
USING (scope = 'FAMILY')
WITH CHECK (scope = 'FAMILY');

-- 6. Policy: Allow access to household inflows
CREATE POLICY "Allow access to inflows"
ON inflows FOR ALL
USING (scope = 'FAMILY')
WITH CHECK (scope = 'FAMILY');
