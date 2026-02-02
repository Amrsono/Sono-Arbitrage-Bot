import BaseAgent from '../core/base-agent.js';
import EthereumClient from '../blockchain/ethereum-client.js';
import config from '../config/config.js';
import { logInfo, logError, logPrice } from '../utils/logger.js';
import { validatePrice } from '../utils/validator.js';

/**
 * Agent responsible for monitoring G token prices on Ethereum DEXs
 */
class EthereumMonitorAgent extends BaseAgent {
    constructor() {
        super('ETHEREUM_MONITOR');
        this.client = new EthereumClient();
        this.monitoringInterval = null;
        this.lastPrice = null;
        this.priceHistory = [];
    }

    /**
     * Start monitoring Ethereum DEXs
     */
    async start() {
        await super.start();

        try {
            // Initialize Ethereum client
            await this.client.initialize();
            logInfo(this.name, 'Ethereum client initialized');

            // Start price monitoring
            this.startMonitoring();
        } catch (error) {
            logError(this.name, error, { context: 'start' });
            this.reportError(error, true);
            throw error;
        }
    }

    /**
     * Stop monitoring
     */
    async stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        await super.stop();
    }

    /**
     * Start the monitoring loop
     */
    startMonitoring() {
        const interval = config.monitoring.intervalMs;

        logInfo(this.name, `Starting price monitoring (interval: ${interval}ms)`);

        // Initial fetch
        this.fetchPrices();

        // Set up recurring fetch
        this.monitoringInterval = setInterval(() => {
            if (this.running) {
                this.fetchPrices();
            }
        }, interval);
    }

    /**
     * Fetch prices from all enabled Ethereum DEXs
     */
    async fetchPrices() {
        try {
            const prices = [];

            // Fetch from Uniswap V3
            if (config.ethereum.dexes.uniswapV3.enabled) {
                try {
                    const uniswapPrice = await this.withRetry(
                        () => this.fetchUniswapPrice(),
                        'Uniswap price fetch'
                    );

                    if (uniswapPrice) {
                        prices.push(uniswapPrice);
                        logPrice('ETHEREUM', uniswapPrice.price, 'Uniswap V3');
                    }
                } catch (error) {
                    // Log but don't stop monitoring
                    logError(this.name, error, { dex: 'Uniswap' });
                }
            }

            // If we got at least one price, use the best one
            if (prices.length > 0) {
                const bestPrice = this.selectBestPrice(prices);
                this.updatePrice(bestPrice);
            } else {
                logError(this.name, new Error('No prices available from any DEX'));
            }
        } catch (error) {
            logError(this.name, error, { context: 'fetch prices' });
            this.reportError(error, false);
        }
    }

    /**
     * Fetch price from Uniswap V3
     */
    async fetchUniswapPrice() {
        try {
            if (!config.ethereum.tokenAddress) {
                // If no token is configured, use WETH as example
                const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
                const result = await this.client.getUniswapPrice(WETH);

                return {
                    price: result.price,
                    source: 'uniswap-v3',
                    dex: 'uniswap-v3',
                    timestamp: Date.now(),
                    metadata: {
                        fee: result.fee,
                    },
                };
            }

            const result = await this.client.getUniswapPrice(config.ethereum.tokenAddress);

            // Validate price
            validatePrice(result.price, 'Uniswap V3');

            return {
                price: result.price,
                source: 'uniswap-v3',
                dex: 'uniswap-v3',
                timestamp: Date.now(),
                metadata: {
                    fee: result.fee,
                },
            };
        } catch (error) {
            logError(this.name, error, { context: 'Uniswap price fetch' });
            throw error;
        }
    }

    /**
     * Select the best price from multiple sources
     * For selling, we want the highest price
     */
    selectBestPrice(prices) {
        if (prices.length === 0) return null;
        if (prices.length === 1) return prices[0];

        // Sort by price descending (highest first)
        prices.sort((a, b) => b.price - a.price);

        return prices[0]; // Return highest price (best for selling)
    }

    /**
     * Update the current price and emit event
     */
    updatePrice(priceData) {
        this.lastPrice = priceData;

        // Add to history
        this.priceHistory.push(priceData);

        // Keep history size limited
        if (this.priceHistory.length > config.monitoring.priceHistorySize) {
            this.priceHistory.shift();
        }

        // Emit price update event
        this.emit('price:update', {
            chain: 'ethereum',
            price: priceData.price,
            dex: priceData.dex,
            timestamp: priceData.timestamp,
            metadata: priceData.metadata,
        });

        logInfo(this.name, `Price updated: $${priceData.price.toFixed(6)}`, {
            dex: priceData.dex,
        });
    }

    /**
     * Get the latest price
     */
    getLatestPrice() {
        return this.lastPrice;
    }

    /**
     * Get price history
     */
    getPriceHistory() {
        return this.priceHistory;
    }

    /**
     * Calculate average price over time window
     */
    getAveragePrice(windowMs = 60000) {
        const cutoff = Date.now() - windowMs;
        const recentPrices = this.priceHistory.filter(p => p.timestamp >= cutoff);

        if (recentPrices.length === 0) return null;

        const sum = recentPrices.reduce((acc, p) => acc + p.price, 0);
        return sum / recentPrices.length;
    }
}

export default EthereumMonitorAgent;
