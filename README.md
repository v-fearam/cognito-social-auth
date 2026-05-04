# Cognito Social Auth Monorepo

Monorepo for testing AWS Cognito authentication and authorization with a React frontend and NestJS backend.

## Current Status

- Phase 0 (local baseline): complete
- Phase 1 (Cognito Hosted UI + protected APIs): complete
- Phase 2 (social providers: Google/Facebook): in progress

What is implemented now:
1. Frontend login/logout with Cognito Hosted UI (OIDC Authorization Code + PKCE).
2. Frontend callback handling at `/callback`.
3. Frontend sends bearer access token to protected backend endpoints.
4. Backend validates Cognito access tokens using Cognito JWKS.
5. Backend enforces group-based authorization (`admin`) on `/api/admin`.
6. Backend startup explicitly loads `packages/backend/.env`.
7. Google social provider login is working end-to-end.
8. UI refactored into reusable React components with consistent naming.
9. Backend controllers now return a business logic simulation message in addition to the technical response payload.
10. Frontend preserves the raw controller payload and also displays controller message plus business logic simulation separately.

## Target Authentication Flow

1. User opens the web app.
2. Frontend redirects to Cognito managed login.
3. Cognito authenticates user (local user now; social in Phase 2).
4. Cognito redirects to `/callback` and tokens are established in the app session.
5. Frontend calls backend with `Authorization: Bearer <access_token>`.
6. Backend validates signature and claims with Cognito JWKS.
7. Backend authorizes by `cognito:groups` for admin-only routes.

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | npm workspaces |
| Frontend | React 19, Vite 8, TypeScript, `react-oidc-context` |
| Backend | NestJS 11, TypeScript, `jose` |
| Auth | AWS Cognito User Pool + Hosted UI |
| Runtime | Node.js 20 |

## Project Structure

```text
cognito-social-auth/
├── plan.md
├── README.md
├── package.json
├── tsconfig.base.json
└── packages/
    ├── backend/
    │   ├── src/
    │   │   ├── app.controller.ts
    │   │   ├── app.module.ts
    │   │   ├── main.ts
    │   │   └── auth/
    │   │       ├── admin-group.guard.ts
    │   │       ├── cognito-auth.guard.ts
    │   │       └── cognito-token-verifier.service.ts
    │   ├── .env.example
    │   └── package.json
    └── frontend/
        ├── src/
        │   ├── App.tsx
        │   ├── main.tsx
        │   └── components/
        │       ├── ApiActionsPanel.tsx
        │       ├── ApiResultsPanel.tsx
        │       ├── AuthPanels.tsx
        │       ├── DashboardHeader.tsx
        │       └── SummaryCards.tsx
        ├── .env.example
        └── package.json
```

## Prerequisites

- Node.js 20+
- npm 10+
- AWS account
- Cognito user pool and app client configured for localhost callback/signout

## Environment Variables

Backend file: `packages/backend/.env`

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
COGNITO_REGION=<aws-region>
COGNITO_USER_POOL_ID=<user-pool-id>
COGNITO_APP_CLIENT_ID=<app-client-id>
COGNITO_ADMIN_GROUP=admin
```

Frontend file: `packages/frontend/.env`

```env
VITE_API_URL=http://localhost:3000
VITE_COGNITO_AUTHORITY=https://cognito-idp.<region>.amazonaws.com/<user-pool-id>
VITE_COGNITO_APP_CLIENT_ID=<app-client-id>
VITE_COGNITO_DOMAIN=https://<hosted-ui-domain>
VITE_COGNITO_REDIRECT_URI=http://localhost:5173/callback
VITE_COGNITO_SIGNOUT_URI=http://localhost:5173/
```

## Local Run

From repository root:

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

Open:
- Frontend: http://localhost:5173
- Backend health: http://localhost:3000/api/health

## API Authorization

- `GET /api/health`: public
- `GET /api/profile`: requires valid Cognito access token
- `GET /api/admin`: requires valid Cognito access token + `admin` group

## Verification Checklist

Implemented and validated:
- [x] Hosted UI login roundtrip with callback
- [x] Sign out using Cognito logout endpoint
- [x] Access token sent to backend protected endpoints
- [x] Backend token signature and issuer validation via JWKS
- [x] Admin group guard on `/api/admin`
- [x] Business logic simulation included in controller responses and shown in the UI
- [x] Frontend and backend build succeed

Pending (Phase 2):
- [x] Google login end-to-end
- [ ] Facebook login end-to-end
- [x] Social user group assignment workflow validated for Google users

## Scope

In scope:
- Manual Cognito setup in AWS Console
- Frontend Hosted UI auth flow
- Backend token validation + group authorization

Out of scope for now:
- CDK/Terraform/CLI automation
- Production hardening and deployment pipeline
