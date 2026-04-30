# Plan: Cognito Social Auth Monorepo (Manual AWS Console)

## Version

- Version: 0.4.1
- Date: 2026-04-30
- Status: Phase 1 complete; Phase 2 in progress with Google provider validated

## TL;DR

The project has moved from an open local baseline to a working Cognito-protected implementation.

Current flow:
1. User signs in through Cognito Hosted UI.
2. Frontend handles callback at `/callback` and keeps OIDC session.
3. Frontend calls backend with Cognito access token.
4. Backend validates JWT via Cognito JWKS and issuer.
5. Backend authorizes admin endpoint with `cognito:groups`.

## Implementation Progress

| Workstream | Current State | Progress | Last Updated | Notes |
|---|---|---:|---|---|
| Phase 0 - Local app (no auth) | Done | 100% | 2026-04-30 | Baseline complete |
| Phase 1 - Cognito email/password | Done | 100% | 2026-04-30 | Hosted UI + callback + backend guards complete |
| Phase 2 - Social IdPs (Google/Facebook) | In progress | 50% | 2026-04-30 | Google complete, Facebook pending |
| Frontend (React/Vite) | Done for Phase 1 | 85% | 2026-04-30 | OIDC integration + component refactor complete |
| Backend (NestJS API) | Done for Phase 1 | 90% | 2026-04-30 | Access token verification + admin guard + dotenv loading complete |
| Testing and validation | Core checks done | 85% | 2026-04-30 | Google flow validated; Facebook scenarios pending |

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
5. Protected routes:
- `/api/health` public
- `/api/profile` authenticated
- `/api/admin` authenticated + admin group

## Required Environment Variables

Backend (`packages/backend/.env`):
- `NODE_ENV=development`
- `PORT=3000`
- `CORS_ORIGIN=http://localhost:5173`
- `COGNITO_REGION=<aws-region>`
- `COGNITO_USER_POOL_ID=<user-pool-id>`
- `COGNITO_APP_CLIENT_ID=<app-client-id>`
- `COGNITO_ADMIN_GROUP=admin`

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

Pending:
- [ ] End-to-end Facebook sign-in
- [ ] Facebook user role/group operational checklist

## Out of Scope (Current Iteration)

- IaC automation (CDK/Terraform/CLI)
- Production hardening (MFA/WAF/CI-CD)
- Advanced token customization workflows
