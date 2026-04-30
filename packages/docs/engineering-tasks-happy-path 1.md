# Engineering tasks: Cognito to Entra External ID happy path validation

Engineer sets up both an AWS Cognito source environment and an Azure External ID target environment, then runs through the migration described in the article to validate every step works as documented.

## Source environment (AWS)

### Task 1: Create Cognito User Pool with social sign-in

Set up a Cognito User Pool that matches the article's example scenario: a consumer app with social sign-in and API access.

- Create a User Pool in a test AWS account
- Configure sign-in with email as the username alias
- Set a password policy
- Register Google as a social identity provider (create OAuth client in Google Cloud Console)
- Verify social sign-in works in the Cognito Hosted UI


(Optional)
- Register Facebook as a social identity provider (create app in Meta for Developers)
- Optionally register Apple Sign-In (requires Apple Developer account, Services ID, domain verification)


### Task 2: Configure Cognito app client and resource server

- Create an app client with authorization code grant + PKCE enabled
- Set callback URLs and sign-out URLs
- Create a resource server with at least two custom scopes (e.g., `read` and `write`)
- Assign the social identity providers to the app client

### Task 3: Create groups, custom attributes, and a Lambda trigger

- Create at least two groups: `admin` and `viewer`
- Define a custom attribute: `custom:tier` (string)
- Create a Pre Token Generation Lambda trigger that adds a custom claim (e.g., `custom:tier` mapped into the token)
- Assign a test user to the `admin` group and another to `viewer`

### Task 4: Deploy a sample web app (Amplify Auth)

- Build a minimal web app (React or plain JS) that uses Amplify Auth to sign users in via Cognito
- The app should: sign in, display the ID token claims, and call the backend API with the access token
- Deploy to a test URL (localhost is fine for validation)

### Task 5: Deploy a backend API that validates Cognito tokens

- Create an API (Node.js, Python, or .NET) that:
  - Accepts a Cognito access token in the Authorization header
  - Validates the token against the Cognito JWKS endpoint
  - Reads `cognito:groups` to authorize the request (admin can write, viewer can only read)
  - Returns the decoded claims in the response (for debugging)
- Deploy locally or on AWS (API Gateway + Lambda, or standalone)

### Task 6: Create test users

- Create at least 3 users:
  1. A user linked to Google (social sign-in only)
  2. A user linked to Facebook (social sign-in only)
  3. A local user with email + password
- Assign users to groups (`admin`, `viewer`)
- Set the `custom:tier` attribute on each user
- Sign in with each user to confirm tokens are issued correctly and the Lambda trigger runs

## Target environment (Azure)

### Task 7: Create External ID tenant

- Create a Microsoft Entra External ID tenant in the Entra admin center
- Note the tenant name, tenant ID, and domain

### Task 8: Register applications and expose API

- Register the client app (web app) with redirect URI matching the sample app
- Enable authorization code flow with PKCE
- Register the backend API as a separate app registration
- In "Expose an API," set the Application ID URI and declare scopes matching the Cognito resource server (`read`, `write`)
- In the client app, add the API scopes under "API permissions"
- Grant admin consent

### Task 9: Configure social identity providers in External ID

- Add Google as a social identity provider using the same OAuth client from Task 1 (add the External ID redirect URI in Google Cloud Console)
- Add Facebook using the same app from Task 1 (add the External ID redirect URI in Meta for Developers)
- Optionally add Apple
- Create a sign-up/sign-in user flow and add the social providers as sign-in options
- Associate the client app with the user flow
- Test: sign in with Google/Facebook through the External ID user flow, confirm a user is created

### Task 10: Set up groups or app roles

- Create app roles on the client app registration: `admin` and `viewer`
- Or: create Entra groups matching the Cognito groups
- Document which approach was chosen and why (article recommends app roles for this scenario)

### Task 11: Create custom authentication extension

- Create an Azure Function that mimics the Cognito Pre Token Generation Lambda:
  - On the `OnTokenIssuanceStart` event, return the `custom:tier` value as an extra claim
- Register the Azure Function as a custom authentication extension in External ID
- Add the extension to the user flow
- Test: sign in and verify the custom claim appears in the token

### Task 12: Deploy sample web app with MSAL

- Update the sample web app from Task 4 (or build a new one) to use MSAL instead of Amplify Auth
- Configure: client ID, authority (External ID tenant), redirect URI, API scopes
- The app should: sign in via MSAL, display ID token claims, call the backend API with the Entra access token
- Verify the MSAL call translations from the article work:
  - `loginRedirect` replaces `Auth.federatedSignIn`
  - `acquireTokenSilent` replaces `Auth.currentSession`
  - `logoutRedirect` replaces `Auth.signOut`

### Task 13: Update backend API to validate Entra tokens

- Update (or create a parallel version of) the backend API to:
  - Validate tokens against the Entra JWKS endpoint
  - Read `roles` (or `groups`) instead of `cognito:groups`
  - Read `oid` instead of `sub` as the user identifier
  - Read `scp` instead of `scope`
  - Handle the groups overage scenario (if using groups instead of app roles)
- Test: call the API with an Entra access token, confirm authorization works

## Migration (the actual test) - to be done after green light and to follow the instruction from article

### Task 14: Export users from Cognito

- Use AWS CLI (`list-users`, `admin-get-user`) to export all test users
- Capture: email, federated identity links (provider + external subject ID), custom attributes, group memberships
- Save as JSON for the import step

### Task 15: Import users to External ID via Microsoft Graph

- For each user, create a user object via Graph API `/users`
- For social-linked users, add federated identities so External ID links them to the same Google/Facebook subject
- Set the `custom:tier` extension attribute on each user
- Assign app roles (or group memberships) matching the Cognito groups
- Use Graph batching to simulate a realistic migration flow
- Document: which Graph API calls were used, any throttling encountered, how long it took

### Task 16: Test the migrated happy path

Run through each scenario and record pass/fail:

1. **Social sign-in (Google) with migrated user.** User signs in with Google. External ID finds the existing user (not a new registration). Token is issued with correct claims.
2. **Social sign-in (Facebook) with migrated user.** Same as above for Facebook.
3. **New user sign-up.** A brand-new Google user signs up. External ID creates a user with expected attributes.
4. **API call with Entra token.** Web app calls the API with the Entra access token. API authorizes based on roles/groups. Admin can write, viewer can only read.
5. **Custom claim in token.** The `custom:tier` claim appears in the token via the custom authentication extension.
6. **Token refresh.** Let the access token expire. MSAL uses the refresh token silently. App continues working.
7. **Local account password reset (if applicable).** Migrated local user is prompted to reset password on first sign-in. After reset, sign-in works.
8. **Account linking.** A migrated user signs in with the same Google account. They are matched to the existing user, not duplicated.

### Task 17: Document findings and gaps

- Record any steps from the article that were unclear, incorrect, or missing
- Note any AWS or Azure behavior that differed from what the article describes
- Flag any permissions, configurations, or prerequisites the article should mention but doesn't
- Capture screenshots of key configuration screens for the article's media folder

## Cleanup

### Task 18: Tear down test environments

- Delete the Cognito User Pool and associated Lambda functions
- Delete or disable the External ID tenant (or keep it for future testing)
- Remove OAuth redirect URIs from Google and Facebook developer consoles
- Revoke any test credentials
