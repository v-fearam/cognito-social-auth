# Engineering tasks: Cognito to Entra External ID happy path validation

## Current repo status (2026-05-04)

This document is broader than the current repository scope. The current repo status is:

- Local Cognito login with Hosted UI: completed ✅
- Google social login with Cognito: completed and validated ✅
- Facebook social login: completed and validated ✅
- Backend JWT validation with Cognito JWKS: completed ✅
- Group-based authorization on `/api/admin`: completed ✅
- Viewer-capable authorization on `/api/viewer`: completed in repo ✅
- `custom:tier` claim support in backend/frontend: completed in repo ✅
- Business logic simulation in controller responses and UI rendering: completed ✅
- Unit tests for authentication guards and token verification: completed (47 tests) ✅
- Task 1 (Create Cognito User Pool): ✅ COMPLETE  
- Task 2 (Configure Cognito app client & resource server): ✅ COMPLETE

**AWS source environment (Tasks 1-3) is complete and production-ready.** Ready for Phase 3 Azure migration setup.

Engineer sets up both an AWS Cognito source environment and an Azure External ID target environment, then runs through the migration described in the article to validate every step works as documented.

## Source environment (AWS)

### Task 1: Create Cognito User Pool with social sign-in ✅

Set up a Cognito User Pool that matches the article's example scenario: a consumer app with social sign-in and API access.

- ✅ Create a User Pool in a test AWS account
- ✅ Configure sign-in with email as the username alias
- ✅ Set a password policy
- ✅ Register Google as a social identity provider (create OAuth client in Google Cloud Console)
- ✅ Verify social sign-in works in the Cognito Hosted UI
- ✅ Register Facebook as a social identity provider (create app in Meta for Developers)
- ✅ Verify Facebook social sign-in works in the Cognito Hosted UI

(Optional)
- ⏭️ Optionally register Apple Sign-In (requires Apple Developer account, Services ID, domain verification)


### Task 2: Configure Cognito app client and resource server ✅

- ✅ Create an app client with authorization code grant + PKCE enabled
- ✅ Set callback URLs and sign-out URLs
- ✅ Create a resource server with at least two custom scopes (e.g., `read` and `write`) - Using standard `openid email phone` scopes
- ✅ Assign the social identity providers to the app client (Google and Facebook both complete and tested end-to-end)

### Task 3: Create groups, custom attributes, and a Lambda trigger (OPTIONAL) ✅ COMPLETE

**Status: ✅ Complete. All components implemented, deployed, and tested.**

- ✅ Create at least two groups: `admin` and `viewer` (both exist in Cognito and are in use)
- ✅ Define a custom attribute: `custom:tier` (created in Cognito, populated on test users)
- ✅ Create a Pre Token Generation Lambda trigger that adds a custom claim (deployed to AWS, attached to user pool, verified working)
- ✅ Assign a test user to the `admin` group and a test user to the `viewer` group
- ✅ Lambda source code backed up in repo: [packages/backend/src/auth/cognito-pretoken-lambda/index.mjs](../../packages/backend/src/auth/cognito-pretoken-lambda/index.mjs)
- ✅ Deployment guide available: [packages/backend/src/auth/cognito-pretoken-lambda/DEPLOYMENT.md](../../packages/backend/src/auth/cognito-pretoken-lambda/DEPLOYMENT.md)

### Task 4: Build the sample web app ✅

**Status: ✅ COMPLETE (using react-oidc-context instead of Amplify Auth)**

- ✅ Build a minimal web app (React or plain JS) that uses OIDC auth with Cognito (Vite + React 19)
- ✅ Sign in, display the ID token claims and summary cards, and call backend API with access token
- ✅ Add a dedicated `/api/viewer` action for read-only group validation
- ✅ Surface the optional `custom:tier` claim in the UI when Cognito provides it
- ✅ Deploy to localhost:5173 for validation

### Task 5: Build the backend API ✅

**Status: ✅ COMPLETE (NestJS on localhost:3000)**

- ✅ Create an API (NestJS with TypeScript) that:
  - ✅ Accepts Cognito access token in `Authorization: Bearer <token>` header
  - ✅ Validates token against Cognito JWKS endpoint (using `jose` library)
  - ✅ Reads `cognito:groups` to authorize requests via `AdminGroupGuard` and `ViewerGroupGuard`
  - ✅ Returns decoded claims and tier information in responses for debugging
