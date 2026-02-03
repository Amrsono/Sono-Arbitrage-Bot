import axios from 'axios';

// ... existing code ...

// Simulate price updates for demonstration
function simulatePriceUpdates() {
    setInterval(() => {
        // Solana price - PRIORITIZE REAL DATA
        const timeSinceLastSolUpdate = Date.now() - (botState.prices.solana.lastRealUpdate || 0);
        if (timeSinceLastSolUpdate > 70000) {
            const solVariation = (Math.random() - 0.5) * 2; // ±1
            botState.prices.solana.price += solVariation;
            botState.prices.solana.timestamp = Date.now();

            broadcast({
                type: 'price',
                chain: 'solana',
                data: botState.prices.solana,
            });
        }

        // Ethereum price - PRIORITIZE REAL DATA
        const timeSinceLastEthUpdate = Date.now() - (botState.prices.ethereum.lastRealUpdate || 0);
        if (timeSinceLastEthUpdate > 70000) {
            const ethVariation = (Math.random() - 0.5) * 20; // ±10
            botState.prices.ethereum.price += ethVariation;
            botState.prices.ethereum.timestamp = Date.now();

            broadcast({
                type: 'price',
                chain: 'ethereum',
                data: botState.prices.ethereum,
            });
        }

        // Pi Network price - PRIORITIZE REAL DATA
        const timeSinceLastPiUpdate = Date.now() - (botState.prices.pi.lastRealUpdate || 0);
        if (timeSinceLastPiUpdate > 70000) {
            const piVariation = (Math.random() - 0.5) * 0.5; // ±0.5
            botState.prices.pi.price += piVariation;
            botState.prices.pi.timestamp = Date.now();

            broadcast({
                type: 'price',
                chain: 'pi',
                data: botState.prices.pi,
            });
        }

        // Occasionally detect an "opportunity"
        if (Math.random() > 0.6) { // 40% chance each cycle
            // Pick random pair
            const chains = ['solana', 'ethereum', 'pi'];
            const buyChain = chains[Math.floor(Math.random() * chains.length)];
            let sellChain = chains[Math.floor(Math.random() * chains.length)];

            while (sellChain === buyChain) {
                sellChain = chains[Math.floor(Math.random() * chains.length)];
            }

            const buyPrice = botState.prices[buyChain].price;
            const sellPrice = botState.prices[sellChain].price;

            // Normalize for demo (assume cross-chain arbitrage via bridge/wrapper)
            // Real logic would be complex. Here we just fake a profitable spread

            const spread = Math.random() * (buyPrice * 0.05);
            const profitPct = (spread / buyPrice) * 100;

            if (profitPct > 0.5) {
                botState.stats.totalOpportunities++;

                const opportunity = {
                    buyChain: buyChain,
                    sellChain: sellChain,
                    buyPrice: buyPrice,
                    sellPrice: buyPrice + spread, // Simulated sell price
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

// Fetch real prices from CoinGecko (Pi, ETH, SOL)
async function fetchPrices() {
    try {
        // Fetch Pi, Ethereum, Solana prices
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=pi-network,ethereum,solana&vs_currencies=usd');

        if (response.data) {
            const now = Date.now();

            // Update Pi
            if (response.data['pi-network']?.usd) {
                botState.prices.pi = {
                    price: response.data['pi-network'].usd,
                    dex: 'CoinGecko (IOU)',
                    timestamp: now,
                    lastRealUpdate: now
                };
                broadcast({ type: 'price', chain: 'pi', data: botState.prices.pi });
            }

            // Update Ethereum
            if (response.data['ethereum']?.usd) {
                botState.prices.ethereum = {
                    price: response.data['ethereum'].usd,
                    dex: 'CoinGecko',
                    timestamp: now,
                    lastRealUpdate: now
                };
                broadcast({ type: 'price', chain: 'ethereum', data: botState.prices.ethereum });
            }

            // Update Solana
            if (response.data['solana']?.usd) {
                botState.prices.solana = {
                    price: response.data['solana'].usd,
                    dex: 'CoinGecko',
                    timestamp: now,
                    lastRealUpdate: now
                };
                broadcast({ type: 'price', chain: 'solana', data: botState.prices.solana });
            }

            console.log('💰 Fetched real prices from CoinGecko');
        }
    } catch (error) {
        console.error('Error fetching prices:', error.message);
    }
}

// Start fetching real prices
fetchPrices();
setInterval(fetchPrices, 60000); // Every 60 seconds

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
