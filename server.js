const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── Simple JSON file database ────────────────────────────────────
const DB_FILE = path.join(__dirname, 'db.json');

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const empty = { users: [], deposits: [], withdrawals: [], auditLog: [], dealerReferralCodes: [] };
        fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2));
        return empty;
    }
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch (e) { return { users: [], deposits: [], withdrawals: [], auditLog: [], dealerReferralCodes: [] }; }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function addAuditLog(db, eventType, email, amount, reference, ip, details) {
    db.auditLog.push({
        id: Date.now(),
        created_at: new Date().toLocaleString(),
        event_type: eventType,
        email: email || '',
        amount: amount || null,
        reference: reference || '',
        ip_address: ip || '',
        details: details || ''
    });
}

function getVipTier(depositors) {
    if (depositors >= 25) return 'VIP 5';
    if (depositors >= 20) return 'VIP 4';
    if (depositors >= 15) return 'VIP 3';
    if (depositors >= 10) return 'VIP 2';
    if (depositors >= 5)  return 'VIP 1';
    return 'None';
}

function creditConfirmedReferral(db, deposit) {
    if (deposit.referral_rewarded || deposit.status !== 'Completed') return;
    const referrer = db.users.find(u => u.referral_code === deposit.referral_code);
    if (!referrer || !referrer.registered_via_admin_link) return;

    referrer.referral_depositors = (referrer.referral_depositors || 0) + 1;
    referrer.vip_tier = getVipTier(referrer.referral_depositors);
    referrer.referral_withdraw_allowance = (referrer.referral_withdraw_allowance || 0) + 10000;
    deposit.referral_rewarded = true;
}

// ─── Service: Register ──────────────────────────────────────────────
app.post('/service/register', (req, res) => {
    const { username, lastname, email, country, password, referralCode } = req.body;
    if (!username || !email || !password) return res.json({ status: 'error', message: 'Missing fields' });

    const db = readDB();
    const dealerCode = String(referralCode || '').trim().toUpperCase();
    const dealerInvite = db.dealerReferralCodes.find(c => c.code === dealerCode && c.active);
    if (db.users.find(u => u.email === email))
        return res.json({ status: 'error', message: 'Email already registered' });

    if (referralCode && !dealerInvite && !db.users.find(u => u.referral_code === referralCode))
        return res.json({ status: 'error', message: 'Invalid or inactive referral link.' });

    const code = 'UTE-' + username.replace(/\s+/g,'').toUpperCase().substring(0,6) + '-' + Math.random().toString(36).substr(2,4).toUpperCase();
    const link = `${req.protocol}://${req.get('host')}/register.html?ref=${code}`;

    const user = {
        id: Date.now(),
        username, lastname, email, country,
        password, // stored as-is (plain text — upgrade to bcrypt for production)
        referral_code: code,
        referral_link: link,
        used_referral_code: referralCode || null,
        registered_via_admin_link: Boolean(dealerInvite),
        vip_tier: 'None',
        referral_joins: 0,
        referral_depositors: 0,
        referral_withdraw_allowance: 0,
        registered_at: new Date().toLocaleString()
    };

    db.users.push(user);

    // Credit referrer join count
    if (referralCode) {
        const referrer = db.users.find(u => u.referral_code === referralCode);
        if (referrer) {
            referrer.referral_joins = (referrer.referral_joins || 0) + 1;
        }
    }

    if (dealerInvite) {
        dealerInvite.active = false;
        dealerInvite.used_by = email;
        dealerInvite.used_at = new Date().toLocaleString();
    }

    addAuditLog(db, 'USER_REGISTERED', email, null, code, req.ip, `${username} registered`);
    writeDB(db);

    res.json({ status: 'success', referralCode: code, referralLink: link });
});

