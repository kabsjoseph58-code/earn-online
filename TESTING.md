# Testing before live payments

## Safe service smoke test

The smoke test does not create a real account, charge a card/mobile wallet, or
send a withdrawal. It checks the service process, database health, validation, the
payment minimum, webhook JSON handling, and one in-memory game event.

From the repository root:

```bash
npm install
npm start
```

In another terminal:

```bash
npm test
```

For the deployed service:

```bash
BASE_URL=https://your-domain.example npm test
```

The test must report zero failures before sandbox testing.

## Sandbox payment test

Use the backend service from [backend/server.js](backend/server.js), not the
root JSON-file server, because `/service/pay/collect` and the Jjuma webhook are in
the backend service. Configure sandbox credentials only:

- `PAYMENT_SERVICE_PUBLIC_KEY`
- `PAYMENT_SERVICE_PRIVATE_KEY`
- `PAYMENT_SERVICE_URL`
- `PAYMENT_WEBHOOK_SECRET`
- `BASE_URL` (public HTTPS URL)
- `DATABASE_URL`

Then verify that a sandbox checkout is created, the provider sends the webhook,
the deposit changes from `pending` to `completed`, and the dashboard updates.

## Live-payment gate

Do not use live credentials until all of these are true:

1. The smoke test passes against the deployed URL.
2. A sandbox payment succeeds.
3. Invalid webhook signatures are rejected.
4. Duplicate webhooks do not duplicate rewards or deposits.
5. A real HTTPS webhook URL is reachable from the payment provider.
6. The provider confirms the minimum supported live amount and fees.
7. You have backed up the database and configured monitoring.

The current application minimum is UGX 30,000. The smoke test deliberately
confirms that UGX 1,000 is rejected; do not bypass this minimum for a live test
without confirming provider and business requirements.