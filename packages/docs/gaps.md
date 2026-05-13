# Gaps and Technical Validation Log

Last modified: 2026-05-13

## Purpose
This is the working document for validating the migration draft against the POC implemented in this repository.

Primary goal:
- Identify technical gaps, ambiguous guidance, and statements that are not yet validated by the POC.
- Capture evidence from code and runbooks.
- Track decisions and updates throughout the day.

## Scope
Source draft under review:
- "Migrate from Amazon Cognito to Microsoft Entra External ID" (provided in chat)

POC baseline in this repo:
- Frontend migrated to MSAL
- Backend validates Entra tokens and authorizes by roles
- Token enrichment extension implemented for tier claim
- Cognito user export and migration runbooks documented

## Working Rules
- Every gap must include: severity, rationale, and repo evidence.
- Use status values: Open, Validated, Blocked, Out of scope.
- Update Last modified date each time this file changes.
- Keep statements evidence-based and implementation-focused.

## Gap Register

| ID | Area | Gap statement | Severity | Status | Evidence in repo | Validation notes | Deep-dive section |
|---|---|---|---|---|---|---|---|
| G-001 | Cutover / Dual-run | Draft recommends API acceptance of Cognito and Entra tokens during dual-run. This guidance is conceptually correct; current POC implementation did not test dual-token acceptance yet. | High | Open | packages/backend/src/auth/cognito-token-verifier.service.ts, packages/backend/src/auth/cognito-auth.guard.ts | Keep article guidance as-is. Track as POC validation gap only: dual issuer/token acceptance not tested yet. | - |
| G-002 | Authorization claims | Draft discusses groups overage and Graph fallback. POC implements app roles (`roles`) guards and no groups-overage handling path. | Medium | Validated | packages/backend/src/auth/admin-group.guard.ts, packages/backend/src/auth/viewer-group.guard.ts, packages/docs/engineering-tasks-happy-path 1.md | Recommend app roles as primary model; use security groups assigned to app roles for scalable user administration. Keep groups-overage guidance as optional alternative path. | SEC-AUTH-MODEL |
| G-003 | Tier claim naming | Draft references Cognito `custom:*` mapping to Entra extension attributes. POC custom extension returns `tier` claim directly (not `extension_<appid>_*`). | Medium | Open | packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, packages/frontend/src/App.tsx | Document should distinguish extension-issued transient claim vs directory extension attributes. | - |
| G-004 | Trigger equivalence | Draft provides trigger mapping table. POC currently validates only token issuance extension path; no implementation evidence for post-confirmation replacement workflows. | Medium | Open | packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, packages/docs/tutorial-custom-tier-claim-entra-external-id.md | Mark non-implemented mappings as architectural guidance, not tested POC behavior. | - |
| G-005 | Local account migration | Draft includes JIT/forced-reset strategies. POC evidence is strong for social path; no implemented JIT password migration extension found in repo. | High | Open | packages/docs/plan-migration.md, packages/backend/src/auth | Scope local-account section as optional and unvalidated in this POC. | - |
| G-006 | Session migration | Draft suggests shortening Cognito refresh token lifetime before cutover. POC app is already MSAL-first and does not show a Cognito+MSAL bridge implementation. | Medium | Open | packages/frontend/src/authConfig.ts, packages/frontend/src/main.tsx, packages/frontend/src/App.tsx | Add note that this guidance applies only if transition release still serves Cognito sessions. | - |
| G-007 | Extension payload assumptions | Draft implies robust custom-logic carryover; POC notes token issuance payload may not contain rich role/group context for dynamic tiering. | Medium | Open | packages/docs/engineering-tasks-happy-path 1.md, packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs | Add constraint note: dynamic role-derived claims may require extra data fetches and latency budget. | SEC-PAYLOAD-REALITY |
| G-008 | JWKS validation nuance | Draft mentions issuer/JWKS switch generally. POC required app-qualified JWKS (`?appid=`) fallback due app-specific signing keys. | High | Open | packages/backend/src/auth/cognito-token-verifier.service.ts | Add explicit troubleshooting note to avoid false 401 failures after custom claims provider setup. | SEC-AADSTS50146 |
| G-009 | Cognito scopes model clarity | Draft statements about Cognito custom scopes on resource servers are conceptually correct, but many readers in the current AWS console cannot easily find "Resource servers" and may conclude the model is outdated or wrong. | High | Open | User validation against current console UI (May 2026), packages/docs/plan-migration.md | Add a short note that this feature still exists, plus updated navigation guidance and CLI fallback checks. | SEC-COGNITO-RESOURCE-SERVERS |
| G-010 | PR narrative completeness | PR #1 has no structured description (goals, non-goals, validation evidence, rollback), which makes technical review and writer handoff harder. | Medium | Open | GitHub PR #1 conversation metadata | Add a PR summary template section in docs with: scope, risks, test evidence, and post-merge actions. | SEC-PR1-CONTEXT |
| G-011 | Sensitive data in repository | User export files include personal data (email, social identifiers, group memberships) and are committed in the branch. This is risky for sharing and long-term retention. | High | Open | cognito-users-enriched.json, cognito-users-export.json | Replace with sanitized samples, move real exports to secure storage, and document redaction policy. | SEC-PR1-CONTEXT |
| G-012 | Binary artifact in source control | The branch commits a generated deployment zip for Azure Function. Binary build artifacts reduce reviewability and create drift risk against source. | Medium | Open | packages/backend/src/auth/pretoken-tier-function/pretoken-tier.zip | Remove binary from git and generate during CI/release with scripted packaging. | SEC-PR1-CONTEXT |
| G-013 | Configuration consistency | Documentation contains inconsistent SPA client IDs (`...8bfd1c` and `...8dfd1c`) across migration docs. This can break setup and reduce trust in instructions. | High | Open | packages/docs/plan.md, packages/docs/engineering-tasks-happy-path 1.md, packages/docs/plan-migration.md, packages/frontend/.env.example | Define one canonical value source and run a consistency check before publishing. | SEC-PR1-CONTEXT |
| G-014 | Scope model decision clarity | PR migrates to roles-first authorization while migration text still discusses multiple patterns. Reader guidance should clearly choose primary path and optional alternatives. | Medium | Open | packages/backend/src/auth/admin-group.guard.ts, packages/backend/src/auth/viewer-group.guard.ts, packages/docs/plan.md | Add a decision record: Primary = app roles; Alternative = groups with overage handling; include criteria. | SEC-AUTH-MODEL |
| G-015 | Tooling prerequisite friction | Migration runbook depends on AWS CLI, but setup may fail in contributor environments. Missing early precheck can block validation tasks and create false doc defects. | Medium | Open | Terminal context (May 13, 2026: `aws --version` failed), packages/docs/plan-migration.md | Add preflight: verify aws, az, node, npm availability before task steps; include recovery links/commands. | SEC-PR1-CONTEXT |
| G-016 | MFA coverage scope | Migration draft includes MFA migration guidance, but MFA was not exercised in this POC. This area cannot be validated from current implementation evidence. | Medium | Open | POC scope notes in packages/docs/engineering-tasks-happy-path 1.md, current test evidence | Mark MFA section as "not validated in this POC" and add separate validation plan for TOTP/SMS scenarios. | SEC-MFA-SCOPE |
| G-017 | Access-token authorization mismatch | POC API enforces `roles` from access token. One test window showed access token with `scp` only (no `roles`) and 403; later tokens include `roles` and endpoint works. This indicates configuration/propagation sensitivity that needs explicit troubleshooting guidance. | High | Validated | packages/backend/src/auth/viewer-group.guard.ts, packages/backend/src/app.controller.ts, observed token samples (May 2026) | Keep troubleshooting section and add note about assignment propagation + fresh token issuance after changes. | SEC-ACCESS-TOKEN-ROLES |
| G-018 | TokenIssuanceStart payload limitation | OnTokenIssuanceStart payload observed in this POC includes user and app context but no role/group claims. Dynamic tier-by-role logic cannot rely only on callout payload fields. | High | Validated | Function logs in packages/docs/tutorial-custom-tier-claim-entra-external-id.md and observed payload samples | Document this as a platform behavior to design around (fallback claim, Graph lookup, or precomputed attribute). | SEC-PAYLOAD-REALITY |
| G-019 | Graph enrichment authentication model | To enrich claims with custom attributes at token issuance time, function may need Graph lookup. Article should recommend secure app-to-app auth model and avoid user-interactive dependency assumptions. | High | Open | packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, observed design notes | Prefer managed identity or confidential client credentials for Graph; avoid delegated user login dependency in extension runtime. | SEC-GRAPH-AUTH |
| G-020 | AADSTS50146 operational resilience | Enabling custom claims provider without valid app-specific signing key triggers AADSTS50146 and can block auth until disabled/fixed. This should be documented as a known migration hazard with rollback steps. | High | Validated | packages/docs/tutorial-custom-tier-claim-entra-external-id.md, observed AADSTS50146 error payload | Add explicit precheck and rollback sequence: verify signing key before enabling extension; disable extension if outage occurs. | SEC-AADSTS50146 |

