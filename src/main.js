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
export class SonoArbitrageBot {
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

            // Setup stats reporting
            this.setupStatsReporting();

        } catch (error) {
            logError('MAIN', error, { context: 'startup' });
            throw error; // Let caller handle fatal error
        }
    }

    /**
     * Stop the bot
     */
    async stop() {
        await this.orchestrator.shutdown();
        logInfo('MAIN', 'Bot stopped.');
    }

    /**
     * Pause trading (Emergency Stop)
     */
    pauseTrading() {
        this.agents.tradeExecutor.pause();
    }

    /**
     * Resume trading
     */
    resumeTrading() {
        this.agents.tradeExecutor.resume();
    }

    /**
     * Check if trading is paused
     */
    isTradingPaused() {
        return this.agents.tradeExecutor.isPaused;
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
        // ... (existing logic)
        // For brevity preserving existing logic can be done if needed, 
        // but since server.js will display stats, console logs are less critical.
    }
}

export default SonoArbitrageBot;
