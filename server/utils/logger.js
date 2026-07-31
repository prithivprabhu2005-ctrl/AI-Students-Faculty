const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const combinedLogPath = path.join(logsDir, 'combined.log');
const errorLogPath = path.join(logsDir, 'error.log');

function formatMessage(level, message, meta = '') {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
  return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}\n`;
}

function writeToFile(filePath, content) {
  fs.appendFile(filePath, content, (err) => {
    if (err) console.error('Failed to write log:', err);
  });
}

const logger = {
  info: (message, meta) => {
    const formatted = formatMessage('info', message, meta);
    console.log(formatted.trim());
    writeToFile(combinedLogPath, formatted);
  },
  warn: (message, meta) => {
    const formatted = formatMessage('warn', message, meta);
    console.warn(formatted.trim());
    writeToFile(combinedLogPath, formatted);
  },
  error: (message, meta) => {
    const formatted = formatMessage('error', message, meta);
    console.error(formatted.trim());
    writeToFile(combinedLogPath, formatted);
    writeToFile(errorLogPath, formatted);
  }
};

module.exports = logger;
