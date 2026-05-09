import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting Vercel build...');
console.log('📁 Root directory:', rootDir);

// Step 1: Check if src/main.tsx exists
const mainPath = path.join(rootDir, 'src', 'main.tsx');
if (!fs.existsSync(mainPath)) {
    console.error('❌ src/main.tsx not found!');
    process.exit(1);
}
console.log('✅ src/main.tsx found');

// Step 2: Create a temporary index.html with inline script reference
const indexPath = path.join(rootDir, 'index.html');
const originalHtml = fs.readFileSync(indexPath, 'utf-8');

// Create modified HTML that uses entry point directly
const modifiedHtml = originalHtml.replace(
    /<script type="module" src="[^"]+"><\/script>/,
    '<script type="module" src="./src/main.tsx"></script>'
);

// Write the modified HTML
fs.writeFileSync(indexPath, modifiedHtml);
console.log('✅ Modified index.html for build');

// Step 3: Run Vite build with explicit config
try {
    console.log('🔨 Running Vite build...');
    execSync('npx vite build', {
        cwd: rootDir,
        stdio: 'inherit',
        env: {
            ...process.env,
            NODE_ENV: 'production'
        }
    });
    console.log('✅ Build completed successfully!');
} catch (error) {
    // Restore original HTML on error
    fs.writeFileSync(indexPath, originalHtml);
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

// Step 4: Restore original index.html
fs.writeFileSync(indexPath, originalHtml);
console.log('✅ Restored original index.html');

console.log('🎉 Vercel build completed successfully!');
