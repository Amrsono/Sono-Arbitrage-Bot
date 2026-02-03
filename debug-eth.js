
import { ethers } from 'ethers';

// Configuration
const RPC_URL = 'https://eth.llamarpc.com';
const QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const FEE = 3000;

// ABI
const QUOTER_ABI = [
    'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
];

async function main() {
    console.log('Connecting to RPC:', RPC_URL);
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    try {
        const network = await provider.getNetwork();
        console.log('Connected to network:', network.name, '(' + network.chainId + ')');
        const block = await provider.getBlockNumber();
        console.log('Current block:', block);
    } catch (e) {
        console.error('Failed to connect to RPC:', e.message);
        return;
    }

    const quoter = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, provider);
    const amountIn = ethers.parseUnits('1', 18);

    console.log('\nSimulating WETH -> USDC quote...');
    console.log('Token In:', WETH_ADDRESS);
    console.log('Token Out:', USDC_ADDRESS);
    console.log('Fee:', FEE);
    console.log('Amount In:', amountIn.toString());

    try {
        // Use staticCall to simulate
        const quotedAmountOut = await quoter.quoteExactInputSingle.staticCall(
            WETH_ADDRESS,
            USDC_ADDRESS,
            FEE,
            amountIn,
            0
        );

        console.log('\nSUCCESS!');
        console.log('Quoted Amount Out (USDC):', quotedAmountOut.toString());
        console.log('Price:', ethers.formatUnits(quotedAmountOut, 6));

    } catch (error) {
        console.error('\nCALL FAILED');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        if (error.data) console.error('Data:', error.data);
        if (error.revert) console.error('Revert:', error.revert);
    }
}

main().catch(console.error);
