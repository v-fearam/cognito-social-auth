# Cognito Social Auth Monorepo

A monorepo project to test AWS Cognito authentication with social identity providers (Google, Facebook) and email/password sign-in. This is a three-phase implementation starting with a local baseline app (Phase 0), then adding Cognito authentication (Phase 1), and finally social sign-in (Phase 2).

## Project Intent

Build a realistic, working example of:
1. **Phase 0**: A full-stack app (React frontend + NestJS backend) with open endpoints, running locally with no authentication.
2. **Phase 1**: Add AWS Cognito User Pool with email/password sign-up/sign-in, JWT token validation on the backend, and role-based access control (admin/viewer groups).
3. **Phase 2**: Add Google and Facebook social identity providers to the Cognito setup, allowing users to sign in via these platforms.

The app demonstrates user info display (email, sub, groups, custom attributes), API authorization based on Cognito groups, and token-based backend validation using JWKS.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Monorepo** | npm workspaces | Built-in |
| **Frontend** | React 19 + Vite 8 + TypeScript | Latest stable |
| **Backend** | NestJS 11 + Passport JWT | Latest stable |
| **Auth (Phase 1+)** | AWS Cognito User Pool + Amplify Auth SDK | - |
| **Infrastructure (Phase 1+)** | AWS CDK v2 (TypeScript) | Latest stable |
| **Node Runtime** | Node.js 20 LTS | 20+ |

## Prerequisites

- **Node.js 20 LTS** (check [.nvmrc](.nvmrc) or install via nvm)
- **npm 10+** (comes with Node 20)
- **AWS Account** (for Phase 1+; Phase 0 requires no AWS resources)
- **Git**

## Project Structure

```
cognito-social-auth/
├── plan.md                          # Detailed implementation plan
├── README.md                        # This file
├── package.json                     # Root monorepo config
├── tsconfig.base.json               # Shared TypeScript config
├── .nvmrc                           # Node version lock
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore rules
└── packages/
    ├── backend/                     # NestJS API (port 3000)
    │   ├── src/
    │   │   ├── main.ts              # App bootstrap
    │   │   ├── app.controller.ts    # API endpoints
    │   │   ├── app.module.ts        # Module config
    │   │   └── auth/                # (Phase 1) Auth guards & strategies
    │   ├── dist/                    # Compiled output
    │   └── package.json
    ├── frontend/                    # React + Vite (port 5173)
    │   ├── src/
    │   │   ├── main.tsx             # React entry
    │   │   ├── App.tsx              # Router + layout
    │   │   ├── pages/               # Home, Profile, Admin pages
    │   │   ├── services/            # API client
    │   │   └── App.css              # Styles
    │   ├── dist/                    # Build output
    │   └── package.json
    └── infra/                       # (Phase 1) AWS CDK stack
        ├── lib/
        │   └── cognito-auth-stack.ts  # User Pool, App Client, Lambda
        ├── lambda/
        │   └── pre-token-generation.ts # Token customization
        └── package.json
```

## Environment Variables

All secrets and configuration go in `.env` files (one per package). See [.env.example](.env.example) for the template.

### Phase 0 (Local, no AWS)

**Root `.env` (optional for Phase 0):**
```bash
API_URL=http://localhost:3000
```

**Backend `.env` (packages/backend/.env):**
```bash
NODE_ENV=development
PORT=3000
```

**Frontend `.env` (packages/frontend/.env):**
```bash
VITE_API_URL=http://localhost:3000
```

### Phase 1 (Cognito User Pool)

After CDK deployment, update `.env` files with outputs:

**Backend `.env`:**
```bash
NODE_ENV=development
PORT=3000
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx    # From CDK output
COGNITO_REGION=us-east-1                    # AWS region
```

**Frontend `.env`:**
```bash
VITE_API_URL=http://localhost:3000
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx   # From CDK output
VITE_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxx        # From CDK output
VITE_COGNITO_REGION=us-east-1                   # AWS region
```

### Phase 2 (Social Identity Providers)

**Backend `.env` (no additional secrets needed for Phase 2 backend):**
```bash
# Same as Phase 1
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_REGION=us-east-1
```

**Frontend `.env`:**
```bash
# Same as Phase 1, Amplify handles OAuth automatically
VITE_API_URL=http://localhost:3000
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxx
VITE_COGNITO_REGION=us-east-1
```

