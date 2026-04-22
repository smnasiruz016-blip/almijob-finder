type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString()
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
}
