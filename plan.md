# Plan: Cognito Social Auth Monorepo (Manual AWS Console)

## Version

- Version: 0.5.0  
- Date: 2026-05-04
- Status: Task 1 complete; Task 2 complete (app client + PKCE + social IdPs); Resource server scopes documented; Phase 2 in progress (Google validated, Facebook in testing, unit tests added)

## TL;DR

The project has moved from an open local baseline to a working Cognito-protected implementation.

Current flow:
1. User signs in through Cognito Hosted UI.
2. Frontend handles callback at `/callback` and keeps OIDC session.
3. Frontend calls backend with Cognito access token.
4. Backend validates JWT via Cognito JWKS and issuer.
5. Backend authorizes admin endpoint with `cognito:groups`.

## AWS Setup Status

### Task 1: Cognito User Pool with Social Sign-In ✅ COMPLETE

| Requirement | Status | Notes |
|---|---|---|
| User Pool created | ✅ | `us-east-2_EZsrSxHBb` - test account |
| Email username alias | ✅ | Configured for sign-in |
| Password policy | ✅ | Standard Cognito policy applied |
| Google IdP | ✅ | OAuth client created, redirect URI configured, tested end-to-end |
| Facebook IdP | 🔄 | App created in Meta for Developers, redirect URI added, pending E2E test |
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
| Social IdPs assigned | ✅ | Google + Facebook (in progress) assigned to app client |

### Task 3: Groups, Custom Attributes, Lambda Trigger ✅ COMPLETE

| Requirement | Status | Details |
|---|---|---|
| `admin` group | ✅ | Enforced via `AdminGroupGuard` in backend |
| `viewer` group | ⏭️ | Not yet created (optional for Phase 2) |
| `custom:tier` attribute | ⏭️ | Not yet implemented (optional for Task 3) |
| Pre Token Generation Lambda | ⏭️ | Not yet created (optional for advanced scenarios) |
| Test users assigned to groups | 🔄 | Google user verified with groups; Facebook user pending |

## 5. Backend authorizes admin endpoint with `cognito:groups`.

## Implementation Progress

| Workstream | Current State | Progress | Last Updated | Notes |
|---|---|---:|---|---|
| Phase 0 - Local app (no auth) | Done | 100% | 2026-05-04 | Baseline complete |
| Phase 1 - Cognito email/password | Done | 100% | 2026-05-04 | Hosted UI + callback + backend guards complete |
| Phase 2 - Social IdPs (Google/Facebook) | In progress | 60% | 2026-05-04 | Google complete, Facebook redirect configuration already in progress |
| Frontend (React/Vite) | Done for Phase 1 | 90% | 2026-05-04 | OIDC integration + component refactor + structured API result rendering complete |
| Backend (NestJS API) | Done for Phase 1 | 95% | 2026-05-04 | Access token verification + admin guard + dotenv loading + business result simulation complete |
| Testing and validation | Core checks done | 90% | 2026-05-04 | Google flow validated; Facebook scenarios pending |

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
                └── admin-group.guard.ts
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
4. Added explicit `.env` loading in backend startup for reliable runtime config.
5. Added business logic simulation messages in controller responses for health, profile, and admin endpoints.
6. Protected routes:
- `/api/health` public
- `/api/profile` authenticated
- `/api/admin` authenticated + admin group

### UI response rendering

1. The UI preserves the full raw controller response for each protected endpoint.
2. The UI extracts and displays the controller `message` separately.
3. The UI extracts and displays `businessResult` separately so controller result and business result remain visible together.

## Required Environment Variables

Backend (`packages/backend/.env`):
- `NODE_ENV=development`
- `PORT=3000`
- `CORS_ORIGIN=http://localhost:5173`
- `COGNITO_REGION=<aws-region>`
- `COGNITO_USER_POOL_ID=<user-pool-id>`
- `COGNITO_APP_CLIENT_ID=<app-client-id>`
- `COGNITO_ADMIN_GROUP=admin`

## Next Steps: Task 3 & Phase 2 Completion

### Immediate (This Sprint)
1. **Facebook E2E Testing**: Validate Facebook social login flow with a real Facebook account
2. **Unit Tests**: ✅ Added 38 tests covering guards, token verification, and controller responses
3. **Documentation**: Update engineering-tasks-happy-path with Task 1/2 completion status

### Task 3: Groups, Custom Attributes, Lambda Trigger (Optional for MVP)
- **`viewer` group**: Create in Cognito and assign test users
- **`custom:tier` attribute**: Define custom user attribute string
- **Pre Token Generation Lambda**: Implement to inject `custom:tier` into tokens (for advanced scenarios)
- **Test users**: Create Facebook-linked user and assign to groups

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
- [x] Google social sign-in end-to-end
- [x] Google user group-based authorization behavior validated
- [x] Business logic simulation returned by backend and shown in frontend

Pending:
- [ ] End-to-end Facebook sign-in
- [ ] Facebook user role/group operational checklist

## Out of Scope (Current Iteration)

- IaC automation (CDK/Terraform/CLI)
- Production hardening (MFA/WAF/CI-CD)
- Advanced token customization workflows
