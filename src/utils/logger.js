import winston from 'winston';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import config from '../config/config.js';

// Create log directories if they don't exist
if (config.logging.logToFile) {
    if (!fs.existsSync(config.logging.logDirectory)) {
        fs.mkdirSync(config.logging.logDirectory, { recursive: true });
    }
    if (!fs.existsSync(config.logging.tradeHistoryDirectory)) {
        fs.mkdirSync(config.logging.tradeHistoryDirectory, { recursive: true });
    }
}

// Custom format for console output with colors
const consoleFormat = winston.format.printf(({ level, message, timestamp, agent, ...meta }) => {
    const ts = chalk.gray(timestamp);
    const agentTag = agent ? chalk.cyan(`[${agent}]`) : '';

    let levelColor;
    switch (level) {
        case 'error':
            levelColor = chalk.red.bold;
            break;
        case 'warn':
            levelColor = chalk.yellow.bold;
            break;
        case 'info':
            levelColor = chalk.blue.bold;
            break;
        case 'trade':
            levelColor = chalk.green.bold;
            break;
        default:
            levelColor = chalk.white;
    }

    const metaStr = Object.keys(meta).length ? '\n' + JSON.stringify(meta, null, 2) : '';

    return `${ts} ${levelColor(level.toUpperCase().padEnd(7))} ${agentTag} ${message}${metaStr}`;
});

// Define custom levels
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        trade: 2,
        info: 3,
        debug: 4,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        trade: 'green',
        info: 'blue',
        debug: 'gray',
    },
};

// Create transports
const transports = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            consoleFormat
        ),
    }),
];

// Add file transport if enabled
if (config.logging.logToFile) {
    transports.push(
        new winston.transports.File({
            filename: path.join(config.logging.logDirectory, 'error.log'),
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
        }),
        new winston.transports.File({
            filename: path.join(config.logging.logDirectory, 'combined.log'),
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
        }),
        new winston.transports.File({
            filename: path.join(config.logging.logDirectory, 'trades.log'),
            level: 'trade',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
        })
    );
}

// Create logger instance
const logger = winston.createLogger({
    levels: customLevels.levels,
    level: config.logging.level,
    transports,
    exitOnError: false,
});

winston.addColors(customLevels.colors);

// Helper functions
export function logTrade(tradeData) {
    logger.log('trade', 'Trade executed', tradeData);

    // Also save individual trade to file
    if (config.logging.logToFile) {
        const tradeFile = path.join(
            config.logging.tradeHistoryDirectory,
            `trade-${Date.now()}.json`
        );
        fs.writeFileSync(tradeFile, JSON.stringify(tradeData, null, 2));
    }
}

export function logArbitrage(opportunity) {
    logger.info('Arbitrage opportunity detected', { agent: 'ARBITRAGE', ...opportunity });
}

export function logPrice(chain, price, dex) {
    logger.info(`Price updated: $${price}`, { agent: chain.toUpperCase(), dex });
}

export function logError(agent, error, context = {}) {
    logger.error(error.message || error, { agent, error: error.stack, ...context });
}

export function logInfo(agent, message, meta = {}) {
    logger.info(message, { agent, ...meta });
}

export function logWarn(agent, message, meta = {}) {
    logger.warn(message, { agent, ...meta });
}

export function logAgentStart(agentName) {
    logger.info(chalk.green(`✓ ${agentName} started`), { agent: agentName });
}

export function logAgentStop(agentName) {
    logger.info(chalk.yellow(`⊗ ${agentName} stopped`), { agent: agentName });
}

export default logger;
