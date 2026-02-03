import axios from 'axios';
import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { SonoArbitrageBot } from '../main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// State management with MOCK data for demonstration
const botState = {
    running: true,
    agents: {
        SOLANA_MONITOR: { status: 'running', lastUpdate: Date.now() },
        ETHEREUM_MONITOR: { status: 'running', lastUpdate: Date.now() },
        ARBITRAGE_DETECTOR: { status: 'running', lastUpdate: Date.now() },
        TRADE_EXECUTOR: { status: 'running', lastUpdate: Date.now() },
    },
    prices: {
        solana: {
            price: 103.00,
            dex: 'Binance',
            timestamp: Date.now(),
        },
        solana: { price: 103.00, dex: 'Binance', timestamp: Date.now() },
        ethereum: { price: 2345.89, dex: 'Binance', timestamp: Date.now() },
        pi: { price: 0.159, dex: 'CoinGecko (IOU)', timestamp: Date.now() },
    },
    opportunities: [],
    trades: [],
    stats: {
        uptime: 0,
        totalOpportunities: 0,
        totalTrades: 0,
        totalProfit: 0,
    },
};

// WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Broadcast to all connected clients
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
            client.send(JSON.stringify(data));
        }
    });
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('📱 Dashboard client connected');

    // Send current state immediately
    ws.send(JSON.stringify({
        type: 'state',
        data: botState,
    }));

    ws.on('close', () => {
        console.log('📱 Dashboard client disconnected');
    });
});

// Initialize Real Bot
const bot = new SonoArbitrageBot();
let piPriceInterval;

// API Routes for Bot Control
app.post('/api/bot/pause', (req, res) => {
    bot.pauseTrading();
    botState.isPaused = true;
    broadcast({ type: 'state', data: botState });
    console.log('⏸️ Trading Paused via Dashboard');
    res.json({ success: true, message: 'Trading paused' });
});

app.post('/api/bot/resume', (req, res) => {
    bot.resumeTrading();
    botState.isPaused = false;
    broadcast({ type: 'state', data: botState });
    console.log('▶️ Trading Resumed via Dashboard');
    res.json({ success: true, message: 'Trading resumed' });
});

app.get('/api/bot/status', (req, res) => {
    res.json({
        running: botState.running,
        isPaused: botState.isPaused,
        stats: botState.stats
    });
});

// Sync Bot Events to Dashboard State
function syncBotEvents() {
    // Listen for price updates
    const solMonitor = bot.agents.solanaMonitor;
    const ethMonitor = bot.agents.ethereumMonitor;
    const arbDetector = bot.agents.arbitrageDetector;
    const tradeExecutor = bot.agents.tradeExecutor;

    // Solana Price
    solMonitor.on('price:update', (data) => {
        botState.prices.solana = {
            price: data.price,
            dex: 'Binance',
            timestamp: Date.now()
        };
        broadcast({ type: 'price', chain: 'solana', data: botState.prices.solana });
    });

    // Ethereum Price
    ethMonitor.on('price:update', (data) => {
        botState.prices.ethereum = {
            price: data.price,
            dex: 'Binance',
            timestamp: Date.now()
        };
        broadcast({ type: 'price', chain: 'ethereum', data: botState.prices.ethereum });
    });

    // Opportunities
    arbDetector.on('arbitrage:opportunity', (opp) => {
        // Add trade link metadata 
        opp.tradeLink = opp.buyChain === 'solana' ? 'https://phantom.app/' : 'https://www.binance.com/en/trade/ETH_USDT';
        opp.platformName = opp.buyChain === 'solana' ? 'Phantom' : 'Binance';

        botState.opportunities.unshift(opp);
        botState.opportunities = botState.opportunities.slice(0, 50);
        botState.stats.totalOpportunities++;
        broadcast({ type: 'opportunity', data: opp });
    });

    // Trades
    tradeExecutor.on('trade:complete', (trade) => {
        botState.trades.unshift(trade);
        botState.trades = botState.trades.slice(0, 50);
        botState.stats.totalTrades++;
        if (trade.success) {
            botState.stats.totalProfit += (trade.result.netProfit || 0);
        }
        broadcast({ type: 'trade', data: trade });
    });

    // Balances
    tradeExecutor.on('balance:update', (balances) => {
        broadcast({ type: 'balance', data: balances });
    });
}

async function fetchPiPrice() {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    // 3. Pi Network from CoinGecko
    try {
        const piResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd', {
            headers: { 'User-Agent': userAgent }
        });

        if (piResponse.data && piResponse.data['pi-network']?.usd) {
            botState.prices.pi = {
                price: piResponse.data['pi-network'].usd,
                dex: 'CoinGecko (IOU)',
                timestamp: Date.now(),
                lastRealUpdate: Date.now()
            };
            broadcast({ type: 'price', chain: 'pi', data: botState.prices.pi });
        }
    } catch (error) {
        console.error('Error fetching Pi from CoinGecko:', error.message);
    }
}

// Start everything
async function startServer() {
    try {
        await bot.start();
        syncBotEvents();

        // Pi fetching
        setInterval(fetchPiPrice, 60000);
        fetchPiPrice();

        app.listen(PORT, () => {
            console.log(`🚀 Dashboard Server running on http://localhost:${PORT}`);
            console.log(`🤖 Trading Bot is ACTIVE (Paused: ${botState.isPaused})`);
        });
    } catch (err) {
        console.error('Failed to start bot/server:', err);
    }
}

