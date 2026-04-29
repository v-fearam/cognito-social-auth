# Plan: Cognito Social Auth Monorepo (Manual AWS Console)

## Version

- Version: 0.3.0
- Date: 2026-04-29
- Status: Phase 0 completed; Phase 1 and Phase 2 pending

## TL;DR

This plan keeps what is already done locally and changes cloud setup to fully manual steps in the AWS portal.

Target auth flow:
1. User opens the web app.
2. Amplify Auth redirects to Cognito Hosted UI.
3. Cognito signs in the user directly or hands off to Google/Facebook.
4. Cognito redirects back and the app gets Cognito tokens.
5. The app calls backend APIs with the Cognito access token.
6. The API validates the token with Cognito JWKS.
7. The API authorizes by reading `cognito:groups`.

---

## Implementation Progress

| Workstream | Current State | Progress | Last Updated | Notes |
|---|---|---:|---|---|
| Phase 0 - Local app (no auth) | Done | 100% | 2026-04-29 | Monorepo, backend, frontend, open endpoints completed |
| Phase 1 - Cognito email/password | Not started | 0% | 2026-04-29 | Manual AWS Console setup only |
| Phase 2 - Social IdPs (Google/Facebook) | Not started | 0% | 2026-04-29 | Manual AWS Console + provider portals |
| Frontend (React/Vite) | Phase 0 complete | 40% | 2026-04-29 | Public pages + API integration done; auth pending |
| Backend (NestJS API) | Phase 0 complete | 40% | 2026-04-29 | Endpoints done; JWT + group guards pending |
| Infra (Cognito resources) | Not started | 0% | 2026-04-29 | Manual creation in AWS portal |
| Testing and validation | Phase 0 checks complete | 30% | 2026-04-29 | Runtime baseline validated |

---

## Architecture Overview

```text
cognito-social-auth/
├── plan.md                # This plan file
├── packages/
│   ├── frontend/          # React + Vite + TypeScript (+ Amplify in Phase 1)
│   ├── backend/           # NestJS 11 + TypeScript
│   └── infra/             # Not required for this manual-only plan
├── package.json           # npm workspaces root
├── tsconfig.base.json     # shared TS config
└── .env.example           # env template
```

Key decisions:
- Frontend: React 19 + Vite + TypeScript + Amplify Authenticator (Phase 1+)
- Backend: NestJS 11 + Passport JWT + `jwks-rsa` (Phase 1+)
- Authorization model: groups only (`admin`, `viewer`)
- Cloud setup mode: manual only in AWS portal (no CDK, no AWS CLI)

---

## Phase 0 - Completed Baseline (No Auth)

Goal: keep the local baseline as-is and use it as foundation.

Already done:
1. Monorepo scaffold with npm workspaces
2. Backend running on port 3000 with routes:
   - `GET /api/health`
   - `GET /api/profile`
   - `GET /api/admin`
3. Frontend running on port 5173 with pages:
   - `/`
   - `/profile`
   - `/admin`
4. Frontend calls backend with no auth header (expected for Phase 0)
5. Root build succeeds

---

## Phase 1 - Cognito User Pool + Email/Password (Manual Portal)

Goal: manual Cognito setup in AWS portal, then protect backend routes with token validation and `cognito:groups` authorization.

### Step 1: Create User Pool manually in AWS portal

AWS portal path:
- AWS Console -> Amazon Cognito -> User pools -> Create user pool

Set:
- Sign-in options: Email
- Self-registration: enabled
- Verification: email code
- Password policy: minimum 8 chars with complexity
- MFA: optional/off for local test

Capture values:
- `COGNITO_REGION`
- `COGNITO_USER_POOL_ID`

### Step 2: Create App Client manually (SPA public client)

AWS portal path:
- User pool -> App integration -> App clients -> Create app client

Set:
- Public client (no client secret)
- Authorization code grant with PKCE
- Callback URL: `http://localhost:5173/callback`
- Sign-out URL: `http://localhost:5173/`
- OIDC scopes: `openid`, `email`, `profile`

Capture value:
- `VITE_COGNITO_APP_CLIENT_ID`

### Step 3: Configure Cognito Hosted UI domain manually

AWS portal path:
- User pool -> App integration -> Domain

Set:
- Cognito domain prefix using placeholder format: `csa-dev-<unique-suffix>`

Capture value:
- Hosted UI domain: `https://<prefix>.auth.<region>.amazoncognito.com`

### Step 4: Create groups manually

AWS portal path:
- User pool -> User management -> Groups -> Create group

Create exactly:
- `admin`
- `viewer`

### Step 5: Create and assign test users manually

AWS portal path:
- User pool -> User management -> Users -> Create user

Create:
- `localadmin@test.com` -> assign to `admin`
- `localviewer@test.com` -> assign to `viewer`

