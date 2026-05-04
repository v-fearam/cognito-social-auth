# Plan: Cognito Social Auth Monorepo (Manual AWS Console)

## Version

- Version: 0.5.3
- Date: 2026-05-04
- Status: Tasks 1-3 complete; Phase 2 complete; custom:tier and Pre Token Generation Lambda configured and verified; Unit tests: 47 tests

## TL;DR

The project has moved from an open local baseline to a working Cognito-protected implementation.

Current flow:
1. User signs in through Cognito Hosted UI.
2. Frontend handles callback at `/callback` and keeps OIDC session.
3. Frontend calls backend with Cognito access token.
4. Backend validates JWT via Cognito JWKS and issuer.
5. Backend authorizes admin and viewer endpoints with `cognito:groups`.

## AWS Setup Status

### Task 1: Cognito User Pool with Social Sign-In ✅ COMPLETE

| Requirement | Status | Notes |
|---|---|---|
| User Pool created | ✅ | `us-east-2_EZsrSxHBb` - test account |
| Email username alias | ✅ | Configured for sign-in |
| Password policy | ✅ | Standard Cognito policy applied |
| Google IdP | ✅ | OAuth client created, redirect URI configured, tested end-to-end |
| Facebook IdP | ✅ | App created in Meta for Developers, redirect URI configured, tested end-to-end |
| Apple IdP | ⏭️ | Optional - not yet configured |

### Task 2: Cognito App Client & Resource Server ✅ COMPLETE

| Requirement | Status | Details |
|---|---|---|
| App client created | ✅ | `2jcjrvftiedm8rtp8ii8pt1heb` |
| Authorization code flow | ✅ | `response_type=code` in OIDC config |
| PKCE enabled | ✅ | Handled by `react-oidc-context` library |
| Callback URL | ✅ | `http://localhost:5173/callback` |
| Sign-out URL | ✅ | `http://localhost:5173/` |
| Resource server | ✅ | Implicit (standard Cognito user pool scope) |
| Custom scopes | ✅ | `openid email phone` configured in frontend |
| Social IdPs assigned | ✅ | Google + Facebook assigned to app client, both tested end-to-end |

### Task 3: Groups, Custom Attributes, Lambda Trigger ✅ COMPLETE

| Requirement | Status | Details |
|---|---|---|
| `admin` group | ✅ Complete | Group exists in Cognito and admin authorization is validated |
| `viewer` group | ✅ Complete | Group exists in Cognito with assigned user; repo support is complete via `/api/viewer` |
| `custom:tier` attribute | ✅ Complete | Created in Cognito, populated on test users, successfully injected into tokens |
| Pre Token Generation Lambda | ✅ Complete | Deployed to AWS Lambda, attached to user pool, verified working (source backed up in repo) |
| Test users assigned to groups | ✅ Complete | Users assigned to both `admin` and `viewer` groups; tokens include `custom:tier` claim from Lambda |
| Backend tier support | ✅ Complete | `/api/viewer` endpoint surfaces `custom:tier` claim from JWT payload |
| Frontend tier display | ✅ Complete | SummaryCards component displays `custom:tier` claim value in UI |

## Implementation Progress

| Workstream | Current State | Progress | Last Updated | Notes |
|---|---|---:|---|---|
| Phase 0 - Local app (no auth) | Done | 100% | 2026-05-04 | Baseline complete |
| Phase 1 - Cognito email/password | Done | 100% | 2026-05-04 | Hosted UI + callback + backend guards complete |
| Phase 2 - Social IdPs (Google/Facebook) | Complete | 100% | 2026-05-04 | Google and Facebook both validated end-to-end |
| Frontend (React/Vite) | Done for Task 3 app support | 95% | 2026-05-04 | OIDC integration + viewer action + tier summary card complete |
| Backend (NestJS API) | Done for Task 3 app support | 100% | 2026-05-04 | Access token verification + admin/viewer guards + tier claim surfacing complete |
| Testing and validation | Complete for repo scope | 100% | 2026-05-04 | Google and Facebook flows validated; unit tests: 47 tests |

## Implemented Architecture

```text
cognito-social-auth/
├── plan.md
├── README.md
└── packages/
    ├── frontend/
    │   ├── src/main.tsx                      # AuthProvider with Cognito OIDC config
    │   ├── src/App.tsx                       # Container component
    │   └── src/components/                   # Presentational UI components
    └── backend/
        └── src/
            ├── app.controller.ts             # Protected/public routes
            └── auth/
                ├── cognito-token-verifier.service.ts
                ├── cognito-auth.guard.ts
                ├── admin-group.guard.ts
                └── viewer-group.guard.ts
```

## Completed in Phase 1

### Frontend

1. Configured `react-oidc-context` in `main.tsx` with:
- `authority`
- `client_id`
- `redirect_uri`
- `post_logout_redirect_uri`
- `response_type=code`
- callback cleanup via `onSigninCallback`

