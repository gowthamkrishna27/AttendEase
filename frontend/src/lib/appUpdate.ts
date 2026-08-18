export const CURRENT_APP_VERSION = 'v1.2.0';
export const GITHUB_REPO = 'gowthamkrishna27/AttendEase';
export const LATEST_RELEASE_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`;

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  releaseName?: string;
  publishedAt?: string;
}

export async function checkAppUpdate(): Promise<UpdateInfo> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (!res.ok) {
      // If no release published yet or rate limited, return latest release URL
      return {
        hasUpdate: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        downloadUrl: LATEST_RELEASE_PAGE,
      };
    }

    const data = await res.json();
    const latestTag = data.tag_name || CURRENT_APP_VERSION;
    
    // Look for .apk file in release assets, fallback to release page
    const apkAsset = Array.isArray(data.assets) 
      ? data.assets.find((a: any) => a.name && a.name.toLowerCase().endsWith('.apk')) 
      : null;
    
    const downloadUrl = apkAsset?.browser_download_url || data.html_url || LATEST_RELEASE_PAGE;

    // Clean version strings for comparison
    const cleanCurrent = CURRENT_APP_VERSION.replace(/^v/i, '').trim();
    const cleanLatest = latestTag.replace(/^v/i, '').trim();

    const hasUpdate = cleanLatest !== cleanCurrent && cleanLatest > cleanCurrent;

    return {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: latestTag,
      downloadUrl,
      releaseName: data.name,
      publishedAt: data.published_at,
    };
  } catch (error) {
    console.warn('Could not check GitHub releases:', error);
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      downloadUrl: LATEST_RELEASE_PAGE,
    };
  }
}
