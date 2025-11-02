const express = require('express');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());

// Somnia Testnet RPC URL
const SOMNIA_TESTNET_RPC = 'https://dream-rpc.somnia.network';

app.post('/transfer', async (req, res) => {
  try {
    const { privateKey, toAddress, amount } = req.body;

    // Validation
    if (!privateKey || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: privateKey, toAddress, amount'
      });
    }

    // Connect to Somnia testnet
    const provider = new ethers.JsonRpcProvider(SOMNIA_TESTNET_RPC);

    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey, provider);

    // Get current balance
    const balance = await provider.getBalance(wallet.address);
    const amountInWei = ethers.parseEther(amount.toString());

    if (balance < amountInWei) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        currentBalance: ethers.formatEther(balance)
      });
    }

    // Prepare transaction
    const tx = {
      to: toAddress,
      value: amountInWei,
    };

    // Send transaction
    const transactionResponse = await wallet.sendTransaction(tx);
    
    // Wait for confirmation
    const receipt = await transactionResponse.wait();

    return res.json({
      success: true,
      transactionHash: receipt.hash,
      from: wallet.address,
      to: toAddress,
      amount: amount,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

  } catch (error) {
    console.error('Transfer error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', network: 'Somnia Testnet' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Network: Somnia Testnet`);
});

module.exports = app;