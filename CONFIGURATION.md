# Configuration Guide

## 🔧 Quick Configuration Steps

Follow these steps to configure your DEX arbitrage bot:

## Step 1: Get Solana Private Key

### From Phantom Wallet:
1. Open Phantom wallet
2. Click Settings → Show Secret Recovery Phrase
3. **OR** export private key for the specific account
4. Copy the base58 private key

### From Solana CLI:
```bash
solana-keygen recover
# Follow prompts to export your keypair
```

## Step 2: Get Ethereum Private Key

### From MetaMask:
1. Open MetaMask
2. Click the three dots → Account Details
3. Click "Export Private Key"
4. Enter your password
5. Copy the hex private key (should start with `0x`)

## Step 3: Find G Token Addresses

### For Solana:
- Visit [Solscan](https://solscan.io/)
- Search for "Gravity" or "G token"
- Copy the mint address (44 characters)
- **OR** ask the Gravity team for the official mint address

### For Ethereum:
- Visit [Etherscan](https://etherscan.io/)
- Search for "Gravity token" or "G token"
- Copy the contract address (starts with `0x`, 42 characters)
- **OR** ask the Gravity team for the official contract address

## Step 4: Get RPC Endpoints

### Solana RPC Options:

**Free (with limits):**
- `https://api.mainnet-beta.solana.com` (default, but rate-limited)

**Paid (recommended for production):**
- **QuickNode**: https://www.quicknode.com/
  - Sign up → Create endpoint → Select Solana Mainnet
  - Copy your endpoint URL
  
- **Helius**: https://www.helius.dev/
  - Create free account → Create API key
  - Use: `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`

### Ethereum RPC Options:

**Infura** (recommended):
1. Sign up at https://infura.io/
2. Create new project
3. Copy your project ID
4. Use: `https://mainnet.infura.io/v3/YOUR_PROJECT_ID`

**Alchemy** (alternative):
1. Sign up at https://www.alchemy.com/
2. Create app → Select Ethereum Mainnet
3. Copy your HTTP endpoint

## Step 5: Fill in .env File

Open `d:\New projects\Project X\.env` and replace these values:

```env
# Replace these placeholders:
SOLANA_PRIVATE_KEY=YOUR_ACTUAL_BASE58_KEY_HERE
SOLANA_WALLET_ADDRESS=YOUR_SOLANA_ADDRESS_HERE
G_TOKEN_SOLANA=ACTUAL_G_TOKEN_MINT_ADDRESS

ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
ETHEREUM_PRIVATE_KEY=0xYOUR_ACTUAL_ETHEREUM_KEY_HERE
ETHEREUM_WALLET_ADDRESS=0xYOUR_ETHEREUM_ADDRESS_HERE
G_TOKEN_ETHEREUM=0xACTUAL_G_TOKEN_CONTRACT_ADDRESS
```

## Step 6: Verify Wallets Have Funds

### Check Balances:

**Solana:**
- Need SOL for gas fees (start with at least 0.1 SOL)
- Need G tokens if you want to test selling on Solana
- Need USDC if you want to test buying on Solana

**Ethereum:**
- Need ETH for gas fees (start with at least 0.05 ETH)
- Need G tokens if you want to test selling on Ethereum
- Need USDC if you want to test buying on Ethereum

## Step 7: Test in Dry-Run Mode

Before enabling live trading, ALWAYS test first:

```bash
npm run test:dry-run
```

This will:
- ✅ Connect to both blockchains
- ✅ Monitor real-time prices
- ✅ Detect arbitrage opportunities
- ✅ Simulate trades (without executing)
- ✅ Show you what would happen

Let it run for **at least 1-2 hours** to ensure:
- Price monitoring works correctly
- Opportunities are detected accurately
- No errors in the logs
- Gas estimates are reasonable

## Step 8: Enable Live Trading (When Ready)

> [!CAUTION]
> Only do this after thorough testing!

1. **Start small:**
   ```env
   MAX_TRADE_SIZE_USD=10  # Start with $10 trades
   ```

2. **Enable live mode:**
   ```env
   DRY_RUN=false  # ⚠️ Real trades will execute!
   ```

3. **Run the bot:**
   ```bash
   npm start
   ```

4. **Monitor closely:**
   - Watch the console output
   - Check `./logs/trades.log` for execution details
   - Verify first trade completes successfully
   - Confirm profit calculations are accurate

5. **Scale up gradually:**
   - After 5-10 successful small trades, increase size
   - Monitor gas costs vs profit margins
   - Adjust `MIN_PROFIT_PERCENTAGE` if needed

## Common Configuration Issues

### "Configuration validation failed"
- Check all required fields are filled in `.env`
- Ensure no placeholder text remains
- Verify RPC URLs are accessible

### "Invalid Solana private key format"
- Key should be base58 encoded (letters and numbers only)
- No `0x` prefix for Solana keys
- Check for extra spaces or newlines

### "Invalid Ethereum private key format"
- Key should start with `0x`
- Should be 66 characters total (0x + 64 hex chars)
- Check for extra spaces

### "Failed to connect to RPC"
- Verify RPC URLs are correct
- Check API keys are valid
- Test URLs in browser or with curl

### Test RPC Endpoints:
```bash
# Test Solana RPC
curl https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Test Ethereum RPC (replace YOUR_URL)
curl YOUR_ETHEREUM_RPC_URL -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Security Best Practices

✅ **DO:**
- Keep `.env` file private (already in `.gitignore`)
- Use different wallets for testing vs production
- Start with small amounts
- Monitor logs regularly
- Set conservative profit thresholds
- Use hardware wallets for large amounts

❌ **DON'T:**
- Commit `.env` to git
- Share your private keys
- Run with `DRY_RUN=false` before thorough testing
- Use wallets with large balances for testing
- Ignore error messages in logs
- Set `MIN_PROFIT_PERCENTAGE` too low

## Recommended Initial Settings

For safe testing:
```env
DRY_RUN=true
MIN_PROFIT_PERCENTAGE=2.0
MAX_TRADE_SIZE_USD=10
MAX_SLIPPAGE_PERCENTAGE=0.5
MONITORING_INTERVAL_MS=5000
```

For production (after testing):
```env
DRY_RUN=false
MIN_PROFIT_PERCENTAGE=1.5
MAX_TRADE_SIZE_USD=500
MAX_SLIPPAGE_PERCENTAGE=0.5
MONITORING_INTERVAL_MS=5000
```

## Getting Help

If you encounter issues:

1. **Check the logs:**
   ```bash
   cat ./logs/error.log
   cat ./logs/combined.log
   ```

2. **Verify configuration:**
   - All RPC endpoints accessible
   - Token addresses are correct for mainnet
   - Wallets have sufficient balances

3. **Test individual components:**
   - Try connecting to Solana RPC manually
   - Try connecting to Ethereum RPC manually
   - Verify you can see token balances

## Ready to Start?

Once you've completed all steps above:

```bash
# Test configuration
npm run test:dry-run

# Watch the console output
# Let it run for 1-2 hours
# Review logs in ./logs/

# When ready for live trading:
# 1. Set DRY_RUN=false
# 2. Start with small MAX_TRADE_SIZE_USD
# 3. npm start
```

Good luck! 🚀