// ─── Service: Generate single-use dealer registration link ─────────
app.post('/service/generate-dealer-code', (req, res) => {
    const { adminUsername } = req.body;
    const requiredAdminKey = process.env.ADMIN_KEY || '';
    // Require a server-side admin key; do not rely on hard-coded usernames.
    if (!adminUsername || !requiredAdminKey || adminUsername !== requiredAdminKey) {
        return res.json({ status: 'error', message: 'Admin authorization required.' });
    }

    const db = readDB();
    db.dealerReferralCodes = db.dealerReferralCodes || [];
    const code = `DEALER-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    db.dealerReferralCodes.push({ code, active: true, created_by: adminUsername, created_at: new Date().toLocaleString() });
    addAuditLog(db, 'DEALER_LINK_CREATED', adminUsername, null, code, req.ip, 'Admin created single-use dealer registration link');
    writeDB(db);

    res.json({ status: 'success', dealerCode: code, dealerLink: `${req.protocol}://${req.get('host')}/register.html?ref=${code}` });
});

// ─── Service: Login ─────────────────────────────────────────────────
app.post('/service/login', (req, res) => {
    const { username, password } = req.body;

    // Owner account — always works
    if (username === 'owner' && password === '12123') {
        return res.json({
            status: 'success',
            isAdmin: true,
            username: 'owner',
            lastname: 'Owner',
            email: 'owner@earnonline.com',
            country: 'Uganda',
            referralCode: 'ADMIN-MASTER',
            vipTier: 'VIP 5'
        });
    }

    const db = readDB();
    const user = db.users.find(u => u.username === username && u.password === password);
    if (!user) return res.json({ status: 'error', message: 'Invalid credentials' });

    const deposits = db.deposits.filter(d => d.email === user.email);
    const withdrawals = db.withdrawals.filter(w => w.email === user.email);

    res.json({
        status: 'success',
        user: {
            username: user.username,
            lastname: user.lastname,
            email: user.email,
            country: user.country,
            referralCode: user.referral_code,
            referralLink: user.referral_link,
            vipTier: user.vip_tier,
            referralJoins: user.referral_joins,
            referralDepositors: user.referral_depositors,
            referralWithdrawAllowance: user.referral_withdraw_allowance,
            registeredViaAdminLink: user.registered_via_admin_link,
            registeredAt: user.registered_at
        },
        deposits,
        withdrawals
    });
});

// ─── Service: Record Deposit ────────────────────────────────────────
app.post('/service/record-deposit', (req, res) => {
    const { amount, email, phone, name, network, referralCode, txRef, status, customInvestment, idempotencyKey } = req.body;
    if (!amount || !email) return res.json({ status: 'error', message: 'Missing fields' });

    const db = readDB();

    // Idempotency check
    if (idempotencyKey && db.deposits.find(d => d.idempotency_key === idempotencyKey))
        return res.json({ status: 'success', message: 'Already recorded' });

    const deposit = {
        id: Date.now(),
        amount: parseFloat(amount),
        email, phone, name, network,
        referral_code: referralCode || null,
        tx_ref: txRef || `UTE-${Date.now()}`,
        status: status || 'pending_verification',
        gateway: 'manual',
        custom_investment: customInvestment || null,
        idempotency_key: idempotencyKey || null,
        created_at: new Date().toLocaleString()
    };

    db.deposits.push(deposit);

    addAuditLog(db, 'DEPOSIT_RECORDED', email, amount, deposit.tx_ref, req.ip, `Manual deposit by ${name}`);
    writeDB(db);

    res.json({ status: 'success', txRef: deposit.tx_ref });
});

// ─── Service: Confirm Deposit (admin marks as Completed) ───────────
app.post('/service/confirm-deposit', (req, res) => {
    const { txRef } = req.body;
    const db = readDB();
    const deposit = db.deposits.find(d => d.tx_ref === txRef);
    if (!deposit) return res.json({ status: 'error', message: 'Deposit not found' });
    if (deposit.status === 'Completed') return res.json({ status: 'success', message: 'Deposit already confirmed.' });
    deposit.status = 'Completed';
    creditConfirmedReferral(db, deposit);
    addAuditLog(db, 'DEPOSIT_CONFIRMED', deposit.email, deposit.amount, txRef, req.ip, 'Admin confirmed deposit');
    writeDB(db);
    res.json({ status: 'success' });
});

