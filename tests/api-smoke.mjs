#!/usr/bin/env node

// Safe API smoke tests. These tests intentionally do not create real users,
// deposits, withdrawals, or payment-provider transactions.
// Usage: BASE_URL=http://localhost:3000 node tests/api-smoke.mjs

const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
let passed = 0;
let failed = 0;
const testPhone = process.env.PAYMENT_NUMBER || 'REDACTED';

async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    let body = null;
    try { body = await response.json(); } catch {}
    return { response, body };
}

function check(name, condition, details = '') {
    if (condition) {
        passed++;
        console.log(`PASS  ${name}`);
    } else {
        failed++;
        console.error(`FAIL  ${name}${details ? ` — ${details}` : ''}`);
    }
}

async function run() {
    console.log(`Testing ${baseUrl}`);

    try {
        const health = await request('/api/health');
        check('health endpoint', health.response.ok && health.body?.status === 'ok', JSON.stringify(health.body));
    } catch (error) {
        console.error(`Cannot connect to ${baseUrl}: ${error.message}`);
        process.exitCode = 1;
        return;
    }

    const staticPage = await request('/');
    check('frontend is served', staticPage.response.ok);

    const missingRegister = await request('/api/register', {
        method: 'POST', body: JSON.stringify({})
    });
    check('register rejects missing fields', missingRegister.response.ok && missingRegister.body?.status === 'error');

    const invalidLogin = await request('/api/login', {
        method: 'POST', body: JSON.stringify({ username: `smoke-${Date.now()}`, password: 'invalid' })
    });
    check('login rejects invalid credentials', invalidLogin.response.ok && invalidLogin.body?.status === 'error');

    const lowPayment = await request('/api/pay/collect', {
        method: 'POST',
        body: JSON.stringify({
            amount: 1000,
            email: 'smoke@example.invalid',
            phone: testPhone,
            name: 'Smoke Test',
            network: 'MTN'
        })
    });
    check('payment endpoint rejects UGX 1,000 safely', lowPayment.response.status === 400 && lowPayment.body?.status === 'error');

    const missingDeposit = await request('/api/record-deposit', {
        method: 'POST', body: JSON.stringify({ amount: 1000 })
    });
    check('deposit endpoint rejects missing fields', missingDeposit.body?.status === 'error');

    const invalidWebhook = await request('/api/webhooks/jjuma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not-json}'
    });
    check('webhook rejects malformed JSON', invalidWebhook.response.status === 400);

    const gameBet = await request('/api/record-game-bet', {
        method: 'POST',
        body: JSON.stringify({ betAmount: 100, game: 'smoke-test', result: 'loss', payout: 0 })
    });
    check('game bet endpoint accepts valid test input', gameBet.response.ok && gameBet.body?.status === 'success');

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed) process.exitCode = 1;
}

run().catch(error => {
    console.error(`Smoke test error: ${error.stack || error.message}`);
    process.exitCode = 1;
});