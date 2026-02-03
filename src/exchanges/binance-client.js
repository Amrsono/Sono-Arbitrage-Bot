import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import config from '../config/config.js';
import { logInfo, logError } from '../utils/logger.js';

class BinanceClient {
    constructor() {
        this.baseUrl = 'https://api.binance.com';
        this.apiKey = config.binance.apiKey;
        this.privateKeyPath = config.binance.privateKeyPath;
        this.privateKey = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            if (!this.apiKey) {
                throw new Error('Binance API Key not configured');
            }
            if (!this.privateKeyPath || !fs.existsSync(this.privateKeyPath)) {
                throw new Error(`Binance Private Key file not found at: ${this.privateKeyPath}`);
            }

            this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
            this.initialized = true;

            // Test connection
            await this.ping();
            logInfo('BINANCE', 'Client initialized successfully');
        } catch (error) {
            logError('BINANCE', error, { context: 'initialization' });
            throw error;
        }
    }

    async ping() {
        await axios.get(`${this.baseUrl}/api/v3/ping`);
    }

    // Sign query string with RSA-SHA256
    sign(queryString) {
        const sign = crypto.createSign('SHA256');
        sign.update(queryString);
        sign.end();
        return sign.sign(this.privateKey, 'base64');
    }

    async executeSpotOrder(symbol, side, quantity) {
        if (config.dryRun) {
            logInfo('BINANCE', `[DRY_RUN] Would execute ${side} ${quantity} ${symbol}`);
            return {
                symbol,
                orderId: 'dry-run-id',
                transactTime: Date.now(),
                status: 'FILLED_DRY_RUN'
            };
        }

        if (!this.initialized) await this.initialize();

        try {
            const timestamp = Date.now();
            const minimalQuantity = parseFloat(quantity).toFixed(5); // Adjust precision heavily for crypto usually
            // NOTE: Real implementation needs LOT_SIZE filter check. 
            // For now assuming safe 5 decimals for ETH/SOL.

            const params = new URLSearchParams();
            params.append('symbol', symbol.toUpperCase());
            params.append('side', side.toUpperCase());
            params.append('type', 'MARKET');
            params.append('quantity', minimalQuantity);
            params.append('timestamp', timestamp);

            const signature = this.sign(params.toString());
            params.append('signature', signature);

            const response = await axios.post(`${this.baseUrl}/api/v3/order`, null, {
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                },
                params: params // axios serializes this to query string
            });

            logInfo('BINANCE', `Order placed: ${side} ${symbol}`, response.data);
            return response.data;

        } catch (error) {
            const msg = error.response ? JSON.stringify(error.response.data) : error.message;
            logError('BINANCE', new Error(`Order failed: ${msg}`));
            throw error;
        }
    }

    async getPrice(symbol) {
        try {
            const res = await axios.get(`${this.baseUrl}/api/v3/ticker/price`, {
                params: { symbol: symbol.toUpperCase() }
            });
            return parseFloat(res.data.price);
        } catch (error) {
            logError('BINANCE', error, { context: 'getPrice' });
            return null;
        }
    }

    async getAccountBalance(asset) {
        // Try to initialize if keys are present, even in Dry Run
        if (!this.initialized && this.apiKey && this.privateKeyPath) {
            try { await this.initialize(); } catch (e) { /* ignore in dry run */ }
        }

        // If initialized (keys valid), try to fetch REAL balance
        if (this.initialized) {
            try {
                const timestamp = Date.now();
                const params = new URLSearchParams();
                params.append('timestamp', timestamp);
                const signature = this.sign(params.toString());
                params.append('signature', signature);

                const response = await axios.get(`${this.baseUrl}/api/v3/account`, {
                    headers: { 'X-MBX-APIKEY': this.apiKey },
                    params: params
                });

                const balances = response.data.balances;
                const assetBalance = balances.find(b => b.asset === asset);
                return assetBalance ? assetBalance.free : '0.0000';
            } catch (error) {
                // Fall through to mock if real fetch fails in dry run
                if (!config.dryRun) {
                    logError('BINANCE', error, { context: 'getAccountBalance' });
                    return '0.0000';
                }
            }
        }

        if (config.dryRun) {
            // Return fake balance ONLY if we couldn't get real one
            // logInfo('BINANCE', `[DRY_RUN] Using mock balance for ${asset}`);
            return '10.0000';
        }

        return '0.0000';
    }
}

export default new BinanceClient();