// ─── Service: Record Withdrawal ─────────────────────────────────────
app.post('/service/record-withdrawal', (req, res) => {
    const { amount, phone, name, network, email, password } = req.body;
    if (!amount || !phone || !email || !password) return res.json({ status: 'error', message: 'Dealer authentication is required.' });

    const db = readDB();
    const dealer = getDealer(db, email, password);
    if (!dealer) return res.json({ status: 'error', message: 'Only authenticated dealers can withdraw.' });
    const reference = `WD-${Date.now()}`;

    db.withdrawals.push({
        id: Date.now(),
        amount: parseFloat(amount),
        phone, name, network,
        email: dealer.email,
        reference,
        status: 'Pending',
        created_at: new Date().toLocaleString()
    });

    addAuditLog(db, 'WITHDRAWAL_REQUESTED', email || '', amount, reference, req.ip, `Withdrawal to ${phone} (${network})`);
    writeDB(db);

    res.json({ status: 'success', reference });
});

// ─── Service: Referral Stats ────────────────────────────────────────
app.get('/service/referral-stats/:code', (req, res) => {
    const db = readDB();
    const user = db.users.find(u => u.referral_code === req.params.code);
    if (!user) return res.json({ status: 'error', message: 'Code not found' });

    const depositors = user.referral_depositors || 0;
    const thresholds = [5, 10, 15, 20, 25];
    const nextVipAt  = thresholds.find(t => t > depositors) || 25;
    const progressPercent = Math.min(Math.round((depositors / nextVipAt) * 100), 100);

    res.json({
        status: 'success',
        joins: user.referral_joins || 0,
        depositors,
        vipTier: user.vip_tier || 'None',
        nextVipAt,
        progressPercent,
        referralLink: user.referral_link
    });
});

// Owners panel endpoints removed.
// The owners UI and related endpoints have been deleted for security.
// If you need specific admin APIs, reintroduce them with proper auth controls.

// ─── Dealer Auth Helper ───────────────────────────────────────────
function getDealer(db, email, password) {
    const user = db.users.find(u => u.email === email && u.password === password);
    if (!user || !user.registered_via_admin_link) return null;
    return user;
}

// ─── Service: Dealer Info ───────────────────────────────────────────
app.post('/service/dealer/info', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const dealer = getDealer(db, email, password);
    if (!dealer) return res.json({ status: 'error', message: 'Access denied. Not a dealer account.' });

    const referredMembers = db.users.filter(u => u.used_referral_code === dealer.referral_code);
    const myDeposits = db.deposits.filter(d => d.email === dealer.email);
    const myWithdrawals = db.withdrawals.filter(w => w.email === dealer.email);

    res.json({
        status: 'success',
        dealer: {
            username: dealer.username,
            email: dealer.email,
            referral_code: dealer.referral_code,
            referral_link: dealer.referral_link,
            vip_tier: dealer.vip_tier,
            referral_withdraw_allowance: dealer.referral_withdraw_allowance || 0,
            referral_depositors: dealer.referral_depositors || 0
        },
        stats: {
            totalDeposited: myDeposits.reduce((s, d) => s + (d.amount || 0), 0),
            totalWithdrawn: myWithdrawals.reduce((s, w) => s + (w.amount || 0), 0),
            referredCount: referredMembers.length
        },
        referredMembers: referredMembers.map(u => ({
            username: u.username, email: u.email, registered_at: u.registered_at,
            totalDeposited: db.deposits.filter(d => d.email === u.email).reduce((s, d) => s + (d.amount || 0), 0)
        }))
    });
});

