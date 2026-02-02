import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Execution mode
  dryRun: process.env.DRY_RUN === 'true',

  // Solana configuration
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    privateKey: process.env.SOLANA_PRIVATE_KEY,
    walletAddress: process.env.SOLANA_WALLET_ADDRESS,
    tokenMint: process.env.G_TOKEN_SOLANA,
    priorityFee: parseInt(process.env.SOLANA_PRIORITY_FEE_LAMPORTS || '5000'),
    
    // DEX configurations
    dexes: {
      jupiter: {
        enabled: true,
        apiUrl: 'https://quote-api.jup.ag/v6',
      },
      raydium: {
        enabled: true,
        programId: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
      },
      orca: {
        enabled: true,
        programId: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP',
      },
    },
  },

  // Ethereum configuration
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    privateKey: process.env.ETHEREUM_PRIVATE_KEY,
    walletAddress: process.env.ETHEREUM_WALLET_ADDRESS,
    tokenAddress: process.env.G_TOKEN_ETHEREUM,
    chainId: 1, // Mainnet
    maxGasPrice: process.env.MAX_GAS_PRICE_GWEI || 100,
    
    // DEX configurations
    dexes: {
      uniswapV3: {
        enabled: true,
        routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        quoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
      },
      sushiswap: {
        enabled: true,
        routerAddress: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      },
    },
  },

  // Trading parameters
  trading: {
    minProfitPercentage: parseFloat(process.env.MIN_PROFIT_PERCENTAGE || '1.5'),
    maxTradeSizeUsd: parseFloat(process.env.MAX_TRADE_SIZE_USD || '1000'),
    maxSlippagePercentage: parseFloat(process.env.MAX_SLIPPAGE_PERCENTAGE || '0.5'),
  },

  // Monitoring configuration
  monitoring: {
    intervalMs: parseInt(process.env.MONITORING_INTERVAL_MS || '5000'),
    priceHistorySize: 100, // Keep last 100 price points
    staleDataThresholdMs: 30000, // 30 seconds
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logToFile: process.env.LOG_TO_FILE === 'true',
    logDirectory: './logs',
    tradeHistoryDirectory: './trade-history',
  },

  // Agent configuration
  agents: {
    retryAttempts: 3,
    retryDelayMs: 1000,
    healthCheckIntervalMs: 30000,
  },
};

// Validation
function validateConfig() {
  const errors = [];

  if (!config.dryRun) {
    // Validate critical fields only when not in dry-run mode
    if (!config.solana.privateKey) errors.push('SOLANA_PRIVATE_KEY is required');
    if (!config.ethereum.privateKey) errors.push('ETHEREUM_PRIVATE_KEY is required');
    if (!config.solana.tokenMint) errors.push('G_TOKEN_SOLANA is required');
    if (!config.ethereum.tokenAddress) errors.push('G_TOKEN_ETHEREUM is required');
  }

  if (!config.ethereum.rpcUrl) errors.push('ETHEREUM_RPC_URL is required');

  if (errors.length > 0) {
    console.error('Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid configuration');
  }
}

validateConfig();

export default config;
