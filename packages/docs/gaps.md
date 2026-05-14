# Gaps and Technical Validation Log

Last modified: 2026-05-14

## Purpose
This is the working document for validating the migration draft against the POC implemented in this repository.

Primary goal:
- Identify technical gaps, ambiguous guidance, and statements that are not yet validated by the POC.
- Capture evidence from code and runbooks.
- Track decisions and updates throughout the day.

## Scope
Source draft under review

POC baseline in this repo:
- Frontend migrated to MSAL
- Backend validates Entra tokens and authorizes by roles
- Token enrichment extension implemented for tier claim
- Cognito user export and migration runbooks documented
- Migration execution runbook/script reference (Cognito read -> Entra External ID write via Microsoft Graph): https://github.com/v-fearam/cognito-social-auth/blob/entra-external-id/packages/docs/plan-migration.md

## Working Rules
- Every gap row must include: clear gap statement, evidence in repo, and actionable validation notes.
- Severity and status are tracked in narrative context (validation notes and session log), not as separate table columns.
- Use Deep-dive section links (anchor IDs) whenever additional detail exists below.
- Keep anchor IDs stable; if a section title changes, keep the same anchor ID and update the Anchor Index if needed.
- Update Last modified date each time this file changes.
- Keep statements evidence-based, implementation-focused, and reference-backed when possible.
- When the draft asserts Microsoft product behavior, limits, token semantics, or implementation guidance, prefer a current Microsoft Learn citation that directly supports that exact statement.

## Gap Register