// ─── Service: Dealer Deposits ───────────────────────────────────────
app.post('/service/dealer/deposits', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const dealer = getDealer(db, email, password);
    if (!dealer) return res.json({ status: 'error', message: 'Access denied.' });

    const deposits = db.deposits.filter(d => d.email === dealer.email);
    const now = Date.now();
    const enriched = deposits.map(d => {
        const ts = d.depositTimestamp || new Date(d.created_at).getTime() || d.id;
        const daysElapsed = (now - ts) / (1000 * 60 * 60 * 24);
        const daysLeft = Math.max(0, Math.ceil(30 - daysElapsed));
        return { ...d, daysLeft, canWithdraw: daysLeft === 0 };
    });

    res.json({
        status: 'success',
        deposits: enriched,
        total: enriched.length,
        totalAmount: enriched.reduce((s, d) => s + (d.amount || 0), 0)
    });
});

// ─── Service: Dealer Withdrawals ────────────────────────────────────
app.post('/service/dealer/withdrawals', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const dealer = getDealer(db, email, password);
    if (!dealer) return res.json({ status: 'error', message: 'Access denied.' });

    const withdrawals = db.withdrawals.filter(w => w.email === dealer.email);
    res.json({
        status: 'success',
        withdrawals,
        total: withdrawals.length,
        totalAmount: withdrawals.reduce((s, w) => s + (w.amount || 0), 0)
    });
});

// ─── Service: Dealer Edit/Add Deposit ──────────────────────────────
app.post('/service/dealer/edit-deposit', (req, res) => {
    const { email, password, depositId, amount, status, userPhone, userName, network } = req.body;
    const db = readDB();
    const dealer = getDealer(db, email, password);
    if (!dealer) return res.json({ status: 'error', message: 'Access denied.' });

    if (depositId) {
        const dep = db.deposits.find(d => d.id == depositId && d.email === dealer.email);
        if (!dep) return res.json({ status: 'error', message: 'Deposit not found.' });
        if (amount !== undefined) dep.amount = parseFloat(amount);
        if (status !== undefined) dep.status = status;
        addAuditLog(db, 'DEALER_EDIT_DEPOSIT', dealer.email, amount, dep.tx_ref, req.ip, 'Dealer edited deposit');
    } else {
        const newDep = {
            id: Date.now(),
            amount: parseFloat(amount),
            email: dealer.email,
            phone: userPhone || '',
            name: userName || dealer.username,
            network: network || 'Manual',
            referral_code: dealer.referral_code,
            tx_ref: `UTE-${Date.now()}`,
            status: status || 'completed',
            gateway: 'dealer',
            depositTimestamp: Date.now(),
            created_at: new Date().toLocaleString()
        };
        db.deposits.push(newDep);
        addAuditLog(db, 'DEALER_ADD_DEPOSIT', dealer.email, amount, newDep.tx_ref, req.ip, 'Dealer added deposit');
    }

    writeDB(db);
    res.json({ status: 'success' });
});

// ─── Service: Dealer Withdraw Allowance ───────────────────────────
app.post('/service/dealer/withdraw-allowance', (req, res) => {
    const { email, password, amount, phone, network } = req.body;
    if (!amount || !phone || !network) return res.json({ status: 'error', message: 'Amount, phone and network are required.' });

    const db = readDB();
    const dealer = getDealer(db, email, password);
    if (!dealer) return res.json({ status: 'error', message: 'Access denied.' });

    const withdrawAmt = parseFloat(amount);
    const available = dealer.referral_withdraw_allowance || 0;

    if (withdrawAmt !== 10000) return res.json({ status: 'error', message: 'Dealer referral withdrawals must be exactly UGX 10,000.' });
    if (withdrawAmt > available) return res.json({ status: 'error', message: `Insufficient allowance. Available: UGX ${available.toLocaleString()}` });

    dealer.referral_withdraw_allowance = available - withdrawAmt;

    const ref = `DWD-${Date.now()}`;
    db.withdrawals.push({
        id: Date.now(),
        amount: withdrawAmt,
        email: dealer.email,
        phone,
        name: dealer.username,
        network,
        reference: ref,
        type: 'dealer_allowance',
        status: 'Pending',
        created_at: new Date().toLocaleString()
    });

    addAuditLog(db, 'DEALER_ALLOWANCE_WITHDRAWAL', dealer.email, withdrawAmt, ref, req.ip, `Dealer withdrew allowance to ${phone} (${network})`);
    writeDB(db);

    res.json({ status: 'success', reference: ref, remainingAllowance: dealer.referral_withdraw_allowance });
});

