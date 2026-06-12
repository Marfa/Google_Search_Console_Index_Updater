import archiver from 'archiver';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const artifactBase = `Google-Search-Console-Updater-${version}-win-x64`;
const stageDir = path.join(root, 'dist', artifactBase);
const zipPath = path.join(root, 'dist', `${artifactBase}.zip`);
const latestYmlPath = path.join(root, 'dist', 'latest.yml');
const unpackedDir = path.join(root, 'dist', 'win-unpacked');

if (!fs.existsSync(unpackedDir)) {
  console.error('win-unpacked not found. Run npm run build:win first.');
  process.exit(1);
}

if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}

fs.cpSync(unpackedDir, stageDir, { recursive: true });

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', resolve);
  archive.on('error', reject);

  archive.pipe(output);
  archive.directory(stageDir, artifactBase);
  archive.finalize();
});

const zipBuffer = fs.readFileSync(zipPath);
const sha512 = crypto.createHash('sha512').update(zipBuffer).digest('base64');
const releaseDate = new Date().toISOString();

const latestYml = `version: ${version}
files:
  - url: ${artifactBase}.zip
    sha512: ${sha512}
    size: ${zipBuffer.length}
path: ${artifactBase}.zip
sha512: ${sha512}
releaseDate: '${releaseDate}'
`;

fs.writeFileSync(latestYmlPath, latestYml);

console.log(`Created ${zipPath} (${zipBuffer.length} bytes)`);
console.log(`Created ${latestYmlPath}`);
