# Migration Plan: Cognito → Entra External ID (Tasks 14–16)

**Date:** 2026-05-11  
**Status:** In Progress

---

## Overview

This document provides step-by-step instructions for migrating users from AWS Cognito User Pool to Microsoft Entra External ID. It covers:

- **Task 14:** Export users from Cognito (AWS CLI)
- **Task 15:** Import users to External ID (Microsoft Graph API)
- **Task 16:** Test the migrated happy path

### Environment Reference

| Component | Value |
|---|---|
| Cognito User Pool ID | `us-east-2_EZsrSxHBb` |
| AWS Region | `us-east-2` |
| Entra Tenant ID | `0a3af0e3-416b-4a6b-97e9-cb3a9a094449` |
| Entra Subdomain | `cognitomigration` |
| Entra Domain | `cognitomigration.onmicrosoft.com` |
| SPA App ID | `6d28eafe-06fd-46d7-b04a-3403048dfd1c` |
| API App ID | `6c959c17-63ba-4477-b66e-928d7d9ba937` |
| SPA Service Principal | `80ccb07b-43d5-4063-a67d-672616026aeb` |
| API Service Principal | `d9b212cf-0aec-41dc-ab19-3b0c1ccbb20c` |

---

## Task 14: Export Users from Cognito

### Prerequisites

#### 1. Install AWS CLI v2 (if not already installed)

Download and install via MSI with elevated privileges:

```powershell
# Download the installer
Invoke-WebRequest -Uri "https://awscli.amazonaws.com/AWSCLIV2.msi" `
  -OutFile "$env:TEMP\AWSCLIV2.msi" -UseBasicParsing

# Install with admin elevation (silent)
Start-Process msiexec.exe `
  -ArgumentList "/i", "$env:TEMP\AWSCLIV2.msi", "/qn" `
  -Wait -Verb RunAs

# Refresh PATH in current session (required after install)
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + `
             [System.Environment]::GetEnvironmentVariable("PATH", "User")

# Verify
aws --version
# Expected: aws-cli/2.x.x Python/3.x.x Windows/11 exe/AMD64
```

#### 2. Authenticate with AWS

Use browser-based SSO login (recommended over access keys):

```powershell
# Configure default region (one-time)
aws configure set region us-east-2
aws configure set output json

# Login via browser (opens AWS Console SSO in default browser)
aws login
# A browser tab will open — sign in with your AWS credentials.
# The terminal will display: "Updated profile default to use ... credentials."

# Verify authentication
aws sts get-caller-identity --output json
```

> **Required IAM permissions:** `cognito-idp:ListUsers` and `cognito-idp:AdminListGroupsForUser`

### Step 14.1: List all users (raw export)

Export all users from the Cognito User Pool with all their attributes:

```powershell
aws cognito-idp list-users `
  --user-pool-id us-east-2_EZsrSxHBb `
  --region us-east-2 `
  --no-paginate `
  --no-cli-pager `
  --output json > cognito-users-export.json

Write-Host "Exported. File size: $((Get-Item cognito-users-export.json).Length) bytes"
```

> **Important:** The `--no-cli-pager` flag is required. Without it, the AWS CLI opens an interactive pager (`-- More --`) that blocks script execution and prevents output redirection to a file.

This returns a JSON object with a `Users` array. Each user contains:
- `Username` — Cognito username (for native users: UUID like `f12b65b0-...`; for social users: provider prefix + ID, e.g., `google_106279...`)
- `Attributes` — Array of `{Name, Value}` pairs including `sub`, `email`, `custom:tier`, `identities`, etc.
- `UserStatus` — `CONFIRMED` (native email/pass users), `EXTERNAL_PROVIDER` (social/federated users)
- `Enabled` — Whether the account is active

### Step 14.2: Get group memberships for each user

Cognito `list-users` does **not** include group memberships. You must query groups per user:

```powershell
# Get groups for a specific user
aws cognito-idp admin-list-groups-for-user `
  --user-pool-id us-east-2_EZsrSxHBb `
  --username "<USERNAME>" `
  --region us-east-2 `
  --no-cli-pager `
  --output json
```

### Step 14.3: Automated enriched export script

Run this PowerShell script to export all users with their groups and save to a single JSON file.
Copy-paste the entire block into a PowerShell console from the **project root** (`C:\repos\cognito-social-auth`):

