# Migration Plan: Cognito to Microsoft Entra External ID with MSAL

## Overview

Migrate the existing React + NestJS application from AWS Cognito authentication to Microsoft Entra External ID using MSAL. The app currently uses `react-oidc-context` (OIDC) on the frontend and `jose` JWKS validation on the backend.

**Entra External ID Tenant:** "Cognito Migration" (already created ✅)

---

## Current Architecture

| Layer | Technology | Auth mechanism |
|-------|-----------|----------------|
| Frontend | React 19 + Vite (port 5173) | `react-oidc-context` / `oidc-client-ts` with Cognito OIDC authority |
| Backend | NestJS (port 3000) | `jose` JWKS verification against Cognito issuer |
| Claims | `cognito:groups` (admin/viewer), `custom:tier` | Read from access token |
| Social IdPs | Google, Facebook | Configured in Cognito User Pool |

---

## Step 1: Gather Entra External ID Tenant Details ✅ COMPLETE

- [x] Create External ID tenant ("Cognito Migration") via Entra admin center
- [x] Record the following values from the tenant **Overview** page:

| Field | Value |
|-------|-------|
| **Tenant Name** | Cognito Migration |
| **Tenant ID** (Directory ID) | `0a3af0e3-416b-4a6b-97e9-cb3a9a094449` |
| **Tenant Subdomain** | `cognitomigration` |
| **Primary Domain** | `cognitomigration.onmicrosoft.com` |
| **License** | Microsoft Entra ID Free |

> Use these values in all subsequent steps for redirect URIs, MSAL configuration, and token validation.

**Reference:** https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-create-external-tenant-portal

---

## Step 2: Register the Frontend SPA Application ✅ COMPLETE

In the Entra admin center (switched to the "Cognito Migration" tenant):

1. Browse to **Entra ID > App registrations > New registration**
2. Name: `cognito-migration-spa` (or similar)
3. Supported account types: **Accounts in this organizational directory only**
4. Add a **Redirect URI** with platform **Single-page application (SPA)**:
   - `http://localhost:5173` (dev)
   - `http://localhost:5173/` (with trailing slash variant if needed)
   - (Production: add actual HTTPS redirect URI when deploying)
5. Record the **Application (client) ID**
6. Under **Authentication**, confirm:
   - Authorization code flow with PKCE is enabled (default for SPA platform)
   - No implicit flow needed
7. Under **API permissions > Grant admin consent** for the tenant (required for external tenants)

### Captured data (2026-05-06)

| Field | Value |
|-------|-------|
| **App registration name** | `cognito-migration-spa` |
| **Application (client) ID** | `6d28eafe-06fd-46d7-b04a-3403048bfd1c` |
| **Directory (tenant) ID** | `0a3af0e3-416b-4a6b-97e9-cb3a9a094449` |
| **Supported account types** | My organization only (single tenant: Cognito Migration) |
| **Redirect URI platform** | SPA |
| **Redirect URI (dev)** | `http://localhost:5173/` |
| **Redirect URI count** | 0 web, 1 spa, 0 public client |

### Remaining checks to complete Step 2

- [x] Add trailing-slash redirect URI variant: `http://localhost:5173/`
- [x] Confirm **Authentication** settings are aligned for SPA (PKCE flow, no implicit flow)
- [x] Grant admin consent in **API permissions** (current Microsoft Graph `User.Read` shows granted)

> Note: After Step 3 adds backend API scopes to this SPA, grant admin consent again for the new API permission entries.
> Optional compatibility: Add `http://localhost:5173` as an extra SPA redirect URI if your local app sends the callback URL without trailing slash.

### Authentication settings verification (2026-05-06)

- `Implicit grant and hybrid flows`:
   - Access tokens: Off
   - ID tokens: Off
- `Allow public client flows`: Disabled
- `Enable native authentication`: Disabled

**Reference:** https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app

---

## Step 3: Register the Backend API Application ✅ COMPLETE

1. Create a second app registration: `cognito-migration-api`
2. Under **Expose an API**:
   - Set the Application ID URI (e.g., `api://<api-client-id>`)
   - Add scopes matching current functionality:
     - `api://<api-client-id>/access_as_user` (or more granular: `read`, `write`)
3. Record the **API Application (client) ID** and **Application ID URI**
4. On the **SPA app registration** (Step 2), go to **API permissions**:
   - Add permission > My APIs > select the backend API app
   - Select the scopes declared above
   - Grant admin consent

### Captured data (2026-05-06)

