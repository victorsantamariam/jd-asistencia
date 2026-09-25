import fs from 'fs';
import path from 'path';

// Ensure public output directory exists
fs.mkdirSync('public', { recursive: true });

// Copy static assets into public for Vercel deployment
const assets = ['index.html', 'css', 'js', 'data'];
for (const item of assets) {
  if (fs.existsSync(item)) {
    fs.cpSync(item, path.join('public', item), { recursive: true });
  }
}

console.log('✅ Build completed successfully: public/ prepared with all static assets.');
