const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function initializeDatabase() {
  let connection;

  try {
    console.log('[v0] Connecting to MySQL server...');
    connection = await mysql.createConnection(config);

    // Create database
    console.log('[v0] Creating database if it does not exist...');
    await connection.query(
      'CREATE DATABASE IF NOT EXISTS `whisky_scraper` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    console.log('[v0] ✓ Database created or already exists');

    // Use the database
    await connection.query('USE `whisky_scraper`');

    // Create table
    console.log('[v0] Creating whiskies table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS whiskies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        price VARCHAR(32),
        url VARCHAR(512),
        image_url VARCHAR(512),
        image_data LONGBLOB,
        volume VARCHAR(32),
        abv VARCHAR(32),
        description TEXT,
        distillery VARCHAR(128),
        region VARCHAR(128),
        age VARCHAR(32),
        cask_type VARCHAR(128),
        tasting_notes TEXT,
        source VARCHAR(32),
        month VARCHAR(16),
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_url_source (url, source)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[v0] ✓ Whiskies table created or already exists');

    console.log('[v0] ✓ Database initialization completed successfully!');
  } catch (error) {
    console.error('[v0] Database initialization failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();
