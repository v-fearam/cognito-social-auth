# Plan: Cognito Social Auth Monorepo

## Version

- Version: 0.2.0
- Date: 2026-04-29
- Status: Phase 0 implemented and validated locally

## TL;DR
Build a monorepo (`cognito-social-auth`) with a React frontend, NestJS backend, and AWS CDK infrastructure to test AWS Cognito authentication. Three phases: **Phase 0** gets the app running locally with open endpoints (no auth); **Phase 1** adds Cognito User Pool + email/password login + token-based authorization; **Phase 2** adds Google & Facebook social sign-in.

## Implementation Progress

Use this table to update progress as implementation moves forward.

| Workstream | Current State | Progress | Last Updated | Notes |
|---|---|---:|---|---|
| Phase 0 - Local app (no auth) | Done | 100% | 2026-04-29 | Monorepo, backend, frontend, and open endpoints completed |
| Phase 1 - Cognito email/password | Not started | 0% | 2026-04-29 | Depends on Phase 0 base |
| Phase 2 - Social IdPs (Google/Facebook) | Not started | 0% | 2026-04-29 | Depends on Phase 1 |
| Frontend (React/Vite) | Phase 0 complete | 40% | 2026-04-29 | Public pages and API integration done; auth pending |
| Backend (NestJS API) | Phase 0 complete | 40% | 2026-04-29 | Health/profile/admin endpoints done; auth guards pending |
| Infra (AWS CDK/Cognito) | Not started | 0% | 2026-04-29 | Starts in Phase 1 |
| Testing and validation | Phase 0 runtime checks complete | 30% | 2026-04-29 | Backend endpoints and app startup validated |

---

## Architecture Overview

```
cognito-social-auth/
├── plan.md                # This plan file
├── packages/
│   ├── frontend/          # React + Vite + TypeScript (+ Amplify Auth in Phase 1)
│   ├── backend/           # NestJS 11 + TypeScript
│   └── infra/             # AWS CDK v2 (Cognito, Lambda, etc.) — Phase 1+
├── package.json           # npm workspaces root
├── tsconfig.base.json     # shared TS config
└── .env.example           # env template
```

**Key tech choices:**
- **Frontend:** React 19 + Vite + TypeScript (Phase 0: plain, Phase 1+: Amplify Authenticator)
- **Backend:** NestJS 11 + TypeScript (Phase 0: open endpoints, Phase 1+: Passport JWT + Cognito JWKS)
- **Infra:** AWS CDK v2 (TypeScript) — added in Phase 1
- **Monorepo:** npm workspaces
- **Local dev:** Vite dev server (port 5173) + NestJS (port 3000)

---

## Phase 0 — App Running Locally (No Auth)

Goal: monorepo scaffolded, frontend and backend running, two endpoints callable from the browser — no login, no AWS, no auth.

### Step 1: Monorepo scaffolding
- Create `plan.md` in root (this plan)
- Initialize root `package.json` with `"workspaces": ["packages/*"]`
- Create `tsconfig.base.json` with shared compiler options (ES2022, strict)
- Create `.gitignore` (node_modules, dist, cdk.out, .env)
- Create `.nvmrc` (Node 20 LTS)
- Create `.env.example` with `API_URL=http://localhost:3000` (auth vars added later)

### Step 2: NestJS backend (*parallel with step 3*)
Create `packages/backend/` via NestJS CLI (`@nestjs/cli`):

1. **Bootstrap**: `nest new backend --package-manager npm --skip-git`
2. **Config**: `@nestjs/config` reading from `.env`
3. **Profile module** with `ProfileController`:
   - `GET /api/profile` — returns mock user data:
     ```json
     { "sub": "mock-sub-123", "email": "user@example.com", "groups": ["viewer"], "tier": "free", "message": "This is the profile endpoint (no auth yet)" }
     ```
   - `GET /api/admin` — returns mock admin data:
     ```json
     { "message": "This is the admin endpoint (no auth yet)", "secret": "admin-dashboard-data" }
     ```
   - `GET /api/health` — returns `{ "status": "ok" }`
4. **Global prefix**: `api` (so routes are `/api/profile`, `/api/admin`, `/api/health`)
5. **CORS**: allow `http://localhost:5173`
6. **Port**: 3000 (from env or default)

### Step 3: React frontend (*parallel with step 2*)
Create `packages/frontend/` via Vite:

