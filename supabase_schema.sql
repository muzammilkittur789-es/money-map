-- ============================================================
-- MONEY MAP: Supabase Realtime Family Sync Database Schema
-- Run this script in the Supabase SQL Editor (supabase.com)
-- ============================================================

-- 1. Family Groups Table
CREATE TABLE IF NOT EXISTS family_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    monthly_budget NUMERIC DEFAULT 35000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Family Members Table
CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY,
    family_group_id TEXT REFERENCES family_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT DEFAULT '👤',
    role TEXT DEFAULT 'MEMBER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Household Expenses Table (Only Family Pool expenses synced here)
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    family_group_id TEXT REFERENCES family_groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    payment_mode TEXT DEFAULT 'ONLINE',
    upi_provider TEXT,
    payee_name TEXT,
    payee_upi_id TEXT,
    scope TEXT DEFAULT 'FAMILY',
    spent_by_id TEXT,
    spent_by_name TEXT,
    spent_by_avatar TEXT,
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Household Inflows / Money Received Table
CREATE TABLE IF NOT EXISTS inflows (
    id TEXT PRIMARY KEY,
    family_group_id TEXT REFERENCES family_groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    channel TEXT DEFAULT 'BANK_UPI',
    scope TEXT DEFAULT 'FAMILY',
    received_by_id TEXT,
    received_by_name TEXT,
    received_by_avatar TEXT,
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Real-Time Replication on tables
ALTER PUBLICATION supabase_realtime ADD TABLE family_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE inflows;

-- 6. Disable Row Level Security (RLS) for simple invite-code based family pairing
ALTER TABLE family_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE inflows DISABLE ROW LEVEL SECURITY;
