module.exports = async function (context, req) {
  try {
    const body = req.body || {};

    // Correlation ID is useful for tracing extension calls end-to-end.
    const correlationId =
      body?.data?.authenticationContext?.correlationId ||
      body?.data?.authenticationContext?.correlationID ||
      "";

    // Replace this with your real user tier lookup logic.
    const email =
      body?.data?.user?.mail ||
      body?.data?.user?.userPrincipalName ||
      "";
    const tier = email.toLowerCase().endsWith("@contoso.com")
      ? "enterprise"
      : "standard";

    const responsePayload = {
      data: {
        "@odata.type": "microsoft.graph.onTokenIssuanceStartResponseData",
        actions: [
          {
            "@odata.type": "microsoft.graph.tokenIssuanceStart.provideClaimsForToken",
            claims: {
              tier,
              ApiVersion: "1.0.0",
              CorrelationId: correlationId,
            },
          },
        ],
      },
    };

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: responsePayload,
    };
  } catch (err) {
    context.log.error("Token issuance extension error:", err);

    // Fail open with a safe default claim to avoid blocking sign-ins.
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        data: {
          "@odata.type": "microsoft.graph.onTokenIssuanceStartResponseData",
          actions: [
            {
              "@odata.type": "microsoft.graph.tokenIssuanceStart.provideClaimsForToken",
              claims: {
                tier: "standard",
                ApiVersion: "1.0.0",
              },
            },
          ],
        },
      },
    };
  }
};