import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
            price: 145.67,
            dex: 'jupiter',
            timestamp: Date.now(),
        },
        ethereum: {
            price: 2345.89,
            dex: 'uniswap-v3',
            timestamp: Date.now(),
        },
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

// Simulate price updates for demonstration
function simulatePriceUpdates() {
    setInterval(() => {
        // Solana price with slight random variation
        const solVariation = (Math.random() - 0.5) * 2; // ±1
        botState.prices.solana.price += solVariation;
        botState.prices.solana.timestamp = Date.now();

        broadcast({
            type: 'price',
            chain: 'solana',
            data: botState.prices.solana,
        });

        // Ethereum price with slight random variation
        const ethVariation = (Math.random() - 0.5) * 20; // ±10
        botState.prices.ethereum.price += ethVariation;
        botState.prices.ethereum.timestamp = Date.now();

        broadcast({
            type: 'price',
            chain: 'ethereum',
            data: botState.prices.ethereum,
        });

        // Occasionally detect an "opportunity"
        if (Math.random() > 0.7) { // 30% chance each cycle
            const spread = Math.abs(botState.prices.solana.price - botState.prices.ethereum.price / 16);
            const profitPct = (spread / botState.prices.solana.price) * 100;

            if (profitPct > 0.5) {
                botState.stats.totalOpportunities++;

                const opportunity = {
                    buyChain: 'solana',
                    sellChain: 'ethereum',
                    buyPrice: botState.prices.solana.price,
                    sellPrice: botState.prices.ethereum.price,
                    profitPercentage: profitPct,
                    timestamp: Date.now(),
                };

                botState.opportunities.unshift(opportunity);
                botState.opportunities = botState.opportunities.slice(0, 50);

                broadcast({
                    type: 'opportunity',
                    data: opportunity,
                });
            }
        }
    }, 5000); // Every 5 seconds
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
            console.log('⚠️  No log file found, using simulated data');
            console.log('📊 Generating mock price updates for demonstration...');
            simulatePriceUpdates();
        }
    }, 2000);
} catch (error) {
    console.warn('Could not set up log watching, using simulated data');
    simulatePriceUpdates();
}

// Start simulation immediately for demo purposes
console.log('🎮 Starting price simulation...');
simulatePriceUpdates();

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
