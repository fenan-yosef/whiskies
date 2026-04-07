import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD ?? '';
const DB_NAME = process.env.DB_NAME || 'whisky_db';

// Log runtime DB environment (mask password) for debugging production issues.
const dbPasswordLength = DB_PASSWORD ? DB_PASSWORD.length : 0;
console.log(`[db] init: host=${DB_HOST} user=${DB_USER} db=${DB_NAME} pwd_len=${dbPasswordLength} NODE_ENV=${process.env.NODE_ENV}`);

if (process.env.NODE_ENV === 'production' && !process.env.DB_PASSWORD) {
  console.warn('[db] DB_PASSWORD is empty in production. Set it via server env.');
}

const basePoolConfig = {
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const createPool = (password: string) => mysql.createPool({
  ...basePoolConfig,
  password,
});

let pool = createPool(DB_PASSWORD);
let fallbackAttempted = false;

const shouldFallbackToEmptyPassword =
  process.env.NODE_ENV !== 'production' &&
  DB_USER === 'root' &&
  DB_PASSWORD !== '' &&
  ['127.0.0.1', 'localhost', '::1'].includes(DB_HOST);

function isAccessDeniedError(error: unknown): error is { code?: string; errno?: number } {
  if (!error || typeof error !== 'object') return false;
  const mysqlError = error as { code?: string; errno?: number };
  return mysqlError.code === 'ER_ACCESS_DENIED_ERROR' || mysqlError.errno === 1045;
}

async function tryFallbackToEmptyPassword() {
  fallbackAttempted = true;
  console.warn('[db] Access denied with configured DB_PASSWORD; retrying with empty password for local root.');
  pool = createPool('');

  // Validate fallback immediately so later queries fail fast with a clear root cause.
  const connection = await pool.getConnection();
  connection.release();
}

async function executeQuery(sql: string, values?: any[]) {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(sql, values || []);
    return results;
  } finally {
    connection.release();
  }
}

export async function query(sql: string, values?: any[]) {
  try {
    return await executeQuery(sql, values);
  } catch (error) {
    if (shouldFallbackToEmptyPassword && !fallbackAttempted && isAccessDeniedError(error)) {
      try {
        await tryFallbackToEmptyPassword();
        return await executeQuery(sql, values);
      } catch (retryError) {
        console.error('[v0] Database query error after local empty-password fallback:', retryError);
        throw retryError;
      }
    }

    console.error('[v0] Database query error:', error);
    throw error;
  }
}

export async function getConnection() {
  try {
    return await pool.getConnection();
  } catch (error) {
    if (shouldFallbackToEmptyPassword && !fallbackAttempted && isAccessDeniedError(error)) {
      await tryFallbackToEmptyPassword();
      return await pool.getConnection();
    }
    throw error;
  }
}

export default pool;
