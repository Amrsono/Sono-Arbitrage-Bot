# 🚀 Fly.io Deployment Guide

## Sono Trading Suite - Fly.io Deployment

Quick guide to deploy your Sono Trading Suite to Fly.io.

---

## 📋 Prerequisites

1. **Fly.io Account** - Sign up at [fly.io](https://fly.io)
2. **Flyctl CLI** - Install the Fly.io CLI tool
3. **GitHub Repository** - Already done! ✅

---

## ⚙️ Install Fly.io CLI

### Windows:
```powershell
# Using PowerShell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Verify Installation:
```bash
fly version
```

---

## 🚀 Deploy to Fly.io (5 Steps)

### Step 1: Login to Fly.io
```bash
fly auth login
```
This opens your browser to authenticate.

### Step 2: Navigate to Your Project
```bash
cd "d:\New projects\Project X"
```

### Step 3: Launch Your App
```bash
fly launch
```

**Fly.io will ask:**
- ✅ App name: `sono-arbitrage-bot` (or choose your own)
- ✅ Region: Choose closest to you (e.g., `iad` for US East)
- ✅ PostgreSQL: **No** (we don't need a database)
- ✅ Redis: **No** (not needed)
- ⚠️ Deploy now: **No** (we need to set secrets first)

### Step 4: Set Environment Variables (Secrets)
```bash
# Required variables
fly secrets set DRY_RUN=true
fly secrets set NODE_ENV=production

# Optional but recommended
fly secrets set SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
fly secrets set ETHEREUM_RPC_URL=https://eth.llamarpc.com

# For production trading (DO NOT set unless you know what you're doing!)
# fly secrets set SOLANA_PRIVATE_KEY=your_key_here
# fly secrets set ETHEREUM_PRIVATE_KEY=your_key_here
```

### Step 5: Deploy!
```bash
fly deploy
```

**That's it!** Your app will be live at:
```
https://sono-arbitrage-bot.fly.dev
```

---

## 🔐 Environment Variables on Fly.io

### ✅ REQUIRED Variables:

**Dashboard Mode (Safe, No Trading):**
```bash
fly secrets set DRY_RUN=true
fly secrets set NODE_ENV=production
```

**These are set in fly.toml (public):**
- `PORT=3001` - Server port
- `NODE_ENV=production` - Environment

### 📊 RECOMMENDED Variables:

**Better RPC Performance:**
```bash
# Solana (upgrade to Helius for production)
fly secrets set SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Ethereum (upgrade to Alchemy for production)
fly secrets set ETHEREUM_RPC_URL=https://eth.llamarpc.com
```

### 🔑 OPTIONAL Variables (Advanced):

**For Real Trading (⚠️ High Risk!):**
```bash
fly secrets set SOLANA_PRIVATE_KEY=your_base58_private_key
fly secrets set ETHEREUM_PRIVATE_KEY=0xyour_hex_private_key
fly secrets set MIN_PROFIT_PERCENTAGE=2.0
fly secrets set MAX_TRADE_SIZE_USD=50
```

**For Real Social Sentiment:**
```bash
fly secrets set TWITTER_API_KEY=your_twitter_key
fly secrets set TWITTER_API_SECRET=your_twitter_secret
fly secrets set TWITTER_BEARER_TOKEN=your_bearer_token
fly secrets set FARCASTER_API_KEY=your_farcaster_key
```

---

## 📝 How to Manage Secrets

### Set a Secret:
```bash
fly secrets set VARIABLE_NAME=value
```

### List All Secrets:
```bash
fly secrets list
```

### Remove a Secret:
```bash
fly secrets unset VARIABLE_NAME
```

### View App Info:
```bash
fly status
```

---

## 🌐 Accessing Your App

**Your URL:**
```
https://sono-arbitrage-bot.fly.dev
```
Or whatever app name you chose.

**View Logs:**
```bash
fly logs
```

**Open in Browser:**
```bash
fly open
```

---

## 💰 Fly.io Costs

### Free Tier Includes:
- **3 shared-cpu-1x VMs** with 256MB RAM
- **160GB outbound data transfer/month**
- **Permanent after adding payment method**

### Expected Usage:
- **This app**: FREE (within limits)
- **Memory**: ~100-200MB
- **CPU**: <10% typical
- **Bandwidth**: Minimal

**Your trading suite fits in the FREE tier!** 🎉

---

## 🔧 Fly.io vs Railway

| Feature | Fly.io | Railway |
|---------|--------|---------|
| Free Tier | 3 VMs free (with card) | $5/month credits |
| Deployment | CLI-based | Web dashboard |
| Global Edge | ✅ Yes | ✅ Yes |
| Auto-scaling | ✅ Yes | ✅ Yes |
| Custom Domains | ✅ Free | ✅ Free |
| Ease of Use | Medium | Easy |

**Both are excellent choices!**

---

## 🔄 Update Your App

**After making changes:**
```bash
# Commit to git
git add .
git commit -m "Update feature"
git push

# Deploy to Fly.io
fly deploy
```

---

## 📊 Monitor Your App

### Real-time Logs:
```bash
fly logs
```

### App Status:
```bash
fly status
```

### Resource Usage:
```bash
fly scale show
```

### SSH into Container:
```bash
fly ssh console
```

---

## ⚙️ Configuration Files

### fly.toml Created ✅
```toml
app = "sono-arbitrage-bot"
primary_region = "iad"

[build]

[env]
  PORT = "3001"
  NODE_ENV = "production"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
```

This file is already in your project!

---

## 🚨 Important Security Notes

### ⚠️ NEVER Do This:
```bash
# DON'T put secrets in fly.toml (it's public!)
[env]
  PRIVATE_KEY = "abc123"  # ❌ WRONG!
```

### ✅ ALWAYS Do This:
```bash
# Use fly secrets (encrypted and secure)
fly secrets set PRIVATE_KEY=abc123  # ✅ CORRECT!
```

### What Goes Where:

**fly.toml (Public Config):**
- ✅ PORT
- ✅ NODE_ENV
- ✅ App structure settings
- ❌ NOT secrets!

**fly secrets (Private Config):**
- ✅ DRY_RUN
- ✅ API keys
- ✅ Private keys
- ✅ Database URLs
- ✅ RPC endpoints

---

## 🎯 Quick Reference

### Essential Commands:
```bash
# Deploy
fly deploy

# Logs
fly logs

# Open app
fly open

# Set secret
fly secrets set KEY=value

# View secrets
fly secrets list

# Scale resources
fly scale vm shared-cpu-1x --memory 512

# Restart app
fly apps restart sono-arbitrage-bot
```

---

## 🔧 Troubleshooting

### App Won't Start:
```bash
# Check logs
fly logs

# Common issues:
# - Missing PORT variable (should be in fly.toml)
# - Missing DRY_RUN secret
# - Out of memory (scale up)
```

### Deployment Fails:
```bash
# Verify Dockerfile
docker build -t test .

# Check fly.toml syntax
fly config validate
```

### Can't Access App:
```bash
# Check status
fly status

# Ensure machines are running
fly scale show

# Restart if needed
fly apps restart
```

---

## 🎉 Success Criteria

✅ **Deployment Successful When:**
1. `fly deploy` completes without errors
2. `fly open` opens your dashboard
3. Both panels (Arbitrage + Sentiment) visible
4. WebSocket connects (green badge)
5. Data updates every 5-8 seconds

---

## 📱 Post-Deployment

### Verify Everything Works:
```bash
# Open your app
fly open

# Watch logs in real-time
fly logs

# Check resource usage
fly status
```

### Share Your App:
```
https://sono-arbitrage-bot.fly.dev
```

---

## 🌟 Summary

**Environment Variables on Fly.io:**

✅ **YES** - You MUST set secrets using `fly secrets set`  
✅ **Required**: `DRY_RUN=true` for safe mode  
✅ **Optional**: API keys, RPC URLs, private keys  
✅ **Never**: Put secrets in fly.toml (use secrets!)  

**Deploy in 3 Commands:**
```bash
fly launch              # Initialize
fly secrets set DRY_RUN=true  # Configure
fly deploy              # Go live!
```

---

## 📞 Resources

- **Fly.io Docs**: https://fly.io/docs
- **Secrets Guide**: https://fly.io/docs/reference/secrets/
- **CLI Reference**: https://fly.io/docs/flyctl/
- **Community**: https://community.fly.io

---

**Your Sono Trading Suite is ready for Fly.io!** 🚀

Run `fly launch` to get started!
