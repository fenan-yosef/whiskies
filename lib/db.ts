import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'whisky_scraper',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(sql: string, values?: any[]) {
  try {
    const connection = await pool.getConnection();
    try {
      const [results] = await connection.execute(sql, values);
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