// ─── Service: Dealer Edit/Add Withdrawal ───────────────────────────
app.post('/service/dealer/edit-withdrawal', (req, res) => {
    const { email, password, withdrawalId, amount, status, network, userPhone, userName } = req.body;
    const db = readDB();
    const dealer = getDealer(db, email, password);
    if (!dealer) return res.json({ status: 'error', message: 'Access denied.' });

    if (withdrawalId) {
        const wd = db.withdrawals.find(w => w.id == withdrawalId && w.email === dealer.email);
        if (!wd) return res.json({ status: 'error', message: 'Withdrawal not found.' });
        if (amount !== undefined) wd.amount = parseFloat(amount);
        if (status !== undefined) wd.status = status;
        if (network !== undefined) wd.network = network;
        addAuditLog(db, 'DEALER_EDIT_WITHDRAWAL', dealer.email, amount, wd.reference, req.ip, 'Dealer edited withdrawal');
    } else {
        const ref = `WD-${Date.now()}`;
        db.withdrawals.push({
            id: Date.now(),
            amount: parseFloat(amount),
            email: dealer.email,
            phone: userPhone || '',
            name: userName || dealer.username,
            network: network || 'MTN',
            reference: ref,
            status: status || 'Pending',
            created_at: new Date().toLocaleString()
        });
        addAuditLog(db, 'DEALER_ADD_WITHDRAWAL', dealer.email, amount, ref, req.ip, 'Dealer added withdrawal');
    }

    writeDB(db);
    res.json({ status: 'success' });
});

// Owners payout endpoint removed to prevent unauthorized owner operations.
app.post('/service/owners/payout', (req, res) => {
    res.status(404).json({ status: 'error', message: 'Not found' });
});

// ─── Service: View Users (Admin) ────────────────────────────────────
app.get('/service/view-users', (req, res) => {
    const db = readDB();
    res.json({ users: db.users || [] });
});

// ─── Service: View Deposits (Admin) ─────────────────────────────────
app.get('/service/view-deposits', (req, res) => {
    const db = readDB();
    res.json({ deposits: db.deposits || [] });
});

// ─── Service: View Withdrawals (Admin) ──────────────────────────────
app.get('/service/view-withdrawals', (req, res) => {
    const db = readDB();
    res.json({ withdrawals: db.withdrawals || [] });
});

// ─── API: Manual Deposit Submission (User uploads screenshot) ───────
app.post('/api/deposit/manual', (req, res) => {
    const { amount, network, email } = req.body;
    
    if (!amount || !network || !email) {
        return res.json({ status: 'error', message: 'Missing required fields' });
    }
    
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return res.json({ status: 'error', message: 'User not found' });
    
    // Create deposit record with 'Pending' status
    const deposit = {
        id: Date.now(),
        amount: parseFloat(amount),
        email: email,
        username: user.username,
        network: network,
        payment_method: 'manual',
        status: 'Pending',  // Admin must approve
        created_at: new Date().toLocaleString()
    };
    
    db.deposits.push(deposit);
    addAuditLog(db, 'MANUAL_DEPOSIT_SUBMITTED', email, amount, `MANUAL-${deposit.id}`, req.ip, `User submitted manual deposit of ${amount} via ${network}`);
    writeDB(db);
    
    res.json({ status: 'success', message: 'Payment proof submitted. Awaiting admin verification.', depositId: deposit.id });
});

// ─── API: Get Pending Deposits (Admin) ─────────────────────────────
app.get('/api/admin/deposits/pending', (req, res) => {
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
    if (adminKey !== process.env.ADMIN_KEY) {
        return res.json({ status: 'error', message: 'Unauthorized' });
    }
    
    const db = readDB();
    const pendingDeposits = db.deposits.filter(d => d.status === 'Pending');
    
    res.json({ status: 'success', deposits: pendingDeposits });
});

