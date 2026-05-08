using System.Net;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace PretokenTierFunction;

public static class Program
{
    public static void Main()
    {
        var host = new HostBuilder()
            .ConfigureFunctionsWorkerDefaults()
            .ConfigureServices(services =>
            {
                services.Configure<JsonSerializerOptions>(options =>
                {
                    options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                });
            })
            .Build();

        host.Run();
    }
}

public sealed class PretokenTierFunction
{
    private readonly ILogger<PretokenTierFunction> _logger;

    public PretokenTierFunction(ILogger<PretokenTierFunction> logger)
    {
        _logger = logger;
    }

    [Function("pretoken-tier")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req)
    {
        string body = await new StreamReader(req.Body).ReadToEndAsync();

        string? correlationId = null;
        const string tier = "premium";

        try
        {
            JsonNode? root = JsonNode.Parse(body);
            correlationId = root?["data"]?["authenticationContext"]?["correlationId"]?.GetValue<string>();
            var payloadSummary = BuildPayloadSummary(root);
            var userId = root?["data"]?["authenticationContext"]?["user"]?["id"]?.GetValue<string>();
            var userPrincipalName = root?["data"]?["authenticationContext"]?["user"]?["userPrincipalName"]?.GetValue<string>();

            _logger.LogInformation("Using hardcoded tier value: {Tier}", tier);
            _logger.LogInformation("TokenIssuanceStart payload summary: {PayloadSummary}", payloadSummary);
            _logger.LogInformation("TokenIssuanceStart user context: userId={UserId}, userPrincipalName={UserPrincipalName}",
                userId ?? "<none>",
                userPrincipalName ?? "<none>");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Unable to parse request JSON; continuing with hardcoded tier claim: {Tier}. BodyLength={BodyLength}",
                tier,
                body.Length);
        }

        _logger.LogInformation("OnTokenIssuanceStart processed. CorrelationId: {CorrelationId}", correlationId ?? "n/a");

        var responseBody = new JsonObject
        {
            ["data"] = new JsonObject
            {
                ["@odata.type"] = "microsoft.graph.onTokenIssuanceStartResponseData",
                ["actions"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["@odata.type"] = "microsoft.graph.tokenIssuanceStart.provideClaimsForToken",
                        ["claims"] = new JsonObject
                        {
                            ["tier"] = tier,
                            ["CorrelationId"] = correlationId
                        }
                    }
                }
            }
        };

        HttpResponseData response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");
        await response.WriteStringAsync(responseBody.ToJsonString());

        return response;
    }

    private static string BuildPayloadSummary(JsonNode? root)
    {
        var data = root?["data"];
        var authUser = data?["authenticationContext"]?["user"];
        var claimsPrincipal = data?["claimsPrincipal"];
        var claimsNode = claimsPrincipal?["claims"];

        var summary = new JsonObject
        {
            ["dataKeys"] = GetObjectKeys(data),
            ["authenticationUserKeys"] = GetObjectKeys(authUser),
            ["claimsPrincipalKeys"] = GetObjectKeys(claimsPrincipal),
            ["claimsNodeType"] = GetNodeType(claimsNode),
            ["claimsNodeNames"] = GetClaimNames(claimsNode)
        };

        return summary.ToJsonString();
    }

    private static JsonArray GetObjectKeys(JsonNode? node)
    {
        var result = new JsonArray();
        if (node is not JsonObject jsonObject)
        {
            return result;
        }

        foreach (var key in jsonObject)
        {
            result.Add(key.Key);
        }

        return result;
    }

    private static string GetNodeType(JsonNode? node)
    {
        if (node is null)
        {
            return "null";
        }

        if (node is JsonObject)
        {
            return "object";
        }

        if (node is JsonArray)
        {
            return "array";
        }

        return "value";
    }

    private static JsonArray GetClaimNames(JsonNode? claimsNode)
    {
        var result = new JsonArray();
        var uniqueNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (claimsNode is JsonObject claimsObject)
        {
            foreach (var key in claimsObject)
            {
                if (!string.IsNullOrWhiteSpace(key.Key) && uniqueNames.Add(key.Key))
                {
                    result.Add(key.Key);
                }
            }

            return result;
        }

        if (claimsNode is not JsonArray claimsArray)
        {
            return result;
        }

        foreach (var entry in claimsArray)
        {
            if (entry is not JsonObject claimObject)
            {
                continue;
            }

            var claimName = claimObject["id"]?.GetValue<string>()
                ?? claimObject["name"]?.GetValue<string>()
                ?? claimObject["type"]?.GetValue<string>();

            if (!string.IsNullOrWhiteSpace(claimName) && uniqueNames.Add(claimName))
            {
                result.Add(claimName);
            }
        }

        return result;
    }
}