```powershell
# Export Cognito users with groups — run from project root
$userPoolId = "us-east-2_EZsrSxHBb"
$region = "us-east-2"

# Step 1: Get all users (--no-cli-pager prevents interactive pager)
$usersJson = aws cognito-idp list-users `
  --user-pool-id $userPoolId `
  --region $region `
  --no-paginate `
  --no-cli-pager `
  --output json | ConvertFrom-Json

Write-Host "Found $($usersJson.Users.Count) users"

# Step 2: Enrich each user with group memberships
$enrichedUsers = @()
foreach ($user in $usersJson.Users) {
    Write-Host "Processing user: $($user.Username)"

    # Get groups for this user (--no-cli-pager required here too)
    $groupsJson = aws cognito-idp admin-list-groups-for-user `
      --user-pool-id $userPoolId `
      --username $user.Username `
      --region $region `
      --no-cli-pager `
      --output json | ConvertFrom-Json

    $groupNames = @()
    if ($groupsJson.Groups) {
        $groupNames = $groupsJson.Groups | ForEach-Object { $_.GroupName }
    }

    # Extract key attributes into a flat structure
    $attrs = @{}
    foreach ($attr in $user.Attributes) {
        $attrs[$attr.Name] = $attr.Value
    }

    # Parse social identities from the 'identities' attribute (JSON string)
    $socialIdentities = @()
    if ($attrs["identities"]) {
        $socialIdentities = $attrs["identities"] | ConvertFrom-Json
    }

    $enrichedUser = [PSCustomObject]@{
        Username         = $user.Username
        UserStatus       = $user.UserStatus
        Enabled          = $user.Enabled
        UserCreateDate   = $user.UserCreateDate
        Email            = $attrs["email"]
        EmailVerified    = $attrs["email_verified"]
        Sub              = $attrs["sub"]
        Name             = $attrs["name"]
        GivenName        = $attrs["given_name"]
        FamilyName       = $attrs["family_name"]
        CustomTier       = $attrs["custom:tier"]
        Groups           = $groupNames
        SocialIdentities = $socialIdentities
        RawAttributes    = $user.Attributes
    }

    $enrichedUsers += $enrichedUser
}

# Step 3: Save to file
$exportData = [PSCustomObject]@{
    ExportDate    = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    UserPoolId    = $userPoolId
    TotalUsers    = $enrichedUsers.Count
    Users         = $enrichedUsers
}

$exportData | ConvertTo-Json -Depth 10 | Set-Content -Path "cognito-users-enriched.json" -Encoding UTF8

Write-Host "`nExport complete: cognito-users-enriched.json"
Write-Host "Total users exported: $($enrichedUsers.Count)"
```

### Step 14.4: Verify the export

```powershell
# Quick verification
$data = Get-Content "cognito-users-enriched.json" | ConvertFrom-Json
Write-Host "Users exported: $($data.TotalUsers)"
$data.Users | ForEach-Object {
    Write-Host "  - $($_.Username) | Email: $($_.Email) | Groups: $($_.Groups -join ', ') | Tier: $($_.CustomTier) | Status: $($_.UserStatus)"
}
```

### Actual exported users (as of 2026-05-11)

| # | Username | Email | Type | Status | Groups | Tier | Migrate? |
|---|---|---|---|---|---|---|---|
| 1 | `f12b65b0-40c1-70a0-96d5-e4bc3644d42e` | far@clariusconsulting.net | Native (email/pass) | CONFIRMED | `admin` | `user: enterprise` | **NO** — tenant owner |
| 2 | `d10bd570-20c1-701b-562c-a1ae5edead55` | fedaracorp@gmail.com | Native (email/pass) | CONFIRMED | _(none)_ | _(none)_ | YES |
| 3 | `google_106279033361309510741` | farambarri@gmail.com | Google federated | EXTERNAL_PROVIDER | `viewer`, `us-east-2_EZsrSxHBb_Google` | `user: viewer` | YES |
| 4 | `facebook_122099169483299857` | far@clariusconsulting.net | Facebook federated | EXTERNAL_PROVIDER | `us-east-2_EZsrSxHBb_Facebook` | _(none)_ | **NO** — tenant owner |

### Key observations for Task 15 (import)

1. **`far@clariusconsulting.net` must NOT be migrated (Users 1 & 4).** This email belongs to the owner/admin of the Entra External ID tenant (Federico Arambarri, UPN `far_clariusconsulting.net#EXT#@cognitomigration.onmicrosoft.com`). This user already exists in Entra with `Identities: ExternalAzureAD`. Attempting to use a social provider (e.g., Facebook) with an enterprise domain email in an External ID tenant results in: **"Invalid consumer domain for social signup — The associated email cannot be used for signing up using this method since it belongs to an enterprise domain. If you want to use this email for signing up, please use other methods."** The import script must skip users with this email.
2. **Only 2 of 4 Cognito users are eligible for migration:** User 2 (`fedaracorp@gmail.com`, native) and User 3 (`farambarri@gmail.com`, Google federated).
3. **Auto-generated group names:** Cognito creates groups like `us-east-2_EZsrSxHBb_Google` automatically for social providers. These should be **skipped** during import — only map `admin` and `viewer` to Entra security groups.
4. **Social identity `userId` format:** Google uses a numeric ID (`106279033361309510741`), Facebook uses a shorter numeric ID (`122099169483299857`). These must be used as `issuerAssignedId` in Entra federated identity.
5. **Native users have no `identities` attribute:** Only social/federated users have the `identities` JSON string. Native users should be imported with `signInType: "emailAddress"` only.
6. **Tier values include prefix:** Cognito stores `"user: enterprise"` and `"user: viewer"` — decide whether to strip the `"user: "` prefix during import or keep as-is.
7. **Existing Entra users (as of 2026-05-11):** The tenant already has 2 users — Federico Arambarri (tenant owner, ExternalAzureAD) and Fred (test user, `fred@cognitomigration.onmicrosoft.com`). The import script must check for existing users before creating to avoid conflicts.

---

## Task 15: Import Users to External ID via Microsoft Graph

### What to run

> **Quick guide:** You only need to execute **3 steps**:
>
> 1. **Step 15.1** — Get a Graph API token
> 2. **Step 15.2** — Look up group IDs (first time only; once you know them, hardcode in Step 15.6)
> 3. **Step 15.6** — Run the automated import script (does everything: creates users, sets federated identities, assigns groups, sets tier)
>
> Steps 15.3–15.5 are **reference documentation only** — they explain what the Graph API calls look like individually but you do NOT need to run them. The automated script in 15.6 handles all of it.

### Prerequisites

- Azure CLI logged in to the External ID tenant (`az login --tenant 0a3af0e3-416b-4a6b-97e9-cb3a9a094449 --allow-no-subscriptions`)
- Microsoft Graph API permissions: `User.ReadWrite.All`, `GroupMember.ReadWrite.All`
- The `cognito-users-enriched.json` file from Task 14

### Step 15.1: Get a Graph API access token

```powershell
$token = az account get-access-token `
  --resource https://graph.microsoft.com `
  --query accessToken -o tsv
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
```

### Step 15.2: Look up Entra security group IDs

Before importing users, get the group IDs for `admin` and `viewer`:

```powershell
# Get admin group ID
$adminGroup = Invoke-RestMethod `
  -Uri "https://graph.microsoft.com/v1.0/groups?`$filter=displayName eq 'admin'" `
  -Headers $headers
$adminGroupId = $adminGroup.value[0].id
Write-Host "Admin group ID: $adminGroupId"

# Get viewer group ID
$viewerGroup = Invoke-RestMethod `
  -Uri "https://graph.microsoft.com/v1.0/groups?`$filter=displayName eq 'viewer'" `
  -Headers $headers
$viewerGroupId = $viewerGroup.value[0].id
Write-Host "Viewer group ID: $viewerGroupId"
```

### Step 15.3–15.5: Reference — Graph API calls (DO NOT RUN, informational only)

<details>
<summary>Click to expand reference documentation</summary>

#### Understanding federated identities

For each Cognito user with a social identity, create an Entra user with the matching federated identity link. This ensures that when the user signs in with the same Google/Facebook account, Entra matches them to the existing user record instead of creating a duplicate.

**Key concept:** The `identities` array on the Graph API user object uses `objectIdentity` resources:
- `signInType: "federated"` — for social providers
- `issuer: "google.com"` or `"facebook.com"` — the social provider
- `issuerAssignedId` — the provider's unique subject ID for the user (from Cognito's `identities` attribute)

#### Graph API: Create a user with Google federated identity

```http
POST https://graph.microsoft.com/v1.0/users
Content-Type: application/json

{
  "displayName": "User Display Name",
  "identities": [
    {
      "signInType": "federated",
      "issuer": "google.com",
      "issuerAssignedId": "<google-subject-id>"
    },
    {
      "signInType": "emailAddress",
      "issuer": "cognitomigration.onmicrosoft.com",
      "issuerAssignedId": "user@gmail.com"
    }
  ],
  "passwordProfile": {
    "password": "<random-strong-password>",
    "forceChangePasswordNextSignIn": false
  },
  "passwordPolicies": "DisablePasswordExpiration"
}
```

#### Graph API: Create a user with Facebook federated identity

```http
POST https://graph.microsoft.com/v1.0/users
Content-Type: application/json

{
  "displayName": "User Display Name",
  "identities": [
    {
      "signInType": "federated",
      "issuer": "facebook.com",
      "issuerAssignedId": "<facebook-subject-id>"
    },
    {
      "signInType": "emailAddress",
      "issuer": "cognitomigration.onmicrosoft.com",
      "issuerAssignedId": "user@email.com"
    }
  ],
  "passwordProfile": {
    "password": "<random-strong-password>",
    "forceChangePasswordNextSignIn": false
  },
  "passwordPolicies": "DisablePasswordExpiration"
}
```

### Step 15.4: Add users to security groups

After creating a user, add them to the appropriate security group(s):

```http
POST https://graph.microsoft.com/v1.0/groups/{group-id}/members/$ref
Content-Type: application/json

{
  "@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/{user-id}"
}
```

### Step 15.5: Set custom user attribute (tier)

If the `custom:tier` attribute is managed via extension properties, set it via Graph API:

```http
PATCH https://graph.microsoft.com/v1.0/users/{user-id}
Content-Type: application/json

{
  "extension_<b2c-extensions-app-id-no-hyphens>_tier": "premium"
}
```

> **Note:** The b2c-extensions-app ID is `6145e4b9-4a8f-437e-948d-0017b7885140`. Remove hyphens for the extension property name: `extension_6145e4b94a8f437e948d0017b7885140_tier`.

</details>

### Step 15.6: Automated import script

> **⚠️ Known Issues Fixed in This Script:**
>
> 1. **`SocialIdentities` wrapper object:** The enriched JSON stores social identities as `{ "value": [...], "Count": N }` (PowerShell serialization artifact). Access via `$user.SocialIdentities.value`, not `$user.SocialIdentities` directly.
> 2. **`Groups` inconsistent type:** When a user has one group, PowerShell serializes it as a string (`"admin"`); multiple groups become an array (`["viewer", "..."]`). Always wrap with `@()`.
> 3. **Enterprise domain emails blocked:** Entra External ID rejects social sign-up for emails belonging to enterprise domains (e.g., `@clariusconsulting.net`). Skip these users.
> 4. **Auto-generated Cognito groups:** Groups like `us-east-2_EZsrSxHBb_Google` are Cognito-internal; only map `admin` and `viewer`.

```powershell
# Import Cognito users to Entra External ID
$tenantDomain = "cognitomigration.onmicrosoft.com"

# Load exported users
$exportData = Get-Content "cognito-users-enriched.json" | ConvertFrom-Json

# Get Graph API token
$token = az account get-access-token `
  --resource https://graph.microsoft.com `
  --query accessToken -o tsv
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# Group IDs (from Step 15.2, or hardcode known values)
$adminGroupId = "68111139-64f5-4c57-9998-6d19af1be656"
$viewerGroupId = "d620a6d0-dc76-4a38-8b08-ddc03e43b1d5"

Write-Host "Admin group: $adminGroupId"
Write-Host "Viewer group: $viewerGroupId"

# Emails to skip (enterprise domain users that Entra rejects for social signup)
$skipEmails = @("far@clariusconsulting.net")

# Map Cognito provider names to Entra issuers
$providerMap = @{
    "Google"   = "google.com"
    "Facebook" = "facebook.com"
}

$importResults = @()

foreach ($user in $exportData.Users) {
    # Skip enterprise domain users (tenant owners / not migratable)
    if ($skipEmails -contains $user.Email) {
        Write-Host "--- SKIPPING: $($user.Email) (enterprise domain / tenant owner) ---"
        $importResults += [PSCustomObject]@{
            Email   = $user.Email
            Status  = "SKIPPED"
            EntraId = "N/A"
        }
        continue
    }

    Write-Host "`n--- Importing: $($user.Email) ---"

    # Build identities array
    $identities = @()

    # Add federated identity from social provider
    # NOTE: SocialIdentities is wrapped in {value: [...], Count: N} by PowerShell serialization
    $socialList = @($user.SocialIdentities.value)
    if ($socialList.Count -gt 0 -and $socialList[0].providerName) {
        foreach ($social in $socialList) {
            $issuer = $providerMap[$social.providerName]
            if ($issuer) {
                $identities += @{
                    signInType       = "federated"
                    issuer           = $issuer
                    issuerAssignedId = $social.userId
                }
                Write-Host "  Adding federated identity: $issuer / $($social.userId)"
            }
        }
    }

    # Add email identity
    if ($user.Email) {
        $identities += @{
            signInType       = "emailAddress"
            issuer           = $tenantDomain
            issuerAssignedId = $user.Email
        }
        Write-Host "  Adding email identity: $($user.Email)"
    }

    # Generate a random password (required by Graph API but won't be used for social sign-in)
    $randomPassword = -join ((65..90) + (97..122) + (48..57) + (33, 35, 36, 37, 38) | `
        Get-Random -Count 16 | ForEach-Object { [char]$_ })

    # Build display name
    $displayName = if ($user.Email) { $user.Email.Split("@")[0] } else { $user.Username }

    # Create user body
    $userBody = @{
        displayName      = $displayName
        identities       = $identities
        passwordProfile  = @{
            password                      = $randomPassword
            forceChangePasswordNextSignIn = $false
        }
        passwordPolicies = "DisablePasswordExpiration"
    } | ConvertTo-Json -Depth 5

    Write-Host "  Request body:"
    Write-Host $userBody

    try {
        # Create user
        $createdUser = Invoke-RestMethod `
            -Method Post `
            -Uri "https://graph.microsoft.com/v1.0/users" `
            -Headers $headers `
            -Body $userBody

        $userId = $createdUser.id
        Write-Host "  Created user: $userId"

        # Add to groups (wrap in @() because single-group users serialize as string)
        foreach ($group in @($user.Groups)) {
            $groupId = switch ($group) {
                "admin"  { $adminGroupId }
                "viewer" { $viewerGroupId }
                default  { $null }  # Skip auto-generated Cognito groups
            }
            if ($groupId) {
                $memberBody = @{
                    "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$userId"
                } | ConvertTo-Json

                Invoke-RestMethod `
                    -Method Post `
                    -Uri "https://graph.microsoft.com/v1.0/groups/$groupId/members/`$ref" `
                    -Headers $headers `
                    -Body $memberBody

                Write-Host "  Added to group: $group"
            }
        }

        # Set custom tier attribute (if available)
        if ($user.CustomTier) {
            $extensionBody = @{
                "extension_6145e4b94a8f437e948d0017b7885140_tier" = $user.CustomTier
            } | ConvertTo-Json

            Invoke-RestMethod `
                -Method Patch `
                -Uri "https://graph.microsoft.com/v1.0/users/$userId" `
                -Headers $headers `
                -Body $extensionBody

            Write-Host "  Set tier: $($user.CustomTier)"
        }

        $importResults += [PSCustomObject]@{
            Email   = $user.Email
            Status  = "SUCCESS"
            EntraId = $userId
        }

    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $importResults += [PSCustomObject]@{
            Email   = $user.Email
            Status  = "FAILED: $($_.Exception.Message)"
            EntraId = "N/A"
        }
    }
}

# Summary
Write-Host "`n=== Import Summary ==="
$importResults | Format-Table -AutoSize
```

### Step 15.7: Verification

After running the import script, run these 3 checks to confirm everything was migrated correctly.

#### Check 1: All users with identities

```powershell
$token = az account get-access-token `
  --resource https://graph.microsoft.com `
  --query accessToken -o tsv
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# List all users with their identities
$users = Invoke-RestMethod `
  -Uri "https://graph.microsoft.com/v1.0/users?`$select=displayName,identities,id" `
  -Headers $headers
$users.value | ForEach-Object {
    Write-Host "`n$($_.displayName) ($($_.id)):"
    $_.identities | ForEach-Object {
        Write-Host "  $($_.signInType): $($_.issuer) / $($_.issuerAssignedId)"
    }
}
```

**What to look for:**
- `fedaracorp` should have: `emailAddress: cognitomigration.onmicrosoft.com / fedaracorp@gmail.com`
- `farambarri` should have: `federated: google.com / 106279033361309510741` AND `emailAddress: cognitomigration.onmicrosoft.com / farambarri@gmail.com`

#### Check 2: Tier attribute (custom extension property)

```powershell
$token = az account get-access-token `
  --resource https://graph.microsoft.com `
  --query accessToken -o tsv
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$users = Invoke-RestMethod `
  -Uri "https://graph.microsoft.com/v1.0/users?`$select=id,displayName,extension_6145e4b94a8f437e948d0017b7885140_tier" `
  -Headers $headers
foreach ($u in $users.value) {
    $tier = $u.extension_6145e4b94a8f437e948d0017b7885140_tier
    if (-not $tier) { $tier = "(none)" }
    Write-Host "$($u.displayName) | $($u.id) | tier: $tier"
}
```

**What to look for:**
- `farambarri` should show `tier: user: viewer`
- All other users should show `tier: (none)`

> **Note on extension properties:** Entra External ID stores custom attributes using the format `extension_{b2c-extensions-app-id-no-hyphens}_{attributeName}`. The long prefix `extension_6145e4b94a8f437e948d0017b7885140_` is mandatory — it cannot be shortened or renamed. This is a Microsoft Graph API requirement. See: [Define custom attributes — Microsoft Entra External ID](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-define-custom-attributes)
>
> | Feature | What we use | Visible in portal? |
> |---|---|---|
> | **Directory extension properties** (`extension_{appId}_tier`) | ✅ Yes — set via Graph API `PATCH /users` | ❌ **No** — not shown in the user properties page |
> | **Custom security attributes** | ❌ No — different feature | ✅ Yes — visible under user's "Custom security attributes" tab |
>
> Directory extension properties have no portal UI — they can only be read/written via Microsoft Graph API. See: [Add custom data to resources using extensions — Microsoft Graph](https://learn.microsoft.com/en-us/graph/extensibility-overview)

#### Check 3: Group memberships

```powershell
$token = az account get-access-token `
  --resource https://graph.microsoft.com `
  --query accessToken -o tsv
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$users = Invoke-RestMethod `
  -Uri "https://graph.microsoft.com/v1.0/users?`$select=id,displayName" `
  -Headers $headers
foreach ($u in $users.value) {
    $groups = Invoke-RestMethod `
      -Uri "https://graph.microsoft.com/v1.0/users/$($u.id)/memberOf?`$select=displayName" `
      -Headers $headers
    $groupNames = ($groups.value | ForEach-Object { $_.displayName }) -join ", "
    if (-not $groupNames) { $groupNames = "(none)" }
    Write-Host "$($u.displayName) | groups: $groupNames"
}
```

**What to look for:**
- `farambarri` should be in the `viewer` group
- `fedaracorp` should have no groups

**Expected results for our migration:**

| User | Identities | Group | Tier |
|---|---|---|---|
| fedaracorp@gmail.com | emailAddress: fedaracorp@gmail.com | (none) | (none) |
| farambarri@gmail.com | federated: google.com/106279033361309510741, emailAddress: farambarri@gmail.com | viewer | user: viewer |
| far@clariusconsulting.net | SKIPPED (enterprise domain / tenant owner) | — | — |

> **Note:** Entra user IDs change each time users are re-created. Do not hardcode them — always look them up via the scripts above.

---

## Task 16: Test the Migrated Happy Path

After importing users, run through each scenario below. Record pass/fail for each.

### Test Checklist

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 1 | **Google social sign-in (migrated user)** | Sign in with the same Google account used in Cognito | Entra matches the existing user via federated identity (not a new registration). Token includes correct `roles` and `tier` claim. | |
| 2 | **Facebook social sign-in (migrated user)** | Sign in with the same Facebook account used in Cognito | Same as above — existing user matched, not duplicated. | |
| 3 | **New user sign-up** | A brand-new Google user signs up via the user flow | Entra creates a new user with expected default attributes. | |
| 4 | **API call with Entra token (admin)** | Admin user calls `/api/admin` and `/api/viewer` | Both return 200 with decoded claims. Admin role visible in token. | |
| 5 | **API call with Entra token (viewer)** | Viewer user calls `/api/viewer` and `/api/admin` | `/api/viewer` → 200, `/api/admin` → 403. Viewer role visible in token. | |
| 6 | **Custom tier claim in token** | Sign in with migrated user, inspect token | `tier` claim appears via custom authentication extension (currently hardcoded `"premium"`). | |
| 7 | **Token refresh** | Wait for access token to expire, let MSAL refresh silently | App continues working without re-prompting user. | |
| 8 | **Account linking / no duplication** | Migrated Google user signs in again | Same user ID, no duplicate account created in Entra. | |

### How to Run Tests

1. **Start the backend:**
   ```powershell
   npm run start:dev -w @csa/backend
   ```

2. **Start the frontend:**
   ```powershell
   npm run dev -w @csa/frontend
   ```

3. **Sign in with each migrated user** at `http://localhost:5173`

4. **Verify in the UI:**
   - Profile page shows correct email, display name
   - Summary cards show correct role and tier
   - API actions panel: test `/api/profile`, `/api/viewer`, `/api/admin`

5. **Verify in Entra admin center:**
   - Browse to `Users` → confirm migrated users exist
   - Check each user's `Group memberships` tab
   - Confirm no duplicate users were created

### How to verify federated identity matching (no duplication)

After a migrated Google user signs in, verify the same user ID is reused (not a new account created):

```powershell
# List all users and check for duplicates
$token = az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$users = Invoke-RestMethod `
  -Uri "https://graph.microsoft.com/v1.0/users?`$select=id,displayName,identities" `
  -Headers $headers
$users.value | ForEach-Object {
    Write-Host "`n$($_.displayName) ($($_.id)):"
    $_.identities | ForEach-Object {
        Write-Host "  $($_.signInType): $($_.issuer) / $($_.issuerAssignedId)"
    }
}
# If you see the same email appearing on two different user IDs, there's a duplicate.
```

> **⚠️ Note:** The `identities/any()` OData filter does NOT work on External ID tenants (returns 400 Bad Request). Always use the full user list approach above instead.

---

## Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `Request_BadRequest` on user create | Missing required fields or invalid identity format | Ensure `identities` array has valid `signInType`, `issuer`, and `issuerAssignedId` |
| Duplicate user on social sign-in | Federated `issuerAssignedId` doesn't match the social provider's subject ID | Verify the `userId` from Cognito's `identities` attribute matches exactly |
| User not matched on Google sign-in | `issuer` must be exactly `"google.com"` (not `"accounts.google.com"`) | Use `google.com` as the issuer |
| `Authorization_RequestDenied` | Token lacks `User.ReadWrite.All` permission | Re-login with `az login` and ensure Global Admin or User Admin role |
| Graph API throttling (429) | Too many requests in a short window | Add `Start-Sleep -Milliseconds 500` between requests |

### Verifying the Cognito `identities` attribute

The `identities` attribute in Cognito is a JSON string. For a Google social user it looks like:

```json
[
  {
    "userId": "115123456789012345678",
    "providerName": "Google",
    "providerType": "Google",
    "issuer": null,
    "primary": true,
    "dateCreated": 1714000000000
  }
]
```

The `userId` field is the Google subject ID that must be used as `issuerAssignedId` in the Entra federated identity.

---

## Documentation References

- **AWS CLI `list-users`:** https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/list-users.html
- **AWS CLI `admin-list-groups-for-user`:** https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/admin-list-groups-for-user.html
- **Graph API `POST /users`:** https://learn.microsoft.com/en-us/graph/api/user-post-users (Example 2: social + local identities, Example 3: external tenant customer)
- **Graph API `objectIdentity`:** https://learn.microsoft.com/en-us/graph/api/resources/objectidentity
- **Graph API `POST /groups/{id}/members/$ref`:** https://learn.microsoft.com/en-us/graph/api/group-post-members
- **Manage customer accounts in External ID:** https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-manage-customer-accounts
