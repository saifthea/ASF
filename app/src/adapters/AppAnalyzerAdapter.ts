import { ASFAdapter } from './ASFAdapter';

export interface InstalledApp {
  packageName: string;
  label: string;
  versionName: string;
  versionCode: number;
  installDate: string;
  lastUpdate: string;
  size: number;
  permissions: string[];
  isSystem: boolean;
  hasApk: boolean;
}

export class AppAnalyzerAdapter extends ASFAdapter<string, InstalledApp[]> {
  name = 'App Analyzer';
  version = '1.0.0';
  license = 'MIT';
  protected command = 'adb';
  protected args: string[] = [];

  async validate(serial: string): Promise<boolean> {
    return typeof serial === 'string' && serial.length > 0;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.spawnProcess('adb', ['version']);
      return result.includes('adb version');
    } catch {
      return false;
    }
  }

  protected async runCommand(serial: string): Promise<InstalledApp[]> {
    // Use --user 0 for Android 14 compatibility (no -f flag support)
    const output = await this.spawnProcess(
      'adb',
      ['-s', serial, 'shell', 'pm', 'list', 'packages', '--user', '0']
    );

    const apps: InstalledApp[] = [];
    const lines = output.split('\n').filter(l => l.trim().startsWith('package:'));

    // Process in small batches to avoid overwhelming the device
    const BATCH_SIZE = 10;
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (line) => {
        const match = line.match(/package:(\S+)/);
        if (match) {
          const info = await this.getAppInfo(serial, match[1]);
          if (info) apps.push(info);
        }
      }));
    }

    return apps;
  }

  private async getAppInfo(serial: string, packageName: string): Promise<InstalledApp | null> {
    try {
      const dumpsysOutput = await this.spawnProcess(
        'adb',
        ['-s', serial, 'shell', 'dumpsys', 'package', packageName]
      );

      const versionNameMatch = dumpsysOutput.match(/versionName=(\S+)/);
      const versionCodeMatch = dumpsysOutput.match(/versionCode=(\d+)/);
      const installTimeMatch = dumpsysOutput.match(/firstInstallTime=(\d+)/);
      const lastUpdateMatch = dumpsysOutput.match(/lastUpdateTime=(\d+)/);
      const sizeMatch = dumpsysOutput.match(/codeSize=(\d+)/);

      // Extract app label from dumpsys package output.
      // Format: "Package [com.example] ... label=MyApp" or similar.
      let label = packageName;
      const labelMatch = dumpsysOutput.match(/(?:label|name)=([^\s,]+)/);
      if (labelMatch) {
        label = labelMatch[1];
      }

      // Parse ONLY the "requested permissions:" section from dumpsys package.
      // The old parser used the broad "permissions:" block which includes system-level
      // declarations (android.permission.DEVICE_POWER, REORDER_TASKS, etc.) and
      // duplicate entries (android.permission.CAMERA: with trailing colon), causing
      // inflated permission counts and false "declared but NOT granted" findings.
      const permissions: string[] = [];
      const seenPerms = new Set<string>();
      const lines = dumpsysOutput.split('\n');
      let inRequestedSection = false;
      let inInstalledSection = false;

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === 'requested permissions:') {
          inRequestedSection = true;
          inInstalledSection = false;
          continue;
        }
        if (trimmed === 'install permissions:') {
          inRequestedSection = false;
          inInstalledSection = true;
          continue;
        }
        // Stop parsing permissions when we hit other sections
        if (trimmed.startsWith('perm=') || trimmed.startsWith('Permission [')) {
          inRequestedSection = false;
          inInstalledSection = false;
          continue;
        }
        // Only parse requested permissions — skip the broad "permissions:" block
        // that contains system-level declarations and duplicates
        if (inRequestedSection && trimmed.match(/^(com\.|android\.permission\.)\w+/)) {
          if (!seenPerms.has(trimmed)) {
            seenPerms.add(trimmed);
            permissions.push(trimmed);
          }
        }
      }

      return {
        packageName,
        label,
        versionName: versionNameMatch?.[1] || 'unknown',
        versionCode: versionCodeMatch ? parseInt(versionCodeMatch[1], 10) : 0,
        installDate: installTimeMatch
          ? new Date(parseInt(installTimeMatch[1], 10)).toISOString()
          : 'unknown',
        lastUpdate: lastUpdateMatch
          ? new Date(parseInt(lastUpdateMatch[1], 10)).toISOString()
          : 'unknown',
        size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
        permissions,
        isSystem: packageName.startsWith('com.android') || packageName.startsWith('android'),
        hasApk: true,
      };
    } catch {
      return null;
    }
  }
}