const ADMIN_SESSION_KEY = 'ute_admin_session';

// Login page logic — use backend auth, do not keep credentials in frontend
const loginForm = document.getElementById('admin-login-form');
if (loginForm) {
    if (sessionStorage.getItem(ADMIN_SESSION_KEY)) {
        window.location.href = 'admin-panel.html';
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;
        const status   = document.getElementById('admin-login-status');

        status.style.display = 'block';
        status.className = '';
        status.textContent = 'Checking credentials...';

        try {
            const resp = await fetch('/service/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await resp.json();
            if (data.status === 'success' && data.isAdmin === true) {
                sessionStorage.setItem(ADMIN_SESSION_KEY, username);
                status.textContent = 'Access granted. Loading panel...';
                status.className = 'success';
                setTimeout(() => { window.location.href = 'admin-panel.html'; }, 800);
                return;
            }
            status.textContent = 'Invalid username or password. Access denied.';
            status.className = 'error';
        } catch (err) {
            status.textContent = 'Login failed. Try again later.';
            status.className = 'error';
        }
    });
}

// ── Panel page logic ──────────────────────────────────────────────
function adminLogout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.href = 'admin.html';
}

async function loadPanelData() {
    const adminName = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!adminName) {
        window.location.href = 'admin.html';
        return;
    }

    const displayEl = document.getElementById('admin-display-name');
    const welcomeEl = document.getElementById('admin-welcome-name');
    if (displayEl) displayEl.textContent = adminName;
    if (welcomeEl) welcomeEl.textContent = 'Welcome, ' + adminName;

    const refreshEl = document.getElementById('refresh-time');
    if (refreshEl) refreshEl.textContent = new Date().toLocaleString();

    const BACKEND = window.location.origin;

    try {
        const usersRes     = await fetch(`${BACKEND}/service/view-users`);
        const usersData    = await usersRes.json();
        const users        = usersData.users || [];

        const depositsRes  = await fetch(`${BACKEND}/service/view-deposits`);
        const depositsData = await depositsRes.json();
        const deposits     = depositsData.deposits || [];

        const withdrawRes  = await fetch(`${BACKEND}/service/view-withdrawals`);
        const withdrawData = await withdrawRes.json();
        const withdrawals  = withdrawData.withdrawals || [];

        const referrals    = deposits.filter(d => d.referral_code && d.referral_code !== '');
        const totalInvested  = deposits.reduce((s, d) => s + Number(d.amount || 0), 0);
        const totalWithdrawn = withdrawals.reduce((s, w) => s + Number(w.amount || 0), 0);
        const netBalance     = totalInvested - totalWithdrawn;

        // ── Stat boxes ──
        setEl('stat-total-users',       users.length);
        setEl('stat-total-deposits',    deposits.length);
        setEl('stat-referral-deposits', referrals.length);
        setEl('stat-vip-tier',          users.length > 0 ? (users[0].vip_tier || 'None') : 'None');

        // ── Chart stat cards ──
        setEl('chart-total-invested',   'UGX ' + totalInvested.toLocaleString());
        setEl('chart-total-withdrawn',  'UGX ' + totalWithdrawn.toLocaleString());
        setEl('chart-net-balance',      'UGX ' + netBalance.toLocaleString());
        setEl('chart-active-investors', users.length);

        // ── Dealer list for admin quick access ──
        renderDealerList(users);

        // ── Build chart data ──
        buildCharts(deposits, withdrawals);
        buildRecentDeposits(deposits);

    } catch (err) {
        console.error('[ADMIN] Failed to load data:', err.message);
    }
}

