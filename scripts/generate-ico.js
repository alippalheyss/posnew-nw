import fs from 'fs';
import path from 'path';
import pngToIco from 'png-to-ico';

async function generate() {
  const inputPng = path.resolve('public', 'icon-256.png');
  const buf = await pngToIco(inputPng);

  const targets = [
    path.resolve('public', 'favicon.ico'),
    path.resolve('public', 'app-icon.ico'),
    path.resolve('electron', 'app-icon.ico'),
    path.resolve('build', 'icon.ico'),
  ];

  for (const target of targets) {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(target, buf);
    console.log(`Generated: ${target} (${buf.length} bytes)`);
  }
}

generate().catch(err => {
  console.error('Error generating ICO:', err);
  process.exit(1);
});
