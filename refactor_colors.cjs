const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walkSync(filepath, filelist);
    } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
      filelist.push(filepath);
    }
  }
  return filelist;
};

const files = walkSync(path.join(__dirname, 'src'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Backgrounds
  content = content.replace(/bg-\[\#050510\]/g, 'bg-background');
  content = content.replace(/bg-\[\#0a0a1a\]/g, 'bg-card');
  
  // Borders
  content = content.replace(/border-white\/5/g, 'border-border');
  content = content.replace(/border-white\/10/g, 'border-border');
  content = content.replace(/border-white\/20/g, 'border-border');
  
  // Text
  content = content.replace(/text-white\/40/g, 'text-muted-foreground');
  content = content.replace(/text-white\/20/g, 'text-muted-foreground\/50');
  content = content.replace(/text-white\/60/g, 'text-muted-foreground\/80');
  content = content.replace(/\btext-white\b/g, 'text-foreground');
  
  // Surface colors
  content = content.replace(/bg-white\/5/g, 'bg-muted');
  content = content.replace(/bg-white\/10/g, 'bg-muted\/80');
  content = content.replace(/bg-white\/\[0\.02\]/g, 'bg-muted\/30');
  
  // Replace hover states
  content = content.replace(/hover:bg-white\/10/g, 'hover:bg-muted-foreground\/20');
  content = content.replace(/hover:bg-white\/5/g, 'hover:bg-muted-foreground\/10');
  content = content.replace(/hover:text-white/g, 'hover:text-foreground');
  content = content.replace(/hover:border-white\/5/g, 'hover:border-border');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + path.basename(file));
  }
}
console.log('Done replacing colors.');
