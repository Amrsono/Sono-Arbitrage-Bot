# 🚀 Railway Deployment Guide

## Sono Trading Suite - Production Deployment

This guide will help you deploy your Sono Trading Suite to Railway in minutes.

---

## 📋 Prerequisites

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **GitHub Repository** (Recommended) - Push your code to GitHub
3. **API Keys** (Optional) - For real blockchain/social data

---

## 🎯 Quick Deployment (5 Minutes)

### Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Sono Trading Suite"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/sono-trading-suite.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Railway

1. **Go to** [railway.app](https://railway.app)
2. **Click** "New Project"
3. **Select** "Deploy from GitHub repo"
4. **Choose** your repository
5. **Railway will**:
   - Detect the Dockerfile
   - Build your container
   - Deploy automatically
   - Provide a public URL

### Step 3: Configure Environment

In Railway dashboard:
1. Click on your project
2. Go to **"Variables"** tab
3. Add these variables:

```
PORT=3001
NODE_ENV=production
DRY_RUN=true
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
ETHEREUM_RPC_URL=https://eth.llamarpc.com
```

### Step 4: Access Your Dashboard

Railway will provide a URL like:
```
https://sono-trading-suite-production.up.railway.app
```

Your dual dashboard will be live! 🎉

---

## ⚙️ Configuration Options

### Dashboard-Only Mode (Default)
Perfect for monitoring and analysis without trading:
```
DRY_RUN=true
# No private keys needed
# Safe and secure
```

### Trading Mode (Advanced)
⚠️ **Only enable if you understand the risks!**
```
DRY_RUN=false
SOLANA_PRIVATE_KEY=your_key_here
ETHEREUM_PRIVATE_KEY=your_key_here
MIN_PROFIT_PERCENTAGE=2.0
MAX_TRADE_SIZE_USD=50
```

### Premium RPC Endpoints
For better reliability:

**Alchemy (Ethereum):**
```
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```
Sign up: https://www.alchemy.com

**Helius (Solana):**
```
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```
Sign up: https://www.helius.dev

---

## 🔧 Railway Configuration Files

### Dockerfile ✅
```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p logs
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "src/dashboard/server.js"]
```

### railway.json ✅
```json
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "startCommand": "node src/dashboard/server.js",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### package.json ✅
```json
{
  "scripts": {
    "start": "node src/dashboard/server.js"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

## 📊 What Gets Deployed

**Included:**
- ✅ Dual-dashboard UI (Arbitrage + Sentiment)
- ✅ WebSocket server for real-time updates
- ✅ Sentiment analyzer (simulated data)
- ✅ Price monitoring system
- ✅ All static assets (HTML, CSS, JS)

**Not Included (by design):**
- ❌ `.env` file (set in Railway dashboard)
- ❌ `node_modules` (installed during build)
- ❌ Local logs (ephemeral in Railway)
- ❌ Private keys (never commit!)

---

## 🌐 Accessing Your Deployed App

### Railway Provides:
1. **Public URL** - `https://your-app.up.railway.app`
2. **SSL Certificate** - Automatic HTTPS
3. **Auto-deploy** - Pushes trigger rebuilds
4. **Logs** - View in Railway dashboard
5. **Metrics** - CPU, memory, network usage

### Testing Your Deployment:
```bash
# Check if it's live
curl https://your-app.up.railway.app/api/status

# Expected response: JSON with bot state
```

---

## 🔐 Security Best Practices

### ✅ DO:
- Use Railway's environment variables
- Keep `DRY_RUN=true` initially
- Use premium RPC endpoints
- Monitor API rate limits
- Review logs regularly

### ❌ DON'T:
- Commit `.env` files
- Share your Railway URL publicly (if trading)
- Enable trading without testing
- Use same wallet for large amounts
- Ignore error notifications

---

## 📈 Monitoring  & Logs

### View Logs in Railway:
1. Go to your project
2. Click "Deployments"
3. Select latest deployment
4. Click "View Logs"

### What to Watch:
```
✅ "Dashboard Server Started"
✅ "Starting price simulation"
✅ "Starting sentiment tracking"
✅ "Dashboard client connected"
```

### Common Issues:
```
❌ "EADDRINUSE" → Port conflict (Railway handles this)
❌ "Module not found" → Dependencies issue (check package.json)
❌ "Connection refused" → RPC endpoint down (use fallback)
```

---

## 💰 Costs

### Free Tier:
- **$5 free credits/month**
- Perfect for this dashboard
- Includes:
  - 512MB RAM
  - Shared CPU
  - Outbound bandwidth

### Estimated Usage:
- **This app**: ~$3-5/month
- **With trading bots**: $5-10/month

### Optimization:
```javascript
// Reduce update frequency to save resources
setInterval(() => {...}, 10000); // 10s instead of 5s
```

---

## 🔄 Continuous Deployment

### Auto-deploy on Git Push:
1. Make changes locally
2. Commit: `git commit -am "Update feature"`
3. Push: `git push`
4. Railway detects change
5. Rebuilds & redeploys automatically
6. Live in ~2 minutes!

### Manual Deploy:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

---

## 🎯 Post-Deployment Checklist

### Immediately After Deploy:
- [ ] Visit your Railway URL
- [ ] Verify dashboard loads
- [ ] Check WebSocket connection (green badge)
- [ ] Confirm prices update every 5-8 seconds
- [ ] Test sentiment tracker shows tokens
- [ ] Review deployment logs for errors

### Within 24 Hours:
- [ ] Monitor resource usage in Railway
- [ ] Check for any error patterns
- [ ] Verify uptime is stable
- [ ] Test from different devices/networks
- [ ] Share URL with team if applicable

### Weekly:
- [ ] Review Railway usage/costs
- [ ] Check for Railway platform updates
- [ ] Update dependencies if needed
- [ ] Rotate API keys (security)

---

## 🚀 Advanced: Custom Domain

1. **Purchase domain** (Namecheap, GoDaddy, etc.)
2. **In Railway**:
   - Settings → Domains
   - Click "Add Domain"
   - Enter your domain
3. **Add DNS records**:
   ```
   Type: CNAME
   Name: @
   Value: your-app.up.railway.app
   ```
4. **Wait 24-48h** for DNS propagation

---

## 📞 Support & Resources

### Railway:
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://railway.statuspage.io

### This Project:
- GitHub Issues: Create issues for bugs
- Documentation: Check README.md files
- Logs: `./logs/` directory locally

---

## 🎉 Success!

Your Sono Trading Suite is now live in production!

**Next Steps:**
1. Share your Railway URL to access anywhere
2. Monitor the dashboard performance
3. Consider adding real API integrations
4. Scale up resources if needed
5. Add authentication for security

**You've deployed a professional-grade trading dashboard!** 🚀

---

## 📱 Quick Reference

```bash
# Deploy new changes
git add .
git commit -m "Update"
git push

# View logs
railway logs

# Open in browser
railway open

# Check status
railway status

# Redeploy
railway up
```

---

**Railway URL:** Your dashboard will be at:
```
https://sono-trading-suite-production-xxx.up.railway.app
```

**Status:** ✅ Ready for production deployment!
