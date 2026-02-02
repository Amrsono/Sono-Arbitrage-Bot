import { logAgentStart, logAgentStop, logError, logInfo } from '../utils/logger.js';
import config from '../config/config.js';

/**
 * Base class for all agents
 */
class BaseAgent {
    constructor(name) {
        this.name = name;
        this.eventBus = null;
        this.running = false;
        this.retryAttempts = config.agents.retryAttempts;
        this.retryDelay = config.agents.retryDelayMs;
    }

    /**
     * Set the event bus for communication with other agents
     */
    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }

    /**
     * Emit an event to other agents
     */
    emit(eventName, data) {
        if (!this.eventBus) {
            throw new Error(`Event bus not set for agent ${this.name}`);
        }
        this.eventBus.emit(eventName, { ...data, source: this.name });
    }

    /**
     * Listen for events from other agents
     */
    on(eventName, handler) {
        if (!this.eventBus) {
            throw new Error(`Event bus not set for agent ${this.name}`);
        }
        this.eventBus.on(eventName, handler);
    }

    /**
     * Start the agent - to be implemented by subclasses
     */
    async start() {
        this.running = true;
        logAgentStart(this.name);
    }

    /**
     * Stop the agent - to be implemented by subclasses
     */
    async stop() {
        this.running = false;
        logAgentStop(this.name);
    }

    /**
     * Execute an async operation with retry logic
     */
    async withRetry(operation, context = '') {
        let lastError;

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (attempt < this.retryAttempts) {
                    logInfo(
                        this.name,
                        `Retry attempt ${attempt}/${this.retryAttempts} for ${context}`,
                        { error: error.message }
                    );
                    await this.sleep(this.retryDelay * attempt); // Exponential backoff
                }
            }
        }

        // All retries failed
        logError(this.name, lastError, { context, retriesFailed: this.retryAttempts });
        throw lastError;
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Report error to orchestrator
     */
    reportError(error, critical = false) {
        this.emit('agent:error', {
            agent: this.name,
            error: error.message,
            stack: error.stack,
            critical,
            timestamp: Date.now(),
        });
    }

    /**
     * Check if agent is running
     */
    isRunning() {
        return this.running;
    }
}

export default BaseAgent;
