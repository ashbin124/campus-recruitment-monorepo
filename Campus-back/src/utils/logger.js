const LEVEL_ORDER = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function resolveLevel() {
  const raw = String(process.env.LOG_LEVEL || '')
    .trim()
    .toLowerCase();
  if (raw && Object.prototype.hasOwnProperty.call(LEVEL_ORDER, raw)) return raw;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function normalizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  return meta;
}

function toPayload(level, message, meta = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...normalizeMeta(meta),
  };
}

function shouldLog(level) {
  const currentLevel = resolveLevel();
  return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel];
}

function write(level, message, meta = {}) {
  if (!shouldLog(level)) return;

  const payload = toPayload(level, message, meta);
  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

function serializeError(error) {
  if (!error) return null;
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
  };
}

export function logDebug(message, meta) {
  write('debug', message, meta);
}

export function logInfo(message, meta) {
  write('info', message, meta);
}

export function logWarn(message, meta) {
  write('warn', message, meta);
}

export function logError(message, meta) {
  write('error', message, meta);
}

export { serializeError };
