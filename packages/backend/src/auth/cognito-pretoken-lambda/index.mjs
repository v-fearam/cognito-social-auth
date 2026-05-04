/**
 * Pre Token Generation Lambda for AWS Cognito User Pool
 * 
 * Purpose:
 * - Triggered before issuing ID and access tokens
 * - Injects the `custom:tier` attribute from user attributes into token claims
 * - Enables application-level authorization decisions based on tier value
 * 
 * Trigger: Pre Token Generation (NOT Pre Authentication)
 * Event Version: 2.0+ (uses claimsAndScopeOverrideDetails format)
 * Runtime: Node.js 20.x ES Module
 * 
 * Deployment:
 * 1. Go to AWS Cognito User Pool > General settings > App clients
 * 2. Select the app client for this project
 * 3. Scroll to "Lambda triggers"
 * 4. Under "Pre token generation", select this Lambda function
 * 5. Sign out and back in to receive tokens with the new claim
 * 
 * Token Claims:
 * - ID Token: includes custom:tier claim
 * - Access Token: includes custom:tier claim
 * - Allows backend/frontend to make authorization decisions based on tier
 */
export const handler = async (event) => {
  // Extract custom:tier from user attributes
  // User attributes come from Cognito user pool (set via console or programmatically)
  const tier = event?.request?.userAttributes?.["custom:tier"];

  // If no tier is set, return event unchanged (user has no tier claim)
  if (!tier) {
    return event;
  }

  // Initialize response structure for claim overrides
  event.response = event.response || {};
  event.response.claimsAndScopeOverrideDetails = {
    // Add custom:tier to ID Token claims
    idTokenGeneration: {
      claimsToAddOrOverride: {
        "custom:tier": tier,
      },
    },
    // Add custom:tier to Access Token claims
    accessTokenGeneration: {
      claimsToAddOrOverride: {
        "custom:tier": tier,
      },
    },
  };

  return event;
};