// ─── API: Approve/Reject Deposit (Admin) ─────────────────────────────
app.post('/api/admin/deposit/verify', (req, res) => {
    const { depositId, action } = req.body;
    const adminKey = req.headers['x-admin-key'];
    
    if (adminKey !== process.env.ADMIN_KEY) {
        return res.json({ status: 'error', message: 'Unauthorized' });
    }
    
    if (!['approve', 'reject'].includes(action)) {
        return res.json({ status: 'error', message: 'Invalid action' });
    }
    
    const db = readDB();
    const deposit = db.deposits.find(d => d.id == depositId);
    
    if (!deposit) return res.json({ status: 'error', message: 'Deposit not found' });
    
    if (action === 'approve') {
        deposit.status = 'Completed';
        creditConfirmedReferral(db, deposit);
        addAuditLog(db, 'DEPOSIT_APPROVED', deposit.email, deposit.amount, `MANUAL-${deposit.id}`, req.ip, 'Admin approved manual deposit');
    } else if (action === 'reject') {
        deposit.status = 'Rejected';
        addAuditLog(db, 'DEPOSIT_REJECTED', deposit.email, deposit.amount, `MANUAL-${deposit.id}`, req.ip, 'Admin rejected manual deposit');
    }
    
    writeDB(db);
    res.json({ status: 'success', message: `Deposit ${action}d successfully` });
});

// ─── API: Withdrawal Request (User submits withdrawal) ───────────────
app.post('/api/withdrawal/request', (req, res) => {
    const { amount, phone_number, network, email } = req.body;
    
    if (!amount || !phone_number || !network || !email) {
        return res.json({ status: 'error', message: 'Missing required fields' });
    }
    
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return res.json({ status: 'error', message: 'User not found' });
    
    // Create withdrawal request with 'Pending' status
    const withdrawal = {
        id: Date.now(),
        amount: parseFloat(amount),
        email: email,
        username: user.username,
        phone_number: phone_number,
        network: network,
        status: 'Pending', // Admin must process
        created_at: new Date().toLocaleString()
    };
    
    db.withdrawals.push(withdrawal);
    addAuditLog(db, 'WITHDRAWAL_REQUESTED', email, amount, `WD-${withdrawal.id}`, req.ip, `User requested withdrawal of ${amount} to ${phone_number} (${network})`);
    writeDB(db);
    
    res.json({ status: 'success', message: 'Withdrawal request submitted. Admin will process within 24 hours.', withdrawalId: withdrawal.id });
});

// ─── API: Get Pending Withdrawals (Admin) ───────────────────────────
app.get('/api/admin/withdrawals/pending', (req, res) => {
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
    if (adminKey !== process.env.ADMIN_KEY) {
        return res.json({ status: 'error', message: 'Unauthorized' });
    }
    
    const db = readDB();
    const pendingWithdrawals = db.withdrawals.filter(w => w.status === 'Pending');
    
    res.json({ status: 'success', withdrawals: pendingWithdrawals });
});

// ─── API: Process Withdrawal (Admin) ─────────────────────────────────
app.post('/api/admin/withdrawal/process', (req, res) => {
    const { withdrawalId, action } = req.body;
    const adminKey = req.headers['x-admin-key'];
    
    if (adminKey !== process.env.ADMIN_KEY) {
        return res.json({ status: 'error', message: 'Unauthorized' });
    }
    
    if (!['approve', 'reject'].includes(action)) {
        return res.json({ status: 'error', message: 'Invalid action' });
    }
    
    const db = readDB();
    const withdrawal = db.withdrawals.find(w => w.id == withdrawalId);
    
    if (!withdrawal) return res.json({ status: 'error', message: 'Withdrawal not found' });
    
    if (action === 'approve') {
        withdrawal.status = 'Completed';
        addAuditLog(db, 'WITHDRAWAL_COMPLETED', withdrawal.email, withdrawal.amount, `WD-${withdrawal.id}`, req.ip, `Admin completed withdrawal to ${withdrawal.phone_number}`);
    } else if (action === 'reject') {
        withdrawal.status = 'Rejected';
        addAuditLog(db, 'WITHDRAWAL_REJECTED', withdrawal.email, withdrawal.amount, `WD-${withdrawal.id}`, req.ip, 'Admin rejected withdrawal');
    }
    
    writeDB(db);
    res.json({ status: 'success', message: `Withdrawal ${action}d successfully` });
});