**CDK Context (packages/infra/cdk.context.json or CLI):**
```json
{
  "googleClientId": "xxx.apps.googleusercontent.com",
  "googleClientSecret": "xxx",
  "facebookAppId": "xxx",
  "facebookAppSecret": "xxx"
}
```

Or pass via AWS CLI:
```bash
cdk deploy -c googleClientId=xxx -c googleClientSecret=xxx ...
```

## How to Execute

### Phase 0: Local App (No Auth)

**1. Install dependencies:**
```bash
npm install
```

**2. Start the backend:**
```bash
npm run dev:backend
# Backend runs on http://localhost:3000
# Routes: GET /api/health, /api/profile, /api/admin
```

**3. In another terminal, start the frontend:**
```bash
npm run dev:frontend
# Frontend runs on http://localhost:5173
# Navigate to http://localhost:5173 in your browser
```

**4. Click buttons to test endpoints:**
- "View Profile Endpoint" → calls GET /api/profile
- "View Admin Endpoint" → calls GET /api/admin

**5. Build both apps:**
```bash
npm run build
# Outputs: packages/backend/dist and packages/frontend/dist
```

### Phase 1: Add Cognito User Pool (Coming Next)

```bash
# 1. Bootstrap CDK (first time only in your account/region)
cd packages/infra
npx cdk bootstrap

# 2. Deploy Cognito infrastructure
npx cdk deploy

# 3. Note the CDK outputs and update .env files:
#    - COGNITO_USER_POOL_ID
#    - COGNITO_APP_CLIENT_ID
#    - COGNITO_REGION

# 4. Create test users via AWS CLI (after deployment)
aws cognito-idp admin-create-user \
  --user-pool-id <pool-id> \
  --username admin@test.com \
  --user-attributes Name=email,Value=admin@test.com

# 5. Restart backend and frontend with updated .env files
npm run dev:backend
npm run dev:frontend

# 6. Sign up/sign in and test protected endpoints
```

### Phase 2: Add Google & Facebook (Coming Later)

```bash
# 1. Create Google OAuth 2.0 credentials in Google Cloud Console
# 2. Create Facebook OAuth credentials in Facebook Developers
# 3. Update CDK stack with OAuth provider configs
# 4. Deploy CDK again:
cd packages/infra
npx cdk deploy

# 5. Restart frontend to see social sign-in buttons
```

## Troubleshooting

### Backend won't start
- Ensure port 3000 is not in use: `netstat -ano | findstr :3000`
- Check Node version: `node -v` (should be 20+)
- Rebuild: `cd packages/backend && npm run build`

### Frontend build fails
- Clear cache: `rm -rf packages/frontend/dist packages/frontend/node_modules/.vite`
- Reinstall: `npm install -w @csa/frontend`

### Backend endpoints return 404
- Ensure NestJS has started (watch for "[NestFactory] Starting Nest application..." in logs)
- Check port 3000 is correct in frontend `.env` (VITE_API_URL)

### CORS errors in browser
- Backend CORS is set to allow `http://localhost:5173`
- If you changed frontend port, update [packages/backend/src/main.ts](packages/backend/src/main.ts)

## Available Commands

### From root:
```bash
npm run dev:backend        # Start backend in watch mode
npm run dev:frontend       # Start frontend dev server
npm run build              # Build both packages
npm install                # Install all workspace dependencies
```

### Backend only (cd packages/backend):
```bash
npm run start:dev          # Watch mode
npm run start              # Production
npm run build              # Compile
npm run test               # Run tests
```

### Frontend only (cd packages/frontend):
```bash
npm run dev                # Dev server
npm run build              # Build for production
npm run preview            # Preview production build
```

## Documentation

- **[plan.md](plan.md)** — Full three-phase implementation plan with step-by-step details
- **Phase 0 verification checklist** in [plan.md](plan.md#verification-checklist)

## Next Steps

1. ✅ **Phase 0**: Local app running locally with open endpoints
2. 🔄 **Phase 1**: Deploy Cognito User Pool, add JWT validation and role-based guards
3. 📋 **Phase 2**: Add Google & Facebook social sign-in

See [plan.md](plan.md) for the complete roadmap.

## License

MIT
