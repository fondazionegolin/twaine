import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

export const connectDatabase = async (): Promise<Pool> => {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres@localhost/twaine';

  const config: PoolConfig = {
    connectionString: databaseUrl,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  pool = new Pool(config);

  // Test connection
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    client.release();

    // Handle errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });

    return pool;
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
};

export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDatabase() first.');
  }
  return pool;
};

export const disconnectDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Disconnected from PostgreSQL');
  }
};
