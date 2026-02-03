import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import axios from 'axios';
import config from '../config/config.js';
import { logInfo, logError } from '../utils/logger.js';

/**
 * Solana blockchain client for DEX interactions
 */
class SolanaClient {
    constructor() {
        this.connection = null;
        this.wallet = null;
        this.initialized = false;
    }

    /**
     * Initialize the Solana client
     */
    async initialize() {
        try {
            // Create connection to Solana RPC
            this.connection = new Connection(config.solana.rpcUrl, 'confirmed');

            // Initialize wallet if private key is provided
            // Initialize wallet if private key is provided
            if (config.solana.privateKey) {
                try {
                    const secretKey = bs58.decode(config.solana.privateKey);
                    this.wallet = Keypair.fromSecretKey(secretKey);
                    logInfo('SOLANA', 'Wallet initialized (Active Trading)');
                } catch (error) {
                    logError('SOLANA', error, { context: 'wallet initialization' });
                }
            } else if (config.solana.walletAddress) {
                try {
                    // Read-only mode
                    this.publicKey = new PublicKey(config.solana.walletAddress);
                    logInfo('SOLANA', 'Wallet initialized (Read-Only Mode)');
                } catch (error) {
                    logError('SOLANA', error, { context: 'read-only wallet initialization' });
                }
            }

            // Test connection
            const version = await this.connection.getVersion();
            logInfo('SOLANA', `Connected to Solana cluster`, { version });

            this.initialized = true;
            return true;
        } catch (error) {
            logError('SOLANA', error, { context: 'initialization' });
            throw error;
        }
    }

    /**
     * Get price from Jupiter Aggregator
     */
    async getJupiterPrice(inputMint, outputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
        try {
            // outputMint default is USDC on Solana
            // Determine decimals based on input mint
            // SOL has 9 decimals, most SPL tokens (USDC, USDT, etc) have 6
            const SOL_MINT = 'So11111111111111111111111111111111111111112';
            const inputDecimals = inputMint === SOL_MINT ? 9 : 6;
            const outputDecimals = 6; // USDC has 6 decimals

            const amount = Math.pow(10, inputDecimals); // 1 full token unit

            const response = await axios.get(
                `${config.solana.dexes.jupiter.apiUrl}/quote`,
                {
                    params: {
                        inputMint,
                        outputMint,
                        amount,
                        slippageBps: 50, // 0.5%
                    },
                }
            );

            // Validate response format (Solaris/Cloudflare sometimes return HTML)
            if (response.data && typeof response.data === 'object' && response.data.outAmount) {
                // Calculate price: output amount (in human readable) / input amount (1 unit)
                // Since we input exactly 1 unit, price is just output converted to human readable
                const price = response.data.outAmount / Math.pow(10, outputDecimals);
                return {
                    price,
                    source: 'jupiter',
                    route: response.data.routePlan,
                    impact: response.data.priceImpactPct,
                };
            }

            throw new Error('Invalid response from Jupiter');
        } catch (error) {
            // Suppress verbose network errors (let caller handle warning)
            // Suppress verbose network errors (let caller handle warning)
            // Axios errors often have these codes
            const code = error.code || (error.cause && error.cause.code);
            const msg = error.message || error.toString();

            const isNetworkError =
                code === 'ENOTFOUND' ||
                code === 'ETIMEDOUT' ||
                code === 'ECONNREFUSED' ||
                msg.includes('getaddrinfo') ||
                msg.includes('ENOTFOUND') ||
                msg.includes('timeout');

            if (!isNetworkError) {
                if (error.response) {
                    logError('SOLANA', new Error(`Jupiter API error: ${error.response.status}`));
                } else {
                    logError('SOLANA', error, { context: 'Jupiter price fetch' });
                }
            } else {
                // For network errors, we just re-throw without spamming ERROR log
                // The caller (SolanaMonitor) is already handling this with a WARN log
            }
            throw error;
        }
    }