## Confirmed Alignments (POC vs draft)

| ID | Area | Confirmed point | Evidence in repo |
|---|---|---|---|
| A-001 | Frontend migration | Amplify/Cognito SDK replacement with MSAL flow is implemented. | packages/frontend/src/authConfig.ts, packages/frontend/src/main.tsx, packages/frontend/src/App.tsx |
| A-002 | API token validation | API validates Entra issuer/audience and checks `roles`, `oid`, `scp`-style model. | packages/backend/src/auth/cognito-token-verifier.service.ts, packages/backend/src/app.controller.ts |
| A-003 | Token enrichment | Cognito pre-token Lambda pattern replicated with Entra TokenIssuanceStart extension + Azure Function. | packages/backend/src/auth/cognito-pretoken-lambda/index.mjs, packages/backend/src/auth/pretoken-tier-function/PretokenTierFunction.cs, packages/docs/tutorial-custom-tier-claim-entra-external-id.md |
| A-004 | User migration groundwork | Cognito export and user migration runbook exists with social identity handling examples. | packages/docs/plan-migration.md, cognito-users-export.json, cognito-users-enriched.json |

## Open Questions to Resolve Today
- Should the final migration guide be strictly "Pattern 1 social-only" or keep local-account sections as optional appendices?
- Do we want this POC to document dual-run API validation for both issuers, or keep single-issuer cutover guidance only?
- Should the guide standardize on app roles as primary authorization recommendation and demote groups to alternative pattern?
- Do we want to include a dedicated "Known implementation constraints" box for custom extension payload limits and timeout budget?

