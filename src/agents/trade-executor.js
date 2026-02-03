import BaseAgent from '../core/base-agent.js';
import SolanaClient from '../blockchain/solana-client.js';
import EthereumClient from '../blockchain/ethereum-client.js';
import BinanceClient from '../exchanges/binance-client.js';
import config from '../config/config.js';
import { logInfo, logError, logTrade, logWarn } from '../utils/logger.js';
import { validateBalance, validateGasCosts } from '../utils/validator.js';

/**
 * Agent responsible for executing arbitrage trades
 */
class TradeExecutorAgent extends BaseAgent {
    constructor() {
        super('TRADE_EXECUTOR');
        this.solanaClient = new SolanaClient();
        this.ethereumClient = new EthereumClient();
        this.executingTrade = false;
        this.tradeHistory = [];
        this.isPaused = false; // Emergency stop state
    }

    /**
     * Start the trade executor
     */
    async start() {
        await super.start();

        // Initialize blockchain clients
        try {
            await this.solanaClient.initialize();
            await this.ethereumClient.initialize();
            logInfo(this.name, 'Blockchain clients initialized');
        } catch (error) {
            logError(this.name, error, { context: 'initialization' });
            this.reportError(error, true);
            throw error;
        }

        // Listen for arbitrage opportunities
        this.on('arbitrage:opportunity', (opportunity) => {
            this.handleArbitrageOpportunity(opportunity);
        });

        logInfo(this.name, 'Trade executor started');

        if (config.dryRun) {
            logWarn(this.name, '🔒 DRY RUN MODE ENABLED - No real trades will be executed');
        }
    }

    /**
     * Stop the executor
     */
    async stop() {
        await super.stop();
    }

    /**
     * Pause trading (Emergency Stop)
     */
    pause() {
        this.isPaused = true;
        logWarn(this.name, '🛑 TRADING PAUSED BY USER');
    }

    /**
     * Resume trading
     */
    resume() {
        this.isPaused = false;
        logInfo(this.name, '▶️ TRADING RESUMED');
    }

    /**
     * Handle incoming arbitrage opportunity
     */
    async handleArbitrageOpportunity(opportunity) {
        // Check for emergency stop
        if (this.isPaused) {
            logWarn(this.name, '⚠️ Trade skipped: Bot is paused by user');
            return;
        }

        // Prevent concurrent trade execution
        if (this.executingTrade) {
            logInfo(this.name, 'Trade already in progress, skipping opportunity');
            return;
        }

        this.executingTrade = true;

        try {
            logInfo(this.name, 'Processing arbitrage opportunity', {
                buyChain: opportunity.buyChain,
                sellChain: opportunity.sellChain,
                profit: `${opportunity.profitPercentage.toFixed(2)}%`,
            });

            // Execute the arbitrage trade
            const result = await this.executeArbitrageTrade(opportunity);

            // Log trade result
            logTrade({
                ...opportunity,
                ...result,
                timestamp: Date.now(),
            });

            // Store in history
            this.tradeHistory.push({
                ...opportunity,
                ...result,
                executionTime: Date.now(),
            });

            // Emit trade completion event
            this.emit('trade:complete', {
                success: result.success,
                opportunity,
                result,
            });

        } catch (error) {
            logError(this.name, error, { context: 'execute arbitrage' });
            this.reportError(error, false);

            // Emit trade failure event
            this.emit('trade:complete', {
                success: false,
                opportunity,
                error: error.message,
            });
        } finally {
            this.executingTrade = false;
        }
    }

    /**
     * Execute the full arbitrage trade workflow
     */
    async executeArbitrageTrade(opportunity) {
        const startTime = Date.now();

        // Step 1: Estimate gas costs
        const gasCosts = await this.estimateGasCosts(opportunity);
        logInfo(this.name, 'Gas costs estimated', gasCosts);

        // Step 2: Validate gas costs don't eat all profit
        const gasValidation = validateGasCosts(opportunity.profitUsd, gasCosts.totalUsd);
        if (!gasValidation.valid) {
            throw new Error(`Trade not profitable after gas: ${gasValidation.reason}`);
        }

        // Step 3: Check balances
        await this.checkBalances(opportunity);

        // Step 4: Execute buy trade
        const buyResult = await this.executeBuyTrade(opportunity);
        logInfo(this.name, 'Buy trade executed', {
            chain: opportunity.buyChain,
            dryRun: config.dryRun,
        });

        // Step 5: Execute sell trade (only if buy succeeded)
        if (buyResult.success) {
            const sellResult = await this.executeSellTrade(opportunity);
            logInfo(this.name, 'Sell trade executed', {
                chain: opportunity.sellChain,
                dryRun: config.dryRun,
            });

            const executionTime = Date.now() - startTime;

            return {
                success: true,
                buyResult,
                sellResult,
                gasCosts,
                netProfit: gasValidation.netProfit,
                executionTimeMs: executionTime,
                dryRun: config.dryRun,
            };
        } else {
            throw new Error('Buy trade failed');
        }
    }