1. **Scaffold**: `npm create vite@latest frontend -- --template react-ts`
2. **Dependencies**: `react-router-dom`
3. **Pages/Routes**:
   - `/` — Landing page with two buttons: "View Profile" and "View Admin Panel"
   - `/profile` — Calls `GET /api/profile`, displays the JSON response in a styled card (sub, email, groups, tier)
   - `/admin` — Calls `GET /api/admin`, displays the JSON response
4. **API service**: simple `fetch` wrapper using `VITE_API_URL` env var (defaults to `http://localhost:3000`)
5. **Layout**: minimal — navbar with links to Profile / Admin / Home, main content area
6. **No auth at all** — pages are fully public, API calls have no Authorization header

### Step 4: Verify Phase 0 (*depends on steps 2, 3*)
1. `npm install` at root (installs all workspaces)
2. Start backend: `cd packages/backend && npm run start:dev` → listening on port 3000
3. Start frontend: `cd packages/frontend && npm run dev` → listening on port 5173
4. **Verify**:
   - `curl http://localhost:3000/api/health` → `{ "status": "ok" }`
   - `curl http://localhost:3000/api/profile` → mock user JSON
   - `curl http://localhost:3000/api/admin` → mock admin JSON
   - Open `http://localhost:5173` → landing page renders
   - Click "View Profile" → profile page shows data from API
   - Click "View Admin Panel" → admin page shows data from API

---

## Phase 1 — Cognito User Pool + Email/Password Auth

Goal: deploy Cognito via CDK, add login to frontend (Amplify Authenticator), protect endpoints with JWT validation + role-based guards.

### Step 5: CDK infrastructure (*can start immediately*)
Create `packages/infra/` as a CDK app:

1. **Init**: `npx cdk init app --language typescript` inside `packages/infra/`
2. **CognitoAuthStack** (`lib/cognito-auth-stack.ts`):
   - **User Pool**:
     - Self sign-up enabled, email as sign-in alias
     - Email verification (code)
     - Password policy (8 chars, mixed case, numbers, symbols)
     - Custom attribute: `custom:tier` (string, mutable)
     - Standard attributes: email (required)
   - **App Client**:
     - Auth flows: authorization code grant with PKCE (`ALLOW_USER_SRP_AUTH`)
     - No client secret (public SPA client)
     - Callback URLs: `http://localhost:5173/`, `http://localhost:5173/callback`
     - Logout URLs: `http://localhost:5173/`
     - Scopes: `openid`, `email`, `profile`, plus custom resource server scopes
     - Token validity: access 1hr, ID 1hr, refresh 30d
   - **Resource Server**:
     - Identifier: `cognito-social-auth-api`
     - Scopes: `read`, `write`
   - **Groups**: `admin` ("Full access administrators"), `viewer` ("Read-only viewers")
   - **Pre Token Generation Lambda** (V2 trigger):
     - Handler in `lambda/pre-token-generation.ts`
     - Runtime: Node.js 20
     - Reads user's `custom:tier` attribute, injects into access token via `claimsAndScopeOverrides`
     - Attached to User Pool as `PreTokenGenerationConfig` (V2_0)
   - **Cognito Domain**: prefix `cognito-social-auth-dev`
3. **CDK Outputs**: User Pool ID, App Client ID, Region, Domain
4. **Lambda source** (`lambda/pre-token-generation.ts`): standalone handler file bundled by CDK NodejsFunction

### Step 6: Deploy CDK & create test users (*depends on step 5*)
1. `cd packages/infra && npx cdk bootstrap` (if first time in account/region)
2. `npx cdk deploy` → note outputs
3. Create `.env` files in frontend and backend using CDK outputs
4. Create test users via AWS CLI:
   - **User 1 (admin)**: `localadmin@test.com`, `custom:tier=premium`, group `admin`
   - **User 2 (viewer)**: `localviewer@test.com`, `custom:tier=free`, group `viewer`
5. Confirm password for both users (admin-set-user-password or user-initiated)

### Step 7: Backend — Add JWT auth (*depends on step 6*)
Modify `packages/backend/`:

1. **New dependencies**: `@nestjs/passport`, `passport`, `passport-jwt`, `jwks-rsa`
2. **Auth module** (`src/auth/`):
   - `cognito-jwt.strategy.ts` — Passport JWT strategy:
     - JWKS URI: `https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json`
     - Issuer: `https://cognito-idp.{region}.amazonaws.com/{userPoolId}`
     - Validate `token_use` is `access`
     - Extract `cognito:groups`, `scope`, `custom:tier`, `sub`, `username`
   - `roles.decorator.ts` — `@Roles('admin', 'viewer')` metadata decorator
   - `roles.guard.ts` — reads `@Roles()` metadata, checks `cognito:groups` from JWT payload
   - `auth.module.ts` — registers PassportModule + JwtStrategy
