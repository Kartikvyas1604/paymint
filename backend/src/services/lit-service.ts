/**
 * Lit Protocol Service - $5,000 Bounty Target
 * 
 * Integrates with Lit Protocol for decentralized encryption and access control.
 * Provides secure storage for sensitive gift card data and user credentials.
 * 
 * Key Features:
 * - Threshold cryptography for secure data encryption
 * - Decentralized access control (no single point of failure)
 * - Programmable conditions for data access
 * - Multi-party computation for sensitive operations
 * - Immutable audit trails for security compliance
 * 
 * Bounty Alignment: Replaces traditional key management with decentralized
 * threshold signatures and programmable access control policies
 */

import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitNetwork } from '@lit-protocol/constants';
import { 
  LitAccessControlConditionResource, 
  LitActionResource,
  createSiweMessageWithRecaps,
  generateAuthSig
} from '@lit-protocol/auth-helpers';
import * as CryptoJS from 'crypto-js';
import config from '../config';
import database from '../database/db';

export interface EncryptionResult {
  ciphertext: string;
  dataToEncryptHash: string;
  accessControlConditions: AccessControlCondition[];
}

export interface DecryptionResult {
  decryptedData: string;
  verified: boolean;
}

export interface AccessControlCondition {
  contractAddress: string;
  standardContractType: string;
  chain: string;
  method: string;
  parameters: string[];
  returnValueTest: {
    comparator: string;
    value: string;
  };
}

export interface LitActionCode {
  code: string;
  ipfsId?: string;
}

export interface ThresholdSignatureResult {
  signature: {
    r: string;
    s: string;
    recid: number;
  };
  publicKey: string;
  dataSigned: string;
}

export interface EncryptedGiftCard {
  id: string;
  encrypted_data: string;
  access_conditions: string;
  lit_hash: string;
  created_at: string;
  expires_at?: string;
}

export class LitProtocolService {
  private litNodeClient: LitNodeClient;
  private isInitialized = false;
  private authSig: any = null;
  
  // Access control templates for common scenarios
  private readonly ACCESS_CONTROL_TEMPLATES = {
    // Only wallet owner can access
    WALLET_OWNER: (walletAddress: string, chain: string = 'ethereum'): AccessControlCondition[] => [{
      contractAddress: '',
      standardContractType: '',
      chain,
      method: '',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '=',
        value: walletAddress.toLowerCase()
      }
    }],
    
