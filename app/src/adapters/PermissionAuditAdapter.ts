import { ASFAdapter } from './ASFAdapter';
import { InstalledApp } from './AppAnalyzerAdapter';

export interface PermissionEntry {
  packageName: string;
  label: string;
  permission: string;
  granted: boolean;
  grantedByUser: boolean;
  grantedByRole: boolean;
  flags: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class PermissionAuditAdapter extends ASFAdapter<string, PermissionEntry[]> {
  name = 'Permission Audit';
  version = '1.0.0';
  license = 'MIT';
  protected command = 'adb';
  protected args: string[] = [];

  async validate(serial: string): Promise<boolean> {
    return typeof serial === 'string';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.spawnProcess('adb', ['version']);
      return result.includes('adb version');
    } catch {
      return false;
    }
  }

  protected async runCommand(serial: string): Promise<PermissionEntry[]> {
    if (!serial || serial.length === 0) {
      // Try auto-detection as fallback
      const detectResult = await this.spawnProcess('adb', ['devices']).catch(() => '');
      const match = detectResult.match(/\n(\S+)\s+device/);
      if (match) {
        serial = match[1];
      } else {
        throw new Error('No Android device detected. Please connect your device via USB and enable USB debugging.');
      }
    }

    // Get list of packages first
    const packagesOutput = await this.spawnProcess(
      'adb',
      ['-s', serial, 'shell', 'pm', 'list', 'packages', '--user', '0']
    );

    const packageNames: string[] = [];
    for (const line of packagesOutput.split('\n')) {
      const match = line.match(/package:(\S+)/);
      if (match) packageNames.push(match[1]);
    }

    // Build a map of packageName -> label for display
    const appLabelMap = new Map<string, string>();
    const BATCH_SIZE = 10;
    for (let i = 0; i < packageNames.length; i += BATCH_SIZE) {
      const batch = packageNames.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (pkg) => {
        try {
          const dumpsysOutput = await this.spawnProcess(
            'adb',
            ['-s', serial, 'shell', 'dumpsys', 'package', pkg]
          );
          const labelMatch = dumpsysOutput.match(/(?:label|name)=([^\s,]+)/);
          appLabelMap.set(pkg, labelMatch?.[1] || pkg);
        } catch {
          appLabelMap.set(pkg, pkg);
        }
      }));
    }

    const entries: PermissionEntry[] = [];

    // Process in batches to avoid timeout
    for (let i = 0; i < packageNames.length; i += BATCH_SIZE) {
      const batch = packageNames.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (pkg) => {
        try {
          const output = await this.spawnProcess(
            'adb',
            ['-s', serial, 'shell', 'dumpsys', 'package', pkg]
          );
          entries.push(...this.parsePackagePermissions(output, pkg, appLabelMap.get(pkg) || pkg));
        } catch {
          // Skip packages that fail
        }
      }));
    }

    return entries;
  }

  private parsePackagePermissions(output: string, packageName: string, label: string): PermissionEntry[] {
    const entries: PermissionEntry[] = [];

    // Format baru Android 14: section "Requested Permissions:" dan "Install Permissions:"
    const requestedPerms = new Set<string>();
    const grantedPerms = new Set<string>();

    let inRequestedSection = false;
    let inInstalledSection = false;

    for (const line of output.split('\n')) {
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
      if (trimmed.startsWith('perm=') || trimmed.startsWith('Permission [')) {
        inRequestedSection = false;
        inInstalledSection = false;
        continue;
      }

      // Parse requested permissions (indented lines under "requested permissions:")
      if (inRequestedSection && trimmed.match(/^(com\.|android\.permission\.)\w+/)) {
        requestedPerms.add(trimmed);
      }

      // Parse installed/granted permissions (format: "permission.name: granted=true")
      if (inInstalledSection && trimmed.endsWith(': granted=true')) {
        const permName = trimmed.replace(': granted=true', '').trim();
        grantedPerms.add(permName);
      }
    }

    // Build entries from requested permissions, with grant status
    for (const perm of requestedPerms) {
      entries.push({
        packageName,
        label,
        permission: perm,
        granted: grantedPerms.has(perm),
        grantedByUser: grantedPerms.has(perm),
        riskLevel: this.assessRisk(perm),
      });
    }

    return entries;
  }

  private assessRisk(permission: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalPerms = [
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.READ_CONTACTS',
      'android.permission.SEND_SMS',
      'android.permission.RECEIVE_SMS',
      'android.permission.CALL_PHONE',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_CALL_LOG',
      'android.permission.READ_SMS',
      'android.permission.GET_ACCOUNTS',
    ];

    const highPerms = [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.REQUEST_INSTALL_PACKAGES',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.READ_PHONE_NUMBERS',
    ];

    const mediumPerms = [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.VIBRATE',
      'android.permission.WAKE_LOCK',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.NFC',
    ];

    if (criticalPerms.includes(permission)) return 'critical';
    if (highPerms.includes(permission)) return 'high';
    if (mediumPerms.includes(permission)) return 'medium';
    return 'low';
  }
}