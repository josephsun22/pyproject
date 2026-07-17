using System.Diagnostics;
using System.Globalization;

namespace TaskApi.Middleware;

/// <summary>
/// Logs each request and adds an X-Request-Duration-Ms response header.
/// Mirrors backend/config/middleware/logging.py from the Django app.
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var request = context.Request;
        _logger.LogInformation("{Method} {Path}", request.Method, request.Path.Value);

        context.Response.OnStarting(() =>
        {
            var durationMs = stopwatch.Elapsed.TotalMilliseconds;
            context.Response.Headers["X-Request-Duration-Ms"] =
                durationMs.ToString("F2", CultureInfo.InvariantCulture);
            return Task.CompletedTask;
        });

        await _next(context);

        stopwatch.Stop();
        var elapsedMs = stopwatch.Elapsed.TotalMilliseconds;
        var forwardedFor = request.Headers["X-Forwarded-For"].ToString();
        var clientIp = string.IsNullOrWhiteSpace(forwardedFor)
            ? context.Connection.RemoteIpAddress?.ToString() ?? "-"
            : forwardedFor.Split(',')[0].Trim();
        var userAgent = request.Headers.UserAgent.ToString();
        if (string.IsNullOrEmpty(userAgent))
        {
            userAgent = "-";
        }

        _logger.LogInformation(
            "LoggingMiddleware: {Method} {Path} -> {StatusCode} ({DurationMs:F2}ms) client={ClientIp} ua={UserAgent}",
            request.Method,
            request.Path.Value,
            context.Response.StatusCode,
            elapsedMs,
            clientIp,
            userAgent);
    }
}
