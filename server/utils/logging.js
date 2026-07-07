function getStringSize(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value.length;
  if (value == null) return 0;

  try {
    return JSON.stringify(value).length;
  } catch (error) {
    return 0;
  }
}

export function logStageEvent(stage, metrics = {}) {
  if (process.env.NODE_ENV === 'test' || process.env.LOG_LEVEL === 'off') {
    return;
  }

  const payload = {
    stage,
    durationMs: metrics.durationMs ?? 0,
    inputSize: getStringSize(metrics.inputSize),
    outputSize: getStringSize(metrics.outputSize),
    warnings: Array.isArray(metrics.warnings) ? metrics.warnings : [],
    validationResult: metrics.validationResult ?? 'unknown',
    details: Array.isArray(metrics.details) ? metrics.details : [],
  };

  console.info(`[stage] ${JSON.stringify(payload)}`);
}

export class StageError extends Error {
  constructor(stage, reason, options = {}) {
    super(reason);
    this.name = 'StageError';
    this.stage = stage;
    this.reason = reason;
    this.recoverable = options.recoverable ?? true;
    this.suggestedFix = options.suggestedFix ?? 'Review the input and retry the stage.';
    this.details = Array.isArray(options.details) ? options.details : [];
    this.statusCode = options.statusCode ?? 500;
  }
}

export function createStageError(stage, reason, options = {}) {
  return new StageError(stage, reason, options);
}
