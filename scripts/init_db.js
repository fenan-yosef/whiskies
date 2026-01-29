const mysql = require('mysql2/promise');
require('dotenv').config();

async function init() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };

  try {
    const conn = await mysql.createConnection(config);
    console.log('Connected to MySQL');

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'whisky_scraper'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log('Database created/checked');

    await conn.query(`USE \`${process.env.DB_NAME || 'whisky_scraper'}\`;`);

    const createTableSql = `
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await conn.query(createTableSql);
    console.log('Table "whiskies" created/checked');

    await conn.end();
    console.log('Initialization complete.');
  } catch (err) {
    console.error('Initialization failed:', err);
    process.exit(1);
  }
}

init();