| Field | Value |
|-------|-------|
| **App registration name** | `cognito-migration-api` |
| **Application (client) ID** | `6c959c17-63ba-4477-b66e-928d7d9ba937` |
| **Object ID** | `a6f13eaa-3ddb-42e1-bf1e-706b1fa0fb31` |
| **Directory (tenant) ID** | `0a3af0e3-416b-4a6b-97e9-cb3a9a094449` |
| **Supported account types** | My organization only (single tenant: Cognito Migration) |
| **State** | Activated |
| **Redirect URIs** | Not configured (expected for API app at this stage) |
| **Application ID URI** | `api://6c959c17-63ba-4477-b66e-928d7d9ba937` |
| **Scopes created** | `read`, `write` |
| **Scope consent model** | Admins only |

### Remaining actions to complete Step 3

- [x] Set **Application ID URI** in **Expose an API** (`api://6c959c17-63ba-4477-b66e-928d7d9ba937`)
- [x] Add delegated scopes `read` and `write` (granular scope model)
- [x] In SPA app permissions, add API delegated scopes `read` and `write`
- [x] Grant admin consent again for the newly added API scopes

### API permissions verification (2026-05-06)

- SPA app `cognito-migration-spa` has delegated permissions:
   - Read API data (`read`) -> Granted for Cognito Migration
   - Write API data (`write`) -> Granted for Cognito Migration
- Existing Microsoft Graph `User.Read` remains granted

---

## Step 4: Configure Social Identity Providers (Google & Facebook) ✅ COMPLETE

### 4a. Google ✅ COMPLETE

1. In Entra admin center: **External Identities > All identity providers > Google > Configure**
2. Enter the Google OAuth **Client ID** and **Client Secret** (same as used for Cognito)
3. In Google Cloud Console, add these **redirect URIs** to the existing OAuth client:
   - `https://login.microsoftonline.com`
   - `https://login.microsoftonline.com/te/0a3af0e3-416b-4a6b-97e9-cb3a9a094449/oauth2/authresp`
   - `https://login.microsoftonline.com/te/cognitomigration.onmicrosoft.com/oauth2/authresp`
   - `https://0a3af0e3-416b-4a6b-97e9-cb3a9a094449.ciamlogin.com/0a3af0e3-416b-4a6b-97e9-cb3a9a094449/federation/oidc/accounts.google.com`
   - `https://0a3af0e3-416b-4a6b-97e9-cb3a9a094449.ciamlogin.com/cognitomigration.onmicrosoft.com/federation/oidc/accounts.google.com`
   - `https://cognitomigration.ciamlogin.com/0a3af0e3-416b-4a6b-97e9-cb3a9a094449/federation/oauth2`
   - `https://cognitomigration.ciamlogin.com/cognitomigration.onmicrosoft.com/federation/oauth2`
4. Also add `ciamlogin.com` and `microsoftonline.com` as **Authorized domains** in Google OAuth consent screen

### Google verification notes (2026-05-06)

- Existing Google OAuth client reused from the Cognito setup
- Entra External ID redirect URIs added in Google Cloud Console
- Authorized domains verified in Google OAuth consent/branding:
   - `microsoftonline.com`
   - `ciamlogin.com`
- Existing Cognito domain kept during migration for parallel operation
- Google identity provider in Entra External ID: `Configured`

### 4b. Facebook

1. In Entra admin center: **External Identities > All identity providers > Facebook > Configure**
2. Enter the Facebook App **App ID** and **App Secret** (same as used for Cognito)
3. In Meta for Developers, add the Entra redirect URI to "Valid OAuth Redirect URIs":
   - `https://cognitomigration.ciamlogin.com/cognitomigration.onmicrosoft.com/federation/oauth2`

### Remaining actions to complete Step 4

- [x] Configure Google OAuth redirect URIs and authorized domains
- [x] Configure Google identity provider in Entra External ID using Client ID and Client Secret
- [x] Configure Facebook identity provider in Entra External ID
- [x] Confirm Facebook redirect URI is updated in Meta for Developers

### Entra provider status snapshot (2026-05-06)

- Microsoft Entra ID: Configured
- Email one-time passcode: Configured
- Microsoft: Configured
- Google: Configured
- Facebook: Configured
- Apple: Not configured

**Reference:** https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-google-federation-customers

---

## Step 5: Create a User Flow and Associate the App ✅ COMPLETE

1. In Entra admin center: **External Identities > User flows > New user flow**
2. Name: `SignUpSignIn` (or similar)
3. Identity providers:
   - Email Accounts: **Email with password** (for local accounts)
   - Social: **Google**, **Facebook** (will appear after Step 4 is done)
4. User attributes to collect: Email, Display Name (and any others needed)
5. Select **Create**
6. Open the user flow > **Applications** > Add the SPA app registration from Step 2

### Verification notes (2026-05-06)

- User flow created: `SignUpSignIn`
- Application attached to flow: `cognito-migration-spa`
- Identity providers selected in flow:
   - Email with password
   - Google
   - Facebook
