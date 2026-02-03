import BaseAgent from '../core/base-agent.js';
import config from '../config/config.js';
import { logInfo, logArbitrage, logError } from '../utils/logger.js';
import { validateArbitrageOpportunity } from '../utils/validator.js';

/**
 * Agent responsible for detecting arbitrage opportunities between chains
 */
class ArbitrageDetectorAgent extends BaseAgent {
    constructor() {
        super('ARBITRAGE_DETECTOR');
        this.solanaPrice = null;
        this.ethereumPrice = null;
        this.lastOpportunityTime = null;
        this.opportunityCount = 0;
    }

    /**
     * Start the arbitrage detector
     */
    async start() {
        await super.start();

        // Listen for price updates from monitoring agents
        this.on('price:update', (data) => {
            this.handlePriceUpdate(data);
        });

        logInfo(this.name, 'Arbitrage detector started');
    }

    /**
     * Stop the detector
     */
    async stop() {
        await super.stop();
    }

    /**
     * Handle price updates from monitoring agents
     */
    handlePriceUpdate(data) {
        const { chain, price, timestamp } = data;

        // Update stored prices
        if (chain === 'solana') {
            this.solanaPrice = { price, timestamp, ...data };
        } else if (chain === 'ethereum') {
            this.ethereumPrice = { price, timestamp, ...data };
        }

        // Check for arbitrage opportunity if we have both prices
        if (this.solanaPrice && this.ethereumPrice) {
            this.checkArbitrageOpportunity();
        }
    }

    /**
     * Check if there's an arbitrage opportunity
     */
    checkArbitrageOpportunity() {
        try {
            // Check if price data is fresh
            const now = Date.now();
            const staleThreshold = config.monitoring.staleDataThresholdMs;

            if (now - this.solanaPrice.timestamp > staleThreshold) {
                logInfo(this.name, 'Solana price data is stale, skipping check');
                return;
            }

            if (now - this.ethereumPrice.timestamp > staleThreshold) {
                logInfo(this.name, 'Ethereum price data is stale, skipping check');
                return;
            }

            // Calculate price difference
            const solPrice = this.solanaPrice.price;
            const ethPrice = this.ethereumPrice.price;

            const priceDiff = Math.abs(solPrice - ethPrice);
            const lowerPrice = Math.min(solPrice, ethPrice);
            const higherPrice = Math.max(solPrice, ethPrice);

            // Calculate profit percentage
            const profitPercentage = ((priceDiff / lowerPrice) * 100);

            // Determine buy and sell chains
            let buyChain, sellChain, buyPrice, sellPrice, buyDex, sellDex;

            if (solPrice < ethPrice) {
                // Buy on Solana, sell on Ethereum
                buyChain = 'solana';
                sellChain = 'ethereum';
                buyPrice = solPrice;
                sellPrice = ethPrice;
                buyDex = this.solanaPrice.dex;
                sellDex = this.ethereumPrice.dex;
            } else {
                // Buy on Ethereum, sell on Solana
                buyChain = 'ethereum';
                sellChain = 'solana';
                buyPrice = ethPrice;
                sellPrice = solPrice;
                buyDex = this.ethereumPrice.dex;
                sellDex = this.solanaPrice.dex;
            }

            // Calculate estimated profit (without gas costs yet)
            const tradeSize = config.trading.maxTradeSizeUsd;
            const grossProfit = (sellPrice - buyPrice) * (tradeSize / buyPrice);

            // Create opportunity object
            const opportunity = {
                buyChain,
                sellChain,
                buyPrice,
                sellPrice,
                buyDex,
                sellDex,
                profitPercentage,
                priceDiff,
                tradeSize,
                profitUsd: grossProfit,
                timestamp: now,
            };

            // Validate opportunity
            const validation = validateArbitrageOpportunity(opportunity);

            if (!validation.valid) {
                logInfo(this.name, 'Opportunity found but not profitable', {
                    profitPercentage: profitPercentage.toFixed(2) + '%',
                    reasons: validation.errors,
                });

                // Emit skipped event for dashboard visibility
                this.emit('arbitrage:skipped', {
                    ...opportunity,
                    skipped: true,
                    reasons: validation.errors
                });

                return;
            }

            // Opportunity is valid! Emit event
            this.opportunityCount++;
            this.lastOpportunityTime = now;

            logArbitrage({
                ...opportunity,
                opportunityNumber: this.opportunityCount,
            });

            // Emit arbitrage opportunity event for trade executor
            this.emit('arbitrage:opportunity', opportunity);

        } catch (error) {
            logError(this.name, error, { context: 'check arbitrage' });
            this.reportError(error, false);
        }
    }

    /**
     * Get current price spread
     */
    getCurrentSpread() {
        if (!this.solanaPrice || !this.ethereumPrice) {
            return null;
        }

        const priceDiff = Math.abs(this.solanaPrice.price - this.ethereumPrice.price);
        const lowerPrice = Math.min(this.solanaPrice.price, this.ethereumPrice.price);
        const spreadPercentage = (priceDiff / lowerPrice) * 100;

        return {
            solanaPrice: this.solanaPrice.price,
            ethereumPrice: this.ethereumPrice.price,
            priceDiff,
            spreadPercentage,
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            opportunityCount: this.opportunityCount,
            lastOpportunityTime: this.lastOpportunityTime,
            currentSpread: this.getCurrentSpread(),
        };
    }
}

export default ArbitrageDetectorAgent;