function renderDealerList(users) {
    const section = document.getElementById('dealer-list-section');
    if (!section) return;

    const dealers = users.filter(u => u.registered_via_admin_link === true || String(u.referral_code).startsWith('DEALER-'));
    if (dealers.length === 0) {
        section.innerHTML = '<div class="empty-state">No dealer accounts found yet. Dealers are created when a user registers with a dealer referral code.</div>';
        return;
    }

    section.innerHTML = `
        <table class="user-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Referral Code</th>
                    <th>Depositors</th>
                    <th>Allowance</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${dealers.map(d => `
                    <tr>
                        <td>${d.username || d.email}</td>
                        <td>${d.email}</td>
                        <td>${d.referral_code || '—'}</td>
                        <td>${Number(d.referral_depositors || 0).toLocaleString()}</td>
                        <td>${Number(d.referral_withdraw_allowance || 0).toLocaleString()}</td>
                        <td><button onclick="window.location.href='dealers.html?adminDealerEmail=${encodeURIComponent(d.email)}'" style="background:#FFD700;color:#0f0f23;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-weight:bold;">Open Dealer</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ── Build all charts ──────────────────────────────────────────
function buildCharts(deposits, withdrawals) {
    // Group deposits by date
    const dateMap = {};
    deposits.forEach(d => {
        const date = d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Unknown';
        if (!dateMap[date]) dateMap[date] = 0;
        dateMap[date] += Number(d.amount || 0);
    });

    const labels  = Object.keys(dateMap).slice(-10); // last 10 dates
    const amounts = labels.map(l => dateMap[l]);

    // ── Line Chart — Investments Over Time ──
    const lineCtx = document.getElementById('investmentLineChart');
    if (lineCtx) {
        if (window._lineChart) window._lineChart.destroy();
        window._lineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: labels.length > 0 ? labels : ['No data'],
                datasets: [{
                    label: 'UGX Invested',
                    data: amounts.length > 0 ? amounts : [0],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40,167,69,0.15)',
                    borderWidth: 2,
                    pointBackgroundColor: '#FFD700',
                    pointRadius: 5,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: '#aaa' } } },
                scales: {
                    x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#aaa', callback: v => 'UGX ' + Number(v).toLocaleString() }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // ── Bar Chart — Deposits vs Withdrawals ──
    const barCtx = document.getElementById('depositBarChart');
    if (barCtx) {
        if (window._barChart) window._barChart.destroy();
        const totalDep = deposits.reduce((s, d) => s + Number(d.amount || 0), 0);
        const totalWd  = withdrawals.reduce((s, w) => s + Number(w.amount || 0), 0);
        window._barChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['Total Deposits', 'Total Withdrawals', 'Net Profit'],
                datasets: [{
                    label: 'UGX',
                    data: [totalDep, totalWd, totalDep - totalWd],
                    backgroundColor: ['rgba(40,167,69,0.7)', 'rgba(220,53,69,0.7)', 'rgba(255,215,0,0.7)'],
                    borderColor:     ['#28a745', '#dc3545', '#FFD700'],
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#aaa', callback: v => 'UGX ' + Number(v).toLocaleString() }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // ── Doughnut Chart — Investment Plans ──
    const doughCtx = document.getElementById('plansDoughnutChart');
    if (doughCtx) {
        if (window._doughChart) window._doughChart.destroy();
        const planCounts = { '30000': 0, '40000': 0, '50000': 0, '60000': 0, 'Custom': 0 };
        deposits.forEach(d => {
            const amt = String(d.amount);
            if (planCounts[amt] !== undefined) planCounts[amt]++;
            else planCounts['Custom']++;
        });
        window._doughChart = new Chart(doughCtx, {
            type: 'doughnut',
            data: {
                labels: ['UGX 30K Plan', 'UGX 40K Plan', 'UGX 50K Plan', 'UGX 60K Plan', 'Custom'],
                datasets: [{
                    data: Object.values(planCounts),
                    backgroundColor: ['#28a745','#FFD700','#20c997','#c084fc','#ff9900'],
                    borderColor: '#0a0a2a',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#aaa', font: { size: 11 } } }
                }
            }
        });
    }
}

// ── Recent deposits list ──────────────────────────────────────
function buildRecentDeposits(deposits) {
    const el = document.getElementById('recent-deposits-list');
    if (!el) return;
    const recent = deposits.slice(0, 8);
    if (recent.length === 0) {
        el.innerHTML = '<div style="color:#555;text-align:center;padding:20px;">No deposits yet.</div>';
        return;
    }
    el.innerHTML = recent.map(d => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div>
                <div style="color:#ddd;font-size:0.82rem;">${escHtml(d.email || '—')}</div>
                <div style="color:#888;font-size:0.75rem;">${escHtml(d.created_at || '—')}</div>
            </div>
            <div style="color:#28a745;font-weight:bold;font-size:0.9rem;">UGX ${Number(d.amount).toLocaleString()}</div>
        </div>`).join('');
}

function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function escHtml(str) {
    if (!str) return '—';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Run panel loader if we are on the panel page
if (document.getElementById('stat-total-users')) {
    loadPanelData();

    // Admin change password
    const adminPwdForm = document.getElementById('admin-change-pwd-form');
    // Admin change-password UI is disabled in the frontend (server-side only).
    if (adminPwdForm) {
        adminPwdForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const status = document.getElementById('acp-status');
            status.style.cssText = 'display:block;background:rgba(220,53,69,0.2);color:#ff6b6b;border:1px solid #dc3545;';
            status.textContent = 'Password changes must be done via the server or environment; frontend password editing is disabled.';
        });
    }
}

// ── Admin referral link generator ───────────────────────────
if (document.getElementById('generate-admin-link')) {
    const adminRefInput = document.getElementById('admin-ref-input');
    const genBtn = document.getElementById('generate-admin-link');
    const revokeBtn = document.getElementById('revoke-admin-link');
    const noteEl = document.getElementById('admin-link-note');

    function loadAdminLink() {
        const code = localStorage.getItem('adminReferralCode');
        if (code) {
            adminRefInput.value = `${window.location.origin}/register.html?ref=${code}`;
            noteEl.textContent = 'Active admin link — users who register with this code get elevated dashboard privileges.';
        } else {
            adminRefInput.value = '';
            adminRefInput.placeholder = 'No admin link generated yet';
            noteEl.textContent = 'Sharing this link allows one registration to receive admin-linked privileges. Use carefully.';
        }
    }

    genBtn.addEventListener('click', () => {
        // generate a stable ADMIN- code
        const code = 'ADMIN-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        localStorage.setItem('adminReferralCode', code);
        loadAdminLink();
        alert('Admin referral code generated. Share the link to allow one registration with elevated dashboard.');
    });

    revokeBtn.addEventListener('click', () => {
        localStorage.removeItem('adminReferralCode');
        loadAdminLink();
        alert('Admin referral link revoked.');
    });

    loadAdminLink();
}

// ── Dealer referral code generator ───────────────────────────
if (document.getElementById('generate-dealer-link')) {
    const genDealerBtn = document.getElementById('generate-dealer-link');
    const dealerCodesList = document.getElementById('dealer-codes-list');
    const DEALER_CODES_KEY = 'dealerReferralCodes';

    function loadDealerCodes() {
        const codesData = localStorage.getItem(DEALER_CODES_KEY);
        const codes = codesData ? JSON.parse(codesData) : [];

        if (codes.length === 0) {
            dealerCodesList.innerHTML = '<div style="color:#aaa;text-align:center;">No dealer codes generated yet. Click the button above to create one.</div>';
            return;
        }

        dealerCodesList.innerHTML = codes.map((code, idx) => `
            <div style="background:rgba(0,0,0,0.5);border:1px solid #FFD700;border-radius:8px;padding:12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1;">
                    <div style="color:#FFD700;font-weight:bold;font-size:0.95rem;">${code.code}</div>
                    <div style="color:#aaa;font-size:0.85rem;margin-top:4px;">Created: ${new Date(code.createdAt).toLocaleDateString()}</div>
                    <div style="color:#28a745;font-size:0.85rem;margin-top:2px;">🔗 <span class="dealer-link-text" data-idx="${idx}">${window.location.origin}/register.html?ref=${code.code}</span></div>
                </div>
                <div style="margin-left:10px;">
                    <button onclick="copyToClipboard('${window.location.origin}/register.html?ref=${code.code}')" style="background:#28a745;border:none;color:white;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:0.85rem;margin-bottom:5px;">Copy</button>
                    <button onclick="removeDealerCode(${idx})" style="background:#dc3545;border:none;color:white;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:0.85rem;display:block;">Delete</button>
                </div>
            </div>
        `).join('');
    }

    genDealerBtn.addEventListener('click', async () => {
        const adminUsername = sessionStorage.getItem('ute_admin_session');
        
        if (!adminUsername) {
            alert('Admin session not found. Please log in again.');
            return;
        }

        try {
            const response = await fetch('/service/generate-dealer-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminUsername })
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Store the codes locally
                const codesData = localStorage.getItem(DEALER_CODES_KEY);
                const codes = codesData ? JSON.parse(codesData) : [];
                codes.push({
                    code: data.dealerCode,
                    link: data.dealerLink,
                    createdAt: new Date().toISOString()
                });
                localStorage.setItem(DEALER_CODES_KEY, JSON.stringify(codes));

                loadDealerCodes();
                alert('✅ Dealer code generated successfully!\n\nCode: ' + data.dealerCode + '\n\nShare the link with your dealer.');
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            alert('Failed to generate dealer code: ' + err.message);
        }
    });

    loadDealerCodes();
}

// ── Helper function to copy to clipboard ───────────────────────────
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy. Please copy manually: ' + text);
    });
}

// ── Helper function to remove dealer code ───────────────────────────
function removeDealerCode(idx) {
    if (confirm('Are you sure you want to delete this dealer code?')) {
        const codesData = localStorage.getItem('dealerReferralCodes');
        const codes = codesData ? JSON.parse(codesData) : [];
        codes.splice(idx, 1);
        localStorage.setItem('dealerReferralCodes', JSON.stringify(codes));
        
        const dealerCodesList = document.getElementById('dealer-codes-list');
        if (dealerCodesList) {
            // Reload dealer codes display
            if (codes.length === 0) {
                dealerCodesList.innerHTML = '<div style="color:#aaa;text-align:center;">No dealer codes generated yet. Click the button above to create one.</div>';
            } else {
                // Rerun the load function - hacky but works for now
                location.reload();
            }
        }
    }
}