    /**
     * Get wallet balance
     */
    async getBalance(tokenMint = null) {
        try {
            const targetKey = this.wallet ? this.wallet.publicKey : this.publicKey;

            if (!targetKey) {
                throw new Error('Wallet not initialized (No Private Key or Public Address)');
            }

            if (!tokenMint) {
                // Get SOL balance
                const balance = await this.connection.getBalance(targetKey);
                return balance / 1e9; // Convert lamports to SOL
            } else {
                // Get SPL token balance
                const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
                    targetKey,
                    { mint: new PublicKey(tokenMint) }
                );

                if (tokenAccounts.value.length === 0) {
                    return 0;
                }

                const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
                return balance;
            }
        } catch (error) {
            logError('SOLANA', error, { context: 'get balance' });
            throw error;
        }
    }

    /**
     * Execute swap using Jupiter
     */
    async executeSwap(inputMint, outputMint, amount, slippageBps = 50) {
        if (config.dryRun) {
            logInfo('SOLANA', '[DRY RUN] Would execute swap', {
                inputMint,
                outputMint,
                amount,
            });
            return {
                success: true,
                dryRun: true,
                signature: 'dry-run-signature',
            };
        }

        try {
            if (!this.wallet) {
                throw new Error('Wallet not initialized');
            }

            // Get quote
            const quoteResponse = await axios.get(
                `${config.solana.dexes.jupiter.apiUrl}/quote`,
                {
                    params: {
                        inputMint,
                        outputMint,
                        amount,
                        slippageBps,
                    },
                }
            );

            // Get swap transaction
            const swapResponse = await axios.post(
                `${config.solana.dexes.jupiter.apiUrl}/swap`,
                {
                    quoteResponse: quoteResponse.data,
                    userPublicKey: this.wallet.publicKey.toString(),
                    wrapUnwrapSOL: true,
                    prioritizationFeeLamports: config.solana.priorityFee,
                }
            );

            // Deserialize and sign transaction
            const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');
            const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
            transaction.sign([this.wallet]);

            // Send transaction
            const signature = await this.connection.sendTransaction(transaction);

            // Confirm transaction
            await this.connection.confirmTransaction(signature, 'confirmed');

            logInfo('SOLANA', 'Swap executed successfully', { signature });

            return {
                success: true,
                signature,
                inputMint,
                outputMint,
                amount,
            };
        } catch (error) {
            logError('SOLANA', error, { context: 'execute swap' });
            throw error;
        }
    }

    /**
     * Estimate gas cost for a swap
     */
    async estimateSwapCost() {
        try {
            // Solana transaction fees are relatively constant
            const recentBlockhash = await this.connection.getLatestBlockhash();
            const feeCalculator = await this.connection.getFeeForMessage(
                // A typical swap message (estimated)
                null,
                'confirmed'
            );

            // Base fee + priority fee
            const baseFee = 5000; // lamports (typical)
            const priorityFee = config.solana.priorityFee || 5000;
            const totalFeeLamports = baseFee + priorityFee;

            // Convert to SOL
            const feeSOL = totalFeeLamports / 1e9;

            return {
                feeLamports: totalFeeLamports,
                feeSOL,
                priorityFee,
            };
        } catch (error) {
            logError('SOLANA', error, { context: 'estimate swap cost' });
            // Return default estimate on error
            return {
                feeLamports: 10000,
                feeSOL: 0.00001,
                priorityFee: 5000,
            };
        }
    }

    /**
     * Get current SOL price in USD
     */
    async getSolPriceUSD() {
        try {
            // Use Jupiter to get SOL/USDC price
            const SOL_MINT = 'So11111111111111111111111111111111111111112';
            const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

            const result = await this.getJupiterPrice(SOL_MINT, USDC_MINT);
            return result.price;
        } catch (error) {
            logError('SOLANA', error, { context: 'get SOL price' });
            // Return a default fallback price
            return 100; // Default SOL price in USD
        }
    }

    /**
     * Check if client is ready
     */
    isReady() {
        return this.initialized && this.connection !== null;
    }
}

export default SolanaClient;
