# Cognito Social Auth Monorepo

Monorepo project for testing AWS Cognito authentication with local users and social identity providers (Google and Facebook), using a React frontend and NestJS backend.

## Current Status

- Phase 0: complete
- Phase 1: pending
- Phase 2: pending

Phase 0 already runs locally with open endpoints and no authentication.

## Target Authentication Flow

1. User opens the web app.
2. Amplify Auth redirects to Cognito Hosted UI.
3. Cognito signs in the user directly, or hands off to Google/Facebook.
4. Cognito redirects back to the app and tokens are issued.
5. The app calls backend APIs with Cognito access token.
6. Backend validates token signature and claims with Cognito JWKS endpoint.
7. Backend authorizes access using cognito:groups (admin/viewer).

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | npm workspaces |
| Frontend | React 19, Vite 8, TypeScript |
| Backend | NestJS 11, TypeScript |
| Auth | AWS Cognito User Pool, Amplify Auth |
| Token Validation | passport-jwt, jwks-rsa |
| Runtime | Node.js 20 |

## Project Structure

```text
cognito-social-auth/
├── plan.md
├── README.md
├── package.json
├── tsconfig.base.json
├── .env.example
└── packages/
    ├── backend/
    │   ├── src/
    │   │   ├── main.ts
    │   │   ├── app.controller.ts
    │   │   └── app.module.ts
    │   └── package.json
    ├── frontend/
    │   ├── src/
    │   │   ├── main.tsx
    │   │   ├── App.tsx
    │   │   ├── pages/
    │   │   └── services/
    │   └── package.json
    └── infra/
        └── (not used in current manual-only plan)
```

## Prerequisites

- Node.js 20+
- npm 10+
- AWS account
- Google developer account (for Phase 2)
- Facebook developer account (for Phase 2)

## Local Run (Phase 0)

1. Install dependencies:

```bash
npm install
```

2. Start backend:

```bash
npm run dev:backend
```

3. Start frontend in another terminal:

```bash
npm run dev:frontend
```

4. Open the app:

- http://localhost:5173

5. Verify API endpoints:

- http://localhost:3000/api/health
- http://localhost:3000/api/profile
- http://localhost:3000/api/admin

## Manual AWS Setup (Phase 1)

All AWS resources in this project are created manually in AWS Console. No CDK. No AWS CLI.

### 1) Create Cognito User Pool

AWS Console path:
- AWS Console -> Amazon Cognito -> User pools -> Create user pool

Recommended settings:
- Sign-in option: Email
- Self sign-up: enabled
- Email verification: code
- Password policy: minimum 8 with complexity
- MFA: off for local testing

Save these values:
- COGNITO_REGION
- COGNITO_USER_POOL_ID

### 2) Create App Client (Public SPA)

AWS Console path:
- User pool -> App integration -> App clients -> Create app client

Recommended settings:
- Public client (no secret)
- OAuth flow: Authorization code grant with PKCE
- Callback URL: http://localhost:5173/callback
- Sign-out URL: http://localhost:5173/
- Scopes: openid, email, profile

Save this value:
- VITE_COGNITO_APP_CLIENT_ID

### 3) Configure Hosted UI Domain

AWS Console path:
- User pool -> App integration -> Domain

Set a prefix like:
- csa-dev-<unique-suffix>

Save this value:
- VITE_COGNITO_DOMAIN (host only, without https)

### 4) Create Groups

AWS Console path:
- User pool -> User management -> Groups

Create:
- admin
- viewer

### 5) Create Test Users

AWS Console path:
- User pool -> User management -> Users -> Create user

Create and assign:
- localadmin@test.com -> admin
- localviewer@test.com -> viewer

## Manual Social Setup (Phase 2)

### 1) Create Google OAuth App

Google Cloud Console path:
- APIs & Services -> Credentials -> Create OAuth client (Web application)

Redirect URI:
- https://<cognito-domain>/oauth2/idpresponse

Save:
- Google Client ID
- Google Client Secret

### 2) Create Facebook App

Facebook Developers path:
- My Apps -> Create App -> Add Facebook Login

Redirect URI:
- https://<cognito-domain>/oauth2/idpresponse

Save:
- Facebook App ID
- Facebook App Secret

### 3) Add Social Providers in Cognito

AWS Console path:
- User pool -> Sign-in experience -> Social and external providers

Configure:
- Google (client id/secret)
- Facebook (app id/secret)
- Attribute mapping: email and username/name

### 4) Enable Providers for App Client

AWS Console path:
- User pool -> App integration -> Managed login / Hosted UI settings

Enable providers:
- Cognito User Pool
- Google
- Facebook

### 5) Assign Group to Social Users

After first social login auto-creates users:
- User pool -> Users
- Assign admin or viewer group manually

## Environment Variables

Backend file: packages/backend/.env

```env
NODE_ENV=development
PORT=3000
COGNITO_REGION=<aws-region>
COGNITO_USER_POOL_ID=<user-pool-id>
```

Frontend file: packages/frontend/.env

```env
VITE_API_URL=http://localhost:3000
VITE_COGNITO_REGION=<aws-region>
VITE_COGNITO_USER_POOL_ID=<user-pool-id>
VITE_COGNITO_APP_CLIENT_ID=<app-client-id>
VITE_COGNITO_DOMAIN=<hosted-ui-domain-without-https>
```

## API Authorization Expectations

- /api/health: public
- /api/profile: requires valid Cognito access token
- /api/admin: requires valid token and admin group

Backend must:
- validate JWT using Cognito JWKS
- validate issuer and token type
- enforce authorization with cognito:groups

## Verification Checklist

Phase 0:
- App runs locally
- health/profile/admin endpoints respond

Phase 1:
- Hosted UI login works
- App receives tokens after callback
- Profile endpoint works with token
- Admin endpoint returns:
  - 200 for admin
  - 403 for viewer

Phase 2:
- Google login works end-to-end
- Facebook login works end-to-end
- Social users obey same group authorization rules

## Commands

From repository root:

```bash
npm install
npm run dev:backend
npm run dev:frontend
npm run build
```

## Scope

In scope:
- Manual Cognito setup in AWS Console
- Manual Google/Facebook provider setup
- Frontend Hosted UI auth flow
- Backend token validation via JWKS
- Group-based authorization

Out of scope:
- CDK/Terraform/CLI automation
- Production hardening and deployment pipeline
