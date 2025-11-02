const { ethers } = require('ethers');

// ============= CONFIGURATION =============
const PRIVATE_KEY = "0x7a425200e31e8409c27abbc9aaae49a94c314426ef2e569d3a33ffc289a34e76";
const RPC_URL = 'https://dream-rpc.somnia.network';

// Token addresses (change these for different tokens)
const TOKEN_IN = "0xbecd9b5f373877881d91cbdbaf013d97eb532154";  // $PING
const TOKEN_OUT = "0x7968ac15a72629e05f41b8271e4e7292e0cc9f90";  // $PONG

// Swap router address (depends on DEX)
const SWAP_ROUTER = "0x6aac14f090a35eea150705f72d90e4cdc4a49b2c";  // Uniswap V3 style

// Swap parameters
const SWAP_AMOUNT = 1;  // Amount of TOKEN_IN to swap
const POOL_FEE = 500;  // 500 = 0.05%, 3000 = 0.3%, 10000 = 1%
const SLIPPAGE_PERCENT = 5;  // Max slippage tolerance (5%)

// Router type: 'uniswap_v3' or 'uniswap_v2'
const ROUTER_TYPE = 'uniswap_v3';
// =========================================

// ABIs
const TOKEN_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

const UNISWAP_V3_ROUTER_ABI = [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut)"
];

const UNISWAP_V2_ROUTER_ABI = [
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)"
];

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Get token decimals
async function getTokenDecimals(contract) {
    try {
        return await contract.decimals();
    } catch {
        return 18; // Default to 18 if call fails
    }
}

// Check balance
async function checkBalance(tokenContract, walletAddress, amountWei, decimals) {
    const balance = await tokenContract.balanceOf(walletAddress);
    const balanceReadable = ethers.formatUnits(balance, decimals);
    
    console.log(`Token balance: ${balanceReadable}`);
    
    if (balance < amountWei) {
        const amountReadable = ethers.formatUnits(amountWei, decimals);
        console.log(`❌ Insufficient balance! Need ${amountReadable} but have ${balanceReadable}`);
        return false;
    }
    return true;
}