3. **Update ProfileController**:
   - `GET /api/profile` — `@UseGuards(AuthGuard('jwt'))` — returns real decoded user info from token
   - `GET /api/admin` — `@UseGuards(AuthGuard('jwt'))` + `@Roles('admin')` + `RolesGuard` — returns admin data
   - `GET /api/health` — remains public (no guards)
4. **Config env vars**: `COGNITO_USER_POOL_ID`, `COGNITO_REGION`

### Step 8: Frontend — Add Amplify Auth (*depends on step 6*)
Modify `packages/frontend/`:

1. **New dependencies**: `aws-amplify`, `@aws-amplify/ui-react`
2. **Amplify config** in `main.tsx`:
   - `Amplify.configure()` with `Auth.Cognito` block using `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_APP_CLIENT_ID`, `VITE_COGNITO_REGION`
3. **Wrap app** in `<Authenticator.Provider>`
4. **Update routes**:
   - `/` — Landing page: if signed in show "Go to Dashboard", else show "Sign In"
   - `/login` — `<Authenticator>` component (email+password, sign-up)
   - `/profile` — **Protected**: get session via `fetchAuthSession()`, send Bearer token, display real user info (sub, email, groups, tier)
   - `/admin` — **Protected**: same but calls `/api/admin`
5. **Auth header**: `fetchAuthSession()` → `tokens.accessToken.toString()` → `Authorization: Bearer <token>`
6. **Sign-out button** in navbar
7. **Env vars**: `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_APP_CLIENT_ID`, `VITE_COGNITO_REGION`, `VITE_API_URL`

### Step 9: Verify Phase 1 (*depends on steps 7, 8*)
1. Start backend + frontend
2. **Verify**:
   - `http://localhost:5173` → landing page, "Sign In" button visible
   - Sign up new user → confirm email → sign in → redirected to profile
   - Sign in as `localadmin@test.com` → profile shows `groups: ["admin"]`, `tier: "premium"`
   - Click "Admin Panel" → shows admin data (200)
   - Sign in as `localviewer@test.com` → profile shows `groups: ["viewer"]`, `tier: "free"`
   - Click "Admin Panel" → shows 403 Forbidden
   - Sign out → back to landing page
   - `curl http://localhost:3000/api/profile` (no token) → 401
   - `curl http://localhost:3000/api/health` → 200

---

## Phase 2 — Add Google & Facebook Social Sign-In

Goal: add social IdPs to the existing Cognito setup, update frontend to show social sign-in buttons.

### Step 10: Google OAuth credentials
1. Google Cloud Console → APIs & Credentials → Create OAuth 2.0 Client ID (Web application)
2. Authorized redirect URI: `https://cognito-social-auth-dev.auth.<region>.amazoncognito.com/oauth2/idpresponse`
3. Note Client ID and Client Secret

### Step 11: Facebook OAuth credentials (*parallel with step 10*)
1. Facebook Developers → Create App (Consumer type) → Add Facebook Login product
2. Valid OAuth Redirect URI: `https://cognito-social-auth-dev.auth.<region>.amazoncognito.com/oauth2/idpresponse`
3. Note App ID and App Secret

### Step 12: CDK — Add social identity providers (*depends on steps 10, 11*)
Modify `packages/infra/lib/cognito-auth-stack.ts`:

1. **Google IdP** (`UserPoolIdentityProviderGoogle`):
   - Client ID + Secret (from CDK context or env)
   - Scopes: `openid`, `email`, `profile`
   - Attribute mapping: email → email, name → name, sub → username
2. **Facebook IdP** (`UserPoolIdentityProviderFacebook`):
   - App ID + Secret
   - Scopes: `email`, `public_profile`
   - Attribute mapping: email → email, name → name
3. **Update App Client**: add Google and Facebook as supported identity providers
4. Redeploy: `npx cdk deploy`

### Step 13: Frontend — Social sign-in buttons (*depends on step 12*)
Modify `packages/frontend/`:

1. **Update Amplify config** — add `oauth` block:
   - domain: `cognito-social-auth-dev.auth.<region>.amazoncognito.com`
   - scopes: `['openid', 'email', 'profile', 'cognito-social-auth-api/read', 'cognito-social-auth-api/write']`
   - redirectSignIn: `http://localhost:5173/callback`
   - redirectSignOut: `http://localhost:5173/`
   - responseType: `code`
2. **Authenticator**: add `socialProviders={['google', 'facebook']}`
3. **Add `/callback` route** — Amplify handles token exchange automatically
4. **Dashboard**: display identity provider source (from token `identities` claim)

