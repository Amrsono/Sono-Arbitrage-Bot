import BaseAgent from '../core/base-agent.js';
import SolanaClient from '../blockchain/solana-client.js';
import config from '../config/config.js';
import { logInfo, logError, logPrice } from '../utils/logger.js';
import { validatePrice } from '../utils/validator.js';

/**
 * Agent responsible for monitoring G token prices on Solana DEXs
 */
class SolanaMonitorAgent extends BaseAgent {
    constructor() {
        super('SOLANA_MONITOR');
        this.client = new SolanaClient();
        this.monitoringInterval = null;
        this.lastPrice = null;
        this.priceHistory = [];
    }

    /**
     * Start monitoring Solana DEXs
     */
    async start() {
        await super.start();

        try {
            // Initialize Solana client
            await this.client.initialize();
            logInfo(this.name, 'Solana client initialized');

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
     * Fetch prices from all enabled Solana DEXs
     */
    async fetchPrices() {
        try {
            const prices = [];

            // Fetch from Jupiter (aggregator - usually best price)
            if (config.solana.dexes.jupiter.enabled) {
                try {
                    const jupiterPrice = await this.withRetry(
                        () => this.fetchJupiterPrice(),
                        'Jupiter price fetch'
                    );

                    if (jupiterPrice) {
                        prices.push(jupiterPrice);
                        logPrice('SOLANA', jupiterPrice.price, 'Jupiter');
                    }
                } catch (error) {
                    // Log but don't stop monitoring
                    logError(this.name, error, { dex: 'Jupiter' });

                    // Try fallback: CoinGecko API
                    try {
                        const fallbackPrice = await this.fetchCoinGeckoPrice();
                        if (fallbackPrice) {
                            prices.push(fallbackPrice);
                            logPrice('SOLANA', fallbackPrice.price, 'CoinGecko (fallback)');
                        }
                    } catch (fallbackError) {
                        logError(this.name, fallbackError, { dex: 'CoinGecko fallback' });
                    }
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
     * Fetch SOL price from CoinGecko as fallback
     */
    async fetchCoinGeckoPrice() {
        try {
            const axios = (await import('axios')).default;
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
                params: {
                    ids: 'solana',
                    vs_currencies: 'usd'
                },
                timeout: 10000
            });

            if (response.data && response.data.solana && response.data.solana.usd) {
                return {
                    price: response.data.solana.usd,
                    source: 'coingecko',
                    dex: 'coingecko',
                    timestamp: Date.now(),
                    metadata: {
                        fallback: true
                    }
                };
            }

            return null;
        } catch (error) {
            logError(this.name, error, { context: 'CoinGecko fallback' });
            throw error;
        }
    }

    /**
     * Fetch price from Jupiter
     */
    async fetchJupiterPrice() {
        try {
            if (!config.solana.tokenMint) {
                // If no token is configured, use SOL as example
                const SOL_MINT = 'So11111111111111111111111111111111111111112';
                const result = await this.client.getJupiterPrice(SOL_MINT);

                return {
                    price: result.price,
                    source: 'jupiter',
                    dex: 'jupiter',
                    timestamp: Date.now(),
                    metadata: {
                        route: result.route,
                        impact: result.impact,
                    },
                };
            }

            const result = await this.client.getJupiterPrice(config.solana.tokenMint);

            // Validate price
            validatePrice(result.price, 'Jupiter');

            return {
                price: result.price,
                source: 'jupiter',
                dex: 'jupiter',
                timestamp: Date.now(),
                metadata: {
                    route: result.route,
                    impact: result.impact,
                },
            };
        } catch (error) {
            logError(this.name, error, { context: 'Jupiter price fetch' });
            throw error;
        }
    }

    /**
     * Select the best price from multiple sources
     * For buying, we want the lowest price
     */
    selectBestPrice(prices) {
        if (prices.length === 0) return null;
        if (prices.length === 1) return prices[0];

        // Sort by price ascending (lowest first)
        prices.sort((a, b) => a.price - b.price);

        return prices[0]; // Return lowest price (best for buying)
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
            chain: 'solana',
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

export default SolanaMonitorAgent;
