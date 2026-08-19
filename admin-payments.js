// Admin Panel - Manual Payment Management

let pendingDeposits = [];
let pendingWithdrawals = [];
let currentPaymentData = null;
const ADMIN_KEY = localStorage.getItem('adminKey') || '';

document.addEventListener('DOMContentLoaded', function() {
    setupPaymentTabs();
    loadPendingPayments();
    setInterval(loadPendingPayments, 10000); // Refresh every 10 seconds
});

function setupPaymentTabs() {
    const tabDeposits = document.getElementById('tab-deposits');
    const tabWithdrawals = document.getElementById('tab-withdrawals');
    
    if (!tabDeposits || !tabWithdrawals) return;
    
    tabDeposits.addEventListener('click', function() {
        showDepositsTab();
        updateTabStyles('deposits');
    });
    
    tabWithdrawals.addEventListener('click', function() {
        showWithdrawalsTab();
        updateTabStyles('withdrawals');
    });
}

function updateTabStyles(active) {
    const tabDeposits = document.getElementById('tab-deposits');
    const tabWithdrawals = document.getElementById('tab-withdrawals');
    
    if (active === 'deposits') {
        tabDeposits.style.background = '#FFD700';
        tabDeposits.style.color = '#0f0f23';
        tabDeposits.style.border = 'none';
        
        tabWithdrawals.style.background = 'transparent';
        tabWithdrawals.style.color = '#FFD700';
        tabWithdrawals.style.border = '2px solid #FFD700';
    } else {
        tabDeposits.style.background = 'transparent';
        tabDeposits.style.color = '#FFD700';
        tabDeposits.style.border = '2px solid #FFD700';
        
        tabWithdrawals.style.background = '#FFD700';
        tabWithdrawals.style.color = '#0f0f23';
        tabWithdrawals.style.border = 'none';
    }
}

function showDepositsTab() {
    const depositsContent = document.getElementById('deposits-content');
    const withdrawalsContent = document.getElementById('withdrawals-content');
    
    if (depositsContent) depositsContent.style.display = 'block';
    if (withdrawalsContent) withdrawalsContent.style.display = 'none';
}

function showWithdrawalsTab() {
    const depositsContent = document.getElementById('deposits-content');
    const withdrawalsContent = document.getElementById('withdrawals-content');
    
    if (depositsContent) depositsContent.style.display = 'none';
    if (withdrawalsContent) withdrawalsContent.style.display = 'block';
}

async function loadPendingPayments() {
    await loadPendingDeposits();
    await loadPendingWithdrawals();
}

async function loadPendingDeposits() {
    try {
        const response = await fetch('/api/admin/deposits/pending?adminKey=' + ADMIN_KEY);
        const data = await response.json();
        
        if (data.status === 'success') {
            pendingDeposits = data.deposits;
            displayPendingDeposits();
        }
    } catch (error) {
        console.error('Error loading deposits:', error);
    }
}

async function loadPendingWithdrawals() {
    try {
        const response = await fetch('/api/admin/withdrawals/pending?adminKey=' + ADMIN_KEY);
        const data = await response.json();
        
        if (data.status === 'success') {
            pendingWithdrawals = data.withdrawals;
            displayPendingWithdrawals();
        }
    } catch (error) {
        console.error('Error loading withdrawals:', error);
    }
}

function displayPendingDeposits() {
    const container = document.getElementById('pending-deposits-list');
    if (!container) return;
    
    if (!pendingDeposits || pendingDeposits.length === 0) {
        container.innerHTML = '<p style="color: #aaa; text-align: center;">No pending deposits to review.</p>';
        return;
    }
    
    container.innerHTML = pendingDeposits.map(deposit => `
        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 12px;">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px; margin-bottom: 12px;">
                <div>
                    <p style="color: #FFD700; font-weight: bold; margin: 0 0 5px 0;">User: ${deposit.username}</p>
                    <p style="color: #aaa; margin: 0 0 5px 0;">Email: ${deposit.email}</p>
                    <p style="color: #aaa; margin: 0;">Network: ${deposit.network}</p>
                </div>
                <div style="text-align: center;">
                    <p style="color: #FFD700; font-size: 1.5rem; font-weight: bold; margin: 0;">UGX ${parseInt(deposit.amount).toLocaleString()}</p>
                    <p style="color: #aaa; font-size: 0.85rem; margin: 5px 0 0 0;">Amount</p>
                </div>
                <div style="text-align: right;">
                    <p style="color: #aaa; font-size: 0.85rem; margin: 0 0 8px 0;">Submitted</p>
                    <p style="color: #ccc; margin: 0;">${new Date(deposit.created_at).toLocaleString()}</p>
                </div>
            </div>
            <button onclick="openPaymentModal('deposit', ${deposit.id})" style="width: 100%; background: linear-gradient(135deg, #FFD700, #ffed4e); color: #0f0f23; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                👁️ Review & Verify
            </button>
        </div>
    `).join('');
}