### Step 14: Create social test users & verify (*depends on step 13*)
1. Sign in via Google → auto-created in pool → assign to `viewer` group + `custom:tier=premium` via CLI
2. Sign in via Facebook → auto-created → assign to `viewer` group + `custom:tier=free` via CLI
3. **Verify**:
   - Google sign-in → dashboard shows Google as provider, correct groups/tier
   - Facebook sign-in → same
   - Local email+password still works
   - All 3 user types can call `/api/profile`
   - Group-based access on `/api/admin` works for all identity types

---

## Relevant Files

| Path | Purpose |
|---|---|
| `plan.md` | This implementation plan |
| `package.json` | Root npm workspaces config |
| `tsconfig.base.json` | Shared TypeScript config |
| `.env.example` | Environment variable template |
| **Backend** | |
| `packages/backend/src/main.ts` | NestJS bootstrap (CORS, global prefix) |
| `packages/backend/src/profile/profile.controller.ts` | `/api/profile`, `/api/admin`, `/api/health` endpoints |
| `packages/backend/src/auth/cognito-jwt.strategy.ts` | *(Phase 1)* Passport JWT strategy for Cognito JWKS |
| `packages/backend/src/auth/roles.guard.ts` | *(Phase 1)* Guard checking `cognito:groups` |
| `packages/backend/src/auth/roles.decorator.ts` | *(Phase 1)* `@Roles()` decorator |
| **Frontend** | |
| `packages/frontend/src/main.tsx` | React entry (+ Amplify config in Phase 1) |
| `packages/frontend/src/App.tsx` | Router + layout |
| `packages/frontend/src/pages/Landing.tsx` | Public landing page |
| `packages/frontend/src/pages/Profile.tsx` | Profile page (calls `/api/profile`) |
| `packages/frontend/src/pages/Admin.tsx` | Admin page (calls `/api/admin`) |
| `packages/frontend/src/services/api.ts` | Fetch wrapper for backend calls |
| **Infra** *(Phase 1+)* | |
| `packages/infra/bin/app.ts` | CDK app entry point |
| `packages/infra/lib/cognito-auth-stack.ts` | CDK stack: User Pool, Client, Resource Server, Groups, Lambda, IdPs |
| `packages/infra/lambda/pre-token-generation.ts` | Lambda handler: inject `custom:tier` into token |

---

## Verification Checklist

### Phase 0 (no auth)
- [ ] `npm install` at root succeeds
- [ ] `npm run start:dev` in backend → port 3000
- [ ] `npm run dev` in frontend → port 5173
- [ ] `curl http://localhost:3000/api/health` → `{ "status": "ok" }`
- [ ] `curl http://localhost:3000/api/profile` → mock user JSON
- [ ] `curl http://localhost:3000/api/admin` → mock admin JSON
- [ ] Frontend landing page renders, profile and admin pages show API data

### Phase 1 (Cognito + email/password)
- [ ] `cdk synth` produces valid CloudFormation
- [ ] `cdk deploy` succeeds, outputs User Pool ID + Client ID
- [ ] `aws cognito-idp describe-user-pool` confirms custom attribute, Lambda trigger, groups
- [ ] Frontend + backend compile (`npm run build`)
- [ ] Sign in as admin → profile shows `groups: ["admin"]`, `tier: "premium"`
- [ ] Admin page works for admin user (200)
- [ ] Admin page blocked for viewer user (403)
- [ ] No token → 401 on protected endpoints
- [ ] Health endpoint remains public

### Phase 2 (social sign-in)
- [ ] `cdk deploy` with IdPs succeeds
- [ ] Google sign-in → profile shows Google provider
- [ ] Facebook sign-in → profile shows Facebook provider
- [ ] Local email+password still works
- [ ] All 3 user types have correct authorization results

---

## Decisions & Scope

- **In scope**: Cognito User Pool, App Client (PKCE), Resource Server, Groups, Custom Attributes, Lambda trigger, React frontend, NestJS backend, local dev only
- **Out of scope**: Production deployment (S3/CloudFront/ECS), CI/CD, MFA, password reset UI customization, Cognito Identity Pool
- **Phase 0 is the foundation** — app works end-to-end before any AWS resources exist
- **NestJS 11**, **React 19**, **Vite 6**, **CDK v2**, **Node 20**
- **No LocalStack** — real AWS resources from Phase 1 onward
- **Token validation**: backend validates access tokens via JWKS (RS256)
- **Pre Token Generation Lambda**: V2 trigger for access token customization
