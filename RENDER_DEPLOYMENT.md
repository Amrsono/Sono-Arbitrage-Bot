# 🚀 Render Deployment Guide

## Sono Trading Suite - Deploy to Render

**Simple 5-minute deployment with NO credit card required!**

---

## ✨ Why Render?

- ✅ **FREE tier** (no credit card needed!)
- ✅ **750 hours/month** free (always-on for your project)
- ✅ **Auto-deploy** from GitHub
- ✅ **HTTPS included** automatically
- ✅ **Easy web dashboard**
- ✅ **Zero configuration** needed

---

## 🚀 Deploy in 3 Steps (5 Minutes)

### Step 1: Go to Render
**Open:** https://render.com

**Click:** "Get Started" or "Sign Up"

**Sign up with GitHub** (easiest - one click!)

---

### Step 2: Create New Web Service

1. **Dashboard:** Click "New +" → "Web Service"

2. **Connect Repository:**
   - Click "Connect account" if needed
   - Find: `Amrsono/Sono-Arbitrage-Bot`
   - Click "Connect"

3. **Configure Service:**
   ```
   Name: sono-arbitrage-bot
   Region: Oregon (or closest to you)
   Branch: main
   Runtime: Node
   Build Command: npm install
   Start Command: node src/dashboard/server.js
   Plan: Free
   ```

4. **Environment Variables** (Click "Advanced"):
   ```
   NODE_ENV = production
   PORT = 3001
   DRY_RUN = true
   SOLANA_RPC_URL = https://api.mainnet-beta.solana.com
   ETHEREUM_RPC_URL = https://eth.llamarpc.com
   ```

5. **Click:** "Create Web Service"

---

### Step 3: Wait for Deployment

**Render will:**
- ✅ Clone your GitHub repo
- ✅ Install dependencies (`npm install`)
- ✅ Start your server
- ✅ Assign a public URL

**Build time:** ~2-3 minutes

**Your URL:** `https://sono-arbitrage-bot.onrender.com`

---

## 🎉 That's It!

**Your dashboard is LIVE!**

Visit: `https://sono-arbitrage-bot.onrender.com`

---

## 📊 What You'll See During Deployment

**In Render Dashboard:**
```
Building... ⏳
├── Cloning repository
├── Installing dependencies
├── Starting server
└── Deploy live! ✅

Your service is live at:
https://sono-arbitrage-bot.onrender.com
```

---

## 🔐 Environment Variables on Render

### Set via Web Dashboard:

**After creating service:**
1. Go to your service dashboard
2. Click "Environment" tab
3. Click "Add Environment Variable"

### Required Variables:
```
NODE_ENV = production
DRY_RUN = true
PORT = 3001
```

### Optional (Better Performance):
```
SOLANA_RPC_URL = https://api.mainnet-beta.solana.com
ETHEREUM_RPC_URL = https://eth.llamarpc.com
```

### Advanced (Real Trading - ⚠️ Not Recommended):
```
SOLANA_PRIVATE_KEY = your_key_here
ETHEREUM_PRIVATE_KEY = your_key_here
MIN_PROFIT_PERCENTAGE = 2.0
MAX_TRADE_SIZE_USD = 50
```

**Important:** After adding/changing variables, Render auto-redeploys!

---

## 🔄 Auto-Deploy from GitHub

**Every time you push to GitHub:**
```bash
git add .
git commit -m "Update feature"
git push
```

**Render automatically:**
1. Detects the change
2. Rebuilds your app
3. Deploys new version
4. Zero downtime!

**No manual deployment needed!** 🎉

---

## 💰 Render Free Tier

### What You Get FREE:
- **750 hours/month** (enough for 24/7 uptime!)
- **512MB RAM**
- **0.1 CPU**
- **Free SSL/HTTPS**
- **Free custom domains**
- **Unlimited bandwidth** (fair use)

### Limitations:
- ⏱️ **Spins down after 15min inactivity**
- 🐌 **Takes 30-60s to wake up** (first request)
- 🔄 **Monthly restarts** on free tier

### Your App:
- **Cost:** $0 (FREE!) 🎉
- **Usage:** ~100-200MB RAM
- **Perfect for:** Demos, testing, learning

### Upgrade Options:
- **$7/month** "Starter" plan
  - No spin-down
  - Faster response
  - More resources

---

## 📱 Managing Your App

### View Logs:
1. Go to Render dashboard
2. Select your service
3. Click "Logs" tab
4. See real-time output

### Manual Deploy:
1. Go to service dashboard
2. Click "Manual Deploy"
3. Select "Clear build cache & deploy"

### Update Environment Variables:
1. "Environment" tab
2. Add/Edit variables
3. Auto-redeploys on save

### Custom Domain (Optional):
1. "Settings" tab
2. Scroll to "Custom Domain"
3. Add your domain
4. Update DNS records

---

## 🔧 Configuration Files

