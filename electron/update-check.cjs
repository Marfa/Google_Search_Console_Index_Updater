const GITHUB_OWNER = 'Marfa';
const GITHUB_REPO = 'Google_Search_Console_Index_Updater';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
const USER_AGENT = 'Google-Search-Console-Updater';

function getChannelFileName(platform = process.platform) {
  return platform === 'darwin' ? 'latest-mac.yml' : 'latest.yml';
}

function parseYamlVersion(yamlText) {
  const match = yamlText.match(/^version:\s*['"]?([^'"\n]+)['"]?\s*$/m);
  return match ? match[1].trim() : null;
}

// ponytail: semver is dev-only; pack x.y.z compare inline for release tags
function parseVersion(version) {
  const match = String(version)
    .trim()
    .replace(/^v/i, '')
    .match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function normalizeVersion(version) {
  const parts = parseVersion(version);
  return parts ? parts.join('.') : null;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/octet-stream',
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

async function listReleases() {
  const releases = [];

  for (let page = 1; page <= 5; page += 1) {
    const response = await fetch(`${GITHUB_API}/releases?per_page=100&page=${page}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    releases.push(...batch);

    if (batch.length < 100) {
      break;
    }
  }

  return releases;
}

function releaseHasChannelAsset(release, channelFile) {
  return Array.isArray(release.assets) && release.assets.some((asset) => asset.name === channelFile);
}

async function findLatestPlatformRelease(platform = process.platform) {
  const channelFile = getChannelFileName(platform);
  const releases = await listReleases();

  for (const release of releases) {
    if (release.draft || release.prerelease || !releaseHasChannelAsset(release, channelFile)) {
      continue;
    }

    const asset = release.assets.find((item) => item.name === channelFile);
    const yamlText = await fetchText(asset.browser_download_url);
    const version = parseYamlVersion(yamlText);

    const normalizedVersion = normalizeVersion(version);
    if (!normalizedVersion) {
      continue;
    }

    const tag = release.tag_name;

    return {
      tag,
      version: normalizedVersion,
      channelFile,
      releasePageUrl: release.html_url,
      downloadBaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${tag}/`,
    };
  }

  return null;
}

function isNewerVersion(latestVersion, currentVersion) {
  const latest = parseVersion(latestVersion);
  const current = parseVersion(currentVersion);

  if (!latest || !current) {
    return false;
  }

  for (let index = 0; index < 3; index += 1) {
    if (latest[index] !== current[index]) {
      return latest[index] > current[index];
    }
  }

  return false;
}

module.exports = {
  findLatestPlatformRelease,
  getChannelFileName,
  isNewerVersion,
};
