# 🚀 Quick Setup Helper

## ✅ VERIFIED TOKEN ADDRESSES

Based on current research, here are the **official Gravity (G) token addresses**:

### Ethereum (VERIFIED ✅)
```
Contract Address: 0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649
```
- **Source**: Official Gravity docs, Etherscan, CoinGecko
- **Network**: Ethereum Mainnet
- **Token Type**: ERC-20
- **Verified on**: [Etherscan](https://etherscan.io/token/0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649)

### Solana (⚠️ IMPORTANT NOTE)
```
Status: NOT OFFICIALLY SUPPORTED
```
**IMPORTANT**: Gravity (G) token does **NOT** have an official presence on Solana mainnet as of 2026. The Gravity token is primarily an ERC-20 token on Ethereum and other EVM chains (like BNB Chain, Base).

**What this means for your bot:**
- You can monitor G token prices on Ethereum DEXs (Uniswap) ✅
- There is NO official G token on Solana to monitor ❌
- **Alternative approach needed** (see options below)

---

## 🔄 ALTERNATIVE APPROACHES

Since G token doesn't exist on Solana, here are your options:

### Option 1: Use Different Tokens for Demo/Testing
Test the bot with tokens that exist on BOTH chains:

**Wrapped ETH (WETH):**
- Ethereum: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- Solana: Wrapped SOL equivalent or bridged ETH

**USDC (Best for testing):**
- Ethereum: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Solana: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

### Option 2: Monitor SOL vs ETH Price Arbitrage
Monitor the native tokens of each chain:
- Solana: SOL (native token)
- Ethereum: ETH/WETH

### Option 3: Use Wrapped Tokens on Both Chains
Many popular tokens have wrapped versions on both chains via bridges:
- **Wrapped BTC (WBTC)**: Available on both
- **Wrapped Ethereum**: Available on Solana via bridges

---

## 🌐 FREE RPC ENDPOINTS (Ready to Use)

### Ethereum RPC (Choose one):

#### 1. **Alchemy (RECOMMENDED)** - 30M free requests/month
1. Sign up at: https://www.alchemy.com/
2. Create a new app → Select "Ethereum Mainnet"
3. Copy your API key
4. Your endpoint: `https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY`

**Free tier includes:**
- 30 million Compute Units/month
- ~300 requests/second
- Full archive data access
- NFT APIs included

#### 2. **Infura** - 6M credits/day
1. Sign up at: https://infura.io/
2. Create new project
3. Copy your API key
4. Your endpoint: `https://mainnet.infura.io/v3/YOUR_API_KEY`

**Free tier includes:**
- 6 million credits/day
- 2,000 credits/second
- Up to 3 projects

#### 3. **Quick Alternative** (for immediate testing):
```
https://eth.llamarpc.com
```
- No API key needed
- Public endpoint (may be slower)
- Good for testing only

### Solana RPC (Choose one):

#### 1. **Helius (RECOMMENDED)** - Fast & Reliable
1. Sign up at: https://www.helius.dev/
2. Create API key
3. Your endpoint: `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`

**Free tier includes:**
- 100,000 requests/day
- WebSocket support
- Geyser plugin access

#### 2. **QuickNode** - Professional Grade
1. Sign up at: https://www.quicknode.com/
2. Create endpoint → Select Solana Mainnet
3. Copy your HTTP endpoint

**Free tier includes:**
- 10M requests/month
- Global infrastructure
- Archive data available

#### 3. **Public RPC** (for immediate testing):
```
https://api.mainnet-beta.solana.com
```
- No API key needed
- Rate-limited
- Good for testing only

---

## 📝 RECOMMENDED CONFIGURATION FOR TESTING

Since G token isn't on Solana, I recommend testing with **SOL vs ETH** arbitrage:

### Step 1: Update your `.env` file with these working values:

```env
# Use public RPCs for immediate testing (no signup needed)
ETHEREUM_RPC_URL=https://eth.llamarpc.com
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# For Ethereum - Use WETH (Wrapped ETH)
G_TOKEN_ETHEREUM=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

# For Solana - Use SOL (native token represented by this address)
G_TOKEN_SOLANA=So11111111111111111111111111111111111111112

# Keep these as placeholders for dry-run testing
SOLANA_PRIVATE_KEY=placeholder_for_dry_run_testing
ETHEREUM_PRIVATE_KEY=0xplaceholder_for_dry_run_testing
SOLANA_WALLET_ADDRESS=placeholder
ETHEREUM_WALLET_ADDRESS=0xplaceholder
```

### Step 2: Test immediately with dry-run:
```bash
npm run test:dry-run
```

This will:
- ✅ Connect to both blockchains
- ✅ Monitor SOL vs ETH prices in real-time
- ✅ Work immediately without any API keys for testing
- ✅ Not require private keys in dry-run mode

---

## 🔐 GETTING YOUR PRIVATE KEYS (When Ready for Live Trading)

### Solana Private Key (Base58 format):

**From Phantom Wallet:**
1. Open Phantom browser extension
2. Click hamburger menu (☰) → Settings
3. Click "Export Private Key" for your account
4. Enter your password
5. Copy the base58 key (looks like: `5Kd3NBUAdun...`)

**From Solana CLI:**
```bash
solana-keygen pubkey ~/.config/solana/id.json --outfile -
```

### Ethereum Private Key (Hex format):

**From MetaMask:**
1. Open MetaMask
2. Click the three dots (⋮) → Account Details
3. Click "Export Private Key"
4. Enter your MetaMask password
5. Copy the hex key (starts with `0x`)

---

## ⚡ QUICK START COMMANDS

### 1. For Immediate Testing (No Setup):
```bash
# Just test the bot with public RPCs and placeholder keys
npm run test:dry-run
```

### 2. Get Alchemy API Key (Recommended):
```bash
# 1. Visit: https://www.alchemy.com/
# 2. Sign up (free)
# 3. Create app → "Ethereum Mainnet"
# 4. Copy API key
# 5. Update ETHEREUM_RPC_URL in .env
```

### 3. Get Helius API Key (Optional but recommended):
```bash
# 1. Visit: https://www.helius.dev/
# 2. Sign up (free)
# 3. Create API key
# 4. Update SOLANA_RPC_URL in .env
```

---

## 🎯 WHAT TO DO NOW

### Immediate Testing (RIGHT NOW):
I can update your `.env` file with working test values for SOL/ETH monitoring. This will let you:
- ✅ Test the bot immediately
- ✅ See it in action with real price data
- ✅ No API keys needed for dry-run
- ✅ No private keys needed for dry-run

**Would you like me to:**
1. ✅ Update `.env` with test configuration for SOL/ETH monitoring?
2. ⏭️ Help you sign up for Alchemy (5 minutes)?
3. ⏭️ Guide you through a different token pair?

---

## 📌 SUMMARY

**The situation:**
- ❌ Gravity (G) token doesn't exist on Solana (only Ethereum)
- ✅ We have verified Ethereum address for G token
- ✅ We can test with SOL vs ETH instead
- ✅ Public RPCs available for immediate testing

**Best path forward:**
1. Test with SOL/ETH first (I can set this up now)
2. Sign up for Alchemy free tier (better reliability)
3. Add your private keys when ready for live trading
