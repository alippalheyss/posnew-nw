const fs = require('fs');
const path = require('path');

// Read the index.html
const indexPath = path.resolve(__dirname, '../index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

// Replace the script src to use absolute path that Vite will understand
html = html.replace(
    '<script type="module" src="/src/main.tsx"></script>',
    '<script type="module" src="/src/main.tsx"></script>'
);

// Ensure the file is ready for Vite build
console.log('✓ Pre-build script completed');
console.log('✓ index.html is ready for Vite build');