- ✅ Deploy locally on localhost:3000

### Task 6: Prepare test users ✅ COMPLETE

**Status: ✅ All social users complete with groups and custom tier attributes.**

- ✅ Create at least 2 tested users:
  1. ✅ User linked to Google (social sign-in) - created, tested, assigned to `admin` group
  2. ✅ User linked to Facebook (social sign-in) - created, tested, assigned to `viewer` group
- ✅ Local user with email + password: optional, not required for happy path
- ✅ Assign users to groups: `admin` and `viewer` - verified in Cognito
- ✅ Set `custom:tier` attribute on each user in Cognito - deployed and populated
- ✅ Confirmed tokens and Lambda trigger run with real Cognito-issued claims - tested with jwt.io

## Target environment (Azure)

### Task 7: Create External ID tenant ✅ COMPLETE

**Progress snapshot (2026-05-06):**

- ✅ External ID tenant created: **Cognito Migration**
- ✅ Tenant ID: `0a3af0e3-416b-4a6b-97e9-cb3a9a094449`
- ✅ Subdomain: `cognitomigration`
- ✅ Primary domain: `cognitomigration.onmicrosoft.com`
- ✅ CIAM authority: `https://cognitomigration.ciamlogin.com/cognitomigration.onmicrosoft.com`

### Task 8: Register applications and expose API ✅ COMPLETE

**Progress snapshot (2026-05-06):**

- ✅ Client app registration created in External ID tenant
- ✅ App name: `cognito-migration-spa`
- ✅ Supported account type: Single tenant only - Cognito Migration
- ✅ SPA redirect URI configured: `http://localhost:5173/`
- ✅ Application (client) ID captured: `6d28eafe-06fd-46d7-b04a-3403048bfd1c`
- ✅ Directory (tenant) ID confirmed: `0a3af0e3-416b-4a6b-97e9-cb3a9a094449`
- ✅ Admin consent granted for current default permission (`Microsoft Graph > User.Read`)
- ✅ Authentication settings verified for SPA: implicit/hybrid token toggles OFF
- ℹ️ Optional compatibility: add redirect URI `http://localhost:5173` if callback matching requires non-trailing-slash variant
- ✅ Backend API app registration created: `cognito-migration-api`
- ✅ Backend API Application (client) ID captured: `6c959c17-63ba-4477-b66e-928d7d9ba937`
- ✅ Backend API Object ID captured: `a6f13eaa-3ddb-42e1-bf1e-706b1fa0fb31`
- ✅ Application ID URI set in Expose an API: `api://6c959c17-63ba-4477-b66e-928d7d9ba937`
- ✅ API scopes created: `read`, `write` (Admins only)
- ✅ SPA delegated API permissions added: `read`, `write`
- ✅ Admin consent granted for new API scopes (`Read API data`, `Write API data`)

- Register the client app (web app) with redirect URI matching the sample app
- Enable authorization code flow with PKCE
- Register the backend API as a separate app registration
- In "Expose an API," set the Application ID URI and declare scopes matching the Cognito resource server (`read`, `write`)
- In the client app, add the API scopes under "API permissions"
- Grant admin consent

### Task 9: Configure social identity providers in External ID ✅ COMPLETE

**Progress snapshot (2026-05-06):**

- ✅ Google OAuth client updated with required Entra External ID redirect URIs
- ✅ Google OAuth authorized domains verified: `microsoftonline.com`, `ciamlogin.com`
- ✅ Existing Cognito Google configuration preserved during migration
- ✅ Google identity provider configured in Entra External ID
- ✅ Facebook identity provider configured in Entra External ID
- ✅ Facebook redirect URI updated in Meta with Entra URI (Cognito URI preserved)
- ✅ User flow created: `SignUpSignIn`
- ✅ User flow applications includes: `cognito-migration-spa`
- ✅ User flow identity providers selected: Email with password, Google, Facebook
- ✅ User attributes verified: Email Address + Display Name
- ✅ User flow run executed; Google/Facebook options displayed and launched
- ℹ️ Facebook social sign-up with enterprise-domain account returns expected policy block: `Invalid consumer domain for social signup`

**Next active task:** Task 10 (app roles `admin` and `viewer`).

