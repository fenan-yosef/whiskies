import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'whisky_db';

if (process.env.NODE_ENV === 'production' && !process.env.DB_PASSWORD) {
  console.warn('[db] DB_PASSWORD is empty in production. Set it via server env.');
}
//hello
const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(sql: string, values?: any[]) {
  try {
    const connection = await pool.getConnection();
    try {
      const [results] = await connection.execute(sql, values || []);
      return results;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[v0] Database query error:', error);
    throw error;
  }
}

export async function getConnection() {
  return await pool.getConnection();
}

export default pool;
