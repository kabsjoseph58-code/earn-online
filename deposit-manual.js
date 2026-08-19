// Manual Payment Processing for Deposits

// Payment account numbers (replace with actual numbers)
const PAYMENT_CONFIG = {
    Airtel: '+256 XXX XXX XXX',  // Replace with actual Airtel account
    MTN: '+256 XXX XXX XXX'       // Replace with actual MTN account
};

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupPaymentFlow();
    setupScreenshotPreview();
    setupTabButtons();
});

function setupPaymentFlow() {
    const planDisplay = document.getElementById('plan-display');
    const planInput = document.getElementById('plan');
    const paymentInstructions = document.getElementById('payment-instructions');
    const depositForm = document.getElementById('deposit-form');
    
    if (depositForm) {
        depositForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showPaymentInstructions();
        });
    }
}

function showPaymentInstructions() {
    const planInput = document.getElementById('plan');
    const planValue = planInput.value;
    
    if (!planValue) {
        alert('Please select a plan first');
        return;
    }
    
    // Show payment instructions section
    document.getElementById('deposit-section').style.display = 'none';
    document.getElementById('payment-instructions').style.display = 'block';
    
    // Update payment amount display
    const planAmount = getPlanAmount(planValue);
    document.getElementById('payment-plan-display').textContent = `UGX ${parseInt(planValue).toLocaleString()}`;
    
    // Update payment numbers
    document.getElementById('airtel-number').textContent = PAYMENT_CONFIG.Airtel;
    document.getElementById('mtn-number').textContent = PAYMENT_CONFIG.MTN;
}

function getPlanAmount(value) {
    return parseInt(value).toLocaleString();
}

function setupScreenshotPreview() {
    const fileInput = document.getElementById('proof-screenshot');
    if (!fileInput) return;
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            this.value = '';
            return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            this.value = '';
            return;
        }
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('preview-img').src = event.target.result;
            document.getElementById('screenshot-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    });
}

function setupTabButtons() {
    const tabDeposits = document.getElementById('tab-deposits');
    const tabWithdrawals = document.getElementById('tab-withdrawals');
    
    if (tabDeposits && tabWithdrawals) {
        tabDeposits.addEventListener('click', function() {
            document.getElementById('admin-deposits-content').style.display = 'block';
            document.getElementById('admin-withdrawals-content').style.display = 'none';
        });
        
        tabWithdrawals.addEventListener('click', function() {
            document.getElementById('admin-deposits-content').style.display = 'none';
            document.getElementById('admin-withdrawals-content').style.display = 'block';
        });
    }
}

async function submitPaymentProof() {
    const planInput = document.getElementById('plan');
    const networkRadios = document.querySelectorAll('input[name="payment-network"]');
    const screenshotInput = document.getElementById('proof-screenshot');
    
    // Validate inputs
    if (!planInput.value) {
        showPaymentStatus('Please select a plan', 'error');
        return;
    }
    
    const selectedNetwork = Array.from(networkRadios).find(r => r.checked);
    if (!selectedNetwork) {
        showPaymentStatus('Please select a payment network', 'error');
        return;
    }
    
    if (!screenshotInput.files[0]) {
        showPaymentStatus('Please upload a payment screenshot', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submit-payment-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Uploading...';
    
    try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('amount', planInput.value);
        formData.append('network', selectedNetwork.value);
        formData.append('screenshot', screenshotInput.files[0]);
        
        const response = await fetch('/api/deposit/manual', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showPaymentStatus('✅ Payment proof submitted successfully. Admin will verify within 24 hours.', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else {
            showPaymentStatus(data.message || 'Failed to submit payment proof', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showPaymentStatus('Error submitting payment proof: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Submit Payment Proof';
    }
}

function showPaymentStatus(message, type) {
    const statusDiv = document.getElementById('payment-status');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
}

// Setup submit button
document.addEventListener('DOMContentLoaded', function() {
    const submitBtn = document.getElementById('submit-payment-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitPaymentProof);
    }
});
