type LogDetails = Record<string, unknown>;

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause instanceof Error ? error.cause.message : error.cause,
    };
  }

  return { value: String(error) };
}

function write(level: "INFO" | "WARN" | "ERROR", event: string, details?: LogDetails) {
  const prefix = `[${new Date().toISOString()}] [${level}] ${event}`;
  const seen = new WeakSet<object>();
  const serializedDetails = details
    ? JSON.stringify(details, (_key, value: unknown) => {
        if (typeof value === "bigint") return value.toString();
        if (value && typeof value === "object") {
          if (seen.has(value)) return "[Circular]";
          seen.add(value);
        }
        return value;
      })
    : undefined;
  const output = serializedDetails ? `${prefix} ${serializedDetails}` : prefix;

  if (level === "ERROR") {
    console.error(output);
  } else if (level === "WARN") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export function logInfo(event: string, details?: LogDetails) {
  write("INFO", event, details);
}

export function logWarn(event: string, details?: LogDetails) {
  write("WARN", event, details);
}

export function logError(event: string, error: unknown, details?: LogDetails) {
  write("ERROR", event, { ...details, error: normalizeError(error) });
}