// ─── API: Get User Balance ──────────────────────────────────────────
app.get('/api/user/balance', (req, res) => {
    const userEmail = req.query.email;
    
    if (!userEmail) {
        return res.json({ status: 'error', message: 'User not authenticated' });
    }
    
    const db = readDB();
    const deposits = db.deposits.filter(d => d.email === userEmail && d.status === 'Completed');
    const withdrawals = db.withdrawals.filter(w => w.email === userEmail && w.status === 'Completed');
    
    const totalDeposited = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const availableBalance = totalDeposited - totalWithdrawn;
    
    res.json({ status: 'success', total_deposited: totalDeposited, total_withdrawn: totalWithdrawn, available_balance: Math.max(0, availableBalance) });
});

// ─── API: Withdrawal History ─────────────────────────────────────────
app.get('/api/withdrawals/history', (req, res) => {
    const userEmail = req.query.email;
    
    if (!userEmail) {
        return res.json({ status: 'error', message: 'User not authenticated' });
    }
    
    const db = readDB();
    const userWithdrawals = db.withdrawals.filter(w => w.email === userEmail).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({ status: 'success', withdrawals: userWithdrawals });
});

// ─── Socket.IO Chat ───────────────────────────────────────────────
const chatUsers = new Map();

function broadcastUsers() {
    const list = Array.from(chatUsers.values()).map(u => ({
        socketId: u.socketId, name: u.name, phone: u.phone, online: u.online
    }));
    io.emit('users', list);
}

io.on('connection', socket => {
    socket.on('register', ({ name, phone }) => {
        chatUsers.set(socket.id, { socketId: socket.id, name: name || 'Anonymous', phone: phone || '', online: true });
        broadcastUsers();
    });

    socket.on('start_chat', ({ targetSocketId }) => {
        const target = chatUsers.get(targetSocketId);
        const from   = chatUsers.get(socket.id);
        if (!target || !target.online) { socket.emit('user_offline', { targetSocketId }); return; }
        const room = [socket.id, targetSocketId].sort().join('#');
        io.to(targetSocketId).emit('invitation', { room, from: { socketId: socket.id, name: from.name, phone: from.phone } });
        socket.emit('invitation_sent', { room, to: { socketId: targetSocketId, name: target.name, phone: target.phone } });
    });

    socket.on('respond_invite', ({ room, accept, fromSocketId }) => {
        if (accept) {
            const requester = io.sockets.sockets.get(fromSocketId);
            const responder = io.sockets.sockets.get(socket.id);
            if (requester) requester.join(room);
            if (responder) responder.join(room);
            const p1 = chatUsers.get(fromSocketId);
            const p2 = chatUsers.get(socket.id);
            io.to(room).emit('chat_started', { room, participants: [p1, p2] });
        } else {
            io.to(fromSocketId).emit('invite_declined', { from: socket.id });
        }
    });

    socket.on('message', ({ room, text }) => {
        const user = chatUsers.get(socket.id) || { name: 'Unknown', phone: '' };
        io.to(room).emit('message', { from: { socketId: socket.id, name: user.name, phone: user.phone }, text, time: Date.now() });
    });

    socket.on('leave_room', ({ room }) => {
        socket.leave(room);
        io.to(room).emit('user_left', { socketId: socket.id });
    });

    socket.on('disconnect', () => {
        const u = chatUsers.get(socket.id);
        if (u) u.online = false;
        broadcastUsers();
        chatUsers.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Earn Online running on http://localhost:${PORT}`));
