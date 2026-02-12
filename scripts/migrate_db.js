const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'whisky_db',
};

async function migrateData() {
  let connection;

  try {
    console.log('[v0] Connecting to MySQL server...');
    connection = await mysql.createConnection(config);

    // Check if old whiskies table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'whiskies'"
    );

    if (tables.length === 0) {
      console.log('[v0] No old whiskies table found. Migration not needed.');
      return;
    }

    console.log('[v0] Found old whiskies table. Starting migration...');

    // Get all data from old table
    const [oldData] = await connection.query('SELECT * FROM whiskies');

    if (oldData.length === 0) {
      console.log('[v0] No data to migrate.');
      return;
    }

    console.log(`[v0] Migrating ${oldData.length} records...`);

    // Insert data into new tables
    for (const record of oldData) {
      // Insert into wine_products
      const [productResult] = await connection.query(
        `INSERT INTO wine_products (name, url, price, image_url, description, brand, source, scraped_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.name || null,
          record.url || null,
          record.price ? parseFloat(record.price.replace(/[^0-9.]/g, '')) || null : null,
          record.image_url || null,
          record.description || null,
          record.distillery || record.brand || null, // Map distillery to brand
          record.source || 'migrated',
          record.scraped_at || new Date().toISOString(),
        ]
      );

      const productId = productResult.insertId;

      // If there's image_data, insert into wine_product_images
      if (record.image_data) {
        await connection.query(
          `INSERT INTO wine_product_images (product_id, img_blob, position) VALUES (?, ?, ?)`,
          [productId, record.image_data, 0]
        );
      }
    }

    console.log('[v0] Migration completed successfully!');

    // Optional: Backup old table and drop it
    console.log('[v0] Creating backup of old table...');
    await connection.query('CREATE TABLE whiskies_backup AS SELECT * FROM whiskies');

    console.log('[v0] Dropping old table...');
    await connection.query('DROP TABLE whiskies');

    console.log('[v0] Migration and cleanup completed!');

  } catch (error) {
    console.error('[v0] Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateData();