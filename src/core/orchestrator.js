import EventEmitter from 'events';
import { logInfo, logError, logWarn } from '../utils/logger.js';

/**
 * Central orchestrator for managing all agents and their communications
 */
class Orchestrator extends EventEmitter {
    constructor() {
        super();
        this.agents = new Map();
        this.running = false;
        this.eventBus = new EventEmitter();

        // Increase max listeners for the event bus
        this.eventBus.setMaxListeners(50);

        this.setupEventHandlers();
    }

    /**
     * Register an agent with the orchestrator
     */
    registerAgent(name, agent) {
        if (this.agents.has(name)) {
            throw new Error(`Agent ${name} is already registered`);
        }

        this.agents.set(name, {
            instance: agent,
            status: 'registered',
            lastHealthCheck: Date.now(),
        });

        // Give the agent access to the event bus
        agent.setEventBus(this.eventBus);

        logInfo('ORCHESTRATOR', `Agent registered: ${name}`);
    }

    /**
     * Start all registered agents
     */
    async startAll() {
        if (this.running) {
            logWarn('ORCHESTRATOR', 'Orchestrator is already running');
            return;
        }

        logInfo('ORCHESTRATOR', 'Starting all agents...');
        this.running = true;

        const startPromises = [];

        for (const [name, agentData] of this.agents.entries()) {
            startPromises.push(
                this.startAgent(name).catch(error => {
                    logError('ORCHESTRATOR', error, { agent: name });
                })
            );
        }

        await Promise.all(startPromises);

        // Start health monitoring
        this.startHealthMonitoring();

        logInfo('ORCHESTRATOR', `All agents started. Total: ${this.agents.size}`);
    }

    /**
     * Start a specific agent
     */
    async startAgent(name) {
        const agentData = this.agents.get(name);
        if (!agentData) {
            throw new Error(`Agent ${name} not found`);
        }

        try {
            agentData.status = 'starting';
            await agentData.instance.start();
            agentData.status = 'running';
            agentData.lastHealthCheck = Date.now();

            logInfo('ORCHESTRATOR', `Agent started: ${name}`);
        } catch (error) {
            agentData.status = 'failed';
            logError('ORCHESTRATOR', error, { agent: name, action: 'start' });
            throw error;
        }
    }

    /**
     * Stop all agents
     */
    async stopAll() {
        if (!this.running) {
            return;
        }

        logInfo('ORCHESTRATOR', 'Stopping all agents...');
        this.running = false;

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        const stopPromises = [];

        for (const [name, agentData] of this.agents.entries()) {
            stopPromises.push(
                this.stopAgent(name).catch(error => {
                    logError('ORCHESTRATOR', error, { agent: name });
                })
            );
        }

        await Promise.all(stopPromises);

        logInfo('ORCHESTRATOR', 'All agents stopped');
    }

    /**
     * Stop a specific agent
     */
    async stopAgent(name) {
        const agentData = this.agents.get(name);
        if (!agentData) {
            throw new Error(`Agent ${name} not found`);
        }

        try {
            agentData.status = 'stopping';
            await agentData.instance.stop();
            agentData.status = 'stopped';

            logInfo('ORCHESTRATOR', `Agent stopped: ${name}`);
        } catch (error) {
            agentData.status = 'failed';
            logError('ORCHESTRATOR', error, { agent: name, action: 'stop' });
            throw error;
        }
    }

    /**
     * Get status of all agents
     */
    getStatus() {
        const status = {
            running: this.running,
            agents: {},
        };

        for (const [name, agentData] of this.agents.entries()) {
            status.agents[name] = {
                status: agentData.status,
                lastHealthCheck: agentData.lastHealthCheck,
            };
        }

        return status;
    }

    /**
     * Setup event handlers for agent communication
     */
    setupEventHandlers() {
        // Listen for price updates
        this.eventBus.on('price:update', (data) => {
            logInfo('ORCHESTRATOR', 'Price update received', data);
        });

        // Listen for arbitrage opportunities
        this.eventBus.on('arbitrage:opportunity', (data) => {
            logInfo('ORCHESTRATOR', 'Arbitrage opportunity detected', data);
        });

        // Listen for trade execution
        this.eventBus.on('trade:execute', (data) => {
            logInfo('ORCHESTRATOR', 'Trade execution started', data);
        });

        // Listen for trade completion
        this.eventBus.on('trade:complete', (data) => {
            logInfo('ORCHESTRATOR', 'Trade completed', data);
        });

        // Listen for errors
        this.eventBus.on('agent:error', (data) => {
            logError('ORCHESTRATOR', new Error(data.message), { agent: data.agent });
            this.handleAgentError(data);
        });
    }

    /**
     * Handle agent errors and attempt recovery
     */
    async handleAgentError(errorData) {
        const { agent: agentName, error, critical } = errorData;

        if (critical) {
            logError('ORCHESTRATOR', new Error('Critical agent error'), { agent: agentName });
            // In a production system, you might want to restart the agent
            // or trigger an alert to the operator
        }
    }

    /**
     * Start periodic health monitoring
     */
    startHealthMonitoring() {
        const interval = 30000; // 30 seconds

        this.healthCheckInterval = setInterval(() => {
            for (const [name, agentData] of this.agents.entries()) {
                if (agentData.status === 'running') {
                    const timeSinceCheck = Date.now() - agentData.lastHealthCheck;

                    if (timeSinceCheck > interval * 2) {
                        logWarn('ORCHESTRATOR', `Agent may be unhealthy`, {
                            agent: name,
                            timeSinceCheck: `${Math.floor(timeSinceCheck / 1000)}s`,
                        });
                    }

                    // Update health check timestamp
                    agentData.lastHealthCheck = Date.now();
                }
            }
        }, interval);
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        logInfo('ORCHESTRATOR', 'Initiating graceful shutdown...');
        await this.stopAll();
        this.eventBus.removeAllListeners();
        logInfo('ORCHESTRATOR', 'Shutdown complete');
    }
}

export default Orchestrator;
