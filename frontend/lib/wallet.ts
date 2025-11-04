import { ethers } from 'ethers'
import { supabase } from './supabase'

/**
 * Create a new EVM wallet
 * @returns Object with address and private key
 */
export function createWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom()
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  }
}

/**
 * Get wallet address from private key
 * @param privateKey - The private key to derive address from
 * @returns The wallet address
 */
export function getAddressFromPrivateKey(privateKey: string): string {
  try {
    const wallet = new ethers.Wallet(privateKey)
    return wallet.address
  } catch (error) {
    throw new Error('Invalid private key')
  }
}

/**
 * Validate private key format
 * @param privateKey - The private key to validate
 * @returns True if valid
 */
export function isValidPrivateKey(privateKey: string): boolean {
  try {
    // Remove 0x prefix if present
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey
    
    // Check if it's a valid hex string and correct length (64 hex chars = 32 bytes)
    if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
      return false
    }
    
    // Try to create a wallet from it
    const wallet = new ethers.Wallet(`0x${cleanKey}`)
    return !!wallet.address
  } catch {
    return false
  }
}

/**
 * Save wallet to user's Supabase record
 * @param userId - The user ID
 * @param walletAddress - The wallet address
 * @param privateKey - The private key
 */
export async function saveWalletToUser(
  userId: string,
  walletAddress: string,
  privateKey: string
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      wallet_address: walletAddress,
      private_key: privateKey,
    })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to save wallet: ${error.message}`)
  }
}

/**
 * Fetch token balances (placeholder - you'll need to implement actual token contract calls)
 * @param address - The wallet address
 * @returns Object with SOMI and STT balances
 */
export async function getTokenBalances(address: string): Promise<{
  somi: string
  stt: string
}> {
  // TODO: Implement actual token balance fetching
  // This is a placeholder that returns zero balances
  // You'll need to:
  // 1. Get the token contract addresses for SOMI and STT
  // 2. Call balanceOf on each contract
  // 3. Format the results (considering decimals)
  
  return {
    somi: '0.00',
    stt: '0.00',
  }
}

