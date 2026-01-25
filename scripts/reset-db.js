const { Client } = require('pg');

// Parse DATABASE_URL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = new Client({
  connectionString,
});

async function resetDatabase() {
  try {
    await client.connect();
    console.log('Connected to database for reset...');

    // Drop public schema and recreate it
    // This is the most nuclear option to ensure a clean slate
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    
    // Grant permissions (standard for default public schema in PG)
    await client.query('GRANT ALL ON SCHEMA public TO public');
    await client.query('COMMENT ON SCHEMA public IS \'standard public schema\'');

    console.log('✅ Database successfully reset (public schema recreated).');
  } catch (err) {
    console.error('❌ Error resetting database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();