- Required user attributes confirmed:
   - Email Address
   - Display Name
- User flow execution tested:
   - Google/Facebook options appear and launch
   - Facebook test account hit policy message: `Invalid consumer domain for social signup` (enterprise-domain social sign-up restriction, not a provider wiring issue)

### Notes for test execution

- For Facebook social sign-up validation, use a consumer-domain Facebook account (for example `gmail.com`, `outlook.com`) to avoid enterprise-domain restriction.

**Reference:** https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers

---

## Step 6: Configure App Roles (replaces Cognito groups) 🔄 IN PROGRESS

On the **SPA app registration**:

1. Go to **App roles > Create app role**:
   - Display name: `Admin`
   - Value: `admin`
   - Allowed member types: Users/Groups
2. Create another app role:
   - Display name: `Viewer`
   - Value: `viewer`
   - Allowed member types: Users/Groups
3. Assign test users to roles via **Enterprise applications > [app] > Users and groups > Add assignment**

### Status snapshot (2026-05-06)

- ✅ App roles created in `cognito-migration-spa`:
   - `admin`
   - `viewer`
- ✅ Enterprise app assignment flow verified (Users and groups)
- ⏳ Deferred until after user migration:
   - Ensure final test matrix has one `admin` user and one `viewer` user assigned

> **Why app roles over groups:** For External ID (CIAM) scenarios, app roles are simpler and appear directly in the `roles` claim of the token. No "groups overage" handling needed.

---

## Step 7: Create Custom Authentication Extension for `custom:tier` Claim

This replicates the Cognito Pre Token Generation Lambda:

1. **Create an Azure Function** (HTTP trigger, Node.js/TypeScript) that:
   - Receives the `OnTokenIssuanceStart` event from Entra
   - Looks up the user's tier value (from a store or extension attribute)
   - Returns the `custom:tier` claim in the response
2. **Register as Custom Authentication Extension** in Entra admin center:
   - Type: Token issuance start event
   - Target URL: the Azure Function endpoint
   - Configure authentication (Managed Identity or client credentials)
3. **Configure a Custom Claims Provider** on the app registration:
   - Map the external claim to the token
4. **Test:** Sign in and verify `custom:tier` appears in the issued token

**Alternative (simpler):** Use Entra **extension attributes** on user objects and map them via claims mapping policy (no Azure Function needed if the value is static per user).

**Reference:** https://learn.microsoft.com/en-us/entra/external-id/customers/concept-custom-extensions

---

## Step 8: Update Frontend — Replace `react-oidc-context` with MSAL

### 8a. Install MSAL packages

```bash
npm install @azure/msal-browser @azure/msal-react
npm uninstall react-oidc-context oidc-client-ts
```

### 8b. Create `authConfig.ts`

```typescript
import { Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: '<SPA_CLIENT_ID>', // Will be generated in Step 2
    authority: 'https://cognitomigration.ciamlogin.com/',
    redirectUri: 'http://localhost:5173',
    postLogoutRedirectUri: 'http://localhost:5173',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) console.error(message);
      },
    },
  },
};

export const loginRequest = {
  scopes: ['api://<API_CLIENT_ID>/access_as_user'], // Will be generated in Step 3
};
```

### 8c. Update `main.tsx`

- Replace `AuthProvider` from `react-oidc-context` with `MsalProvider` from `@azure/msal-react`
- Create `PublicClientApplication` instance outside the component tree

### 8d. Update `App.tsx`

| Cognito (`react-oidc-context`) | MSAL (`@azure/msal-react`) |
|-------------------------------|---------------------------|
| `useAuth()` | `useMsal()` + `useAccount()` |
| `authContext.signinRedirect()` | `instance.loginRedirect(loginRequest)` |
| `authContext.user?.access_token` | `instance.acquireTokenSilent(loginRequest)` |
| `authContext.removeUser()` + manual redirect | `instance.logoutRedirect()` |
| `authContext.user?.profile['cognito:groups']` | `account.idTokenClaims?.roles` |
| `authContext.user?.profile['custom:tier']` | `account.idTokenClaims?.['custom:tier']` |
| `authContext.isAuthenticated` | `useIsAuthenticated()` |

### 8e. Update environment variables

Replace Cognito `.env` vars:
```env
# OLD (remove)
VITE_COGNITO_AUTHORITY=...
VITE_COGNITO_APP_CLIENT_ID=...
VITE_COGNITO_REDIRECT_URI=...
VITE_COGNITO_SIGNOUT_URI=...
VITE_COGNITO_DOMAIN=...

# NEW
VITE_MSAL_CLIENT_ID=<SPA_CLIENT_ID>
VITE_MSAL_AUTHORITY=https://cognitomigration.ciamlogin.com/
VITE_MSAL_REDIRECT_URI=http://localhost:5173
VITE_API_SCOPE=api://<API_CLIENT_ID>/access_as_user
```

