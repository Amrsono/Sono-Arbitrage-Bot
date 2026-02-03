import { SonoArbitrageBot } from './main.js';
import { logError, logInfo } from './utils/logger.js';
import chalk from 'chalk';

// Start the bot
const bot = new SonoArbitrageBot();

function setupShutdownHandlers(bot) {
    const shutdown = async (signal) => {
        console.log('\n');
        logInfo('MAIN', `Received ${signal}, shutting down gracefully...`);

        try {
            await bot.stop();
            logInfo('MAIN', chalk.green('✓ Shutdown complete'));
            process.exit(0);
        } catch (error) {
            logError('MAIN', error, { context: 'shutdown' });
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('uncaughtException', (error) => {
        logError('MAIN', error, { context: 'uncaught exception' });
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
        logError('MAIN', new Error(`Unhandled rejection: ${reason}`), {
            context: 'unhandled rejection',
        });
    });
}

bot.start().then(() => {
    setupShutdownHandlers(bot);
}).catch((error) => {
    logError('MAIN', error, { context: 'fatal error' });
    process.exit(1);
});
