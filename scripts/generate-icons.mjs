import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pngPath = path.join(root, 'build', 'icon.png');
const icoPath = path.join(root, 'build', 'icon.ico');

if (!fs.existsSync(pngPath)) {
  console.error('Missing build/icon.png');
  process.exit(1);
}

const ico = await pngToIco(pngPath);
fs.writeFileSync(icoPath, ico);
console.log(`Generated ${icoPath} (${ico.length} bytes)`);