### Step 6: Backend JWT validation and group guard

Code tasks in backend:
1. Add dependencies: `@nestjs/passport`, `passport`, `passport-jwt`, `jwks-rsa`
2. Create auth strategy validating Cognito access token via JWKS:
   - Issuer: `https://cognito-idp.<region>.amazonaws.com/<userPoolId>`
   - JWKS: `https://cognito-idp.<region>.amazonaws.com/<userPoolId>/.well-known/jwks.json`
   - Validate `token_use` is `access`
3. Create `@Roles()` decorator
4. Create `RolesGuard` checking `cognito:groups`
5. Protect endpoints:
   - `/api/profile`: JWT required
   - `/api/admin`: JWT required + `admin` group
   - `/api/health`: public

### Step 7: Frontend Amplify Hosted UI integration

Code tasks in frontend:
1. Add dependencies: `aws-amplify`, `@aws-amplify/ui-react`
2. Configure Amplify with:
   - region
   - userPoolId
   - userPoolClientId
   - Hosted UI domain
   - OAuth `responseType: code`
   - Redirect sign-in: `http://localhost:5173/callback`
   - Redirect sign-out: `http://localhost:5173/`
3. Add routes and flow:
   - sign-in entry
   - callback handling
   - sign-out
4. For API calls, send `Authorization: Bearer <access_token>`

---

## Phase 2 - Social Sign-In (Google + Facebook, Manual)

Goal: configure social federation manually and keep authorization behavior based on Cognito groups.

### Step 8: Create Google OAuth app manually

Google portal path:
- Google Cloud Console -> APIs & Services -> Credentials -> Create OAuth client (Web app)

Set redirect URI:
- `https://<cognito-domain>/oauth2/idpresponse`

Capture:
- Google Client ID
- Google Client Secret

### Step 9: Create Facebook app manually

Facebook portal path:
- Facebook Developers -> My Apps -> Create App -> Facebook Login

Set redirect URI:
- `https://<cognito-domain>/oauth2/idpresponse`

Capture:
- Facebook App ID
- Facebook App Secret

### Step 10: Add social providers in Cognito manually

AWS portal path:
- User pool -> Sign-in experience -> Social and external providers

Configure:
- Google provider credentials
- Facebook provider credentials
- Attribute mapping for email and username/name

### Step 11: Enable providers in Hosted UI manually

AWS portal path:
- User pool -> App integration -> Managed login / Hosted UI configuration

Enable identity providers for app client:
- Cognito User Pool
- Google
- Facebook

### Step 12: Assign social users to groups manually

After first social login auto-creates user:
- Go to User pool -> Users
- Assign user to `admin` or `viewer`

---

## Verification Checklist

### Phase 0 baseline
- [x] Root install/build succeeds
- [x] Backend starts and serves open endpoints
- [x] Frontend starts and calls backend

### Phase 1 (manual Cognito + local user login)
- [ ] User pool exists with email sign-in
- [ ] App client configured for PKCE and localhost callback/signout URLs
- [ ] Hosted UI domain configured
- [ ] `admin` and `viewer` groups created
- [ ] Test users created and assigned to groups
- [ ] Frontend can sign in via Cognito Hosted UI
- [ ] Frontend receives Cognito tokens after callback
- [ ] Backend validates access token via JWKS
- [ ] `/api/profile` returns authenticated identity data
- [ ] `/api/admin` returns 200 for admin and 403 for viewer
- [ ] `/api/health` remains public

### Phase 2 (manual social federation)
- [ ] Google provider configured and login works end-to-end
- [ ] Facebook provider configured and login works end-to-end
- [ ] Social users can call `/api/profile` with valid token
- [ ] Group-based access for `/api/admin` works for social users

---

## Required Environment Variables

Backend (`packages/backend/.env`):
- `NODE_ENV=development`
- `PORT=3000`
- `COGNITO_REGION=<aws-region>`
- `COGNITO_USER_POOL_ID=<user-pool-id>`

Frontend (`packages/frontend/.env`):
- `VITE_API_URL=http://localhost:3000`
- `VITE_COGNITO_REGION=<aws-region>`
- `VITE_COGNITO_USER_POOL_ID=<user-pool-id>`
- `VITE_COGNITO_APP_CLIENT_ID=<app-client-id>`
- `VITE_COGNITO_DOMAIN=<hosted-ui-domain-without-https>`

---

## Scope

In scope:
- Local development setup
- Cognito Hosted UI auth flow
- Manual Google/Facebook federation setup
- JWT validation with Cognito JWKS
- Group-based authorization using `cognito:groups`

Out of scope for now:
- Infrastructure automation (CDK/Terraform/CLI)
- Production hardening (MFA, WAF, CloudFront, CI/CD)
- Custom claims Lambda and custom scopes