---

## Step 9: Update Backend — Validate Entra Tokens

### 9a. Update Token Verifier Service

Replace `CognitoTokenVerifierService` with `EntraTokenVerifierService`:

| Cognito concept | Entra equivalent |
|-----------------|------------------|
| Issuer: `https://cognito-idp.<region>.amazonaws.com/<pool-id>` | Issuer: `https://<tenant-subdomain>.ciamlogin.com/<tenant-id>/v2.0` |
| JWKS URL: `<issuer>/.well-known/jwks.json` | JWKS URL: `https://<tenant-subdomain>.ciamlogin.com/<tenant-id>/discovery/v2.0/keys` |
| `token_use: 'access'` validation | Not needed (use `aud` validation instead) |
| `client_id` claim | `azp` claim (authorized party) |
| `cognito:groups` | `roles` (from app roles) |
| `sub` (Cognito user ID) | `oid` (Entra object ID) — preferred stable identifier |
| `scope` | `scp` |
| `custom:tier` | `custom:tier` (from custom claims provider) |

### 9b. Update Guards

- `AdminGroupGuard`: read `roles` array from token, check for `'admin'`
- `ViewerGroupGuard`: read `roles` array from token, check for `'viewer'` or `'admin'`

### 9c. Update environment variables

```env
# OLD (remove)
COGNITO_REGION=...
COGNITO_USER_POOL_ID=...
COGNITO_APP_CLIENT_ID=...

# NEW
ENTRA_TENANT_ID=0a3af0e3-416b-4a6b-97e9-cb3a9a094449
ENTRA_TENANT_SUBDOMAIN=cognitomigration
ENTRA_API_CLIENT_ID=<api-client-id>
```

---

## Step 10: Test the Migrated App End-to-End

1. **Sign in with Google** — User is redirected to Entra External ID, can choose Google, token issued with correct claims
2. **Sign in with Facebook** — Same flow via Facebook
3. **Check roles claim** — Admin user gets `roles: ['admin']`, viewer gets `roles: ['viewer']`
4. **Check custom:tier claim** — Appears in token via custom authentication extension
5. **Call `/api/profile`** — Backend validates Entra token, returns decoded claims
6. **Call `/api/viewer`** — Viewer role check passes
7. **Call `/api/admin`** — Admin role check passes (viewer user is rejected)
8. **Token refresh** — MSAL silently refreshes the token (no page reload needed)
9. **Sign out** — `logoutRedirect` clears session and returns to app

---

## Step 11: (Optional) User Migration — Import Cognito Users to Entra

If existing Cognito users need to be migrated (not new signups):

1. Export users from Cognito via AWS CLI (`list-users`, `admin-get-user`)
2. For each social user, create in Entra via Microsoft Graph API with federated identity linking
3. Set extension attributes (`custom:tier`)
4. Assign app roles

---

## Dependencies & Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Authorization model | App roles (not groups) | Simpler for CIAM, no overage, appears in `roles` claim |
| Frontend auth library | `@azure/msal-react` + `@azure/msal-browser` | Official Microsoft library for SPAs |
| Backend token validation | `jose` library (keep) | Same library, just different issuer/JWKS URL |
| Custom claims (`custom:tier`) | Custom authentication extension (Azure Function) OR extension attributes | Depends on whether tier is dynamic or static |
| User identifier | `oid` (object ID) | Stable, unique, recommended over `sub` for Entra |

---

## Key Microsoft Docs References

| Topic | URL |
|-------|-----|
| Create External ID tenant | https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-create-external-tenant-portal |
| Register app | https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app |
| Add Google IdP | https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-google-federation-customers |
| Add Facebook IdP | https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-facebook-federation-customers |
| Create user flow | https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers |
| Custom auth extensions | https://learn.microsoft.com/en-us/entra/external-id/customers/concept-custom-extensions |
| MSAL React tutorial | https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-single-page-app-react-sign-in-prepare-tenant |
| Token claims reference | https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference |
| App roles | https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps |

---

## Execution Order

```
Step 1  ✅ COMPLETE (Tenant details gathered)
Step 2  → Register SPA app
Step 3  → Register API app + expose scopes
Step 4  → Configure Google & Facebook IdPs
Step 5  → Create user flow + associate app
Step 6  → Create app roles + assign test users
Step 7  → Custom claims extension (can be deferred)
Step 8  → Frontend code changes (MSAL)
Step 9  → Backend code changes (Entra token validation)
Step 10 → End-to-end testing
Step 11 → (Optional) User migration
```