function displayPendingWithdrawals() {
    const container = document.getElementById('pending-withdrawals-list');
    if (!container) return;
    
    if (!pendingWithdrawals || pendingWithdrawals.length === 0) {
        container.innerHTML = '<p style="color: #aaa; text-align: center;">No pending withdrawals to process.</p>';
        return;
    }
    
    container.innerHTML = pendingWithdrawals.map(withdrawal => `
        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 12px;">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px; margin-bottom: 12px;">
                <div>
                    <p style="color: #FFD700; font-weight: bold; margin: 0 0 5px 0;">User: ${withdrawal.username}</p>
                    <p style="color: #aaa; margin: 0 0 5px 0;">Phone: ${withdrawal.phone_number}</p>
                    <p style="color: #aaa; margin: 0;">Network: ${withdrawal.network}</p>
                </div>
                <div style="text-align: center;">
                    <p style="color: #28a745; font-size: 1.5rem; font-weight: bold; margin: 0;">UGX ${parseInt(withdrawal.amount).toLocaleString()}</p>
                    <p style="color: #aaa; font-size: 0.85rem; margin: 5px 0 0 0;">Amount</p>
                </div>
                <div style="text-align: right;">
                    <p style="color: #aaa; font-size: 0.85rem; margin: 0 0 8px 0;">Requested</p>
                    <p style="color: #ccc; margin: 0;">${new Date(withdrawal.created_at).toLocaleString()}</p>
                </div>
            </div>
            <button onclick="openPaymentModal('withdrawal', ${withdrawal.id})" style="width: 100%; background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                ✅ Process Withdrawal
            </button>
        </div>
    `).join('');
}

function openPaymentModal(type, id) {
    const modal = document.getElementById('payment-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const screenshotSection = document.getElementById('screenshot-section');
    const approveBtn = document.getElementById('approve-btn');
    const rejectBtn = document.getElementById('reject-btn');
    
    if (type === 'deposit') {
        const deposit = pendingDeposits.find(d => d.id === id);
        if (!deposit) return;
        
        currentPaymentData = { type: 'deposit', id: id, data: deposit };
        modalTitle.textContent = `Review Deposit - ${deposit.username}`;
        modalContent.innerHTML = `
            <p><strong>User:</strong> ${deposit.username}</p>
            <p><strong>Email:</strong> ${deposit.email}</p>
            <p><strong>Amount:</strong> UGX ${parseInt(deposit.amount).toLocaleString()}</p>
            <p><strong>Network:</strong> ${deposit.network}</p>
            <p><strong>Submitted:</strong> ${new Date(deposit.created_at).toLocaleString()}</p>
        `;
        screenshotSection.style.display = 'none';
        
    } else if (type === 'withdrawal') {
        const withdrawal = pendingWithdrawals.find(w => w.id === id);
        if (!withdrawal) return;
        
        currentPaymentData = { type: 'withdrawal', id: id, data: withdrawal };
        modalTitle.textContent = `Process Withdrawal - ${withdrawal.username}`;
        modalContent.innerHTML = `
            <p><strong>User:</strong> ${withdrawal.username}</p>
            <p><strong>Email:</strong> ${withdrawal.email}</p>
            <p><strong>Phone:</strong> ${withdrawal.phone_number}</p>
            <p><strong>Network:</strong> ${withdrawal.network}</p>
            <p><strong>Amount:</strong> UGX ${parseInt(withdrawal.amount).toLocaleString()}</p>
            <p><strong>Requested:</strong> ${new Date(withdrawal.created_at).toLocaleString()}</p>
        `;
        screenshotSection.style.display = 'none';
    }
    
    modal.style.display = 'block';
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.style.display = 'none';
    currentPaymentData = null;
}

async function approvePayment() {
    if (!currentPaymentData) return;
    
    const approveBtn = document.getElementById('approve-btn');
    approveBtn.disabled = true;
    approveBtn.textContent = '⏳ Processing...';
    
    try {
        let endpoint, body;
        
        if (currentPaymentData.type === 'deposit') {
            endpoint = '/api/admin/deposit/verify';
            body = { depositId: currentPaymentData.id, action: 'approve' };
        } else {
            endpoint = '/api/admin/withdrawal/process';
            body = { withdrawalId: currentPaymentData.id, action: 'approve' };
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': ADMIN_KEY
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('✅ ' + data.message);
            closePaymentModal();
            loadPendingPayments();
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        approveBtn.disabled = false;
        approveBtn.textContent = '✅ Approve';
    }
}

async function rejectPayment() {
    if (!currentPaymentData) return;
    
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;
    
    const rejectBtn = document.getElementById('reject-btn');
    rejectBtn.disabled = true;
    rejectBtn.textContent = '⏳ Processing...';
    
    try {
        let endpoint, body;
        
        if (currentPaymentData.type === 'deposit') {
            endpoint = '/api/admin/deposit/verify';
            body = { depositId: currentPaymentData.id, action: 'reject', reason: reason };
        } else {
            endpoint = '/api/admin/withdrawal/process';
            body = { withdrawalId: currentPaymentData.id, action: 'reject', reason: reason };
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': ADMIN_KEY
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('❌ ' + data.message);
            closePaymentModal();
            loadPendingPayments();
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        rejectBtn.disabled = false;
        rejectBtn.textContent = '❌ Reject';
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('payment-modal');
    if (event.target === modal) {
        closePaymentModal();
    }
});
