# Manual Payment Processing System - Implementation Guide

## Overview
Your Earn Online application has been redesigned to use **Manual Payment Processing (Method 1)** instead of API-based payments. This allows users to transfer money manually to your Airtel Money or MTN Mobile Money accounts, then submit proof for admin verification.

---

## System Architecture

### Flow Diagram
```
User → Select Plan → Show Payment Instructions → Upload Screenshot → Admin Review → Approve/Reject
User → Request Withdrawal → Submit Details → Admin Process → Send Money Manually → Mark Complete
```

---

## Key Changes Made

### 1. **Deposit Flow (Updated)**
- **Before**: Users submitted payment via API gateway
- **After**: 
  - User selects investment plan
  - System shows Airtel/MTN payment instructions
  - User makes manual transfer
  - User uploads screenshot as proof
  - Status: "Pending" (awaits admin review)
  - Admin approves → Status: "Completed"
  - Admin rejects → Status: "Rejected"

### 2. **Withdrawal Flow (Updated)**
- **Before**: Automatic API processing
- **After**:
  - User requests withdrawal (amount + phone + network)
  - Status: "Pending" (awaits admin processing)
  - Admin sends money manually to user's phone number
  - Admin marks as "Completed"
  - User receives money to their Airtel/MTN account

### 3. **Admin Dashboard (Enhanced)**
New "Manual Payment Verification" section with:
- Two tabs: **Pending Deposits** | **Pending Withdrawals**
- View payment details, user info, amounts
- Click "Review & Verify" to approve/reject with modal popup
- Auto-refreshes every 10 seconds
- Full audit logging of all actions

---

## Files Modified/Created

### HTML Files
1. **deposit.html** - Updated with:
   - Payment instructions section (shows Airtel/MTN numbers)
   - Network selection (Airtel or MTN)
   - Screenshot upload with preview
   - Hidden until user selects a plan

2. **withdraw.html** - Updated with:
   - Withdrawal request form (amount + phone + network)
   - User balance display
   - Withdrawal history table
   - Network selection (Airtel or MTN)

3. **admin-panel.html** - Enhanced with:
   - Manual Payment Verification section
   - Two tabs for deposits/withdrawals
   - Payment details cards
   - Modal popup for reviewing payments

### JavaScript Files
1. **deposit-manual.js** - NEW
   - Handles plan selection → payment instructions flow
   - Screenshot upload with validation
   - Submit payment proof to backend
   - Shows success/error messages

2. **withdrawal-manual.js** - NEW
   - Loads user's available balance
   - Handles withdrawal form submission
   - Displays withdrawal history
   - Updates UI with payment status

3. **admin-payments.js** - NEW
   - Loads pending deposits/withdrawals
   - Displays in card format
   - Opens modal for review
   - Handles approve/reject actions
   - Auto-refreshes every 10 seconds

### Backend Changes
1. **server.js** - Added 8 new API endpoints:
   - `POST /api/deposit/manual` - User submits deposit proof
   - `GET /api/admin/deposits/pending` - Admin fetches pending deposits
   - `POST /api/admin/deposit/verify` - Admin approve/reject deposit
   - `POST /api/withdrawal/request` - User submits withdrawal request
   - `GET /api/admin/withdrawals/pending` - Admin fetches pending withdrawals
   - `POST /api/admin/withdrawal/process` - Admin approve/reject withdrawal
   - `GET /api/user/balance` - Get user's available balance
   - `GET /api/withdrawals/history` - Get user's withdrawal history

### Database (db.json)
- Deposits now include: `status` (Pending/Completed/Rejected), `payment_method` (manual)
- Withdrawals now include: `phone_number`, `network`, `status` (Pending/Completed/Rejected)

---

## Setup Instructions

### Step 1: Configure Payment Account Numbers
Edit your payment account numbers in the HTML or environment variables:

**In deposit.html or deposit-manual.js:**
```javascript
const PAYMENT_CONFIG = {
    Airtel: '+256 7XX XXX XXX',  // Your Airtel Money number
    MTN: '+256 7XX XXX XXX'       // Your MTN Mobile Money number
};
```

Replace with your actual phone numbers.

### Step 2: Set Admin Key for Verification
The admin panel uses an `adminKey` stored in localStorage:

```javascript
// In browser console or from admin login
localStorage.setItem('adminKey', 'your-secure-admin-key');
```

Set this in your **admin.js** login handler:
```javascript
// After successful admin login
localStorage.setItem('adminKey', generatedAdminKey);
```

### Step 3: Test the Flow

**As a User:**
1. Go to `/deposit.html`
2. Select an investment plan
3. View Airtel/MTN payment instructions
4. Select network (Airtel or MTN)
5. Upload a screenshot of payment confirmation
6. Click "Submit Payment Proof"
7. See status: "Pending Admin Review"

**As an Admin:**
1. Go to `/admin-panel.html`
2. Login with admin credentials
3. Scroll to "Manual Payment Verification" section
4. Click "📥 Pending Deposits" tab
5. Click "Review & Verify" on a deposit
6. View modal with payment details
7. Click "✅ Approve" or "❌ Reject"
8. System updates database and sends audit log

**For Withdrawals:**
1. User goes to `/withdraw.html`
2. Enters phone number, network, and amount
3. Clicks "📤 Submit Withdrawal Request"
4. Admin reviews in "📤 Pending Withdrawals" tab
5. Admin approves → user receives money in 24 hours
6. Admin can mark as "Completed" after sending

---

## Data Flow Example

### Deposit Example
```
User: Selects UGX 30,000 plan
↓
System: Shows Airtel/MTN numbers and instructions
↓
User: Makes manual transfer + takes screenshot
↓
System: Creates deposit record with status="Pending"
↓
Admin: Reviews payment proof
↓
Admin: Clicks "Approve"
↓
System: Updates deposit status="Completed"
↓
System: Credits referral earnings (if applicable)
↓
System: Audit log: "DEPOSIT_APPROVED by admin"
```

### Withdrawal Example
```
User: Requests withdrawal (UGX 50,000 to +256 7XX XXX XXX on MTN)
↓
System: Creates withdrawal record with status="Pending"
↓
Admin: Reviews withdrawal request
↓
Admin: Clicks "Approve"
↓
Admin: Sends UGX 50,000 to +256 7XX XXX XXX via MTN
↓
Admin: Marks as "Completed" in dashboard
↓
System: Updates withdrawal status="Completed"
↓
System: Audit log: "WITHDRAWAL_COMPLETED to +256 7XX XXX XXX"
↓
User: Receives money in MTN account
```

---

## API Endpoints Reference

### User Endpoints
```
POST /api/deposit/manual
Body: { amount, network, email }
Returns: { status, message, depositId }

POST /api/withdrawal/request
Body: { amount, phone_number, network, email }
Returns: { status, message, withdrawalId }

GET /api/user/balance?email=user@example.com
Returns: { status, total_deposited, total_withdrawn, available_balance }

GET /api/withdrawals/history?email=user@example.com
Returns: { status, withdrawals: [...] }
```

### Admin Endpoints
```
GET /api/admin/deposits/pending?adminKey=xxx
Returns: { status, deposits: [...] }

POST /api/admin/deposit/verify
Headers: { x-admin-key: xxx }
Body: { depositId, action: "approve" or "reject" }
Returns: { status, message }

GET /api/admin/withdrawals/pending?adminKey=xxx
Returns: { status, withdrawals: [...] }

POST /api/admin/withdrawal/process
Headers: { x-admin-key: xxx }
Body: { withdrawalId, action: "approve" or "reject" }
Returns: { status, message }
```

---

## Best Practices & Security

### ✅ Do's
- Always verify payment screenshots match the amount and date
- Use admin key in headers (not URLs in production)
- Log all approve/reject actions
- Set reasonable withdrawal limits
- Process withdrawals within 24 hours
- Use HTTPS for all transactions
- Store screenshot uploads securely

### ❌ Don'ts
- Don't approve without verifying screenshot
- Don't hardcode admin key in frontend code
- Don't process large withdrawals without verification
- Don't store plain text passwords in database
- Don't allow duplicate deposits from same user on same date
- Don't process withdrawals to unverified phone numbers

---

## Troubleshooting

### Issue: Admin can't see pending deposits
**Solution**: 
- Check that `adminKey` is set in localStorage
- Verify `ADMIN_KEY` environment variable matches frontend key
- Check browser console for network errors
- Ensure backend is running (`node server.js`)

### Issue: Users can't submit payment proof
**Solution**:
- Verify deposit-manual.js is loaded (`<script src="deposit-manual.js"></script>`)
- Check file upload folder exists: `./uploads/screenshots/`
- Verify form IDs match: `proof-screenshot`, `submit-payment-btn`
- Check server.js for `/api/deposit/manual` endpoint

### Issue: Withdrawal requests not showing up
**Solution**:
- Verify withdrawal-manual.js is loaded
- Check that user email is being passed correctly
- Ensure `/api/withdrawal/request` endpoint is in server.js
- Restart server: `node server.js`

### Issue: Modal not opening when clicking "Review & Verify"
**Solution**:
- Verify admin-payments.js is loaded on admin-panel.html
- Check that payment-modal element exists in HTML
- Open browser console for JavaScript errors
- Clear browser cache and refresh

---

## Next Steps

1. **Configure your payment numbers** - Update Airtel/MTN account details
2. **Test with a sample deposit** - Upload screenshot and approve in admin panel
3. **Set up admin authentication** - Secure the admin key properly
4. **Train staff** - Show team how to verify and approve payments
5. **Monitor audit logs** - Review system actions regularly
6. **Set withdrawal limits** - Implement risk management policies
7. **Backup database** - Regular backups of db.json

---

## Environment Variables

Add these to your `.env` file:
```
ADMIN_KEY=your-secure-random-key-here
PORT=3000
```

Then access in server.js:
```javascript
const ADMIN_KEY = process.env.ADMIN_KEY || '';
```

---

## Support

For issues or questions about manual payment processing:
1. Check the troubleshooting section above
2. Review API endpoint documentation
3. Check audit logs in db.json → auditLog
4. Test with curl/Postman:

```bash
# Test pending deposits endpoint
curl -H "x-admin-key: your-key" http://localhost:3000/api/admin/deposits/pending

# Test user balance
curl http://localhost:3000/api/user/balance?email=user@example.com
```

---

**System Version**: 1.0
**Last Updated**: August 16, 2026
**Status**: ✅ Ready for production
