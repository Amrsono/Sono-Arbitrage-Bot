import Orchestrator from './core/orchestrator.js';
import SolanaMonitorAgent from './agents/solana-monitor.js';
import EthereumMonitorAgent from './agents/ethereum-monitor.js';
import ArbitrageDetectorAgent from './agents/arbitrage-detector.js';
import TradeExecutorAgent from './agents/trade-executor.js';
import config from './config/config.js';
import logger, { logInfo, logError } from './utils/logger.js';
import chalk from 'chalk';

/**
 * Main application entry point
 */
class SonoArbitrageBot {
    constructor() {
        this.orchestrator = new Orchestrator();
        this.agents = {
            solanaMonitor: new SolanaMonitorAgent(),
            ethereumMonitor: new EthereumMonitorAgent(),
            arbitrageDetector: new ArbitrageDetectorAgent(),
            tradeExecutor: new TradeExecutorAgent(),
        };
        this.startTime = Date.now();
    }

    /**
     * Initialize and start the bot
     */
    async start() {
        try {
            this.printBanner();
            this.printConfig();

            logInfo('MAIN', 'Initializing Sono Arbitrage Bot...');

            // Register all agents with orchestrator
            this.orchestrator.registerAgent('SOLANA_MONITOR', this.agents.solanaMonitor);
            this.orchestrator.registerAgent('ETHEREUM_MONITOR', this.agents.ethereumMonitor);
            this.orchestrator.registerAgent('ARBITRAGE_DETECTOR', this.agents.arbitrageDetector);
            this.orchestrator.registerAgent('TRADE_EXECUTOR', this.agents.tradeExecutor);

            // Start all agents
            await this.orchestrator.startAll();

            logInfo('MAIN', chalk.green.bold('✓ Bot started successfully!'));
            logInfo('MAIN', 'Monitoring for arbitrage opportunities...');
            logInfo('MAIN', chalk.cyan.bold('📊 Dashboard available at: http://localhost:3001'));
            logInfo('MAIN', chalk.gray('(Run: node src/dashboard/server.js in another terminal)'));

            // Setup graceful shutdown handlers
            this.setupShutdownHandlers();

            // Setup stats reporting
            this.setupStatsReporting();

        } catch (error) {
            logError('MAIN', error, { context: 'startup' });
            process.exit(1);
        }
    }

    /**
     * Print startup banner
     */
    printBanner() {
        console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════╗'));
        console.log(chalk.cyan.bold('║  Sono Arbitrage Bot - Multi-Agent System   ║'));
        console.log(chalk.cyan.bold('╚════════════════════════════════════════════╝\n'));
    }

    /**
     * Print configuration summary
     */
    printConfig() {
        console.log(chalk.yellow('Configuration:'));
        console.log(chalk.gray('  - Mode:'), config.dryRun ? chalk.yellow.bold('DRY RUN 🔒') : chalk.red.bold('LIVE TRADING ⚠️'));
        console.log(chalk.gray('  - Monitoring Interval:'), chalk.white(`${config.monitoring.intervalMs}ms`));
        console.log(chalk.gray('  - Min Profit Threshold:'), chalk.white(`${config.trading.minProfitPercentage}%`));
        console.log(chalk.gray('  - Max Trade Size:'), chalk.white(`$${config.trading.maxTradeSizeUsd}`));
        console.log(chalk.gray('  - Max Slippage:'), chalk.white(`${config.trading.maxSlippagePercentage}%`));
        console.log(chalk.gray('  - Solana RPC:'), chalk.white(config.solana.rpcUrl));
        console.log(chalk.gray('  - Ethereum RPC:'), chalk.white(config.ethereum.rpcUrl ? 'Configured' : 'Not configured'));
        console.log('');
    }

