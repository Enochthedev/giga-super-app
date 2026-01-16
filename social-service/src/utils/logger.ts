type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMeta {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  [key: string]: unknown;
}

const SERVICE_NAME = 'social-service';

function formatLog(level: LogLevel, message: string, meta?: LogMeta): string {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    ...meta,
  };
  return JSON.stringify(entry);
}

export const logger = {
  info: (message: string, meta?: LogMeta): void => {
    console.log(formatLog('info', message, meta));
  },

  warn: (message: string, meta?: LogMeta): void => {
    console.warn(formatLog('warn', message, meta));
  },

  error: (message: string, meta?: LogMeta): void => {
    console.error(formatLog('error', message, meta));
  },

  debug: (message: string, meta?: LogMeta): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatLog('debug', message, meta));
    }
  },
};

export default logger;
