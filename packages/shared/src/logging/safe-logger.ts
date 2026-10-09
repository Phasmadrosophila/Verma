import { DENIED_SECRET_FIELD_KEYS } from '../redaction/projection.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  timestamp: number;
  level: LogLevel;
  event: string;
  vaultId?: string;
  entryId?: string;
  entryType?: string;
  errorCategory?: string;
  meta?: Record<string, unknown>;
}

export class SafeLogger {
  private events: LogEvent[] = [];
  private sink?: (event: LogEvent) => void;

  constructor(sink?: (event: LogEvent) => void) {
    this.sink = sink;
  }

  public log(level: LogLevel, event: string, details: {
    vaultId?: string;
    entryId?: string;
    entryType?: string;
    errorCategory?: string;
    meta?: Record<string, unknown>;
  } = {}): LogEvent {
    const sanitizedMeta = details.meta ? this.sanitizeObject(details.meta) : undefined;

    const logEntry: LogEvent = {
      timestamp: Date.now(),
      level,
      event,
      ...(details.vaultId ? { vaultId: details.vaultId } : {}),
      ...(details.entryId ? { entryId: details.entryId } : {}),
      ...(details.entryType ? { entryType: details.entryType } : {}),
      ...(details.errorCategory ? { errorCategory: details.errorCategory } : {}),
      ...(sanitizedMeta ? { meta: sanitizedMeta } : {}),
    };

    this.events.push(logEntry);

    if (this.sink) {
      this.sink(logEntry);
    }

    return logEntry;
  }

  public info(event: string, details?: Parameters<SafeLogger['log']>[2]): LogEvent {
    return this.log('info', event, details);
  }

  public warn(event: string, details?: Parameters<SafeLogger['log']>[2]): LogEvent {
    return this.log('warn', event, details);
  }

  public error(event: string, details?: Parameters<SafeLogger['log']>[2]): LogEvent {
    return this.log('error', event, details);
  }

  public getLoggedEvents(): ReadonlyArray<LogEvent> {
    return this.events;
  }

  public clear(): void {
    this.events = [];
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (DENIED_SECRET_FIELD_KEYS.includes(key as any)) {
        sanitized[key] = '[REDACTED_SECRET]';
        continue;
      }

      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          sanitized[key] = value.map((item) =>
            typeof item === 'object' && item !== null
              ? this.sanitizeObject(item as Record<string, unknown>)
              : item
          );
        } else {
          sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

export const defaultLogger = new SafeLogger();