| ID | Area | Gap statement | Evidence in repo | Validation notes | Deep-dive section |
|---|---|---|---|---|---|
| G-001 | Cutover / Dual-run | Draft recommends API acceptance of Cognito and Entra tokens during dual-run. This is directionally correct, but wording is too simplified for implementation and can be misread as issuer-only validation. | packages/backend/src/auth/cognito-token-verifier.service.ts, packages/backend/src/auth/cognito-auth.guard.ts, Microsoft Learn ASP.NET JWT guidance, express-jwt/jose documentation | Keep dual-run guidance, but clarify implementation: validate each issuer with its own metadata/JWKS and enforce issuer + audience + signature checks. In ASP.NET Core, prefer separate JWT bearer schemes (or policy scheme) per issuer. In Node.js, use issuer-aware key selection when using `express-jwt` or `jose`. POC did not execute dual-token acceptance end-to-end. | [SEC-DUAL-ISSUER-VALIDATION](#SEC-DUAL-ISSUER-VALIDATION) |
| G-002 | Authorization claims | Draft discusses groups overage and Graph fallback. POC implements app roles (`roles`) guards and no groups-overage handling path. Also, Entra `groups` claims are object IDs by default, not friendly group names, so values are environment-specific and should not be presented as stable business labels. | packages/backend/src/auth/admin-group.guard.ts, packages/backend/src/auth/viewer-group.guard.ts, packages/docs/engineering-tasks-happy-path 1.md, observed Entra ID token sample (May 2026) | Recommend app roles as primary model; use security groups assigned to app roles for scalable user administration. Keep groups-overage guidance as optional alternative path. Clarify that raw `groups` values are tenant-specific identifiers unless optional group-claim formatting is explicitly configured. | [SEC-AUTH-MODEL](#SEC-AUTH-MODEL) |
| G-003 | Tier claim naming | Draft references Cognito `custom:*` mapping to Entra extension attributes. POC custom extension returns `tier` claim directly (not `extension_<appid>_*`). | packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, packages/frontend/src/App.tsx, packages/docs/plan-migration.md | Clarify that `extension_<appid>_*` is the directory storage schema, while `tier` is a custom token claim name emitted by extension logic. Both can coexist and are valid. | [SEC-ATTR-VS-CLAIM](#SEC-ATTR-VS-CLAIM) |
| G-004 | Trigger equivalence | Draft provides trigger mapping table. POC currently validates only token issuance extension path; no implementation evidence for post-confirmation replacement workflows. | packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, packages/docs/tutorial-custom-tier-claim-entra-external-id.md | Trigger mapping is valid per Microsoft docs: Entra supports multiple extension event types (token issuance, attribute collection, OTP send, password submit, account recovery). POC tested only token issuance; other triggers not validated in this repo. | [SEC-TRIGGER-MAPPING](#SEC-TRIGGER-MAPPING) |
| G-005 | Local account migration | Draft includes JIT/forced-reset strategies. POC evidence is strong for social path; no implemented JIT password migration extension found in repo. | packages/docs/plan-migration.md, packages/backend/src/auth | Product docs align with article guidance. In this POC, forced password reset (forgot-password path) was tested; JIT remains untested implementation scope. | [SEC-LOCAL-CRED-MIGRATION](#SEC-LOCAL-CRED-MIGRATION) |
| G-006 | Extension payload and enrichment auth model | Draft implies robust custom-logic carryover; in this POC, TokenIssuanceStart payload lacks role/group/custom-attribute context for dynamic tiering, and enrichment may require Graph lookup with secure non-interactive auth. | packages/docs/engineering-tasks-happy-path 1.md, packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, packages/docs/tutorial-custom-tier-claim-entra-external-id.md | Add implementation constraint note: role-derived claims may require fallback/lookup path with latency budget, and Graph reads should use managed identity or confidential client credentials in extension runtime. | [SEC-PAYLOAD-REALITY](#SEC-PAYLOAD-REALITY) |
| G-007 | AADSTS50146 signing-key resilience | Enabling custom claims provider without a valid app-specific signing key can trigger AADSTS50146 and block authentication until corrected. | packages/docs/tutorial-custom-tier-claim-entra-external-id.md, observed AADSTS50146 error payload | Add explicit precheck and rollback sequence: verify signing key before enabling extension; disable extension if outage occurs. Include troubleshooting steps to reduce false 401/invalid_request investigations. | [SEC-AADSTS50146](#SEC-AADSTS50146) |
| G-008 | MFA coverage scope | Migration draft includes MFA migration guidance, but MFA was not exercised in this POC. This area cannot be validated from current implementation evidence. | POC scope notes in packages/docs/engineering-tasks-happy-path 1.md, current test evidence | Mark MFA section as "not validated in this POC" and add separate validation plan for TOTP/SMS scenarios. | [SEC-MFA-SCOPE](#SEC-MFA-SCOPE) |
| G-009 | Access-token authorization mismatch | POC API enforces `roles` from access token. One test window showed access token with `scp` only (no `roles`) and 403; later tokens include `roles` and endpoint works. The roles need to be added in the app api app registration to be included on access token. | packages/backend/src/auth/viewer-group.guard.ts, packages/backend/src/app.controller.ts, observed token samples (May 2026) |  | [SEC-ACCESS-TOKEN-ROLES](#SEC-ACCESS-TOKEN-ROLES) |
| G-010 | Access token audience claim semantics | Draft audience mapping is too absolute. Entra v2 access-token `aud` is API client ID (GUID), while Cognito access tokens always include `client_id` and include `aud` only when resource binding is requested. | Observed token sample (May 2026), packages/backend/src/auth/cognito-token-verifier.service.ts, Microsoft Learn claims docs, AWS Cognito token docs | Update claims mapping text to reflect token-version/provider nuance: Entra v2 `aud` = API client ID GUID; Cognito access token uses `client_id` and optional `aud` (resource binding). | [SEC-AUD-V2-CLAIM](#SEC-AUD-V2-CLAIM) |
| G-011 | Documentation evidence / citations | The draft frequently states Microsoft product behavior, limits, or implementation guidance without attaching a supporting official Microsoft Learn reference. This weakens technical confidence and makes future review harder. | Repeated pattern across draft sections: groups overage, claim mapping, trigger equivalence, social provider setup, token lifetime/session behavior | Add explicit source discipline: whenever the article asserts how Entra External ID or Microsoft identity platform behaves, attach the most specific current Microsoft Learn link that supports the statement. If the statement is based only on POC observation, label it as implementation observation rather than product fact. | [SEC-REFERENCE-DISCIPLINE](#SEC-REFERENCE-DISCIPLINE) |
| G-012 | Frontend auth migration section quality | The draft frontend SDK mapping table is high-risk and quickly outdated. It can also be implementation-mismatched (this repo migrated from `react-oidc-context`, not Amplify SDK APIs). | `git show main:packages/frontend/src/main.tsx`, `git show main:packages/frontend/src/App.tsx`, packages/frontend/src/main.tsx, packages/frontend/src/App.tsx | Remove the per-method SDK mapping table from the section. Replace with implementation-specific narrative  and add official references to both MSAL APIs and Cognito/OIDC baseline docs. | [SEC-FRONTEND-MAPPING-TABLE](#SEC-FRONTEND-MAPPING-TABLE) |
| G-013 | Identity Pools replacement wording (OBO token type) | The draft sentence says: "Use the On-Behalf-Of flow to exchange the user's External ID token for a downstream API token." This is ambiguous and can be interpreted as ID token usage. In Microsoft guidance, OBO is an API-to-API delegation pattern that redeems a user access token (not an ID token) at a middle-tier confidential client. | Microsoft Learn OBO flow docs, Microsoft Learn ID token docs, Microsoft Learn SPA token acquisition docs | Rewrite to explicitly state access-token delegation and middle-tier context. If the scenario is direct client-to-resource, recommend acquiring an access token for the target resource directly instead of OBO. | [SEC-OBO-TOKEN-USAGE](#SEC-OBO-TOKEN-USAGE) |

## Editorial Notes (Non-gap)

| ID | Area | Editorial issue | Suggested rewrite |
|---|---|---|---|
| E-001 | Verification section wording | This is not a technical gap; it is an edit-quality issue. The draft says: "API authorization boundaries: A user in the \"viewer\" group can read but not write. A user in \"admin\" can do both. Same test you had for Cognito, re-run against the Entra tokens." However, `viewer` and `admin` are not defined in that section, and application-specific role/group setup details are not described there. | "API authorization boundaries: Re-run the same authorization tests you used with Cognito, now using Entra-issued access tokens. Verify that the read-only test identity is denied write operations, and that the elevated test identity can perform both read and write operations, according to your app's configured roles or groups." |
| E-002 | Section scope (functional vs non-functional testing) | This is not a technical gap; it is an edit-scope issue. The sentence "Pre-production load test: Drive a realistic sign-in rate through the new tenant. Watch for throttling, custom extension timeouts, and tail latency." is correct as part of assessment/non-functional validation, but it does not belong under "Verify authentication flows and API authorization". | Keep the sentence, but move it from the authentication/authorization verification section to an assessment section such as "Performance and resilience validation" or "Pre-production non-functional testing." |
| E-003 | Migration section completeness (Step 3) | This is not a technical gap; it is an editorial completeness issue. The draft mentions downstream dependencies risk (CloudWatch alarms on Cognito events, EventBridge rules triggered by Cognito, third-party webhook analytics, and SNS/SQS notifications tied to the user pool), but this is not explicitly called out in migration section Step 3. | Add a writer-attention note in migration Step 3: "Before decommissioning Cognito, inventory and migrate downstream event consumers (CloudWatch alarms, EventBridge rules, third-party webhooks, SNS/SQS notifications) to equivalent sources in the new identity architecture. Validate they continue to receive expected events to avoid silent breakage." |

## Confirmed Alignments (POC vs draft)

| ID | Area | Confirmed point | Evidence in repo |
|---|---|---|---|
| A-001 | Frontend migration | Cognito OIDC client (`react-oidc-context`) replacement with MSAL flow is implemented. | packages/frontend/src/authConfig.ts, packages/frontend/src/main.tsx, packages/frontend/src/App.tsx, `git show main:packages/frontend/src/main.tsx`, `git show main:packages/frontend/src/App.tsx` |
| A-002 | API token validation | API validates Entra issuer/audience and checks `roles`, `oid`, `scp`-style model. | packages/backend/src/auth/cognito-token-verifier.service.ts, packages/backend/src/app.controller.ts |
| A-003 | Token enrichment | Cognito pre-token Lambda pattern replicated with Entra TokenIssuanceStart extension + Azure Function. | packages/backend/src/auth/cognito-pretoken-lambda/index.mjs, packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, packages/docs/tutorial-custom-tier-claim-entra-external-id.md |
| A-004 | User migration groundwork | Cognito export and user migration runbook exists with social identity handling examples. | packages/docs/plan-migration.md, cognito-users-export.json, cognito-users-enriched.json |

## Anchor Index
- SEC-REFERENCE-DISCIPLINE -> Cross-cutting writer guidance for reference-backed Microsoft product assertions
- SEC-DUAL-ISSUER-VALIDATION -> Dual-run token validation wording and implementation note
- SEC-MFA-SCOPE -> MFA statement for writer
- SEC-ACCESS-TOKEN-ROLES -> Access token missing roles: observed issue and recommendation
- SEC-AUD-V2-CLAIM -> Access-token audience semantics (Entra v2 and Cognito)
- SEC-FRONTEND-MAPPING-TABLE -> Recommendation to remove fragile frontend SDK mapping table and use implementation-specific guidance with references
- SEC-OBO-TOKEN-USAGE -> OBO means On-Behalf-Of; use access token (not ID token) and middle-tier delegation pattern
- SEC-PAYLOAD-REALITY -> OnTokenIssuanceStart payload reality (writer note)
- SEC-AADSTS50146 -> AADSTS50146 outage prevention and rollback
- SEC-AUTH-MODEL -> Authorization model recommendation (aligned with POC)
- SEC-ATTR-VS-CLAIM -> Entra extension attribute name vs emitted token claim name
- SEC-LOCAL-CRED-MIGRATION -> Local credential migration support (product alignment)
- SEC-TRIGGER-MAPPING -> Custom authentication extension trigger equivalence (product validation)

## New Evaluation Notes (May 2026)

<a id="SEC-REFERENCE-DISCIPLINE"></a>
### Reference discipline for Microsoft product assertions

Validation result:
- A recurring weakness in the draft is unsupported product assertions.
- When the article states how Microsoft Entra External ID or Microsoft identity platform behaves, readers should be able to trace that statement to a current official Microsoft Learn page.

Writer guidance:
- Add at least one Microsoft Learn citation whenever the article asserts Microsoft behavior, limits, or implementation guidance.
- Prefer the most specific page that directly supports the sentence, not a broad landing page.
- If no official Learn page directly supports the statement, soften the wording and label it as a POC observation or implementation note rather than as a universal product fact.
- For comparative statements involving Cognito and Entra, cite both Microsoft Learn and the corresponding AWS documentation when possible.

Concrete example: groups overage section
- The draft currently makes several strong statements about Entra group overage behavior with no adjacent supporting citation.
- Add Microsoft Learn references that support both the overage mechanics.

Recommended references for the groups-overage section:
- Access token claims reference (groups overage indicator, `groups`, `hasgroups`, `_claim_names`, `_claim_sources`):
    https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference
- Configure group claims for applications by using Microsoft Entra ID (200 JWT / 150 SAML limits, groups assigned to application, recommendation to use app roles):
    https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims

<a id="SEC-DUAL-ISSUER-VALIDATION"></a>
### Dual-run token validation wording (Cognito + External ID)

Validation result:
- The draft statement is conceptually correct (an API can accept both Cognito and External ID tokens during migration).
- The sentence is too brief and can imply that accepting multiple issuers alone is enough.

Why this matters:
- Safe JWT validation requires more than issuer matching.
- During dual-run, each token source should be validated with its own trust configuration (metadata/JWKS), plus issuer and audience checks.

Guidance:
- Keep the dual-run recommendation, but use implementation-safe wording.
- For ASP.NET Core, describe multiple JWT bearer schemes (or a policy scheme) so each issuer has its own authority/metadata and validation settings.
- For Node.js, describe issuer-aware key resolution for `express-jwt` or `jose`.

Suggested replacement sentence for the article:
"During migration, an API might need to accept access tokens from both Cognito and External ID. Configure token validation per issuer: for each issuer, validate signature using the correct metadata/JWKS and enforce expected issuer and audience. In ASP.NET Core, use separate JWT bearer schemes (or a policy scheme); in Node.js, use issuer-aware key selection with `express-jwt` or `jose`."

References:
- ASP.NET Core JWT bearer authentication (explicit validation, multi-issuer patterns):
    https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-jwt-bearer-authentication
- ASP.NET Core multiple authentication schemes:
    https://learn.microsoft.com/en-us/aspnet/core/security/authorization/limitingidentitybyscheme
- Protected web API with Microsoft.Identity.Web:
    https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-app-configuration#microsoftidentityweb
- express-jwt (issuer validation and dynamic key retrieval):
    https://github.com/auth0/express-jwt
- jose (JWT verify and remote JWKS):
    https://github.com/panva/jose

<a id="SEC-MFA-SCOPE"></a>
### MFA statement
- MFA exists in the migration draft but was not covered by this POC execution.
- Recommendation: keep MFA guidance, but add good links that support the information.

<a id="SEC-LOCAL-CRED-MIGRATION"></a>
### Local credential migration support (product alignment)

Validation result:
- Microsoft product documentation confirms the article is correct to describe local-account credential migration options, including JIT migration and reset-based alternatives.
- In this repo, social/federated path is validated and local forced password reset was tested through forgot-password flow.
- JIT password migration remains untested implementation scope in this POC.

What the product docs support:
- If users are social/federated only, credential migration can be skipped.
- For local accounts, External ID supports staged credential migration, including JIT password migration using `OnPasswordSubmit` custom authentication extension.
- JIT flow guidance includes migration-flag pattern and custom extension response actions (`MigratePassword`, `UpdatePassword`, `Retry`, `Block`).

References:
- Migrate users and credentials to External ID:
    https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-migrate-users?tabs=graph
- Just-in-time password migration to External ID:
    https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-migrate-passwords-just-in-time

<a id="SEC-TRIGGER-MAPPING"></a>
### Custom authentication extension trigger equivalence (product validation)

Validation result:
- The draft document's trigger mapping information is valid and supported by current Microsoft Entra External ID.
- POC tested only one trigger type (token issuance); other trigger points are architecturally valid but not exercised in this repo.

Supported custom authentication extension event types in Entra:
- **Token issuance start** (`OnTokenIssuanceStart`) - Triggered when token is about to be issued; used for custom claims provider. ✓ **Tested in this POC**
- **Attribute collection start** (`OnAttributeCollectionStart`) - Triggered before attribute collection page renders; allows prefilling and validation.
- **Attribute collection submit** (`OnAttributeCollectionSubmit`) - Triggered after user submits attributes; allows post-submission validation and modification.
- **One time passcode send** (`OnOtpSend`) - Triggered when OTP email is sent; allows custom email provider integration.
- **Password submit** (`OnPasswordSubmit`) - Triggered during sign-in when password is submitted; used for JIT password migration from legacy IdP.
- **Account recovery claim validation** (`OnVerifiedIdClaimValidation`) - Triggered during account recovery when Verified ID claims are presented.

Writer implication:
- Keep draft trigger mapping guidance as-is; it aligns with product capabilities.
- For any trigger type not tested in this POC (all except token issuance), label as "architectural guidance, not validated in this POC implementation" rather than defective.

References:
- Custom authentication extensions overview (all trigger types listed):
    https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-overview
- Custom authentication extension resource types (Graph API):
    https://learn.microsoft.com/en-us/graph/api/resources/customauthenticationextension
- Token issuance start configuration:
    https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-tokenissuancestart-configuration
- Attribute collection start and submit:
    https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-attribute-collection
- OTP send custom email provider:
    https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-email-otp-get-started


<a id="SEC-ACCESS-TOKEN-ROLES"></a>
### Access token missing roles: observed issue and recommendation

Observed behavior:
- ID token contains `roles: ["viewer"]` for the SPA audience.
- Access token for the API audience contains `scp: "read write"` but no `roles`.
- Backend authorization guards require `roles` and return 403 when absent.

Practical validation checklist for this issue:
- Confirm app roles are defined on the API app registration (not only on SPA).
- Confirm role assignments are applied in the API enterprise application (group-to-role mapping on API service principal).
- Confirm the user is in the expected security group and the assignment is effective.
- Confirm the frontend requests API scopes for the API audience and uses that access token for backend calls.
- Force new token issuance after assignment changes (sign out/in) to avoid stale tokens.

References:
- App roles vs groups:
    https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps#app-roles-vs-groups
- Usage scenario for app-calling-API:
    https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps#usage-scenario-of-app-roles
- Access token claims reference:
    https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference

<a id="SEC-AUD-V2-CLAIM"></a>
### Access-token audience semantics (Entra v2 and Cognito)

Observed in this POC:
- Entra v2 access token `aud` is the API client ID GUID (`6c959c17-63ba-4477-b66e-928d7d9ba937`), not the Application ID URI string.

Validation against Microsoft documentation:
- Microsoft Learn access token claims reference states `aud` can be Application ID URI or GUID in general, and clarifies that in v2.0 tokens it is the web API client ID.
- Microsoft Learn claims validation guidance states the same: for v2.0 tokens, `aud` is the web API client ID (GUID); v1.0 may use app ID URI.

Validation against AWS Cognito documentation:
- Cognito access token claim reference states `client_id` identifies the app client and corresponds to ID-token `aud`.
- Cognito access-token `aud` is optional and present only when resource binding is requested.

Writer guidance:
- Update the migration claim-mapping table with provider/version nuance:
  - Cognito access token: `client_id = app client ID`; `aud` may appear only with resource binding.
  - Entra v2 access token: `aud = API client ID (GUID)`.
- Keep Application ID URI in scope/resource configuration guidance, but do not state it as the universal runtime `aud` value.

References:
- Microsoft access token claims reference:
    https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference
- Microsoft claims validation (Validate the audience):
    https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation#validate-the-audience
- AWS Cognito access token claims:
    https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- AWS Cognito ID token claims:
    https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-id-token.html

<a id="SEC-FRONTEND-MAPPING-TABLE"></a>
### Recommendation: remove frontend SDK mapping table

Validation result:
- The draft table that maps frontend SDK methods is too easy to become outdated.
- It can also be incorrect for a specific implementation baseline.
- In this repo, the baseline is Cognito with `react-oidc-context`, not Amplify `Auth.*` APIs.

Writer guidance:
- Remove the per-method SDK mapping table from the frontend migration section.
- Keep generic product statements minimal and always reference official docs.


Recommended references:
- MSAL Browser login APIs:
    https://learn.microsoft.com/en-us/entra/msal/javascript/browser/login-user
- MSAL Browser acquire token APIs:
    https://learn.microsoft.com/en-us/entra/msal/javascript/browser/acquire-token
- MSAL Browser logout APIs:
    https://learn.microsoft.com/en-us/entra/msal/javascript/browser/logout
- MSAL Browser account APIs:
    https://learn.microsoft.com/en-us/entra/msal/javascript/browser/accounts
- MSAL React hooks:
    https://learn.microsoft.com/en-us/entra/msal/javascript/react/hooks
- Cognito user pool app integration (OIDC/OAuth baseline concepts):
    https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-integration.html

<a id="SEC-OBO-TOKEN-USAGE"></a>
### OBO token usage and wording correction

Definition:
- OBO stands for **On-Behalf-Of**.

Validation result:
- The draft idea is directionally useful, but the current sentence is risky because "External ID token" can be interpreted as an ID token.
- Official Microsoft guidance for OBO requires a **user access token** as the assertion, sent to a **middle-tier confidential API** that exchanges it for another downstream access token.
- ID tokens are for authentication context in the client and should not be used to call APIs.

Writer guidance:
- Replace ambiguous wording with one of the following, depending on architecture:
  - API-to-API delegation pattern (OBO):
    "Use the On-Behalf-Of (OBO) flow in a middle-tier confidential API to exchange the user's access token (issued for API A) for an access token to downstream API B."
  - Direct client-to-resource pattern (no OBO):
    "For direct client access, acquire an access token for the target resource directly from the client and call the resource without OBO."

Recommended references:
- OAuth 2.0 OBO flow (assertion is access token, middle-tier pattern):
    https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow
- ID tokens (not for API authorization):
    https://learn.microsoft.com/en-us/entra/identity-platform/id-tokens
- Access tokens (authorization tokens for APIs):
    https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- SPA acquire token for API calls:
    https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-acquire-token
- Web API that calls downstream APIs (OBO scenario overview):
    https://learn.microsoft.com/en-us/entra/identity-platform/scenario-web-api-call-api-overview

<a id="SEC-PAYLOAD-REALITY"></a>
### OnTokenIssuanceStart payload reality

Observed payload content in this POC:
- Includes tenant, listener IDs, client and resource service principals, and user basic identity.
- Does not include roles/groups and custom attributes in the callout payload used by the function.

Writer guidance:
- Do not assume role/group claims are available inside TokenIssuanceStart payload.
- If tier depends on role or custom attributes, define one of these patterns explicitly:
  - deterministic mapping not requiring external lookup,
  - Graph lookup at runtime
- If Graph lookup is required, use non-interactive workload identity from extension runtime.
- Prefer managed identity when hosting model supports it; otherwise use confidential client credentials (app registration + certificate/secret) with least-privilege Graph application permissions.
- Avoid user-interactive delegated auth assumptions for this callout path.

References:
- External ID user attributes concept:
    https://learn.microsoft.com/en-us/entra/external-id/customers/concept-user-attributes
- Define custom attributes:
    https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-define-custom-attributes

<a id="SEC-AADSTS50146"></a>
### AADSTS50146 incident context

This section captures the observed authentication failure in the POC when custom claims provider flow was enabled.

Internal tracking:
- ADO ticket: https://dev.azure.com/msft-skilling/Content/_workitems/edit/573454

Observed error payload (reported by Federico Arambarri):

```json
{
    "error": "invalid_request",
    "error_description": "AADSTS50146: This application is required to be configured with an application-specific signing key. It is either not configured with one, or the key has expired or is not yet valid. Trace ID: 5bc15a95-15c3-45fb-8dd9-51773e100100 Correlation ID: 019e03f6-4314-7c6a-93b1-2a94da6c3a8e Timestamp: 2026-05-07 19:42:13Z",
    "error_codes": [
        50146
    ],
    "timestamp": "2026-05-07 19:42:13Z",
    "trace_id": "5bc15a95-15c3-45fb-8dd9-51773e100100",
    "correlation_id": "019e03f6-4314-7c6a-93b1-2a94da6c3a8e",
    "error_uri": "https://cognitomigration.ciamlogin.com/error?code=50146"
}
```

Related information:
- Microsoft Q&A discussion: Issue with Azure Entra ID External Authentication: Error AADSTS50146
- Customize app JSON Web Token (JWT) claims - Microsoft identity platform:
    https://learn.microsoft.com/en-us/entra/identity-platform/jwt-claims-customization
- Microsoft identity platform error code reference:
    https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes

Repository evidence and summary:
- Full incident walkthrough is documented in [packages/docs/tutorial-custom-tier-claim-entra-external-id.md](packages/docs/tutorial-custom-tier-claim-entra-external-id.md).
- The tutorial records the end-to-end flow used in this POC: `OnTokenIssuanceStart` extension calling Azure Function to inject `tier` claim.
- It captures the AADSTS50146 failure condition observed after enabling custom claims provider flow.
- It records the successful remediation path executed in the POC: configuring an application-specific token signing certificate on the SPA service principal via Microsoft Graph and setting the preferred signing thumbprint.
- It includes command-level verification outputs used to confirm the service principal had active signing-key configuration after the change.

<a id="SEC-AUTH-MODEL"></a>
### Authorization model recommendation (aligned with POC)

Recommendation for article:
- Prefer app roles as the primary authorization model for app-calling-API scenarios.
- Use security groups mapped to app roles in enterprise applications to simplify user administration.
- Keep direct group-based authorization as an alternative pattern only when required.

Why:
- This matches current implementation in this repo (API guards evaluate `roles`).
- It aligns with Microsoft guidance that app roles are the stable app-defined authorization boundary, while groups are useful for assignment scalability.

Observed token behavior in this POC:
- The ID token `groups` claim contains Microsoft Entra group object IDs such as `68111139-64f5-4c57-9998-6d19af1be656`, not friendly names such as `admin`.
- Those group object IDs are tenant-specific, so the same conceptual group in another environment would normally have a different value.
- In the same token, the `roles` claim carries the stable business value `admin`, which is more suitable for app authorization logic and article examples.

Writer implication:
- Do not describe Entra `groups` claims as if they normally carry readable names like `admin` or `viewer`.
- Clarify that, by default, `groups` contains group object IDs.
- If the article wants readable group values, document that this requires explicit optional-claims configuration and has limitations.
- Avoid examples that imply a group ID from test or dev is portable across environments.

References:
- Access token claims reference (`groups` claim contains object IDs; overage behavior):
    https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference
- Configure group claims for applications by using Microsoft Entra ID (ObjectId default, claim-format options, app-role recommendation):
    https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims
- Configure and manage optional claims in ID tokens, access tokens, and SAML tokens (default group object IDs, `cloud_displayname`, `ApplicationGroup` limitation):
    https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims
- App roles vs groups:
    https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps#app-roles-vs-groups

<a id="SEC-ATTR-VS-CLAIM"></a>
### Entra extension attribute name vs emitted token claim name

Clarification for G-003:
- In Entra, custom user attributes are stored as extension properties using the Graph naming format `extension_{b2c-extensions-app-id-no-hyphens}_{attributeName}`.
- The long prefix (for this tenant: `extension_6145e4b94a8f437e948d0017b7885140_`) is mandatory and cannot be shortened or renamed.
- In this POC, the Azure Function returns a token claim named `tier` at TokenIssuanceStart.
- These are different layers and both are valid:
  - storage layer (directory attribute): `extension_<appid>_<name>`
  - token layer (issued claim): `tier` (custom output name chosen by implementation)

Feature distinction used in this POC:

| Feature | What we use | Visible in portal? |
|---|---|---|
| **Directory extension properties** (`extension_{appId}_tier`) | Yes - set via Graph API `PATCH /users` | No - not shown in the default user properties page |
| **Custom security attributes** | No - different feature | Yes - visible under user's Custom security attributes tab |

Directory extension properties are managed via Microsoft Graph APIs, not the standard user-properties portal UI.

Internet validation (Microsoft docs):
- External ID custom attributes are added to the user object and can be called through Microsoft Graph API using `extension_{appId-without-hyphens}_{custom-attribute-name}`.
- Microsoft Graph `GET /users/{id}` supports returning directory extensions when explicitly requested with `$select`.

Example read pattern:
- `GET https://graph.microsoft.com/v1.0/users/{id}?$select=displayName,extension_6145e4b94a8f437e948d0017b7885140_tier`

Practical implication:
- Keep migration guidance about extension attribute naming for data storage and Graph operations.
- Also document that token claim names can be normalized to business-friendly names (for example `tier`) by extension logic.
- If a token claim is sourced from an extension attribute, explicitly document the mapping rule in the implementation notes.
- Custom extension attributes are not received in the Azure Function payload; developers must query Microsoft Graph APIs to retrieve them.

References:
- External ID user attributes concept:
    https://learn.microsoft.com/en-us/entra/external-id/customers/concept-user-attributes
- Define custom attributes:
    https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-define-custom-attributes
- Add custom data to resources using extensions:
    https://learn.microsoft.com/en-us/graph/extensibility-overview
- Microsoft Graph - Get a user (directory extensions returned with `$select`):
    https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0
- Microsoft Graph - Update user (manage extensions and associated data):
    https://learn.microsoft.com/en-us/graph/api/user-update?view=graph-rest-1.0


