# Wallet Audit Logging

All wallet operations are now automatically logged to the `audit_logs` table for
compliance and security.

## What Gets Logged

Every wallet operation is tracked with:

- **User ID** - Who performed the action
- **Action Type** - What they did (wallet_topup_initialized,
  wallet_topup_completed, wallet_deduction)
- **Resource Type** - Always "wallet" for wallet operations
- **Resource ID** - Transaction reference number
- **Old Values** - Previous state (e.g., old balance)
- **New Values** - New state (e.g., new balance, amount, status)
- **IP Address** - Where the request came from
- **User Agent** - What device/browser was used
- **Timestamp** - When it happened (automatic)

## Logged Operations

### 1. Wallet Top-Up Initialization

```
Action: wallet_topup_initialized
Old Values: { balance: 5000 }
New Values: {
  amount: 1000,
  reference: "WALLET-TOPUP-123...",
  status: "pending",
  isDemoMode: false
}
```

### 2. Wallet Top-Up Completion

```
Action: wallet_topup_completed
Old Values: { balance: 5000 }
New Values: {
  balance: 6000,
  amount: 1000,
  reference: "WALLET-TOPUP-123...",
  status: "completed"
}
```

### 3. Wallet Deduction (Payment)

```
Action: wallet_deduction
Old Values: { balance: 6000 }
New Values: {
  balance: 5500,
  amount: 500,
  description: "Hotel booking payment",
  reference: "BOOKING-456...",
  status: "completed"
}
```

## Database Schema

The `audit_logs` table structure:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Querying Audit Logs

### Get all wallet operations for a user

```sql
SELECT * FROM audit_logs
WHERE user_id = 'user-uuid-here'
  AND resource_type = 'wallet'
ORDER BY created_at DESC;
```

### Get all top-ups in the last 30 days

```sql
SELECT * FROM audit_logs
WHERE action = 'wallet_topup_completed'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

### Get all deductions over NGN 10,000

```sql
SELECT * FROM audit_logs
WHERE action = 'wallet_deduction'
  AND (new_values->>'amount')::numeric > 10000
ORDER BY created_at DESC;
```

## For Mobile Developers

**You don't need to do anything!**

Audit logging happens automatically on the backend. Just call the wallet APIs
normally:

```typescript
// This automatically logs to audit_logs
const response = await axios.post('/api/v1/wallet/topup', {
  amount: 1000,
  email: 'user@example.com',
});
```

The backend extracts IP address and user agent from the request headers
automatically.

## Security & Compliance

- All sensitive operations are logged
- Logs are immutable (no updates/deletes)
- Includes IP address for fraud detection
- Includes user agent for device tracking
- Timestamps are automatic and accurate
- Logs survive even if the operation fails (best effort)

## Admin Access

Admins can view audit logs through:

1. Direct database queries (SQL)
2. Admin dashboard (if implemented)
3. Supabase dashboard (for authorized personnel)

## Performance

Audit logging is:

- **Non-blocking** - Failures don't break wallet operations
- **Async** - Doesn't slow down user requests
- **Lightweight** - Minimal database overhead
- **Indexed** - Fast queries on user_id and created_at

## Compliance

This audit trail helps with:

- **PCI DSS** - Payment card industry compliance
- **GDPR** - User data access tracking
- **SOC 2** - Security audit requirements
- **Internal audits** - Financial reconciliation
- **Fraud detection** - Suspicious activity monitoring

---

**Questions?** Check `MOBILE_PAYMENT_GUIDE.md` for payment integration details.