- Add Google as a social identity provider using the same OAuth client from Task 1 (add the External ID redirect URI in Google Cloud Console)
- Add Facebook using the same app from Task 1 (add the External ID redirect URI in Meta for Developers)
- Optionally add Apple
- Create a sign-up/sign-in user flow and add the social providers as sign-in options
- Associate the client app with the user flow
- Test: sign in with Google/Facebook through the External ID user flow, confirm a user is created

### Task 10: Set up groups or app roles ✅ COMPLETE

**Progress snapshot (2026-05-07):**

- ✅ Security groups created in Entra: `admin`, `viewer`
- ✅ App roles (`admin`, `viewer`) created on **both** app registrations:
  - `cognito-migration-spa` → roles emitted in the **ID token** (audience = SPA)
  - `cognito-migration-api` → roles emitted in the **access token** (audience = API)
- ✅ Enterprise app role-to-group mapping configured:
  - Enterprise app `cognito-migration-spa`: group `admin` → role `admin`, group `viewer` → role `viewer`
  - Enterprise app `cognito-migration-api`: group `admin` → role `admin`, group `viewer` → role `viewer`
- ✅ Test user "Fred" assigned to `viewer` group and verified in both tokens
- ✅ `/api/viewer` returns 200 with viewer role ✅
- ✅ `/api/admin` returns 200 with admin role ✅ (tested with admin-assigned user)
- ✅ Social login (Google/Facebook) tested with new user sign-up

**Approach chosen: App roles + Security groups (combined)**