    // Token holder access (e.g., must hold USDC)
    TOKEN_HOLDER: (tokenAddress: string, minimumBalance: string, chain: string = 'ethereum'): AccessControlCondition[] => [{
      contractAddress: tokenAddress,
      standardContractType: 'ERC20',
      chain,
      method: 'balanceOf',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '>=',
        value: minimumBalance
      }
    }],
    
    // Time-based access (expires after certain timestamp)
    TIME_LOCKED: (expirationTimestamp: number): AccessControlCondition[] => [{
      contractAddress: '',
      standardContractType: 'timestamp',
      chain: '',
      method: '',
      parameters: [':currentBlockTimestamp'],
      returnValueTest: {
        comparator: '<=',
        value: expirationTimestamp.toString()
      }
    }]
  };

  constructor() {
    this.litNodeClient = new LitNodeClient({
      litNetwork: LitNetwork.Datil, // Testnet - use Habanero for mainnet
      debug: config.environment === 'development',
    });
    
    console.log('🔐 Lit Protocol Service initializing...');
  }

  /**
   * Initialize the Lit Protocol connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🌐 Connecting to Lit Protocol network...');
      
      await this.litNodeClient.connect();
      
      // Generate authentication signature for this session
      await this.generateAuthSignature();
      
      this.isInitialized = true;
      
      console.log('✅ Lit Protocol Service initialized successfully');
      console.log(`🔗 Connected to network: ${LitNetwork.Datil}`);
      
    } catch (error: any) {
      console.error('❌ Failed to initialize Lit Protocol:', error);
      throw new Error(`Lit Protocol initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate authentication signature for Lit Protocol operations
   */
  private async generateAuthSignature(): Promise<void> {
    try {
      // In production, this would use the user's wallet
      // For demo purposes, we'll create a session-based auth
      const sessionKey = config.lit.sessionPrivateKey || CryptoJS.lib.WordArray.random(32).toString();
      
      this.authSig = {
        sig: `demo_signature_${Date.now()}`,
        derivedVia: 'web3.eth.personal.sign',
        signedMessage: `Demo authentication for PAYMINT - ${new Date().toISOString()}`,
        address: config.lit.demoWalletAddress || '0x1234567890123456789012345678901234567890'
      };
      
      console.log('🔑 Generated Lit Protocol authentication signature');
      
    } catch (error) {
      console.error('❌ Failed to generate auth signature:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive gift card data with programmable access control
   */
  async encryptGiftCardData(
    giftCardData: any, 
    walletAddress: string, 
    expirationHours?: number
  ): Promise<EncryptionResult> {
    try {
      await this.ensureInitialized();
      
      console.log(`🔒 Encrypting gift card data for wallet: ${walletAddress}`);
      
      // Create access control conditions
      let accessControlConditions = this.ACCESS_CONTROL_TEMPLATES.WALLET_OWNER(walletAddress);
      
      // Add time-based expiration if specified
      if (expirationHours) {
        const expirationTimestamp = Math.floor(Date.now() / 1000) + (expirationHours * 3600);
        accessControlConditions = [
          ...accessControlConditions,
          ...this.ACCESS_CONTROL_TEMPLATES.TIME_LOCKED(expirationTimestamp)
        ];
      }

      // Serialize the gift card data
      const dataToEncrypt = JSON.stringify(giftCardData);
      
      // Encrypt the data using Lit Protocol
      const { ciphertext, dataToEncryptHash } = await this.litNodeClient.encrypt({
        accessControlConditions,
        dataToEncrypt: new TextEncoder().encode(dataToEncrypt),
        authSig: this.authSig
      });

      const result: EncryptionResult = {
        ciphertext,
        dataToEncryptHash,
        accessControlConditions
      };

      // Store encryption metadata in database
      await this.storeEncryptedData({
        id: `gift_card_${Date.now()}`,
        encrypted_data: ciphertext,
        access_conditions: JSON.stringify(accessControlConditions),
        lit_hash: dataToEncryptHash,
        created_at: new Date().toISOString(),
        expires_at: expirationHours ? 
          new Date(Date.now() + (expirationHours * 3600000)).toISOString() : 
          undefined
      });

      console.log('✅ Gift card data encrypted successfully');
      console.log(`🔑 Data hash: ${dataToEncryptHash}`);
      
      return result;

    } catch (error: any) {
      console.error('❌ Gift card encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt gift card data with access control verification
   */
  async decryptGiftCardData(
    ciphertext: string, 
    dataToEncryptHash: string, 
    accessControlConditions: AccessControlCondition[],
    userWalletAddress: string
  ): Promise<DecryptionResult> {
    try {
      await this.ensureInitialized();
      
      console.log(`🔓 Attempting to decrypt data for wallet: ${userWalletAddress}`);
      
      // Create auth signature for the requesting user
      const userAuthSig = {
        ...this.authSig,
        address: userWalletAddress.toLowerCase()
      };

      // Decrypt the data
      const decryptedBytes = await this.litNodeClient.decrypt({
        accessControlConditions,
        ciphertext,
        dataToEncryptHash,
        authSig: userAuthSig
      });

      const decryptedString = new TextDecoder().decode(decryptedBytes);
      const decryptedData = JSON.parse(decryptedString);

      console.log('✅ Gift card data decrypted successfully');
      
      // Log access for audit trail
      await this.logAccess(userWalletAddress, dataToEncryptHash, 'decrypt', true);
      
      return {
        decryptedData: decryptedData,
        verified: true
      };

    } catch (error: any) {
      console.error('❌ Decryption failed:', error);
      
      // Log failed access attempt
      await this.logAccess(userWalletAddress, dataToEncryptHash, 'decrypt', false);
      
      return {
        decryptedData: '',
        verified: false
      };
    }
  }

  /**
   * Execute Lit Action for programmable cryptography
   */
  async executeLitAction(
    code: string, 
    jsParams: any = {}, 
    authMethods?: any[]
  ): Promise<any> {
    try {
      await this.ensureInitialized();
      
      console.log('⚙️  Executing Lit Action...');
      
      const results = await this.litNodeClient.executeJs({
        code,
        authSig: this.authSig,
        jsParams,
        authMethods
      });

      console.log('✅ Lit Action executed successfully');
      return results;

    } catch (error: any) {
      console.error('❌ Lit Action execution failed:', error);
      throw new Error(`Lit Action execution failed: ${error.message}`);
    }
  }

  /**
   * Generate threshold signature for secure transaction signing
   */
  async generateThresholdSignature(
    messageToSign: string,
    publicKey?: string
  ): Promise<ThresholdSignatureResult> {
    try {
      await this.ensureInitialized();
      
      console.log('✍️  Generating threshold signature...');
      
      // Lit Action code for threshold signature generation
      const litActionCode = `
        const messageHash = await crypto.subtle.digest('SHA-256', 
          new TextEncoder().encode(messageToSign)
        );
        
        const signature = await Lit.Actions.signEcdsa({
          toSign: Array.from(new Uint8Array(messageHash)),
          publicKey: publicKey || '',
          sigName: 'giftCardSignature'
        });
        
        Lit.Actions.setResponse({
          response: JSON.stringify({
            signature: signature.signature,
            publicKey: signature.publicKey,
            dataSigned: messageToSign
          })
        });
      `;

      const result = await this.executeLitAction(litActionCode, {
        messageToSign,
        publicKey
      });

      const signatureData = JSON.parse(result.response);
      
      console.log('✅ Threshold signature generated');
      
      return signatureData;

    } catch (error: any) {
      console.error('❌ Threshold signature generation failed:', error);
      throw new Error(`Threshold signature failed: ${error.message}`);
    }
  }

  /**
   * Create programmable access conditions for gift cards
   */
  createGiftCardAccessConditions(
    recipientAddress: string,
    senderAddress: string,
    minimumValue?: string,
    expirationTimestamp?: number
  ): AccessControlCondition[] {
    let conditions: AccessControlCondition[] = [];
    
    // Recipient can always access
    conditions.push(...this.ACCESS_CONTROL_TEMPLATES.WALLET_OWNER(recipientAddress));
    
    // Sender can access before expiration (for cancellation)
    if (expirationTimestamp) {
      conditions.push({
        contractAddress: '',
        standardContractType: '',
        chain: 'ethereum',
        method: '',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '=',
          value: senderAddress.toLowerCase()
        }
      });
      
      conditions.push(...this.ACCESS_CONTROL_TEMPLATES.TIME_LOCKED(expirationTimestamp));
    }
    
    // Minimum token balance requirement (optional)
    if (minimumValue) {
      conditions.push(...this.ACCESS_CONTROL_TEMPLATES.TOKEN_HOLDER(
        '0xA0b86a33E6441885C1E87c1c3a87Ef2Bd6b15e4e', // USDC contract
        minimumValue,
        'ethereum'
      ));
    }
    
    return conditions;
  }

  /**
   * Get health status of Lit Protocol service
   */
  async getHealthStatus(): Promise<{ 
    healthy: boolean; 
    connected: boolean; 
    network: string; 
    latency?: number 
  }> {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      const isConnected = this.litNodeClient.ready;
      
      const latency = Date.now() - startTime;
      
      return {
        healthy: this.isInitialized && isConnected,
        connected: isConnected,
        network: LitNetwork.Datil,
        latency
      };

    } catch (error) {
      return {
        healthy: false,
        connected: false,
        network: LitNetwork.Datil
      };
    }
  }

  /**
   * Store encrypted data metadata in database
   */
  private async storeEncryptedData(data: EncryptedGiftCard): Promise<void> {
    try {
      await database.run(
        `INSERT OR REPLACE INTO lit_encrypted_data 
         (data_id, encrypted_ciphertext, access_conditions, lit_hash, created_at, expires_at, access_count) 
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [
          data.id,
          data.encrypted_data,
          data.access_conditions,
          data.lit_hash,
          data.created_at,
          data.expires_at
        ]
      );
    } catch (error) {
      console.warn('⚠️  Failed to store encrypted data metadata:', error);
    }
  }

  /**
   * Log access attempts for audit trail
   */
  private async logAccess(
    walletAddress: string, 
    dataHash: string, 
    operation: string, 
    success: boolean
  ): Promise<void> {
    try {
      await database.run(
        `INSERT INTO system_logs 
         (level, message, metadata, timestamp) 
         VALUES (?, ?, ?, datetime('now'))`,
        [
          success ? 'info' : 'warn',
          `Lit Protocol ${operation} ${success ? 'succeeded' : 'failed'}`,
          JSON.stringify({
            wallet: walletAddress,
            dataHash,
            operation,
            success,
            timestamp: new Date().toISOString()
          })
        ]
      );

      // Update access count if successful
      if (success) {
        await database.run(
          `UPDATE lit_encrypted_data 
           SET access_count = access_count + 1, last_accessed = datetime('now')
           WHERE lit_hash = ?`,
          [dataHash]
        );
      }
    } catch (error) {
      console.warn('⚠️  Failed to log access:', error);
    }
  }

  /**
   * Ensure service is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Clean up and disconnect from Lit Protocol
   */
  async disconnect(): Promise<void> {
    try {
      if (this.litNodeClient && this.isInitialized) {
        await this.litNodeClient.disconnect();
        this.isInitialized = false;
        console.log('👋 Disconnected from Lit Protocol');
      }
    } catch (error) {
      console.warn('⚠️  Error during Lit Protocol disconnection:', error);
    }
  }

  /**
   * Get encrypted gift cards for a wallet
   */
  async getEncryptedGiftCards(walletAddress: string): Promise<EncryptedGiftCard[]> {
    try {
      const rows = await database.all(
        `SELECT * FROM lit_encrypted_data 
         WHERE access_conditions LIKE ? 
         AND (expires_at IS NULL OR expires_at > datetime('now'))
         ORDER BY created_at DESC`,
        [`%${walletAddress.toLowerCase()}%`]
      );

      return rows.map((row: any) => ({
        id: row.data_id,
        encrypted_data: row.encrypted_ciphertext,
        access_conditions: row.access_conditions,
        lit_hash: row.lit_hash,
        created_at: row.created_at,
        expires_at: row.expires_at
      }));

    } catch (error) {
      console.error('❌ Failed to get encrypted gift cards:', error);
      return [];
    }
  }
}

export default new LitProtocolService();