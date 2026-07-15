import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';
const logDir = process.env.LOG_DIR ?? path.resolve(process.cwd(), 'logs');
const appLogFile = path.join(logDir, 'app.log');
const errorLogFile = path.join(logDir, 'error.log');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const streams = [
  { level, stream: process.stdout },
  { level: 'error', stream: pino.destination({ dest: errorLogFile, sync: false }) },
  { level, stream: pino.destination({ dest: appLogFile, sync: false }) },
];

export const logger = pino({ level }, pino.multistream(streams));
