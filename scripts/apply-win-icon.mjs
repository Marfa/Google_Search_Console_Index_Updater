import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as PELibrary from 'pe-library';
import * as ResEdit from 'resedit';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
const productName = 'Google Search Console Updater';
const icoPath = path.join(root, 'build', 'icon.ico');
const exePath = path.join(root, 'dist', 'win-unpacked', `${productName}.exe`);

const generate = spawnSync('node', ['scripts/generate-icons.mjs'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

if (generate.status !== 0) {
  process.exit(generate.status ?? 1);
}

if (!fs.existsSync(icoPath)) {
  console.error('build/icon.ico was not generated.');
  process.exit(1);
}

if (!fs.existsSync(exePath)) {
  console.error('Windows executable not found:', exePath);
  process.exit(1);
}

const exe = PELibrary.NtExecutable.from(fs.readFileSync(exePath));
const res = PELibrary.NtExecutableResource.from(exe);
const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
const icons = iconFile.icons.map((item) => item.data);
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);

if (groups.length === 0) {
  console.error('No icon groups found in executable.');
  process.exit(1);
}

for (const group of groups) {
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    group.id,
    group.lang,
    icons
  );
}

const versionInfoList = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
if (versionInfoList.length > 0) {
  const versionInfo = versionInfoList[0];
  versionInfo.setFileVersion(major, minor, patch, 0, 1033);
  versionInfo.setProductVersion(major, minor, patch, 0, 1033);
  versionInfo.setStringValues(
    { lang: 1033, codepage: 1200 },
    {
      FileDescription: productName,
      ProductName: productName,
      OriginalFilename: `${productName}.exe`,
      InternalName: 'GoogleSearchConsoleUpdater',
      LegalCopyright: 'CC BY-NC-SA 4.0',
    }
  );
  versionInfo.outputToResourceEntries(res.entries);
}

res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));

console.log(
  `Replaced ${groups.length} icon group(s) with ${iconFile.icons.length} sizes in ${exePath}`
);
