const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://admin:internal1234@192.168.0.17:5432/Imagen',
});

async function cleanupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Cleaning up database...');
    
    // Drop triggers
    await client.query('DROP TRIGGER IF EXISTS image_simple_tags_insert ON "Image"');
    console.log('✓ Dropped image_simple_tags_insert trigger');
    
    await client.query('DROP TRIGGER IF EXISTS image_simple_tags_update ON "Image"');
    console.log('✓ Dropped image_simple_tags_update trigger');
    
    await client.query('DROP TRIGGER IF EXISTS simple_tag_usage_increment ON "ImageSimpleTag"');
    console.log('✓ Dropped simple_tag_usage_increment trigger');
    
    await client.query('DROP TRIGGER IF EXISTS simple_tag_usage_decrement ON "ImageSimpleTag"');
    console.log('✓ Dropped simple_tag_usage_decrement trigger');
    
    // Drop functions
    await client.query('DROP FUNCTION IF EXISTS auto_populate_image_simple_tags() CASCADE');
    console.log('✓ Dropped auto_populate_image_simple_tags function');
    
    await client.query('DROP FUNCTION IF EXISTS increment_simple_tag_usage() CASCADE');
    console.log('✓ Dropped increment_simple_tag_usage function');
    
    await client.query('DROP FUNCTION IF EXISTS decrement_simple_tag_usage() CASCADE');
    console.log('✓ Dropped decrement_simple_tag_usage function');
    
    // Drop tables
    await client.query('DROP TABLE IF EXISTS "ImageSimpleTag" CASCADE');
    console.log('✓ Dropped ImageSimpleTag table');
    
    await client.query('DROP TABLE IF EXISTS "SimpleTag" CASCADE');
    console.log('✓ Dropped SimpleTag table');
    
    console.log('\n✅ Database cleanup complete!');
    console.log('Now run: npx prisma migrate deploy');
    
  } catch (error) {
    console.error('Error cleaning up database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupDatabase();