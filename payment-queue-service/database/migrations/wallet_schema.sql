-- =====================================================
-- WALLET SYSTEM SCHEMA
-- =====================================================
-- This migration creates tables for the wallet system
-- including user wallets and wallet transactions
-- =====================================================

-- Create user_wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    description TEXT NOT NULL,
    reference VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_wallets_updated_at ON user_wallets;
CREATE TRIGGER update_user_wallets_updated_at
    BEFORE UPDATE ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallet_transactions_updated_at ON wallet_transactions;
CREATE TRIGGER update_wallet_transactions_updated_at
    BEFORE UPDATE ON wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to credit wallet
CREATE OR REPLACE FUNCTION credit_wallet(
    p_user_id UUID,
    p_amount DECIMAL(15, 2)
)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    v_new_balance DECIMAL(15, 2);
BEGIN
    -- Update wallet balance
    UPDATE user_wallets
    SET balance = balance + p_amount
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;
    
    -- If wallet doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO user_wallets (user_id, balance)
        VALUES (p_user_id, p_amount)
        RETURNING balance INTO v_new_balance;
    END IF;
    
    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Create function to debit wallet
CREATE OR REPLACE FUNCTION debit_wallet(
    p_user_id UUID,
    p_amount DECIMAL(15, 2)
)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    v_current_balance DECIMAL(15, 2);
    v_new_balance DECIMAL(15, 2);
BEGIN
    -- Get current balance
    SELECT balance INTO v_current_balance
    FROM user_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check if wallet exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
    END IF;
    
    -- Check if sufficient balance
    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_current_balance, p_amount;
    END IF;
    
    -- Debit wallet
    UPDATE user_wallets
    SET balance = balance - p_amount
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;
    
    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Create function to get wallet balance
CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    v_balance DECIMAL(15, 2);
BEGIN
    SELECT balance INTO v_balance
    FROM user_wallets
    WHERE user_id = p_user_id;
    
    -- If wallet doesn't exist, return 0
    IF NOT FOUND THEN
        RETURN 0.00;
    END IF;
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_wallets
-- Users can only view their own wallet
CREATE POLICY "Users can view own wallet"
    ON user_wallets FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role has full access to wallets"
    ON user_wallets FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for wallet_transactions
-- Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
    ON wallet_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role has full access to transactions"
    ON wallet_transactions FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_wallets TO authenticated;
GRANT SELECT ON wallet_transactions TO authenticated;
GRANT ALL ON user_wallets TO service_role;
GRANT ALL ON wallet_transactions TO service_role;

-- Add comments for documentation
COMMENT ON TABLE user_wallets IS 'Stores user wallet balances';
COMMENT ON TABLE wallet_transactions IS 'Stores all wallet transaction history';
COMMENT ON FUNCTION credit_wallet IS 'Credits amount to user wallet';
COMMENT ON FUNCTION debit_wallet IS 'Debits amount from user wallet with balance check';
COMMENT ON FUNCTION get_wallet_balance IS 'Gets current wallet balance for a user';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created:
--   - user_wallets
--   - wallet_transactions
-- 
-- Functions created:
--   - credit_wallet(user_id, amount)
--   - debit_wallet(user_id, amount)
--   - get_wallet_balance(user_id)
-- 
-- RLS enabled with policies for user access control
-- =====================================================
