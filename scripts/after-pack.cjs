const fs = require('fs');
const path = require('path');

const LOCALES_TO_KEEP = new Set(['en', 'en_GB', 'ru']);

function removeExtraLocales(resourcesDir) {
  if (!fs.existsSync(resourcesDir)) {
    return 0;
  }

  let removed = 0;

  for (const entry of fs.readdirSync(resourcesDir)) {
    if (!entry.endsWith('.lproj')) {
      continue;
    }

    const locale = entry.slice(0, -'.lproj'.length);
    if (LOCALES_TO_KEEP.has(locale)) {
      continue;
    }

    fs.rmSync(path.join(resourcesDir, entry), { recursive: true, force: true });
    removed += 1;
  }

  return removed;
}

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);

  const localeDirs = [
    path.join(
      appPath,
      'Contents',
      'Frameworks',
      'Electron Framework.framework',
      'Versions',
      'A',
      'Resources'
    ),
    path.join(appPath, 'Contents', 'Resources'),
  ];

  let removed = 0;
  for (const localeDir of localeDirs) {
    removed += removeExtraLocales(localeDir);
  }

  console.log(`Removed ${removed} unused Electron locale packs`);
};
