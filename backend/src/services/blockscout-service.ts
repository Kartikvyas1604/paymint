/**
 * Blockscout Service - $10,000 Bounty Target
 * 
 * Integrates with Blockscout's distributed blockchain explorer infrastructure
 * for reliable, decentralized transaction verification across multiple chains.
 * 
 * Key Features:
 * - Multi-chain transaction verification (Ethereum, Base, Polygon, etc.)
 * - Real-time transaction status monitoring
 * - Distributed verification (no single point of failure)
 * - Token balance checking across chains
 * - Gas estimation and transaction analysis
 * 
 * Bounty Alignment: Replaces centralized APIs with Blockscout's distributed explorer
 */

import axios, { AxiosInstance } from 'axios';
import { ethers } from 'ethers';
import config from '../config';
import database from '../database/db';

export interface BlockscoutTransaction {
  hash: string;
  block_number: number;
  block_hash: string;
  transaction_index: number;
  from: string;
  to: string;
  value: string;
  gas: string;
  gas_price: string;
  gas_used?: string;
  status: '1' | '0'; // 1 = success, 0 = failed
  timestamp: string;
  confirmations: number;
  input: string;
  logs?: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
}

export interface TokenBalance {
  contract_address: string;
  token_name: string;
  token_symbol: string;
  token_type: string;
  balance: string;
  decimals: number;
}

export interface BlockscoutStats {
  total_blocks: number;
  total_transactions: number;
  total_addresses: number;
  average_block_time: number;
  network_utilization: number;
}