// Approve token
async function approveToken(tokenContract, spenderAddress, amountWei, wallet, decimals) {
    // Check current allowance (for info only)
    const currentAllowance = await tokenContract.allowance(wallet.address, spenderAddress);
    console.log(`Current allowance: ${ethers.formatUnits(currentAllowance, decimals)}`);
    
    console.log("Approving tokens...");
    
    // Estimate gas
    const gasEstimate = await tokenContract.approve.estimateGas(spenderAddress, amountWei);
    const gasLimit = gasEstimate * 120n / 100n; // Add 20% buffer
    
    // Send approve transaction
    const tx = await tokenContract.approve(spenderAddress, amountWei, {
        gasLimit: gasLimit
    });
    
    console.log(`Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    
    console.log(`✓ Approved: ${receipt.hash}`);
    console.log(`  Gas used: ${receipt.gasUsed.toString()}\n`);
    
    await sleep(3000); // Wait for state sync
    return receipt.status === 1;
}

// Swap Uniswap V3
async function swapUniswapV3(swapContract, tokenIn, tokenOut, amountWei, amountOutMin, wallet) {
    const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: POOL_FEE,
        recipient: wallet.address,
        amountIn: amountWei,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0
    };
    
    return swapContract.exactInputSingle.populateTransaction(params);
}

// Swap Uniswap V2
async function swapUniswapV2(swapContract, tokenIn, tokenOut, amountWei, amountOutMin, wallet) {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
    const path = [tokenIn, tokenOut];
    
    return swapContract.swapExactTokensForTokens.populateTransaction(
        amountWei,
        amountOutMin,
        path,
        wallet.address,
        deadline
    );
}

// Main function
async function main() {
    // Connect to provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    try {
        const network = await provider.getNetwork();
        console.log("=".repeat(60));
        console.log("Universal Token Swapper");
        console.log("=".repeat(60));
        console.log(`Connected to Chain ID: ${network.chainId}`);
    } catch (e) {
        console.log("❌ Failed to connect to RPC");
        return;
    }
    
    // Create wallet
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`Wallet: ${wallet.address}`);
    console.log(`Router Type: ${ROUTER_TYPE}`);
    console.log(`Swapping ${SWAP_AMOUNT} tokens`);
    console.log(`Token In: ${TOKEN_IN}`);
    console.log(`Token Out: ${TOKEN_OUT}`);
    console.log("=".repeat(60));
    console.log();
    
    // Create token contracts
    const tokenInContract = new ethers.Contract(TOKEN_IN, TOKEN_ABI, wallet);
    const tokenOutContract = new ethers.Contract(TOKEN_OUT, TOKEN_ABI, wallet);
    
    // Get token decimals
    const decimalsIn = await getTokenDecimals(tokenInContract);
    const decimalsOut = await getTokenDecimals(tokenOutContract);
    
    console.log(`Token IN decimals: ${decimalsIn}`);
    console.log(`Token OUT decimals: ${decimalsOut}\n`);
    
    // Parse amounts
    const amountWei = ethers.parseUnits(SWAP_AMOUNT.toString(), decimalsIn);
    const amountOutMin = ethers.parseUnits(
        (SWAP_AMOUNT * (100 - SLIPPAGE_PERCENT) / 100).toString(),
        decimalsOut
    );
    
    // Approve first
    const approveSuccess = await approveToken(
        tokenInContract,
        SWAP_ROUTER,
        amountWei,
        wallet,
        decimalsIn
    );
    
    if (!approveSuccess) {
        console.log("❌ Approval failed");
        return;
    }
    
    // Check balance after approval
    if (!(await checkBalance(tokenInContract, wallet.address, amountWei, decimalsIn))) {
        return;
    }
    
    // Build swap transaction based on router type
    console.log("Building swap transaction...");
    let swapTx;
    let swapContract;
    
    try {
        if (ROUTER_TYPE === 'uniswap_v3') {
            swapContract = new ethers.Contract(SWAP_ROUTER, UNISWAP_V3_ROUTER_ABI, wallet);
            swapTx = await swapUniswapV3(
                swapContract,
                TOKEN_IN,
                TOKEN_OUT,
                amountWei,
                amountOutMin,
                wallet
            );
        } else if (ROUTER_TYPE === 'uniswap_v2') {
            swapContract = new ethers.Contract(SWAP_ROUTER, UNISWAP_V2_ROUTER_ABI, wallet);
            swapTx = await swapUniswapV2(
                swapContract,
                TOKEN_IN,
                TOKEN_OUT,
                amountWei,
                amountOutMin,
                wallet
            );
        } else {
            console.log(`❌ Unknown router type: ${ROUTER_TYPE}`);
            return;
        }
        
        // Estimate gas
        const gasEstimate = await provider.estimateGas({
            ...swapTx,
            from: wallet.address
        });
        
        const gasLimit = gasEstimate * 150n / 100n; // Add 50% buffer
        console.log(`Estimated gas: ${gasEstimate.toString()}, Using: ${gasLimit.toString()}`);
        
        swapTx.gasLimit = gasLimit;
        
    } catch (e) {
        console.log(`⚠ Gas estimation failed: ${e.message.substring(0, 150)}`);
        console.log("Using fallback gas: 1000000");
        swapTx.gasLimit = 1000000;
    }
    
    // Execute swap
    console.log("Executing swap...");
    
    const tx = await wallet.sendTransaction(swapTx);
    console.log(`Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
        console.log(`✅ Swap successful!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   Explorer: https://shannon-explorer.somnia.network/tx/${receipt.hash}`);
    } else {
        console.log(`❌ Swap failed!`);
    }
}

// Run
main().catch(console.error);