### render.yaml (Created ✅)
```yaml
services:
  - type: web
    name: sono-arbitrage-bot
    env: node
    plan: free
    buildCommand: npm install
    startCommand: node src/dashboard/server.js
```

**This file is optional but helpful!** Render can also use the web dashboard settings.

---

## 🎯 Verify Deployment

### Check These:
- [ ] Service status: "Live" (green)
- [ ] Build logs: No errors
- [ ] Visit URL: Dashboard loads
- [ ] WebSocket: Connected (green badge)
- [ ] Left panel: SOL/ETH prices updating
- [ ] Right panel: Trending tokens showing
- [ ] No console errors (F12)

---

## 🐛 Troubleshooting

### Service Won't Start:
```
Check Logs tab for:
- "Port already in use" → Port conflict (rare)
- "Module not found" → Dependencies issue
- "ECONNREFUSED" → Network/RPC issue
```

**Solution:** Check environment variables are set correctly

### Slow First Load:
- Free tier spins down after 15min idle
- First request takes 30-60s to wake up
- **Normal behavior on free tier**
- Upgrade to $7/month to keep always-on

### WebSocket Not Connecting:
- Render supports WebSocket on free tier ✅
- Check PORT is set to 3001
- Verify logs show "Dashboard Server Started"

---

## 📈 Monitoring

### Built-in Metrics:
1. Dashboard → Your service
2. See graphs for:
   - CPU usage
   - Memory usage
   - Response time
   - Request count

### Set Up Alerts:
1. "Settings" → "Notifications"
2. Add email for deploy failures
3. Get notified of issues

---

## 🔄 CI/CD Pipeline

**Already configured!** Every push to GitHub:

```
GitHub Push
    ↓
Render Detects Change
    ↓
Pulls Latest Code
    ↓
Runs: npm install
    ↓
Starts: node src/dashboard/server.js
    ↓
Health Check
    ↓
Routes Traffic
    ↓
LIVE! ✅
```

**Zero configuration needed!**

---

## 🌐 Access Your App

**Your URL will be:**
```
https://sono-arbitrage-bot.onrender.com
```

**Or custom domain:**
```
https://sonotrading.com
```

### Share with Team:
- URL is public by default
- Anyone can view dashboard
- Safe (DRY_RUN mode, no trading)

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep `DRY_RUN=true` for safety
- Use environment variables for secrets
- Monitor logs regularly
- Update dependencies monthly

### ❌ DON'T:
- Put private keys in environment (unless production trading)
- Commit `.env` files to GitHub
- Share your Render dashboard login
- Enable real trading without testing

---

## 📊 Render vs Others

| Feature | Render | Railway | Fly.io |
|---------|--------|---------|--------|
| Free Tier | 750h/month | $5 credits | 3 VMs |
| Card Required | No | No | Yes |
| Auto-deploy | Yes | Yes | No |
| Ease | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| WebSocket | Yes | Yes | Yes |
| Spin-down | 15min | No | Yes |

**Render is perfect for your use case!**

---

## 🎉 Quick Start Summary

**3 Steps to Deploy:**

1. **Sign Up:** https://render.com (use GitHub)

2. **Connect Repo:** 
   - New + → Web Service
   - Connect `Amrsono/Sono-Arbitrage-Bot`

3. **Configure:**
   ```
   Name: sono-arbitrage-bot
   Build: npm install
   Start: node src/dashboard/server.js
   Plan: Free
   
   Environment:
   - DRY_RUN=true
   - NODE_ENV=production
   ```

4. **Deploy:** Click "Create Web Service"

**Live in 3 minutes!** 🚀

---

## 📞 Resources

- **Render Docs:** https://render.com/docs
- **Node.js Guide:** https://render.com/docs/deploy-node-express-app
- **Environment Vars:** https://render.com/docs/configure-environment-variables
- **Custom Domains:** https://render.com/docs/custom-domains
- **Support:** https://community.render.com

---

## ✨ Post-Deployment

### Test Your App:
```bash
# Visit your URL
curl https://sono-arbitrage-bot.onrender.com/api/status

# Should return JSON with bot state
```

### Monitor Performance:
- Check Render dashboard metrics
- Watch for memory usage
- Monitor response times

### Share:
- Send URL to team
- Add to your portfolio
- Show off your work! 🎊

---

## 🎯 Success!

**Your Sono Trading Suite is now LIVE on Render!**

✅ No credit card needed  
✅ Auto-deploy from GitHub  
✅ Free HTTPS included  
✅ Professional URL  
✅ Monitoring dashboard  

**Visit:** https://sono-arbitrage-bot.onrender.com

---

## 📱 Next Steps

1. **Access your dashboard** at the Render URL
2. **Share with team** or add to portfolio
3. **Monitor logs** for any issues
4. **Update features** and push to GitHub (auto-deploys!)
5. **Consider upgrade** to $7/month for always-on

---

**Congratulations! Your trading suite is in production!** 🎉🚀

**No credit card, no hassle, just deploy and go!**
