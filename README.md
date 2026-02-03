# Sono Trading Suite

🤖 Professional dual-dashboard trading suite with DEX arbitrage monitoring and social sentiment tracking.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## � Features

### Left Panel: Sono Arbitrage Bot
- ⚡ Real-time price monitoring (Solana & Ethereum)
- 🎯 Arbitrage opportunity detection
- 📊 Trading statistics & profit tracking
- 💰 Multi-DEX support (Jupiter, Uniswap V3)
- 🔒 Safe dry-run mode

### Right Panel: Social Sentiment Tracker
- 🔥 Trending crypto token detection
- 🐦 Twitter & Farcaster integration  
- 📈 Sentiment analysis (Bullish/Bearish/Neutral)
- ⚡ Real-time social media feed
- 🚀 Hot token alerts

## 🎨 Live Demo

**Deployed on Railway:** [Your URL here after deployment]

**Local Development:**
```bash
npm install
npm run dashboard
# Visit http://localhost:3001
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20.0.0
- npm >= 9.0.0

### Installation
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/sono-trading-suite.git
cd sono-trading-suite

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start dashboard
npm run dashboard
```

Visit `http://localhost:3001` to see your dual dashboard!

## 📦 Deployment

### Railway (Recommended)

1. Push to GitHub
2. Connect to Railway
3. Deploy automatically
4. Access via Railway URL

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed instructions.

### Docker

```bash
# Build
docker build -t sono-trading-suite .

# Run
docker run -p 3001:3001 sono-trading-suite
```

## 🛠️ Configuration

### Environment Variables

Key variables in `.env`:
```env
PORT=3001
NODE_ENV=production
DRY_RUN=true
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
ETHEREUM_RPC_URL=https://eth.llamarpc.com
```

See [`.env.production`](./.env.production) for all options.

## 📊 Architecture

```
┌─────────────────────────────────────┐
│         Browser Client              │
│  ┌──────────┐  ┌──────────────┐    │
│  │Arbitrage │  │  Sentiment   │    │
│  │   Bot    │  │   Tracker    │    │
│  └────┬─────┘  └──────┬───────┘    │
└───────┼────────────────┼────────────┘
        │   WebSocket    │
┌───────▼────────────────▼────────────┐
│       Dashboard Server (3001)       │
│  ┌──────────┐  ┌──────────────┐    │
│  │  Price   │  │  Sentiment   │    │
│  │Simulator │  │  Analyzer    │    │
│  └──────────┘  └──────────────┘    │
└─────────────────────────────────────┘
```

## 🎯 Tech Stack

- **Backend**: Node.js, Express, WebSocket
- **Frontend**: Vanilla HTML/CSS/JS
- **Blockchain**: Solana Web3.js, Ethers.js
- **Deployment**: Docker, Railway
- **APIs**: Twitter, Farcaster (ready to integrate)

## 📚 Documentation

- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Dual Dashboard Guide](./DUAL_DASHBOARD_GUIDE.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Quick Setup](./QUICK_SETUP.md)

## 🔍 Data Sources & Integrity

We believe in 100% transparency regarding data sources. Here is the breakdown:

### ✅ Real Live Data
*   **Solana Prices:** Fetched real-time from **Jupiter Aggregator** via `SolanaMonitor`.
*   **Ethereum Prices:** Fetched real-time from **Uniswap V3** and RPC hooks via `EthereumMonitor`.
*   **Wallet Balances:** Live fetches from your configured Wallet (SOL) and Binance (ETH/USDT).
*   **Arbitrage Logic:** Opportunities are calculated mathematically using these live price feeds.
*   **Social Sentiment:** Real-time analysis of trending tokens (when configured).

### ⚠️ Placeholders & Simulations
*   **Startup State (T=0s):** When the server first boots, it initializes with hardcoded placeholder values (e.g., ~$103 SOL) for < 1 second. These are **immediately overwritten** by the first real network packet.
*   **Pi Network:** Price is fetched from CoinGecko, but as Pi is not on Mainnet, this represents an **IOU/Speculative Price**, not a tradeable DEX price.
*   **Log Watcher Fallback:** If the system cannot find or read `combined.log`, it may fall back to simulated data strings. (Check console logs for "Using simulated data" warning to confirm).

## � Security

- Never commit `.env` files
- Keep `DRY_RUN=true` for testing
- Use environment variables for secrets
- Monitor API rate limits
- Review code before enabling real trading

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## � License

MIT License - see [LICENSE](./LICENSE) file

## 🙏 Acknowledgments

- Solana Foundation
- Ethereum Community
- Railway Team
- Open source contributors

## � Support

- Issues: GitHub Issues
- Documentation: See `docs/` folder
- Community: [Discord/Telegram link]

---

**Built with ❤️ by the Sono Team**

⭐ Star this repo if you find it useful!