## Anchor Index
- SEC-COGNITO-RESOURCE-SERVERS -> Writer-Ready Clarification: Cognito Resource Servers vs New Console
- SEC-PR1-CONTEXT -> PR #1 Context Summary (main -> entra-external-id)
- SEC-MFA-SCOPE -> MFA statement for writer
- SEC-ACCESS-TOKEN-ROLES -> Access token missing roles: observed issue and recommendation
- SEC-PAYLOAD-REALITY -> OnTokenIssuanceStart payload reality (writer note)
- SEC-GRAPH-AUTH -> Graph authentication model for extension callouts
- SEC-AADSTS50146 -> AADSTS50146 outage prevention and rollback
- SEC-AUTH-MODEL -> Authorization model recommendation (aligned with POC)

<a id="SEC-COGNITO-RESOURCE-SERVERS"></a>
## Writer-Ready Clarification: Cognito Resource Servers vs New Console

### Why this needs clarification
- The migration draft says Cognito custom API scopes are defined on resource servers.
- That is still accurate in AWS Cognito, but the console UX changed and the navigation differs from older tutorials.
- Readers can fail to find the menu and assume the article has an error.

### Suggested wording for the migration article
"Amazon Cognito still uses OAuth resource servers for custom API scopes. In the current AWS console, these settings might not appear where older tutorials show them. If you cannot find the Resource servers entry in the user pool UI, use the user pool Domain and App clients configuration paths documented by AWS, or verify existing configuration with CLI commands such as list-resource-servers and describe-user-pool-client."

