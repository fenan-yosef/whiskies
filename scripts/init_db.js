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
      'CREATE DATABASE IF NOT EXISTS `whisky_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    console.log('[v0] ✓ Database created or already exists');

    // Use the database
    await connection.query('USE `whisky_db`');

    // Create wine_products table
    console.log('[v0] Creating wine_products table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wine_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        url VARCHAR(512),
        price DECIMAL(10,2),
        image_url VARCHAR(512),
        description TEXT,
        brand VARCHAR(128),
        source VARCHAR(64),
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_url_source (url, source)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[v0] ✓ wine_products table created or already exists');

    // Create wine_product_images table
    console.log('[v0] Creating wine_product_images table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wine_product_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        url VARCHAR(512),
        img_blob LONGBLOB,
        position INT DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES wine_products(id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[v0] ✓ wine_product_images table created or already exists');

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
