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
| G-001 | Cutover / Dual-run | Draft recommends API acceptance of Cognito and Entra tokens during dual-run. This guidance is conceptually correct; current POC implementation did not test dual-token acceptance yet. | packages/backend/src/auth/cognito-token-verifier.service.ts, packages/backend/src/auth/cognito-auth.guard.ts | Keep article guidance as-is. Track as POC validation gap only: dual issuer/token acceptance not tested yet. | - |
| G-002 | Authorization claims | Draft discusses groups overage and Graph fallback. POC implements app roles (`roles`) guards and no groups-overage handling path. | packages/backend/src/auth/admin-group.guard.ts, packages/backend/src/auth/viewer-group.guard.ts, packages/docs/engineering-tasks-happy-path 1.md | Recommend app roles as primary model; use security groups assigned to app roles for scalable user administration. Keep groups-overage guidance as optional alternative path. | [SEC-AUTH-MODEL](#SEC-AUTH-MODEL) |
| G-003 | Tier claim naming | Draft references Cognito `custom:*` mapping to Entra extension attributes. POC custom extension returns `tier` claim directly (not `extension_<appid>_*`). | packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, packages/frontend/src/App.tsx, packages/docs/plan-migration.md | Clarify that `extension_<appid>_*` is the directory storage schema, while `tier` is a custom token claim name emitted by extension logic. Both can coexist and are valid. | [SEC-ATTR-VS-CLAIM](#SEC-ATTR-VS-CLAIM) |
| G-004 | Trigger equivalence | Draft provides trigger mapping table. POC currently validates only token issuance extension path; no implementation evidence for post-confirmation replacement workflows. | packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, packages/docs/tutorial-custom-tier-claim-entra-external-id.md | Trigger mapping is valid per Microsoft docs: Entra supports multiple extension event types (token issuance, attribute collection, OTP send, password submit, account recovery). POC tested only token issuance; other triggers not validated in this repo. | [SEC-TRIGGER-MAPPING](#SEC-TRIGGER-MAPPING) |
| G-005 | Local account migration | Draft includes JIT/forced-reset strategies. POC evidence is strong for social path; no implemented JIT password migration extension found in repo. | packages/docs/plan-migration.md, packages/backend/src/auth | Product docs align with article guidance. In this POC, forced password reset (forgot-password path) was tested; JIT remains untested implementation scope. | [SEC-LOCAL-CRED-MIGRATION](#SEC-LOCAL-CRED-MIGRATION) |
| G-006 | Extension payload and enrichment auth model | Draft implies robust custom-logic carryover; in this POC, TokenIssuanceStart payload lacks role/group/custom-attribute context for dynamic tiering, and enrichment may require Graph lookup with secure non-interactive auth. | packages/docs/engineering-tasks-happy-path 1.md, packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, packages/docs/tutorial-custom-tier-claim-entra-external-id.md | Add implementation constraint note: role-derived claims may require fallback/lookup path with latency budget, and Graph reads should use managed identity or confidential client credentials in extension runtime. | [SEC-PAYLOAD-REALITY](#SEC-PAYLOAD-REALITY) |
| G-007 | AADSTS50146 signing-key resilience | Enabling custom claims provider without a valid app-specific signing key can trigger AADSTS50146 and block authentication until corrected. | packages/docs/tutorial-custom-tier-claim-entra-external-id.md, observed AADSTS50146 error payload | Add explicit precheck and rollback sequence: verify signing key before enabling extension; disable extension if outage occurs. Include troubleshooting steps to reduce false 401/invalid_request investigations. | [SEC-AADSTS50146](#SEC-AADSTS50146) |
| G-008 | MFA coverage scope | Migration draft includes MFA migration guidance, but MFA was not exercised in this POC. This area cannot be validated from current implementation evidence. | POC scope notes in packages/docs/engineering-tasks-happy-path 1.md, current test evidence | Mark MFA section as "not validated in this POC" and add separate validation plan for TOTP/SMS scenarios. | [SEC-MFA-SCOPE](#SEC-MFA-SCOPE) |
| G-009 | Access-token authorization mismatch | POC API enforces `roles` from access token. One test window showed access token with `scp` only (no `roles`) and 403; later tokens include `roles` and endpoint works. The roles need to be added in the app api app registration to be included on access token. | packages/backend/src/auth/viewer-group.guard.ts, packages/backend/src/app.controller.ts, observed token samples (May 2026) |  | [SEC-ACCESS-TOKEN-ROLES](#SEC-ACCESS-TOKEN-ROLES) |
| G-010 | Access token audience claim semantics | Draft audience mapping is too absolute. Entra v2 access-token `aud` is API client ID (GUID), while Cognito access tokens always include `client_id` and include `aud` only when resource binding is requested. | Observed token sample (May 2026), packages/backend/src/auth/cognito-token-verifier.service.ts, Microsoft Learn claims docs, AWS Cognito token docs | Update claims mapping text to reflect token-version/provider nuance: Entra v2 `aud` = API client ID GUID; Cognito access token uses `client_id` and optional `aud` (resource binding). | [SEC-AUD-V2-CLAIM](#SEC-AUD-V2-CLAIM) |
| G-011 | Documentation evidence / citations | The draft frequently states Microsoft product behavior, limits, or implementation guidance without attaching a supporting official Microsoft Learn reference. This weakens technical confidence and makes future review harder. | Repeated pattern across draft sections: groups overage, claim mapping, trigger equivalence, social provider setup, token lifetime/session behavior | Add explicit source discipline: whenever the article asserts how Entra External ID or Microsoft identity platform behaves, attach the most specific current Microsoft Learn link that supports the statement. If the statement is based only on POC observation, label it as implementation observation rather than product fact. | [SEC-REFERENCE-DISCIPLINE](#SEC-REFERENCE-DISCIPLINE) |

## Confirmed Alignments (POC vs draft)

| ID | Area | Confirmed point | Evidence in repo |
|---|---|---|---|
| A-001 | Frontend migration | Amplify/Cognito SDK replacement with MSAL flow is implemented. | packages/frontend/src/authConfig.ts, packages/frontend/src/main.tsx, packages/frontend/src/App.tsx |
| A-002 | API token validation | API validates Entra issuer/audience and checks `roles`, `oid`, `scp`-style model. | packages/backend/src/auth/cognito-token-verifier.service.ts, packages/backend/src/app.controller.ts |
| A-003 | Token enrichment | Cognito pre-token Lambda pattern replicated with Entra TokenIssuanceStart extension + Azure Function. | packages/backend/src/auth/cognito-pretoken-lambda/index.mjs, packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, packages/docs/tutorial-custom-tier-claim-entra-external-id.md |
| A-004 | User migration groundwork | Cognito export and user migration runbook exists with social identity handling examples. | packages/docs/plan-migration.md, cognito-users-export.json, cognito-users-enriched.json |

## Anchor Index
- SEC-REFERENCE-DISCIPLINE -> Cross-cutting writer guidance for reference-backed Microsoft product assertions
- SEC-MFA-SCOPE -> MFA statement for writer
- SEC-ACCESS-TOKEN-ROLES -> Access token missing roles: observed issue and recommendation
- SEC-AUD-V2-CLAIM -> Access-token audience semantics (Entra v2 and Cognito)
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
- A recurring weakness in the draft is not only technical ambiguity, but unsupported product assertions.
- When the article states how Microsoft Entra External ID or Microsoft identity platform behaves, readers should be able to trace that statement to a current official Microsoft Learn page.
- This is especially important in migration guidance, where readers need to separate product-guaranteed behavior from POC-specific observations.

Writer guidance:
- Add at least one Microsoft Learn citation whenever the article asserts Microsoft behavior, limits, or implementation guidance.
- Prefer the most specific page that directly supports the sentence, not a broad landing page.
- If no official Learn page directly supports the statement, soften the wording and label it as a POC observation or implementation note rather than as a universal product fact.
- For comparative statements involving Cognito and Entra, cite both Microsoft Learn and the corresponding AWS documentation when possible.

High-priority places where citations should be explicit:
- service limits or quotas
- token claim semantics and validation rules
- groups overage behavior and Graph fallback
- app roles versus groups guidance
- custom authentication extension trigger support and timeout-sensitive behavior
- social identity provider configuration steps
- custom attributes, extension properties, and Graph read/write patterns
- token lifetime and session management guidance

Concrete example: groups overage section
- The draft currently makes several strong statements about Entra group overage behavior with no adjacent supporting citation.
- Add Microsoft Learn references that support both the overage mechanics and the recommendation to prefer app roles when appropriate.

Suggested editorial note for the writer:
"Throughout the article, when we assert Microsoft product behavior or limits, add a current Microsoft Learn citation at the point of use. For example, the groups-overage section should cite the access-token claims reference for overage indicator behavior and the group-claims guidance for token limits and app-role recommendations."

Recommended references for the groups-overage section:
- Access token claims reference (groups overage indicator, `groups`, `hasgroups`, `_claim_names`, `_claim_sources`):
    https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference
- Configure group claims for applications by using Microsoft Entra ID (200 JWT / 150 SAML limits, groups assigned to application, recommendation to use app roles):
    https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims

<a id="SEC-MFA-SCOPE"></a>
### MFA statement
- MFA exists in the migration draft but was not covered by this POC execution.
- Recommendation: keep MFA guidance, but explicitly label it as outside current POC validation scope.

Suggested sentence for the article:
"MFA migration guidance is included for completeness, but MFA re-enrollment and SMS/TOTP behavior were not validated in this POC and should be tested in a dedicated pilot wave."

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

Reference:
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


