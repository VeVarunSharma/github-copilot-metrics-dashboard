import pino from 'pino';

export function createLogger(verbose = false) {
  const isDev = process.env.NODE_ENV !== 'production';
  return pino({
    level: verbose ? 'debug' : process.env.LOG_LEVEL ?? 'info',
    redact: ['githubToken', 'token', 'headers.authorization', 'Authorization'],
    transport: isDev ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } } : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