Per [Microsoft Learn - App roles vs. groups](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps#app-roles-vs-groups) and [Usage scenario](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps#usage-scenario-of-app-roles):

- In an app-calling-API scenario with two app registrations, roles must be defined on **each** app registration to appear in the corresponding token (ID token for SPA, access token for API)
- Security groups provide centralized user management: add/remove a user from a group once, and they receive the correct roles in both tokens
- Each app registration has its own Enterprise App where groups are mapped to roles

### Task 11: Create custom authentication extension ✅ COMPLETE

**Progress snapshot (2026-05-08):**

- ✅ Custom authentication extension created using `OnTokenIssuanceStart` event
- ✅ Extension mimics Cognito Pre Token Generation Lambda: returns `custom:tier` as an extra claim
- ✅ Extension registered in **Enterprise applications → Custom authentication extensions**
- ✅ Azure Function deployed and validated with live HTTP response
- ✅ App-specific signing key configured on `cognito-migration-spa` service principal
- ✅ App-specific signing key configured on `cognito-migration-api` service principal for enriched access tokens
- ✅ Custom claims provider assigned and mapped in **Single sign-on → Attributes & Claims**
- ✅ `tier` claim confirmed injected in token flow
- ✅ Demo path validated without Step 5 function protection

**Latest validation update (2026-05-08):**

- ✅ Added structured diagnostics in function logs (payload summary + user context)
- ✅ Confirmed with live logs that `TokenIssuanceStart` payload currently contains only minimal user fields (`id`, `userPrincipalName`, etc.) and does not include role/group claims
- ✅ Confirmed dynamic role-based tier resolution is not reliable in current External ID callout payload
- ✅ Temporary operating decision: simplify function and hardcode `tier = "premium"` while keeping diagnostics enabled
- ⏭️ Deferred decision: long-term tier source (Graph lookup of custom attribute/app role vs. env mapping)

**External ID custom attribute note (2026-05-08):**

- ✅ Custom attribute `tier` created in **External Identities → Custom user attributes**
- ✅ Microsoft Learn guidance reviewed
- ⚠️ Standard per-user portal properties page does not expose these extension values for manual editing in this flow
- ✅ Supported paths: collect via user flow during sign-up or set programmatically via Microsoft Graph extension property naming convention

**Reproducible runbook:** See [tutorial-custom-tier-claim-entra-external-id.md](./tutorial-custom-tier-claim-entra-external-id.md) for the validated end-to-end procedure, including:
1. The Azure Function code for the `tier` claim
2. How to configure signing keys on both SPA and API service principals when needed
3. How to assign the custom claims provider and map the claim
4. The current portal behavior for `TokenIssuanceStart`
5. Demo vs production guidance for Azure Function protection

### Task 12: Deploy sample web app with MSAL ✅ COMPLETE

**Progress snapshot (2026-05-07):**

- ✅ Frontend migrated from `react-oidc-context` (Cognito) to `@azure/msal-react` (Entra)
- ✅ MSAL configuration: client ID, CIAM authority, redirect URI, API scopes
- ✅ `loginRedirect` replaces `Auth.federatedSignIn`
- ✅ `acquireTokenSilent` replaces `Auth.currentSession` (used for API calls with access token)
- ✅ `logoutRedirect` replaces `Auth.signOut`
- ✅ User "Fred" signs in successfully; profile, groups, tier, and session cards display correctly
- ✅ Social login (Google/Facebook) tested with new user sign-up
- ✅ Running on `localhost:5173`

### Task 13: Update backend API to validate Entra tokens ✅ COMPLETE

**Progress snapshot (2026-05-07):**

- ✅ Backend migrated from Cognito JWKS validation to Entra JWKS validation (using `jose` library)
- ✅ Token issuer validation supports CIAM issuer variants (`tenantId.ciamlogin.com` and `subdomain.ciamlogin.com`)
- ✅ JWKS URI derived dynamically from token issuer for consistency
- ✅ Audience validated against API client ID (`6c959c17-63ba-4477-b66e-928d7d9ba937`)
- ✅ Reads `roles` instead of `cognito:groups` for authorization
- ✅ Reads `oid` instead of `sub` as user identifier
- ✅ Reads `scp` instead of `scope`
- ✅ `AdminGroupGuard` and `ViewerGroupGuard` check `roles` claim from access token
- ✅ `/api/profile` returns 200 with decoded Entra claims
- ✅ `/api/viewer` returns 200 for users with `viewer` role
- ✅ `/api/admin` returns 200 for users with `admin` role
- ✅ Running on `localhost:3000`

## Migration (the actual test) ✅ COMPLETE

**Status: COMPLETE (Phase 3 validated on 2026-05-12)**

### Task 14: Export users from Cognito ✅ COMPLETE

- ✅ Exported users from Cognito user pool using AWS CLI
- ✅ Captured email, federated identity links, custom attributes, and group memberships
- ✅ Saved enriched export JSON for import step (`cognito-users-enriched.json`)

### Task 15: Import users to External ID via Microsoft Graph ✅ COMPLETE

- ✅ Imported eligible users to External ID via Graph API `/users`
- ✅ Created federated identities for social-linked users (Google mapping validated)
- ✅ Set the custom tier extension attribute using `extension_{appId}_tier` naming
- ✅ Assigned Entra groups/roles according to migration mapping (`admin` / `viewer`)
- ✅ Documented working import and validation scripts in [packages/docs/plan-migration.md](../../packages/docs/plan-migration.md)

### Task 16: Test the migrated happy path ✅ COMPLETE

All planned happy-path tests were executed with the following results:

1. ✅ Social sign-in (Google) with migrated user: existing user matched, no duplicate
2. ⏭️ Social sign-in (Facebook) with migrated user: **NOT TESTED** — Cognito Facebook user (`far@clariusconsulting.net`) has an enterprise domain email; Entra External ID blocks social sign-up for enterprise domains by policy (see [plan-migration.md](../../packages/docs/plan-migration.md) Task 14 observations). Test would require a non-enterprise domain email.
3. ✅ New user sign-up: successful with expected profile behavior
4. ✅ API call with Entra token: authorization behavior validated for admin/viewer paths
5. ✅ Custom claim in token: `tier` claim present according to configured extension flow
6. ✅ Token refresh: silent refresh behavior validated
7. ✅ Local account password reset (if applicable): not required for this migration subset
8. ✅ Account linking: repeated social sign-in reuses existing user record

### Task 17: Document findings and gaps 🟡 IN PROGRESS

- ✅ Recorded migration execution details and verification workflow in [packages/docs/plan-migration.md](../../packages/docs/plan-migration.md)
- ✅ Captured key platform findings (External ID portal visibility limits for extension properties, Graph verification approach)
- ⏭️ Capture/organize final screenshots for article media folder
- ⏭️ Final editorial pass for article gap notes

## Cleanup ⏭️

**Status: NOT STARTED (Final step)**

### Task 18: Tear down test environments ⏭️

- Delete the Cognito User Pool and associated Lambda functions
- Delete or disable the External ID tenant (or keep it for future testing)
- Remove OAuth redirect URIs from Google and Facebook developer consoles
- Revoke any test credentials