    /**
     * Setup graceful shutdown handlers
     */
    setupShutdownHandlers() {
        const shutdown = async (signal) => {
            console.log('\n');
            logInfo('MAIN', `Received ${signal}, shutting down gracefully...`);

            try {
                // Print final stats
                this.printFinalStats();

                // Stop all agents
                await this.orchestrator.shutdown();

                logInfo('MAIN', chalk.green('✓ Shutdown complete'));
                process.exit(0);
            } catch (error) {
                logError('MAIN', error, { context: 'shutdown' });
                process.exit(1);
            }
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

        // Handle uncaught errors
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

    /**
     * Setup periodic stats reporting
     */
    setupStatsReporting() {
        // Report stats every 5 minutes
        setInterval(() => {
            this.printStats();
        }, 5 * 60 * 1000);
    }

    /**
     * Print current statistics
     */
    printStats() {
        console.log('\n' + chalk.cyan('─'.repeat(50)));
        console.log(chalk.cyan.bold('📊 Current Statistics'));
        console.log(chalk.cyan('─'.repeat(50)));

        // Orchestrator status
        const orchestratorStatus = this.orchestrator.getStatus();
        console.log(chalk.yellow('\nAgent Status:'));
        for (const [name, status] of Object.entries(orchestratorStatus.agents)) {
            const statusColor = status.status === 'running' ? chalk.green : chalk.red;
            console.log(`  ${name}: ${statusColor(status.status)}`);
        }

        // Arbitrage detector stats
        const arbStats = this.agents.arbitrageDetector.getStats();
        console.log(chalk.yellow('\nArbitrage Detection:'));
        console.log(`  Opportunities Found: ${chalk.white(arbStats.opportunityCount)}`);
        if (arbStats.currentSpread) {
            console.log(`  Current Spread: ${chalk.white(arbStats.currentSpread.spreadPercentage.toFixed(2) + '%')}`);
            console.log(`    Solana: ${chalk.white('$' + arbStats.currentSpread.solanaPrice.toFixed(6))}`);
            console.log(`    Ethereum: ${chalk.white('$' + arbStats.currentSpread.ethereumPrice.toFixed(6))}`);
        }

        // Trade executor stats
        const tradeStats = this.agents.tradeExecutor.getStats();
        console.log(chalk.yellow('\nTrade Execution:'));
        console.log(`  Total Trades: ${chalk.white(tradeStats.totalTrades)}`);
        console.log(`  Successful: ${chalk.green(tradeStats.successfulTrades)}`);
        console.log(`  Failed: ${chalk.red(tradeStats.failedTrades)}`);
        console.log(`  Total Profit: ${chalk.green('$' + tradeStats.totalProfit.toFixed(2))}`);
        if (tradeStats.totalTrades > 0) {
            console.log(`  Avg Profit/Trade: ${chalk.green('$' + tradeStats.averageProfit.toFixed(2))}`);
        }

        console.log(chalk.cyan('─'.repeat(50)) + '\n');
    }

    /**
     * Print final statistics on shutdown
     */
    printFinalStats() {
        console.log('\n' + chalk.cyan('═'.repeat(50)));
        console.log(chalk.cyan.bold('📈 Final Statistics'));
        console.log(chalk.cyan('═'.repeat(50)));

        const tradeStats = this.agents.tradeExecutor.getStats();
        const arbStats = this.agents.arbitrageDetector.getStats();

        console.log(chalk.yellow('\nSession Summary:'));
        console.log(`  Opportunities Detected: ${chalk.white(arbStats.opportunityCount)}`);
        console.log(`  Trades Executed: ${chalk.white(tradeStats.totalTrades)}`);
        console.log(`  Success Rate: ${chalk.white(
            tradeStats.totalTrades > 0
                ? ((tradeStats.successfulTrades / tradeStats.totalTrades) * 100).toFixed(1) + '%'
                : 'N/A'
        )}`);
        console.log(`  Total Profit: ${chalk.green.bold('$' + tradeStats.totalProfit.toFixed(2))}`);

        if (config.dryRun) {
            console.log(chalk.yellow('\n⚠️  This was a DRY RUN - no real trades were executed'));
        }

        console.log(chalk.cyan('═'.repeat(50)) + '\n');
    }
}

// Start the bot
const bot = new SonoArbitrageBot();
bot.start().catch((error) => {
    logError('MAIN', error, { context: 'fatal error' });
    process.exit(1);
});
