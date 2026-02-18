'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

// ─────────────────────────────────────────────
// Custom format: add timestamp + service label
// ─────────────────────────────────────────────
const baseFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    format.errors({ stack: true }),
    format((info) => {
        info.service = 'research-engine';
        return info;
    })()
);

// ─────────────────────────────────────────────
// Transport list
// ─────────────────────────────────────────────
const logTransports = [
    new transports.Console({
        format: isProduction
            ? format.combine(baseFormat, format.json())
            : format.combine(
                baseFormat,
                format.colorize(),
                format.printf(({ timestamp, level, message, service, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                    return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
                })
            ),
    }),
];

// In production, also write errors to a file
if (isProduction) {
    logTransports.push(
        new transports.File({
            filename: path.join(process.cwd(), 'logs', 'error.log'),
            level: 'error',
            format: format.combine(baseFormat, format.json()),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        })
    );
}

// ─────────────────────────────────────────────
// Logger instance
// ─────────────────────────────────────────────
const logger = createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    transports: logTransports,
    exitOnError: false,
});

module.exports = logger;