    /**
     * Estimate total gas costs for both trades
     */
    async estimateGasCosts(opportunity) {
        const costs = {
            buy: null,
            sell: null,
            totalUsd: 0,
        };

        // Estimate buy trade gas
        if (opportunity.buyChain === 'solana') {
            const solCost = await this.solanaClient.estimateSwapCost();
            const solPrice = await this.solanaClient.getSolPriceUSD();
            costs.buy = {
                chain: 'solana',
                gasCostNative: solCost.feeSOL,
                gasCostUsd: solCost.feeSOL * solPrice,
            };
        } else {
            const ethCost = await this.ethereumClient.estimateSwapCost();
            const ethPrice = await this.ethereumClient.getEthPriceUSD();
            costs.buy = {
                chain: 'ethereum',
                gasCostNative: ethCost.gasCostETH,
                gasCostUsd: ethCost.gasCostETH * ethPrice,
            };
        }

        // Estimate sell trade gas
        if (opportunity.sellChain === 'solana') {
            const solCost = await this.solanaClient.estimateSwapCost();
            const solPrice = await this.solanaClient.getSolPriceUSD();
            costs.sell = {
                chain: 'solana',
                gasCostNative: solCost.feeSOL,
                gasCostUsd: solCost.feeSOL * solPrice,
            };
        } else {
            const ethCost = await this.ethereumClient.estimateSwapCost();
            const ethPrice = await this.ethereumClient.getEthPriceUSD();
            costs.sell = {
                chain: 'ethereum',
                gasCostNative: ethCost.gasCostETH,
                gasCostUsd: ethCost.gasCostETH * ethPrice,
            };
        }

        costs.totalUsd = costs.buy.gasCostUsd + costs.sell.gasCostUsd;

        return costs;
    }

    /**
     * Check wallet balances before executing
     */
    async checkBalances(opportunity) {
        if (config.dryRun) {
            logInfo(this.name, '[DRY RUN] Skipping balance check');
            return;
        }

        // Check buy chain balance
        let buyBalance;
        if (opportunity.buyChain === 'solana') {
            buyBalance = await this.solanaClient.getBalance();
            logInfo(this.name, `Solana balance: ${buyBalance} SOL`);
        } else {
            buyBalance = await this.ethereumClient.getBalance();
            logInfo(this.name, `Ethereum balance: ${buyBalance} ETH`);
        }

        // Basic check - should have at least some balance
        if (buyBalance < 0.01) {
            throw new Error(`Insufficient balance on ${opportunity.buyChain}`);
        }
    }

    /**
     * Execute the buy side of the arbitrage
     */
    async executeBuyTrade(opportunity) {
        const { buyChain, tradeSize, buyPrice } = opportunity;

        // Calculate amount of tokens to buy
        const tokenAmount = tradeSize / buyPrice;

        if (buyChain === 'solana') {
            // Buy on Solana (Phantom/Jupiter)
            const result = await this.solanaClient.executeSwap(
                'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
                config.solana.tokenMint || 'So11111111111111111111111111111111111111112', // G token or SOL
                Math.floor(tradeSize * 1e6), // USDC has 6 decimals
                config.trading.maxSlippagePercentage * 100 // Convert to bps
            );
            return result;
        } else {
            // Buy on Binance (Ethereum)
            const result = await BinanceClient.executeSpotOrder('ETHUSDT', 'BUY', tokenAmount);
            return {
                base: 'ETH',
                quote: 'USDT',
                amount: tokenAmount,
                ...result
            };
        }
    }

    /**
     * Execute the sell side of the arbitrage
     */
    async executeSellTrade(opportunity) {
        const { sellChain, tradeSize, buyPrice } = opportunity;

        // Calculate amount of tokens to sell (same as bought amount)
        const tokenAmount = tradeSize / buyPrice;

        if (sellChain === 'solana') {
            // Sell on Solana (Phantom/Jupiter)
            const result = await this.solanaClient.executeSwap(
                config.solana.tokenMint || 'So11111111111111111111111111111111111111112', // G token or SOL
                'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
                Math.floor(tokenAmount * 1e9), // Assuming 9 decimals for token
                config.trading.maxSlippagePercentage * 100 // Convert to bps
            );
            return result;
        } else {
            // Sell on Binance (Ethereum)
            const result = await BinanceClient.executeSpotOrder('ETHUSDT', 'SELL', tokenAmount);
            return {
                base: 'ETH',
                quote: 'USDT',
                amount: tokenAmount,
                ...result
            };
        }
    }

    /**
     * Get trade history
     */
    getTradeHistory() {
        return this.tradeHistory;
    }

    /**
     * Get trade statistics
     */
    getStats() {
        const totalTrades = this.tradeHistory.length;
        const successfulTrades = this.tradeHistory.filter(t => t.success).length;

        const totalProfit = this.tradeHistory.reduce((sum, trade) => {
            return sum + (trade.netProfit || 0);
        }, 0);

        return {
            totalTrades,
            successfulTrades,
            failedTrades: totalTrades - successfulTrades,
            totalProfit,
            averageProfit: totalTrades > 0 ? totalProfit / totalTrades : 0,
        };
    }
}

export default TradeExecutorAgent;
