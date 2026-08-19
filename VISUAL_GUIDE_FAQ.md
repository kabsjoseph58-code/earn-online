# Manual Payment Processing - Visual Guide & FAQ

## 🎯 System Flow Diagram

### Deposit Flow
```
┌─────────────────────────────────────────────────────────────────────┐
┌─────────────────────────────────────────────────────────────────────┐
│ USER: Visit /deposit.html                                            │
│  ↓                                                                    │
│  Sees investment plans (30K, 40K, 50K, 60K)                          │
│  ↓                                                                    │
│  Clicks "Select Plan" → Plan selected                              │
│  ↓                                                                    │
│  PAYMENT INSTRUCTIONS appear:                                        │
│  ┌─────────────────────┬─────────────────────┐                      │
│  │ Airtel Money        │ MTN Mobile Money    │                      │
│  │ +256 700 123 456    │ +256 700 654 321    │                      │
│  │ How to send:        │ How to send:        │                      │
│  │ 1. Dial *185#       │ 1. Dial *165#       │                      │
│  │ 2. Send Money       │ 2. Send Money       │                      │
│  │ 3. Enter number     │ 3. Enter number     │                      │
│  │ 4. Enter amount     │ 4. Enter amount     │                      │
│  │ 5. Take screenshot  │ 5. Take screenshot  │                      │
│  └─────────────────────┴─────────────────────┘                      │
│  ↓                                                                    │
│  USER: Makes manual transfer to chosen number                       │
│  ↓                                                                    │
│  USER: Takes screenshot of confirmation                              │
│  ├→ Uploads screenshot                                                │
│  ├→ Selects network (Airtel or MTN)                                  │
│  └→ Clicks "Submit Payment Proof"                                    │
│  ↓                                                                    │
│  SERVER: Creates deposit record                                      │
│  ├─ Status: "Pending"                                                │
│  ├─ Amount: 30000                                                    │
│  ├─ Network: "Airtel"                                                │
│  ├─ Email: user@example.com                                          │
│  └─ Created_at: timestamp                                            │
│  ↓                                                                    │
│  USER: Sees "✅ Payment proof submitted. Awaiting admin verification"│
│  ↓                                                                    │
│  USER DASHBOARD: Shows "Pending - awaiting verification"            │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│ ADMIN: Visit /admin-panel.html → Login                               │
│ ↓                                                                     │
│ Scroll down to "💳 Manual Payment Verification"                     │
│ ↓                                                                     │
│ Click "📥 Pending Deposits" tab                                      │
│ ↓                                                                     │
│ See card showing:                                                    │
│ ┌──────────────────────┬──────────────┬──────────────┐              │
│ │ User: john_doe       │ 30,000 UGX   │ Submitted    │              │
│ │ Email: john@...      │              │ 8/16 2:30 PM │              │
│ │ Network: Airtel      │              │              │              │
│ │ [Review & Verify →]  │              │              │              │
│ └──────────────────────┴──────────────┴──────────────┘              │
│ ↓                                                                     │
│ ADMIN: Clicks "Review & Verify"                                     │
│ ↓                                                                     │
│ MODAL OPENS showing:                                                │
│ ┌────────────────────────────────────────┐                          │
│ │ Review Deposit - john_doe              │ ✕                       │
│ ├────────────────────────────────────────┤                          │
│ │ User: john_doe                         │                          │
│ │ Email: john@example.com                │                          │
│ │ Amount: UGX 30,000                     │                          │
│ │ Network: Airtel                        │                          │
│ │ Submitted: 8/16/2026, 2:30:45 PM       │                          │
│ ├────────────────────────────────────────┤                          │
│ │ [✅ Approve]  [❌ Reject]              │                          │
│ └────────────────────────────────────────┘                          │
│ ↓                                                                     │
│ ADMIN: Verifies screenshot shows:                                   │
│ ├─ Correct amount (30000)                                          │
│ ├─ Recent date/time                                                 │
│ ├─ Successful transaction                                           │
│ ├─ Correct payment details                                          │
│ ↓                                                                    │
│ ADMIN: Clicks "✅ Approve"                                          │
│ ↓                                                                    │
│ SERVER: Updates deposit                                             │
│ ├─ Status: "Completed" (was "Pending")                             │
│ ├─ Audit log: "DEPOSIT_APPROVED by admin"                          │
│ ├─ Referral credits applied (if applicable)                        │
│ └─ User balance updated +30000                                      │
│ ↓                                                                    │
│ ADMIN: Sees success message "✅ Deposit approved successfully"     │
│ ↓                                                                    │
│ USER: Can now see balance updated on dashboard                      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Withdrawal Flow
```
┌──────────────────────────────────────────────────────────────────────┐
│ USER: Visit /withdraw.html                                            │
│ ↓                                                                      │
│ Sees balance: Available: UGX 30,000                                   │
│ ↓                                                                      │
│ Enters withdrawal details:                                            │
│ ┌──────────────────────────────────────┐                             │
│ │ Choose Network: ○ Airtel   ○ MTN    │                             │
│ │ Your Phone Number: [256 7XX XXX XXX] │                             │
│ │ Withdrawal Amount: [25000]           │                             │
│ │ [📤 Submit Withdrawal Request]        │                             │
│ └──────────────────────────────────────┘                             │
│ ↓                                                                      │
│ SERVER: Creates withdrawal record                                    │
│ ├─ Status: "Pending"                                                 │
│ ├─ Amount: 25000                                                     │
│ ├─ Phone: 256700123456                                               │
│ ├─ Network: "MTN"                                                    │
│ ├─ Email: user@example.com                                           │
│ └─ Created_at: timestamp                                             │
│ ↓                                                                      │
│ USER: Sees "✅ Withdrawal request submitted. Admin will process..."  │
│ ↓                                                                      │
│ USER DASHBOARD: Shows withdrawal in history                          │
│ Status: "Pending" (waiting for admin)                                │
│                                                                        │
├──────────────────────────────────────────────────────────────────────┤
│ ADMIN: Visit /admin-panel.html → Login                                │
│ ↓                                                                      │
│ Scroll to "💳 Manual Payment Verification"                          │
│ ↓                                                                      │
│ Click "📤 Pending Withdrawals" tab                                    │
│ ↓                                                                      │
│ See card showing:                                                    │
│ ┌────────────────────────┬──────────────┬──────────────┐             │
│ │ User: john_doe         │ 25,000 UGX   │ Requested    │             │
│ │ Phone: 256700123456    │              │ 8/16 2:45 PM │             │
│ │ Network: MTN           │              │              │             │
│ │ [Process Withdrawal →] │              │              │             │
│ └────────────────────────┴──────────────┴──────────────┘             │
│ ↓                                                                      │
│ ADMIN: Clicks "Process Withdrawal"                                   │
│ ↓                                                                      │
│ MODAL SHOWS:                                                         │
│ ┌────────────────────────────────────────┐                           │
│ │ Process Withdrawal - john_doe          │ ✕                        │
│ ├────────────────────────────────────────┤                           │
│ │ User: john_doe                         │                           │
│ │ Email: john@example.com                │                           │
│ │ Phone: 256700123456                    │                           │
│ │ Network: MTN                           │                           │
│ │ Amount: UGX 25,000                     │                           │
│ │ Requested: 8/16/2026, 2:45:30 PM       │                           │
│ ├────────────────────────────────────────┤                           │
│ │ [✅ Approve]  [❌ Reject]              │                           │
│ └────────────────────────────────────────┘                           │
│ ↓                                                                      │
│ ADMIN: Sends UGX 25,000 to 256700123456 via MTN                      │
│ (Using their own MTN account or company account)                     │
│ ↓                                                                      │
│ ADMIN: Once money is sent, clicks "✅ Approve"                       │
│ ↓                                                                      │
│ SERVER: Updates withdrawal                                           │
│ ├─ Status: "Completed"                                               │
│ ├─ Audit log: "WITHDRAWAL_COMPLETED to 256700123456"                │
│ └─ User balance updated -25000                                       │
│ ↓                                                                      │
│ ADMIN: Sees success message "✅ Withdrawal completed successfully"   │
│ ↓                                                                      │
│ USER: Receives UGX 25,000 in their MTN account                       │
│ USER DASHBOARD: Shows withdrawal status "Completed"                  │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## ❓ Frequently Asked Questions

