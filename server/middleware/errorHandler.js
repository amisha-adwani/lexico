export default function errorHandler(err, req, res, next) {
  const stageErrorPayload = err && typeof err === "object" && err.stage
    ? {
        stage: err.stage,
        reason: err.reason || err.message || "Stage failed",
        recoverable: err.recoverable !== false,
        suggestedFix: err.suggestedFix || "Review the input and retry the stage.",
        details: Array.isArray(err.details) ? err.details : [],
      }
    : null;

  if (err?.name === "AbortError") {
    return res.status(408).json({
      error: "Request timeout",
      stageError: {
        stage: "AI Request",
        reason: "Upstream model request timed out",
        recoverable: true,
        suggestedFix: "Retry the request with smaller input text.",
        details: [],
      },
    });
  }

  if (stageErrorPayload) {
    return res.status(err.statusCode || 500).json({
      error: "stage_failed",
      message: stageErrorPayload.reason,
      stageError: stageErrorPayload,
    });
  }

  console.error("Server Error:", err);

  return res.status(500).json({
    error: err?.message || "Internal Server Error",
  });
}
