# Pre Token Generation Lambda - Deployment Guide

## Overview

This Lambda function is triggered by AWS Cognito **before issuing tokens** and injects the `custom:tier` custom attribute into both ID and access tokens.

## Prerequisites

1. **Cognito User Pool**: `us-east-2_EZsrSxHBb` (or your pool ID)
2. **Custom Attribute**: `custom:tier` created and populated on users
3. **Lambda Function**: Code deployed to AWS Lambda (runtime: Node.js 20.x)
4. **IAM Role**: Lambda execution role with no special permissions needed for this function

## Deployment Steps

### Step 1: Create Lambda Function in AWS Console

1. Go to **AWS Lambda** console
2. Click **Create function**
3. Choose **Author from scratch**
4. Configure:
   - **Function name**: `cognito-pretoken-generation` (or your preference)
   - **Runtime**: Node.js 20.x
   - **Architecture**: x86_64
   - **Execution role**: Create new basic Lambda role (no special permissions needed)
5. Click **Create function**

### Step 2: Add Lambda Code

1. In the Lambda console, under **Code** tab, open the inline editor
2. Replace the default code with the contents of `index.mjs`
3. Click **Deploy**
4. Verify: No deployment errors should appear

### Step 3: Attach Lambda to Cognito User Pool

1. Go to **AWS Cognito** > **User pools** > `us-east-2_EZsrSxHBb`
2. Under **App integration**, select **App clients and analytics**
3. Click on your app client (e.g., `2jcjrvftiedm8rtp8ii8pt1heb`)
4. Scroll down to **Lambda triggers**
5. Under **Pre token generation**, select your Lambda function from the dropdown
6. Click **Save changes**

### Step 4: Verify Deployment

1. **Sign out** of your application completely
2. **Sign back in** via Cognito Hosted UI
3. Check that the custom:tier claim now appears in:
   - ID Token (decoded at jwt.io): look for `"custom:tier": "value"`
   - Access Token (decoded at jwt.io): look for `"custom:tier": "value"`
4. Call `/api/viewer` from the frontend to confirm the tier is present in the token

## Event Version Compatibility

This Lambda uses the **event version 2.0+ format** with `claimsAndScopeOverrideDetails`.

- ✅ Works with: Cognito event version 2.0 and later
- ❌ Does NOT work with: older event versions using `claimsOverrideDetails` (deprecated)

If you receive an error like `"claimsOverrideDetails is not a valid claim override format"`, ensure your user pool is using event version 2.0+.

## Troubleshooting

### Custom:tier Claim Not Appearing in Tokens

1. Verify the custom:tier attribute exists on the user in Cognito console
2. Verify the Lambda is attached to the **Pre token generation** trigger (not "Pre authentication")
3. Ensure you signed out completely and signed back in after attaching the Lambda
4. Check Lambda CloudWatch logs for errors
5. Verify the Lambda code uses `claimsAndScopeOverrideDetails` format (not old `claimsOverrideDetails`)

### Lambda Execution Errors

1. Check **CloudWatch Logs** for the Lambda function
2. Verify the user has the `custom:tier` attribute set (not null/empty)
3. Ensure the Lambda event structure is correct (should have `event.request.userAttributes`)

### Token Still Missing Claim After Fix

1. Clear browser cookies for your app
2. Sign out of Cognito session
3. Close and reopen the browser
4. Sign in again

## Code Changes

If you need to modify the Lambda code:

1. Update `index.mjs` locally
2. Copy the updated code to AWS Lambda console
3. Click **Deploy**
4. Sign out and back in to test new behavior

## Integration with Application

### Backend (`packages/backend/src/app.controller.ts`)

The `/api/viewer` endpoint expects the `custom:tier` claim in the JWT:

```typescript
GET /api/viewer
Authorization: Bearer <access_token_with_custom:tier_claim>

Response:
{
  "statusCode": 200,
  "message": "Viewer access granted",
  "businessResult": "This is the Business result for the controller ViewerController",
  "data": {
    "tier": "viewer"  // from custom:tier claim
  }
}
```

### Frontend (`packages/frontend/src/App.tsx`)

The UI displays the tier in the summary cards:

```tsx
Tier: user: viewer  // or "user: admin" depending on custom:tier value
```

## Related Files

- Source code: [index.mjs](./index.mjs)
- Backend controller: [app.controller.ts](../../app.controller.ts)
- Frontend: [App.tsx](../../../frontend/src/App.tsx)
- Plan: [plan.md](../../../plan.md)
