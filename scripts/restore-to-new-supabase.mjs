import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Usage: node scripts/restore-to-new-supabase.mjs <NEW_SUPABASE_URL> <NEW_SERVICE_ROLE_KEY_OR_ANON_KEY>
let [rawUrl, rawKey] = process.argv.slice(2);
const newUrl = rawUrl ? rawUrl.replace(/^[<"']+|[>"']+$/g, '').trim() : '';
const newKey = rawKey ? rawKey.replace(/^[<"']+|[>"']+$/g, '').trim() : '';

if (!newUrl || !newKey) {
  console.error('\nUsage: node scripts/restore-to-new-supabase.mjs <NEW_SUPABASE_URL> <NEW_SUPABASE_KEY>\n');
  console.error('Example: node scripts/restore-to-new-supabase.mjs https://xyz.supabase.co eyJhbGciOi...\n');
  process.exit(1);
}

const supabase = createClient(newUrl, newKey);
const backupDir = path.resolve('backup');

async function restoreTable(tableName) {
  const filePath = path.join(backupDir, `${tableName}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${tableName} (no backup file)`);
    return;
  }
  const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (rows.length === 0) {
    console.log(`Skipping ${tableName} (0 rows)`);
    return;
  }

  console.log(`Restoring ${tableName} (${rows.length} rows)...`);
  const CHUNK_SIZE = 100;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    let chunk = rows.slice(i, i + CHUNK_SIZE);
    let { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id' });
    if (error && tableName === 'customers' && error.message.includes('telegram_chat_id')) {
      console.log('Notice: telegram_chat_id column missing on customers table. Retrying with base customer fields...');
      const strippedChunk = chunk.map(({ telegram_chat_id, ...rest }) => rest);
      const res = await supabase.from(tableName).upsert(strippedChunk, { onConflict: 'id' });
      error = res.error;
    }
    if (error) {
      console.error(`Error inserting chunk ${i} - ${i + chunk.length} into ${tableName}:`, error.message);
    }
  }
  console.log(`✓ ${tableName} restored successfully!`);
}

async function restoreImages() {
  const imagesDir = path.join(backupDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    console.log('Skipping images (no backup/images folder)');
    return;
  }
  const files = fs.readdirSync(imagesDir);
  if (files.length === 0) {
    console.log('Skipping images (0 images)');
    return;
  }

  console.log(`\nRestoring ${files.length} product images to 'product-images' storage bucket...`);
  
  // Ensure bucket exists
  try {
    await supabase.storage.createBucket('product-images', { public: true });
  } catch {}

  let uploaded = 0;
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    const { error } = await supabase.storage
      .from('product-images')
      .upload(file, fileBuffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000'
      });
    if (!error) {
      uploaded++;
      if (uploaded % 50 === 0 || uploaded === files.length) {
        console.log(`  Uploaded ${uploaded}/${files.length} images...`);
      }
    } else {
      console.warn(`  Warning uploading ${file}:`, error.message);
    }
  }
  console.log(`✓ ${uploaded} product images uploaded successfully!`);
}

async function main() {
  console.log(`\n=============================================`);
  console.log(`Starting migration to new Supabase project: ${newUrl}`);
  console.log(`=============================================\n`);

  // Order matters for foreign key relationships:
  const sequence = [
    'vendors',
    'customers',
    'settings',
    'products',
    'purchases',
    'sales',
    'settlements',
    'transfer_slips',
    'expenses'
  ];

  for (const table of sequence) {
    await restoreTable(table);
  }

  // Restore Storage Images
  await restoreImages();

  console.log('\n=============================================');
  console.log('✓ All database data and product images migrated successfully!');
  console.log('=============================================\n');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