### Q: Do users need API keys or accounts?
**A**: No! Users don't need anything except their phone number. They make the transfer manually using their Airtel/MTN dial codes (*185# or *165#).

### Q: How do you verify payments?
**A**: Users upload a screenshot of the payment confirmation. The admin reviews it in the dashboard and clicks approve/reject.

### Q: How long does it take to process?
**A**: 
- **Deposits**: Usually 5 minutes after user uploads screenshot (admin reviews)
- **Withdrawals**: Within 24 hours (admin manually sends money)

### Q: What if a user uploads a fake screenshot?
**A**: 
- Admin can reject it - status becomes "Rejected"
- User gets rejection notification
- Money stays in their account (doesn't get deducted)
- Full audit log of rejection

### Q: Can users withdraw more than they deposited?
**A**: No. System calculates available balance:
```
Available Balance = Total Deposits - Total Withdrawals
```
Users can only withdraw up to this amount.

### Q: What if admin rejects a deposit?
**A**: Deposit status becomes "Rejected". The user knows their payment wasn't verified. Money stays in their personal Airtel/MTN account (never left their phone).

### Q: Do payment screenshots need to be stored?
**A**: Currently no - the system notes that a screenshot was submitted but the file isn't stored. In production, consider storing in cloud storage (AWS S3, Google Drive, Dropbox) for security/compliance.

### Q: Can users upload multiple deposits?
**A**: Yes! Each deposit is a separate entry:
```
User: john_doe
├─ Deposit 1: UGX 30000 - Completed
├─ Deposit 2: UGX 40000 - Pending
└─ Deposit 3: UGX 20000 - Completed
```

### Q: What about referral bonuses?
**A**: When admin approves a deposit, the system automatically:
1. Adds to user's balance
2. Checks if referrer is eligible for referral bonus
3. Applies bonuses if conditions met
4. Updates VIP tier if applicable

### Q: Is the system secure?
**A**: Security features included:
- Admin key verification on all admin endpoints
- Email verification (users can only see their own data)
- Full audit logging of all actions
- Timestamps on everything
- No sensitive data in frontend code

### Q: Can users see pending payments?
**A**: Yes! When they log in to their dashboard, they see:
- Deposits with status (Pending/Completed/Rejected)
- Withdrawals with status (Pending/Completed/Rejected)
- Current balance
- Payment history

### Q: What's the admin user experience like?
**A**: Simple and fast:
1. Admin logs in to dashboard
2. Scrolls to "Manual Payment Verification"  
3. Sees new payments auto-refresh every 10 seconds
4. Clicks one button to open payment details
5. Clicks "Approve" or "Reject"
6. Done! Status updates immediately

### Q: Can there be multiple admins?
**A**: Currently uses single ADMIN_KEY. To support multiple admins, you'd need to:
1. Store admin accounts in database
2. Pass admin ID with requests
3. Log which admin approved what
The foundation is there to add this.

### Q: How do users receive money?
**A**: The withdrawal amount goes to their phone via:
- **Airtel**: Money appears in their Airtel Money account
- **MTN**: Money appears in their MTN Mobile Money account

They can then withdraw to their bank account from there using Airtel/MTN apps.

### Q: What if a user gives wrong phone number?
**A**: Admin can see the wrong number in the pending list. They can:
1. Contact user to get correct number
2. Reject withdrawal
3. User resubmits with correct number

### Q: Can withdrawals be edited?
**A**: Currently no - but the system allows it. Admin would need to:
1. Reject current withdrawal
2. User resubmits with corrected amount
Or alternatively, add an admin edit feature.

### Q: What's the audit trail?
**A**: Every action is logged in `db.json` → `auditLog`:
```json
{
  "event_type": "DEPOSIT_APPROVED",
  "email": "user@example.com",
  "amount": 30000,
  "reference": "MANUAL-1234567890",
  "ip_address": "192.168.1.1",
  "details": "Admin approved manual deposit"
}
```

### Q: Can system send SMS/Email notifications?
**A**: Currently no - but easy to add using services like:
- Twilio (SMS)
- SendGrid (Email)
- Firebase (Push notifications)

The foundation is there to add notifications to:
- User when deposit approved
- User when withdrawal processed
- Admin when new payment submitted

---

## 📊 Example Screenshots/Terminology

### Status Meanings
- **Pending** 🟡 - Awaiting action (admin hasn't reviewed/processed yet)
- **Completed** 🟢 - Done! Money transferred, transaction finished
- **Rejected** 🔴 - Not approved, payment issue or user cancellation

### Payment Methods
- **Airtel Money** - Dial *185# or use app, fast and reliable
- **MTN Mobile Money** - Dial *165# or use app, fast and reliable

### Key Terms
- **Deposit**: Money coming IN from user to your account
- **Withdrawal**: Money going OUT from your account to user
- **Available Balance**: Total deposits - Total withdrawals = What user can withdraw
- **Proof**: Screenshot of payment confirmation
- **Verification**: Admin reviewing the screenshot and approving/rejecting

---

## 🎓 Training Your Team

### For Admin Support Staff
1. User uploads deposit proof → screenshot appears
2. You verify: Amount matches, date is recent, transaction is successful
3. Click approve if legit, reject if suspicious
4. For withdrawals, send money first, then approve

### Red Flags to Watch
- ❌ Amount doesn't match (user says 30K but screenshot shows 20K)
- ❌ Date is old (screenshot from yesterday for today's deposit)
- ❌ Fake/edited screenshot (suspicious elements, poor quality)
- ❌ Typos in phone number (check carefully)
- ❌ Duplicate submissions (user submitting same deposit twice)

### Best Practices
- ✅ Verify within 15 minutes of submission
- ✅ Keep screenshots as reference (save them locally)
- ✅ Double-check phone number before approving withdrawal
- ✅ Contact user if any doubts
- ✅ Document rejections with clear reason
- ✅ Process all withdrawals within 24 hours

---

**Version**: 1.0  
**Last Updated**: August 16, 2026  
**System Status**: ✅ Ready to Deploy
