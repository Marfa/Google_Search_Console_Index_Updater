const { execSync } = require('child_process');
const path = require('path');

module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

  // ponytail: electron-builder leaves a linker-only adhoc signature; macOS 15+ reports that as "damaged"
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
};