export interface ChainConfig {
  name: string;
  chainId: number;
  explorerUrl: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export class BlockscoutService {
  private clients: Map<number, AxiosInstance> = new Map();
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();
  private healthStatus: Map<number, boolean> = new Map();

  // Supported blockchain networks with Blockscout instances
  private readonly SUPPORTED_CHAINS: { [chainId: number]: ChainConfig } = {
    1: { // Ethereum Mainnet
      name: 'Ethereum',
      chainId: 1,
      explorerUrl: 'https://eth.blockscout.com',
      rpcUrl: config.blockscout.rpcUrls.ethereum,
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 }
    },
    8453: { // Base
      name: 'Base',
      chainId: 8453,
      explorerUrl: 'https://base.blockscout.com',
      rpcUrl: config.blockscout.rpcUrls.base,
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 }
    },
    137: { // Polygon
      name: 'Polygon',
      chainId: 137,
      explorerUrl: 'https://polygon.blockscout.com',
      rpcUrl: config.blockscout.rpcUrls.polygon,
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
    }
  };

  constructor() {
    this.initializeClients();
    console.log('🔍 Blockscout Service initialized');
    console.log(`🌐 Monitoring ${Object.keys(this.SUPPORTED_CHAINS).length} blockchain networks`);
  }

  /**
   * Initialize HTTP clients and RPC providers for each supported chain
   */
  private initializeClients(): void {
    for (const [chainId, config] of Object.entries(this.SUPPORTED_CHAINS)) {
      const numericChainId = parseInt(chainId);
      
      // HTTP client for Blockscout API
      const client = axios.create({
        baseURL: `${config.explorerUrl}/api`,
        timeout: 15000,
        headers: {
          'User-Agent': 'PAYMINT/1.0 ETHGlobal2025',
          'Accept': 'application/json'
        }
      });

      this.clients.set(numericChainId, client);

      // RPC provider for direct blockchain queries
      const provider = new ethers.JsonRpcProvider(config.rpcUrl, {
        name: config.name,
        chainId: numericChainId
      });

      this.providers.set(numericChainId, provider);
      this.healthStatus.set(numericChainId, true);

      console.log(`✅ Initialized ${config.name} (Chain ID: ${chainId})`);
    }
  }

  /**
   * Get transaction details by hash from any supported chain
   */
  async getTransaction(txHash: string, chainId?: number): Promise<BlockscoutTransaction | null> {
    try {
      console.log(`🔍 Looking up transaction: ${txHash}${chainId ? ` on chain ${chainId}` : ''}`);

      // If chainId specified, query that chain directly
      if (chainId && this.SUPPORTED_CHAINS[chainId]) {
        return await this.getTransactionFromChain(txHash, chainId);
      }

      // Otherwise, search across all supported chains
      for (const [supportedChainId] of Object.entries(this.SUPPORTED_CHAINS)) {
        try {
          const result = await this.getTransactionFromChain(txHash, parseInt(supportedChainId));
          if (result) {
            console.log(`✅ Transaction found on ${this.SUPPORTED_CHAINS[parseInt(supportedChainId)].name}`);
            return result;
          }
        } catch (error) {
          // Continue searching other chains
          continue;
        }
      }

      console.log(`❌ Transaction ${txHash} not found on any supported chain`);
      return null;

    } catch (error: any) {
      console.error('❌ Transaction lookup failed:', error);
      throw new Error(`Transaction lookup failed: ${error.message}`);
    }
  }

  /**
   * Get transaction from a specific chain using Blockscout API
   */
  private async getTransactionFromChain(txHash: string, chainId: number): Promise<BlockscoutTransaction | null> {
    const client = this.clients.get(chainId);
    const provider = this.providers.get(chainId);
    
    if (!client || !provider) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    try {
      // Try Blockscout API first
      const response = await client.get('/v2/transactions/' + txHash);
      
      if (response.data && response.data.hash) {
        const txData = response.data;
        
        // Get current block for confirmation calculation
        const currentBlock = await provider.getBlockNumber();
        const confirmations = currentBlock - parseInt(txData.block_number);

        const transaction: BlockscoutTransaction = {
          hash: txData.hash,
          block_number: parseInt(txData.block_number),
          block_hash: txData.block_hash,
          transaction_index: parseInt(txData.transaction_index || '0'),
          from: txData.from,
          to: txData.to,
          value: txData.value,
          gas: txData.gas,
          gas_price: txData.gas_price,
          gas_used: txData.gas_used,
          status: txData.status,
          timestamp: txData.timestamp,
          confirmations: Math.max(0, confirmations),
          input: txData.input || '0x',
          logs: txData.logs || []
        };

        // Store transaction data in database
        await this.storeTransactionData(transaction, chainId);

        this.healthStatus.set(chainId, true);
        return transaction;
      }

      return null;

    } catch (error: any) {
      console.warn(`⚠️  Blockscout API failed for chain ${chainId}, trying RPC fallback:`, error.message);
      
      // Fallback to direct RPC call
      try {
        const receipt = await provider.getTransactionReceipt(txHash);
        const tx = await provider.getTransaction(txHash);
        
        if (receipt && tx) {
          const currentBlock = await provider.getBlockNumber();
          
          const transaction: BlockscoutTransaction = {
            hash: tx.hash,
            block_number: receipt.blockNumber,
            block_hash: receipt.blockHash,
            transaction_index: receipt.index,
            from: tx.from,
            to: tx.to || '',
            value: tx.value.toString(),
            gas: tx.gasLimit.toString(),
            gas_price: tx.gasPrice?.toString() || '0',
            gas_used: receipt.gasUsed.toString(),
            status: receipt.status === 1 ? '1' : '0',
            timestamp: new Date().toISOString(), // Would get actual timestamp in production
            confirmations: Math.max(0, currentBlock - receipt.blockNumber),
            input: tx.data,
            logs: receipt.logs.map(log => ({
              address: log.address,
              topics: [...log.topics],
              data: log.data
            }))
          };

          await this.storeTransactionData(transaction, chainId);
          return transaction;
        }

        return null;

      } catch (rpcError) {
        this.healthStatus.set(chainId, false);
        throw rpcError;
      }
    }
  }

  /**
   * Monitor transaction status until confirmed
   */
  async monitorTransaction(txHash: string, chainId: number, targetConfirmations: number = 12): Promise<void> {
    try {
      console.log(`👀 Monitoring transaction ${txHash} for ${targetConfirmations} confirmations`);

      let confirmations = 0;
      const maxAttempts = 60; // 10 minutes with 10-second intervals
      let attempts = 0;

      while (confirmations < targetConfirmations && attempts < maxAttempts) {
        const tx = await this.getTransactionFromChain(txHash, chainId);
        
        if (tx) {
          confirmations = tx.confirmations;
          
          console.log(`📊 Transaction ${txHash}: ${confirmations}/${targetConfirmations} confirmations`);
          
          // Update database with current status
          await database.run(
            `INSERT OR REPLACE INTO blockchain_confirmations 
             (transaction_id, tx_hash, network, block_number, confirmations, status, checked_at) 
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
              `monitor_${txHash}`,
              txHash,
              this.SUPPORTED_CHAINS[chainId].name.toLowerCase(),
              tx.block_number,
              confirmations,
              tx.status === '1' ? 'confirmed' : 'failed'
            ]
          );

          if (confirmations >= targetConfirmations) {
            console.log(`✅ Transaction ${txHash} fully confirmed`);
            return;
          }
        } else {
          console.log(`⏳ Transaction ${txHash} still pending...`);
        }

        // Wait 10 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.warn(`⚠️  Transaction monitoring timeout for ${txHash}`);
      }

    } catch (error) {
      console.error(`❌ Transaction monitoring failed for ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Get token balances for an address across supported chains
   */
  async getTokenBalances(address: string, chainId?: number): Promise<TokenBalance[]> {
    try {
      console.log(`💰 Getting token balances for ${address}${chainId ? ` on chain ${chainId}` : ''}`);

      const results: TokenBalance[] = [];
      const chainsToCheck = chainId ? [chainId] : Object.keys(this.SUPPORTED_CHAINS).map(Number);

      for (const currentChainId of chainsToCheck) {
        try {
          const balances = await this.getTokenBalancesFromChain(address, currentChainId);
          results.push(...balances);
        } catch (error) {
          console.warn(`⚠️  Failed to get balances from chain ${currentChainId}:`, error);
        }
      }

      console.log(`✅ Retrieved ${results.length} token balances`);
      return results;

    } catch (error: any) {
      console.error('❌ Token balance lookup failed:', error);
      throw new Error(`Token balance lookup failed: ${error.message}`);
    }
  }

  /**
   * Get token balances from a specific chain
   */
  private async getTokenBalancesFromChain(address: string, chainId: number): Promise<TokenBalance[]> {
    const client = this.clients.get(chainId);
    
    if (!client) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    try {
      const response = await client.get(`/v2/addresses/${address}/tokens`);
      
      if (response.data && response.data.items) {
        return response.data.items.map((item: any) => ({
          contract_address: item.token.address,
          token_name: item.token.name,
          token_symbol: item.token.symbol,
          token_type: item.token.type,
          balance: item.value,
          decimals: parseInt(item.token.decimals || '18')
        }));
      }

      return [];

    } catch (error) {
      console.warn(`⚠️  Blockscout token balance API failed for chain ${chainId}`);
      return [];
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(to: string, data: string, chainId: number, from?: string): Promise<bigint> {
    try {
      const provider = this.providers.get(chainId);
      
      if (!provider) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const gasEstimate = await provider.estimateGas({
        to,
        data,
        from
      });

      console.log(`⛽ Gas estimate for chain ${chainId}: ${gasEstimate.toString()}`);
      return gasEstimate;

    } catch (error: any) {
      console.error(`❌ Gas estimation failed for chain ${chainId}:`, error);
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Get network statistics from Blockscout
   */
  async getNetworkStats(chainId: number): Promise<BlockscoutStats | null> {
    try {
      const client = this.clients.get(chainId);
      
      if (!client) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const response = await client.get('/v2/stats');
      
      if (response.data) {
        return {
          total_blocks: parseInt(response.data.total_blocks || '0'),
          total_transactions: parseInt(response.data.total_transactions || '0'),
          total_addresses: parseInt(response.data.total_addresses || '0'),
          average_block_time: parseFloat(response.data.average_block_time || '0'),
          network_utilization: parseFloat(response.data.network_utilization || '0')
        };
      }

      return null;

    } catch (error) {
      console.warn(`⚠️  Failed to get network stats for chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Store transaction data in database
   */
  private async storeTransactionData(tx: BlockscoutTransaction, chainId: number): Promise<void> {
    try {
      await database.run(
        `INSERT OR REPLACE INTO blockchain_confirmations 
         (tx_hash, network, block_number, confirmations, gas_used, gas_price, status, checked_at, confirmed_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
        [
          tx.hash,
          this.SUPPORTED_CHAINS[chainId].name.toLowerCase(),
          tx.block_number,
          tx.confirmations,
          tx.gas_used || '0',
          tx.gas_price,
          tx.status === '1' ? 'confirmed' : 'failed',
          tx.status === '1' ? 'datetime(\'now\')' : null
        ]
      );
    } catch (error) {
      console.warn('⚠️  Failed to store transaction data:', error);
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{ [chainId: number]: { healthy: boolean; name: string; latency?: number } }> {
    const status: { [chainId: number]: { healthy: boolean; name: string; latency?: number } } = {};

    for (const [chainId, config] of Object.entries(this.SUPPORTED_CHAINS)) {
      const numericChainId = parseInt(chainId);
      
      try {
        const startTime = Date.now();
        const client = this.clients.get(numericChainId);
        
        if (client) {
          await client.get('/v2/stats', { timeout: 5000 });
          const latency = Date.now() - startTime;
          
          status[numericChainId] = {
            healthy: true,
            name: config.name,
            latency
          };
        }
      } catch (error) {
        status[numericChainId] = {
          healthy: false,
          name: config.name
        };
      }
    }

    return status;
  }

  /**
   * Get supported chains information
   */
  getSupportedChains(): ChainConfig[] {
    return Object.values(this.SUPPORTED_CHAINS);
  }

  /**
   * Get chain configuration by ID
   */
  getChainConfig(chainId: number): ChainConfig | null {
    return this.SUPPORTED_CHAINS[chainId] || null;
  }
}

export default new BlockscoutService();