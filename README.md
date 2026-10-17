# RunItBetterAI

A responsive AI automation services website for local businesses, built with React, Vinext, and Cloudflare D1.

## Run locally

Dependencies are already installed for this checkout.

```powershell
cd "C:\Users\basim\OneDrive\Desktop\web\goodwork"
node scripts/run-framework.mjs dev
```

Open the printed URL (normally http://127.0.0.1:5173). Stop with Ctrl+C.

For a fresh checkout, run npm install:ci through your installed npm. This Windows host's npm shim is misconfigured, so the working invocation here is:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run install:ci
```

## Build and database

```powershell
node scripts/run-framework.mjs build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_cloudy_kree.sql
```

The initial migration has already been applied locally. Do not apply it twice. Hosted migrations are applied by Sites publishing.

## Business configuration

## Marketing CRM

Open `/admin` for the marketing workspace. On first use, create your administrator email and password at `/admin/login`; passwords must be 12–128 characters. Later visits require sign-in. Website chat and callback submissions appear directly as New contacts. You can add/edit contacts, search by source, move them through New → Contacted → Qualified → Proposal → Won/Lost, add notes, and schedule/reschedule/complete/cancel calls. Delete buttons appear in contact details, call cards, and individual notes. Each asks for confirmation. Deleting a contact permanently deletes its calls and notes in one database batch; there is no undo.

Calls store a UTC timestamp and an IANA scheduling timezone. The agenda shows your selected display timezone and the contact's timezone. Existing inquiries default to UTC: edit the contact to set their actual timezone. Skipped/repeated daylight-saving times are rejected. No external chat integrations, calendar invitations, or automated reminders are connected.

CRM authentication uses salted PBKDF2 password hashes and opaque random sessions stored as hashes in D1. Cookies are HttpOnly/SameSite=Strict (also Secure in production), sessions expire after eight hours, and sign-out revokes the server session. Five failed login attempts lock the account for 15 minutes. Sites identity headers and the mock local cookie do not grant CRM access. Public inquiry submission remains available. Password recovery is not configured; keep the chosen credentials in a password manager.

The first account (ID 1) is the protected super admin, including existing installations. Use **Manage admins** at `/admin/users` to add administrators, enable/disable them, reset their passwords, or remove them. Only the super admin can access these operations, enforced on the server. Other admins can manage the shared CRM records. The super admin cannot be removed, disabled, or reset from this screen. Disabling, removing, and resetting an admin revokes their sessions; removing an admin retains CRM records. Email addresses are unique and normalized to lowercase. No invitation emails are sent; share initial/reset credentials securely.

First-account setup is allowed on loopback development only. For a hosted installation, configure a strong random `CRM_SETUP_TOKEN` server runtime secret and enter it on the setup screen; remove that secret after setup. Setup is disabled once the first administrator account exists. Hosted Sites access policies still apply separately. Do not expose the development server publicly.

Migrations through `drizzle/0003_soft_the_fallen.sql` have been applied locally. Apply each once in order to other existing databases; Sites applies pending migrations on deployment. Migration 0003 retains the first account and password, adds user-linked sessions, and invalidates old sessions (sign in again).

Local authentication QA: `node scripts/verify-crm-auth.mjs` on port 5173, only before an owner account exists. It creates and removes its own temporary test account and records. Multi-admin QA: `node scripts/verify-crm-users.mjs` with an existing owner account; it creates a temporary local test session and QA admin, verifies roles, revocation, management actions, and browser rendering, and removes only its test artifacts. It never changes the owner's password. The other CRM verification scripts require `CRM_SESSION_COOKIE` in the process environment; never commit session tokens.

- Working name and phone: app/brand.ts. Company: RunItBetterAI. Domain: runitbetter.com. The business phone has not been supplied. With no phone, call/text buttons open a callback request instead of dialing a fictional number.
- Browser title and description: app/layout.tsx.
- Content: app/content.ts and app/website.tsx.
- Illustration/sample: /sample/your-local-pro; sample finder accepts DEMO. No real customer samples were supplied. Unknown links show a help state. This example is not a real customer. Real private sample delivery and prospect access controls must be configured before adding confidential customer data; noindex alone is not access control.
- Chat: a clearly labeled guided assistant, not a generative AI agent or live support. It saves the visitor's inquiry only when they submit.
- Inquiries: stored in D1 table inquiries; no email/SMS delivery provider is configured. Review records using the Sites database tools. A notification destination is still required for automatic owner alerts.
- The site is owner-private on Sites by default. A public audience is a separate launch decision.

## Checks

```powershell
node node_modules/typescript/bin/tsc --noEmit
node scripts/verify-local.mjs
node scripts/verify-browser.mjs
```

The latter checks use the running local server. Browser QA uses installed Microsoft Edge in headless mode and writes ignored screenshots to outputs/. The inquiry check inserts a synthetic local-only QA request.

## Hero asset

Built-in image generation produced the service-worker image. Optimized web asset: public/service-owner.webp; original: public/service-owner.png. Prompt: natural editorial photo of a friendly local HVAC technician in a faded sage-green shirt repairing an outdoor AC beside a modest American house, warm afternoon daylight, authentic tools and natural colors, portrait framing, no text or logos. This is illustrative imagery, not a customer testimonial.

## Publishing status
Local production build and browser checks passed. Publishing could not proceed because the Sites connector returned 'Sites project not found' for the persisted project ID when requesting a source credential. No successful deployment was reported. Preserve the existing ID until access is resolved.