### Practical mapping note for readers
- Cognito concept: Resource server identifier plus custom scopes (for example, api.read, api.write).
- Entra concept: API app registration (Expose an API), Application ID URI, and delegated scopes.
- Migration implication: Conceptual mapping is still valid even if your Cognito tenant did not use resource servers explicitly.

### Validation checklist to include in article
- Confirm whether the source Cognito app client requests only OIDC scopes (openid, profile, email) or also custom API scopes.
- If only OIDC scopes are present, call this out and simplify migration steps (no custom scope migration needed).
- If custom API scopes exist, map each Cognito custom scope to an Entra API scope under Expose an API.

### References
- AWS Cognito developer guide: Scopes, M2M, and resource servers
    https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html
- AWS API reference: ListResourceServers
    https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ListResourceServers.html
- AWS API reference: CreateResourceServer
    https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateResourceServer.html
- Microsoft identity platform: Expose an API
    https://learn.microsoft.com/entra/identity-platform/quickstart-configure-app-expose-web-apis

<a id="SEC-PR1-CONTEXT"></a>
## PR #1 Context Summary (main -> entra-external-id)

PR reviewed:
- https://github.com/v-fearam/cognito-social-auth/pull/1

Branch delta observed:
- 12 commits
- 35 files changed
- 2981 additions, 413 deletions
- Core themes: frontend MSAL migration, backend Entra token validation, role-based authorization, custom claims extension, migration runbooks

### Recommendations for writer-facing quality
- Add a concise "What changed in this POC" section with 5 bullets and links to implementation files.
- Add a "Not validated in this POC" section (for local-account JIT, full dual-run, post-confirmation alternatives).
- Add a "Security and data handling" section that explicitly forbids committing raw user exports and generated binaries.
- Add a "Configuration source of truth" table (tenant, app IDs, scope URI) to prevent cross-doc drift.

### Suggested references to cite in migration narrative
- PR context: https://github.com/v-fearam/cognito-social-auth/pull/1
- AWS Cognito resource servers and custom scopes:
    https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html
- AWS CLI list resource servers:
    https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ListResourceServers.html
- Entra expose API scopes:
    https://learn.microsoft.com/entra/identity-platform/quickstart-configure-app-expose-web-apis
- Entra custom extensions overview:
    https://learn.microsoft.com/entra/identity-platform/custom-extension-overview

## New Evaluation Notes (May 2026)

<a id="SEC-MFA-SCOPE"></a>
### MFA statement for writer
- MFA exists in the migration draft but was not covered by this POC execution.
- Recommendation: keep MFA guidance, but explicitly label it as outside current POC validation scope.

Suggested sentence for the article:
"MFA migration guidance is included for completeness, but MFA re-enrollment and SMS/TOTP behavior were not validated in this POC and should be tested in a dedicated pilot wave."

<a id="SEC-ACCESS-TOKEN-ROLES"></a>
### Access token missing roles: observed issue and recommendation

Observed behavior:
- ID token contains `roles: ["viewer"]` for the SPA audience.
- Access token for the API audience contains `scp: "read write"` but no `roles`.
- Backend authorization guards require `roles` and return 403 when absent.

Impact:
- App sign-in appears successful, but API authorization fails for role-protected endpoints.

Writer recommendation:
- Add a dedicated troubleshooting callout for "roles present in ID token but missing in access token" in app-calling-API scenarios.

