import { ethers } from 'ethers';
import config from '../config/config.js';
import { logInfo, logError } from '../utils/logger.js';

// Minimal Uniswap V3 Router ABI (for quotes and swaps)
const UNISWAP_ROUTER_ABI = [
    'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
];

// ERC20 ABI for token operations
const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
];

// Uniswap V3 Quoter ABI
const QUOTER_ABI = [
    'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
];

/**
 * Ethereum blockchain client for DEX interactions
 */
class EthereumClient {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.initialized = false;
        this.uniswapRouter = null;
        this.quoter = null;
    }

    /**
     * Initialize the Ethereum client
     */
    async initialize() {
        try {
            // Create provider
            this.provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);

            // Initialize wallet if private key is provided
            if (config.ethereum.privateKey && !config.dryRun) {
                try {
                    this.wallet = new ethers.Wallet(config.ethereum.privateKey, this.provider);
                    logInfo('ETHEREUM', 'Wallet initialized', {
                        address: this.wallet.address,
                    });
                } catch (error) {
                    logError('ETHEREUM', error, { context: 'wallet initialization' });
                    throw new Error('Invalid Ethereum private key format');
                }
            }

            // Test connection
            const network = await this.provider.getNetwork();
            const blockNumber = await this.provider.getBlockNumber();

            logInfo('ETHEREUM', `Connected to Ethereum network`, {
                chainId: network.chainId.toString(),
                blockNumber,
            });

            // Initialize Uniswap contracts
            if (config.ethereum.dexes.uniswapV3.enabled) {
                this.uniswapRouter = new ethers.Contract(
                    config.ethereum.dexes.uniswapV3.routerAddress,
                    UNISWAP_ROUTER_ABI,
                    this.wallet || this.provider
                );

                this.quoter = new ethers.Contract(
                    config.ethereum.dexes.uniswapV3.quoterAddress,
                    QUOTER_ABI,
                    this.provider
                );
            }

            this.initialized = true;
            return true;
        } catch (error) {
            logError('ETHEREUM', error, { context: 'initialization' });
            throw error;
        }
    }

    /**
     * Get price from Uniswap V3
     */
    async getUniswapPrice(tokenIn, tokenOut, fee = 3000) {
        try {
            // USDC address on Ethereum mainnet
            const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

            if (!tokenOut) {
                tokenOut = USDC;
            }

            // Quote for 1 token (assuming 18 decimals, adjust if needed)
            const amountIn = ethers.parseUnits('1', 18);

            // Get quote from Uniswap V3 Quoter (static call)
            const quotedAmountOut = await this.quoter.quoteExactInputSingle.staticCall(
                tokenIn,
                tokenOut,
                fee,
                amountIn,
                0
            );

            // Calculate price (USDC has 6 decimals)
            const price = parseFloat(ethers.formatUnits(quotedAmountOut, 6));

            return {
                price,
                source: 'uniswap-v3',
                fee,
                amountIn: amountIn.toString(),
                amountOut: quotedAmountOut.toString(),
            };
        } catch (error) {
            // If quote fails, it might be due to no liquidity or wrong token
            logError('ETHEREUM', error, { context: 'Uniswap price fetch', tokenIn, tokenOut });
            throw error;
        }
    }

    /**
     * Get wallet balance
     */
    async getBalance(tokenAddress = null) {
        try {
            if (!this.wallet) {
                throw new Error('Wallet not initialized');
            }

            if (!tokenAddress) {
                // Get ETH balance
                const balance = await this.provider.getBalance(this.wallet.address);
                return parseFloat(ethers.formatEther(balance));
            } else {
                // Get ERC20 token balance
                const tokenContract = new ethers.Contract(
                    tokenAddress,
                    ERC20_ABI,
                    this.provider
                );

                const balance = await tokenContract.balanceOf(this.wallet.address);
                const decimals = await tokenContract.decimals();

                return parseFloat(ethers.formatUnits(balance, decimals));
            }
        } catch (error) {
            logError('ETHEREUM', error, { context: 'get balance' });
            throw error;
        }
    }

    /**
     * Execute swap on Uniswap V3
     */
    async executeSwap(tokenIn, tokenOut, amountIn, slippagePercent = 0.5, fee = 3000) {
        if (config.dryRun) {
            logInfo('ETHEREUM', '[DRY RUN] Would execute swap', {
                tokenIn,
                tokenOut,
                amountIn,
            });
            return {
                success: true,
                dryRun: true,
                hash: 'dry-run-hash',
            };
        }

        try {
            if (!this.wallet) {
                throw new Error('Wallet not initialized');
            }

            // Get quote first
            const quotedAmountOut = await this.quoter.quoteExactInputSingle.staticCall(
                tokenIn,
                tokenOut,
                fee,
                amountIn,
                0
            );

            // Calculate minimum output with slippage
            const slippageFactor = 1 - slippagePercent / 100;
            const amountOutMinimum = (quotedAmountOut * BigInt(Math.floor(slippageFactor * 1000))) / 1000n;

            // Check and approve token if needed
            const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, this.wallet);
            const allowance = await tokenContract.allowance(
                this.wallet.address,
                config.ethereum.dexes.uniswapV3.routerAddress
            );

            if (allowance < amountIn) {
                logInfo('ETHEREUM', 'Approving token for swap');
                const approveTx = await tokenContract.approve(
                    config.ethereum.dexes.uniswapV3.routerAddress,
                    amountIn
                );
                await approveTx.wait();
            }

            // Prepare swap parameters
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

            const params = {
                tokenIn,
                tokenOut,
                fee,
                recipient: this.wallet.address,
                deadline,
                amountIn,
                amountOutMinimum,
                sqrtPriceLimitX96: 0,
            };

            // Execute swap
            const tx = await this.uniswapRouter.exactInputSingle(params);
            logInfo('ETHEREUM', 'Swap transaction sent', { hash: tx.hash });

            // Wait for confirmation
            const receipt = await tx.wait();
            logInfo('ETHEREUM', 'Swap executed successfully', {
                hash: receipt.hash,
                gasUsed: receipt.gasUsed.toString(),
            });

            return {
                success: true,
                hash: receipt.hash,
                gasUsed: receipt.gasUsed.toString(),
                tokenIn,
                tokenOut,
                amountIn: amountIn.toString(),
            };
        } catch (error) {
            logError('ETHEREUM', error, { context: 'execute swap' });
            throw error;
        }
    }

    /**
     * Estimate gas cost for a swap
     */
    async estimateSwapCost(tokenIn, tokenOut, amountIn, fee = 3000) {
        try {
            // Get current gas price
            const feeData = await this.provider.getFeeData();
            const gasPrice = feeData.gasPrice;

            // Estimate gas limit for swap (typical Uniswap V3 swap uses ~150k-200k gas)
            const estimatedGasLimit = 180000n;

            // Calculate cost in ETH
            const gasCostWei = gasPrice * estimatedGasLimit;
            const gasCostETH = parseFloat(ethers.formatEther(gasCostWei));

            return {
                gasPrice: gasPrice.toString(),
                gasPriceGwei: parseFloat(ethers.formatUnits(gasPrice, 'gwei')),
                estimatedGasLimit: estimatedGasLimit.toString(),
                gasCostWei: gasCostWei.toString(),
                gasCostETH,
            };
        } catch (error) {
            logError('ETHEREUM', error, { context: 'estimate swap cost' });
            // Return default estimate
            return {
                gasPrice: '0',
                gasPriceGwei: 30,
                estimatedGasLimit: '180000',
                gasCostWei: '0',
                gasCostETH: 0.0054, // ~30 gwei * 180k gas
            };
        }
    }

    /**
     * Get current ETH price in USD
     */
    async getEthPriceUSD() {
        try {
            // Use Uniswap to get ETH/USDC price
            const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
            const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

            const result = await this.getUniswapPrice(WETH, USDC);
            return result.price;
        } catch (error) {
            logError('ETHEREUM', error, { context: 'get ETH price' });
            // Return a default fallback price
            return 2500; // Default ETH price in USD
        }
    }

    /**
     * Check if client is ready
     */
    isReady() {
        return this.initialized && this.provider !== null;
    }
}

export default EthereumClient;
