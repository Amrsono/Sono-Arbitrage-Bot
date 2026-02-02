import config from '../config/config.js';

/**
 * Validates price data for sanity
 */
export function validatePrice(price, source) {
    if (typeof price !== 'number' || isNaN(price)) {
        throw new Error(`Invalid price from ${source}: ${price}`);
    }

    if (price <= 0) {
        throw new Error(`Price must be positive from ${source}: ${price}`);
    }

    // Sanity check: price should be reasonable (between $0.000001 and $1,000,000)
    if (price < 0.000001 || price > 1000000) {
        throw new Error(`Price outside reasonable range from ${source}: ${price}`);
    }

    return true;
}

/**
 * Validates trade size in USD
 */
export function validateTradeSize(sizeUsd) {
    if (typeof sizeUsd !== 'number' || isNaN(sizeUsd)) {
        throw new Error(`Invalid trade size: ${sizeUsd}`);
    }

    if (sizeUsd <= 0) {
        throw new Error(`Trade size must be positive: ${sizeUsd}`);
    }

    if (sizeUsd > config.trading.maxTradeSizeUsd) {
        throw new Error(
            `Trade size ${sizeUsd} exceeds maximum ${config.trading.maxTradeSizeUsd}`
        );
    }

    return true;
}

/**
 * Validates profit percentage
 */
export function validateProfitPercentage(profitPct) {
    if (typeof profitPct !== 'number' || isNaN(profitPct)) {
        throw new Error(`Invalid profit percentage: ${profitPct}`);
    }

    if (profitPct < config.trading.minProfitPercentage) {
        return {
            valid: false,
            reason: `Profit ${profitPct.toFixed(2)}% below minimum ${config.trading.minProfitPercentage}%`,
        };
    }

    return { valid: true };
}

/**
 * Validates gas costs don't exceed profit
 */
export function validateGasCosts(profitUsd, estimatedGasCostUsd) {
    if (estimatedGasCostUsd >= profitUsd) {
        return {
            valid: false,
            reason: `Gas cost ${estimatedGasCostUsd.toFixed(2)} exceeds profit ${profitUsd.toFixed(2)}`,
        };
    }

    const netProfit = profitUsd - estimatedGasCostUsd;
    const netProfitPct = (netProfit / profitUsd) * 100;

    if (netProfitPct < 20) {
        return {
            valid: false,
            reason: `Net profit after gas only ${netProfitPct.toFixed(2)}% of gross profit`,
        };
    }

    return { valid: true, netProfit };
}

/**
 * Validates slippage is within acceptable range
 */
export function validateSlippage(expectedPrice, actualPrice) {
    const slippagePct = Math.abs(((actualPrice - expectedPrice) / expectedPrice) * 100);

    if (slippagePct > config.trading.maxSlippagePercentage) {
        return {
            valid: false,
            reason: `Slippage ${slippagePct.toFixed(2)}% exceeds maximum ${config.trading.maxSlippagePercentage}%`,
        };
    }

    return { valid: true, slippagePct };
}

/**
 * Validates wallet has sufficient balance
 */
export function validateBalance(requiredAmount, availableBalance, token) {
    if (availableBalance < requiredAmount) {
        throw new Error(
            `Insufficient ${token} balance. Required: ${requiredAmount}, Available: ${availableBalance}`
        );
    }

    // Also check for a safety buffer (keep at least 10% extra)
    const safetyBuffer = requiredAmount * 1.1;
    if (availableBalance < safetyBuffer) {
        return {
            valid: false,
            warning: `Low balance warning. Recommended buffer not met for ${token}`,
        };
    }

    return { valid: true };
}

/**
 * Validates arbitrage opportunity is still profitable after all costs
 */
export function validateArbitrageOpportunity(opportunity) {
    const errors = [];

    // Validate prices
    try {
        validatePrice(opportunity.buyPrice, opportunity.buyChain);
        validatePrice(opportunity.sellPrice, opportunity.sellChain);
    } catch (error) {
        errors.push(error.message);
    }

    // Validate profit
    const profitCheck = validateProfitPercentage(opportunity.profitPercentage);
    if (!profitCheck.valid) {
        errors.push(profitCheck.reason);
    }

    // Validate gas costs
    if (opportunity.estimatedGasCost) {
        const gasCheck = validateGasCosts(
            opportunity.profitUsd,
            opportunity.estimatedGasCost
        );
        if (!gasCheck.valid) {
            errors.push(gasCheck.reason);
        }
    }

    // Validate trade size
    try {
        validateTradeSize(opportunity.tradeSize);
    } catch (error) {
        errors.push(error.message);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

export default {
    validatePrice,
    validateTradeSize,
    validateProfitPercentage,
    validateGasCosts,
    validateSlippage,
    validateBalance,
    validateArbitrageOpportunity,
};