Practical validation checklist for this issue:
- Confirm app roles are defined on the API app registration (not only on SPA).
- Confirm role assignments are applied in the API enterprise application (group-to-role mapping on API service principal).
- Confirm the user is in the expected security group and the assignment is effective.
- Confirm the frontend requests API scopes for the API audience and uses that access token for backend calls.
- Force new token issuance after assignment changes (sign out/in) to avoid stale tokens.
- Verify no claims customization/policy path suppresses default role emission for API access tokens.

Potential mitigation guidance in article:
- If API uses role-based authorization, check `roles` in access token.
- If only delegated scopes are emitted, either fix role emission configuration or explicitly use `scp`-based authorization model for that API.

References:
- App roles vs groups:
    https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps#app-roles-vs-groups
- Usage scenario for app-calling-API:
    https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps#usage-scenario-of-app-roles
- Access token claims reference:
    https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference

Update from latest evidence:
- New token samples now show `roles` and `tier` in both ID token and API access token.
- This suggests earlier 403 behavior was transitional/configuration-related, not a permanent platform limitation.

<a id="SEC-PAYLOAD-REALITY"></a>
### OnTokenIssuanceStart payload reality (writer note)

Observed payload content in this POC:
- Includes tenant, listener IDs, client and resource service principals, and user basic identity.
- Does not include roles/groups in the callout payload used by the function.

Writer guidance:
- Do not assume role/group claims are available inside TokenIssuanceStart payload.
- If tier depends on role or custom attributes, define one of these patterns explicitly:
  - deterministic mapping not requiring external lookup,
  - Graph lookup at runtime,
  - precomputed attribute persisted on user and read at token time.

References:
- External ID user attributes concept:
    https://learn.microsoft.com/en-us/entra/external-id/customers/concept-user-attributes
- Define custom attributes:
    https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-define-custom-attributes

<a id="SEC-GRAPH-AUTH"></a>
### Graph authentication model for extension callouts

Writer recommendation:
- For Graph reads from Azure Function extension runtime, use non-interactive workload identity.
- Prefer managed identity when hosting model supports it; otherwise use confidential client credentials (app registration + certificate/secret) with least-privilege Graph application permissions.
- Avoid designing this flow around a human user account and MFA prompts.

<a id="SEC-AADSTS50146"></a>
### AADSTS50146 outage prevention and rollback

Writer recommendation:
- Add explicit warning that custom claims provider enablement requires valid app-specific signing keys on service principals.
- Add rollback runbook: if AADSTS50146 appears, disable extension/claims provider path to restore sign-in, then repair signing key configuration and re-enable.

Reference:
- Error code reference:
    https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes

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

## Validation Session Log

### 2026-05-13
- Created initial gap register from current POC implementation and docs.
- Added eight initial gap items and four confirmed alignments.
- Next pass: mark each gap as Validated or Closed with concrete wording changes for the migration draft.
- Added G-009 for Cognito resource-server discoverability gap in the current AWS console UX.
- Added writer-ready text and references to prevent confusion between concept validity and console navigation changes.
- Reviewed PR #1 and branch diff against main; added PR-context gaps (G-010 to G-014) for documentation completeness, security hygiene, and config consistency.
- Added G-015 for tooling preflight validation to reduce setup friction during migration execution.
- Added G-016 (MFA out-of-scope for this POC) and G-017 (ID token roles present but API access token roles missing, causing 403).
- Updated G-017 to Validated with latest token evidence showing roles restored in access token.
- Added G-018 (TokenIssuanceStart payload lacks role/group claims), G-019 (Graph auth model guidance), and G-020 (AADSTS50146 resilience and rollback).
- Updated G-002 to Validated with an app-roles-first recommendation and Microsoft reference (groups assigned to roles pattern).
- Added a new Gap Register column, "Deep-dive section", to link each relevant gap to detailed analysis sections below (starting with G-002 and other high-impact items).
- Added stable section anchors and an Anchor Index. Gap register deep-dive references now use anchor IDs to remain stable if section titles change.
- Updated G-001 wording to reflect agreement with article dual-run guidance; kept as open only because dual-token acceptance has not been tested in this POC.