// Watch log file for real-time updates (if available)
let logWatcher;
try {
    const logPath = path.join(__dirname, '../../logs/combined.log');

    // Try to read actual logs if they exist
    setTimeout(() => {
        if (fs.existsSync(logPath)) {
            console.log('📄 Watching log file for real updates...');

            try {
                const logs = fs.readFileSync(logPath, 'utf-8')
                    .split('\n')
                    .filter(line => line.trim())
                    .slice(-20);

                logs.forEach(line => {
                    try {
                        const log = JSON.parse(line);

                        // Parse price updates
                        if (log.level === 'info' && log.message && log.message.includes('Price updated')) {
                            const priceMatch = log.message.match(/\$([0-9.]+)/);
                            if (priceMatch && log.agent) {
                                const chain = log.agent === 'SOLANA_MONITOR' ? 'solana' : 'ethereum';
                                const dex = log.dex || (chain === 'solana' ? 'jupiter' : 'uniswap-v3');

                                botState.prices[chain] = {
                                    price: parseFloat(priceMatch[1]),
                                    dex: dex,
                                    timestamp: new Date(log.timestamp).getTime(),
                                };

                                botState.running = true;

                                broadcast({
                                    type: 'price',
                                    chain: chain,
                                    data: botState.prices[chain],
                                });
                            }
                        }

                        // Detect bot started
                        if (log.message && (log.message.includes('Bot started') || log.message.includes('SOLANA_MONITOR') || log.message.includes('Agent started'))) {
                            botState.running = true;
                            broadcast({
                                type: 'status',
                                data: { running: true },
                            });
                        }
                    } catch (e) {
                        // Skip invalid JSON lines
                    }
                });
            } catch (error) {
                console.warn('Could not read log file, using simulated data');
            }

            // Watch for changes
            logWatcher = fs.watch(logPath, (eventType) => {
                if (eventType === 'change') {
                    try {
                        const logs = fs.readFileSync(logPath, 'utf-8')
                            .split('\n')
                            .filter(line => line.trim())
                            .slice(-5);

                        logs.forEach(line => {
                            try {
                                const log = JSON.parse(line);

                                if (log.level === 'info' && log.message && log.message.includes('Price updated')) {
                                    const priceMatch = log.message.match(/\$([0-9.]+)/);
                                    if (priceMatch && log.agent) {
                                        const chain = log.agent === 'SOLANA_MONITOR' ? 'solana' : 'ethereum';
                                        const dex = log.dex || (chain === 'solana' ? 'jupiter' : 'uniswap-v3');

                                        botState.prices[chain] = {
                                            price: parseFloat(priceMatch[1]),
                                            dex: dex,
                                            timestamp: new Date(log.timestamp).getTime(),
                                        };

                                        botState.running = true;

                                        broadcast({
                                            type: 'price',
                                            chain: chain,
                                            data: botState.prices[chain],
                                        });
                                    }
                                }
                            } catch (e) {
                                // Skip invalid lines
                            }
                        });
                    } catch (error) {
                        // Silently handle errors
                    }
                }
            });
        } else {
            console.log('⚠️  No log file found.');
        }
    }, 2000);
} catch (error) {
    console.warn('Could not set up log watching');
}

// Import and start sentiment analyzer
import SentimentAnalyzer from '../sentiment/sentiment-analyzer.js';
const sentimentAnalyzer = new SentimentAnalyzer();

// Sentiment tracking
async function trackSentiment() {
    setInterval(async () => {
        try {
            // Fetch trending tokens
            const tokens = await sentimentAnalyzer.fetchTrendingTokens();

            // Analyze overall sentiment
            const sentimentData = await sentimentAnalyzer.analyzeSentiment(tokens);

            // Broadcast sentiment update
            broadcast({
                type: 'sentiment',
                data: sentimentData,
            });

            // Broadcast individual trending tokens
            tokens.forEach(token => {
                broadcast({
                    type: 'trending',
                    data: token,
                });
            });

            // Generate and broadcast random activity
            if (Math.random() > 0.6) {
                const randomToken = tokens[Math.floor(Math.random() * tokens.length)];
                const activity = sentimentAnalyzer.generateActivity(randomToken);

                broadcast({
                    type: 'activity',
                    data: activity,
                });
            }

        } catch (error) {
            console.error('Sentiment tracking error:', error);
        }
    }, 8000); // Every 8 seconds
}

console.log('📊 Starting sentiment tracking...');
trackSentiment();

// API Routes
app.get('/api/status', (req, res) => {
    res.json(botState);
});

app.get('/api/logs', (req, res) => {
    const logPath = path.join(__dirname, '../../logs/combined.log');

    if (fs.existsSync(logPath)) {
        try {
            const logs = fs.readFileSync(logPath, 'utf-8')
                .split('\n')
                .filter(line => line.trim())
                .slice(-100)
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return { message: line };
                    }
                })
                .reverse();

            res.json({ logs: logs.slice(0, 50) });
        } catch (error) {
            res.json({ logs: [], error: error.message });
        }
    } else {
        res.json({ logs: [], message: 'No log file found - using simulated data' });
    }
});

// Serve split-screen dashboard by default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index-split.html'));
});

// Also serve the split dashboard at /split
app.get('/split', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index-split.html'));
});

// Original single dashboard
app.get('/single', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`\n🎨 ========================================`);
    console.log(`📊 Sono Trading Suite - Dashboard Server`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📱 Split View (Arbitrage + Sentiment)`);
    console.log(`🎮 Running with simulated data`);
    console.log(`========================================\n`);
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Cleanup on exit
process.on('SIGINT', () => {
    if (logWatcher) {
        logWatcher.close();
    }
    server.close();
    process.exit(0);
});