2. Added authentication UI flow:
- signed-out state with Sign In action
- signed-in state with user identity and Sign Out action
- protected API action buttons and response panes

3. Refactored UI for maintainability:
- extracted reusable components
- standardized naming conventions across props/handlers

### Backend

1. Implemented Cognito access token verification with `jose` + remote JWKS.
2. Added `CognitoAuthGuard` for bearer token validation.
3. Added `AdminGroupGuard` enforcing `COGNITO_ADMIN_GROUP` (default `admin`).
4. Added `ViewerGroupGuard` permitting `viewer` or `admin` access on the read-only route.
5. Added explicit `.env` loading in backend startup for reliable runtime config.
6. Added business logic simulation messages in controller responses for health, profile, viewer, and admin endpoints.
7. Protected routes:
- `/api/health` public
- `/api/profile` authenticated
- `/api/viewer` authenticated + viewer/admin group
- `/api/admin` authenticated + admin group

### UI response rendering

1. The UI preserves the full raw controller response for each protected endpoint.
2. The UI extracts and displays the controller `message` separately.
3. The UI extracts and displays `businessResult` separately so controller result and business result remain visible together.
4. The UI exposes a dedicated `/api/viewer` action and surfaces `custom:tier` in the summary cards when present.

## Required Environment Variables

Backend (`packages/backend/.env`):
- `NODE_ENV=development`
- `PORT=3000`
- `CORS_ORIGIN=http://localhost:5173`
- `COGNITO_REGION=<aws-region>`
- `COGNITO_USER_POOL_ID=<user-pool-id>`
- `COGNITO_APP_CLIENT_ID=<app-client-id>`
- `COGNITO_ADMIN_GROUP=admin`
- `COGNITO_VIEWER_GROUP=viewer`

## Next Steps: Task 3 Execution & Phase 3 Readiness

### Immediate
1. Task 3 is complete and verified in Cognito (`custom:tier` in ID and access tokens).
2. Keep Lambda source in repo as backup under `packages/backend/src/auth/cognito-pretoken-lambda/`.
3. Proceed with Phase 3 (Azure External ID migration track).

### Task 3 Execution Plan

Task 3 execution is complete.

Final validated configuration:
1. `admin` and `viewer` groups exist and are assigned to test users.
2. `custom:tier` exists in Cognito and is populated.
3. Pre Token Generation Lambda is attached and active.
4. Trigger event version is configured as `V3_0`.
5. `custom:tier` is present in both ID and access tokens.
6. App behavior is validated:
- `/api/viewer` returns 200 for viewer user
- `/api/admin` returns 403 for viewer user
- frontend summary cards display tier from token claim

### Task 3 Done Criteria
- `viewer` group exists and is assigned to at least one tested user.
- `custom:tier` exists and is populated for each test user used in migration validation.
- Pre Token Generation Lambda is attached and verified.
- Tokens for both admin and viewer users show the expected claims, including tier.
- Documentation reflects whether Task 3 remains optional or has been fully completed.

### Phase 3: Azure External ID (Parallel Track)
- Prepare for Cognito→Entra migration validation  
- Set up External ID tenant in Azure
- Register applications and expose API scopes
- Configure Azure social IdPs
- Build MSAL client app variant

Frontend (`packages/frontend/.env`):
- `VITE_API_URL=http://localhost:3000`
- `VITE_COGNITO_AUTHORITY=https://cognito-idp.<region>.amazonaws.com/<user-pool-id>`
- `VITE_COGNITO_APP_CLIENT_ID=<app-client-id>`
- `VITE_COGNITO_DOMAIN=https://<hosted-ui-domain>`
- `VITE_COGNITO_REDIRECT_URI=http://localhost:5173/callback`
- `VITE_COGNITO_SIGNOUT_URI=http://localhost:5173/`

## Phase 2 Plan (Next)

1. Configure Facebook social provider and test login.
2. Enable Facebook provider in Cognito managed login app client config.
3. Validate first-login Facebook user creation and group assignment flow.
4. Verify `/api/admin` authorization behavior for Facebook users.
5. Finalize social-provider operational runbook in docs.

## Validation Checklist

Completed:
- [x] Frontend/backend build succeeds
- [x] Callback route works for OIDC sign-in
- [x] Protected API calls include bearer token
- [x] Backend validates Cognito access tokens
- [x] Admin group authorization in backend
- [x] Viewer/admin read authorization route exists in backend and frontend
- [x] Google social sign-in end-to-end
- [x] Google user group-based authorization behavior validated
- [x] Business logic simulation returned by backend and shown in frontend

Pending:
- [ ] Phase 3 Azure External ID environment setup

## Out of Scope (Current Iteration)

- IaC automation (CDK/Terraform/CLI)
- Production hardening (MFA/WAF/CI-CD)
- Advanced token customization workflows
