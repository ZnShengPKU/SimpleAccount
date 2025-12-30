const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist-electron');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2));
console.log('Created dist-electron/package.json with type: commonjs');
