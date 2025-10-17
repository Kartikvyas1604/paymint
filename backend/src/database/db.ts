/**
 * PAYMINT Database Connection & Management
 * SQLite database initialization and connection handling
 */

import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import config from '../config';

// Enable verbose mode for development
if (config.nodeEnv === 'development') {
  sqlite3.verbose();
}

export class Database {
  private db: sqlite3.Database | null = null;
  private isInitialized = false;

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure data directory exists
      const dataDir = path.dirname(config.databasePath);
      await fs.mkdir(dataDir, { recursive: true });

      console.log(`📁 Initializing database at: ${config.databasePath}`);

      // Create database connection
      this.db = new sqlite3.Database(config.databasePath, (err) => {
        if (err) {
          console.error('❌ Database connection failed:', err.message);
          throw err;
        }
        console.log('✅ Connected to SQLite database');
      });

      // Execute schema
      await this.executeSqlFile();
      
      // Insert initial data if needed
      await this.seedInitialData();

      this.isInitialized = true;
      console.log('✅ Database initialized successfully');

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute SQL schema file
   */
  private async executeSqlFile(): Promise<void> {
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    try {
      const schema = await fs.readFile(schemaPath, 'utf-8');
      
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Database not connected'));
          return;
        }

        this.db.exec(schema, (err) => {
          if (err) {
            console.error('❌ Schema execution failed:', err.message);
            reject(err);
          } else {
            console.log('✅ Database schema executed successfully');
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('❌ Failed to read schema file:', error);
      throw error;
    }
  }

  /**
   * Insert initial data for development/testing
   */
  private async seedInitialData(): Promise<void> {
    if (config.nodeEnv !== 'development') {
      return;
    }

    try {
      // Insert some test crypto prices
      const testPrices = [
        { currency: 'BTC', usd_rate: 67890.12, confidence: 0.05, source: 'pyth' },
        { currency: 'ETH', usd_rate: 3456.78, confidence: 0.12, source: 'pyth' },
        { currency: 'SOL', usd_rate: 156.34, confidence: 0.08, source: 'pyth' },
        { currency: 'USDC', usd_rate: 0.9998, confidence: 0.0001, source: 'pyth' },
        { currency: 'PYUSD', usd_rate: 1.00, confidence: 0.001, source: 'pyth' }
      ];

      for (const price of testPrices) {
        await this.run(
          `INSERT OR REPLACE INTO crypto_prices (currency, usd_rate, confidence, source) 
           VALUES (?, ?, ?, ?)`,
          [price.currency, price.usd_rate, price.confidence, price.source]
        );
      }

      console.log('🌱 Seeded initial test data');
    } catch (error) {
      console.warn('⚠️  Failed to seed initial data:', error);
      // Don't fail initialization if seeding fails
    }
  }

  /**
   * Execute a SQL query that returns rows
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Database query failed:', err.message);
          console.error('Query:', sql);
          console.error('Params:', params);
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  /**
   * Execute a SQL query that returns a single row
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Database query failed:', err.message);
          console.error('Query:', sql);
          console.error('Params:', params);
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  /**
   * Execute a SQL query that modifies data (INSERT, UPDATE, DELETE)
   */
  async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Database query failed:', err.message);
          console.error('Query:', sql);
          console.error('Params:', params);
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  /**
   * Execute multiple SQL statements in a transaction
   */
  async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.serialize(() => {
        this.db!.run('BEGIN TRANSACTION');

        let hasError = false;

        const executeNext = (index: number) => {
          if (index >= queries.length) {
            if (hasError) {
              this.db!.run('ROLLBACK', () => {
                reject(new Error('Transaction rolled back due to error'));
              });
            } else {
              this.db!.run('COMMIT', (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }
            return;
          }

          const query = queries[index];
          this.db!.run(query.sql, query.params || [], (err) => {
            if (err) {
              console.error('❌ Transaction query failed:', err.message);
              console.error('Query:', query.sql);
              hasError = true;
            }
            executeNext(index + 1);
          });
        };

        executeNext(0);
      });
    });
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{ status: string; tables: number; lastBackup?: string }> {
    try {
      const tables = await this.all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );

      return {
        status: 'healthy',
        tables: tables.length,
      };
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return {
        status: 'unhealthy',
        tables: 0,
      };
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          console.error('❌ Failed to close database:', err.message);
          reject(err);
        } else {
          console.log('✅ Database connection closed');
          this.db = null;
          this.isInitialized = false;
          resolve();
        }
      });
    });
  }

  /**
   * Get database instance (for advanced usage)
   */
  getInstance(): sqlite3.Database | null {
    return this.db;
  }
}

// Singleton instance
const database = new Database();

export default database;