import { ASFAdapter } from './ASFAdapter';

export interface CameraMicEvent {
  packageName: string;
  resource: 'camera' | 'microphone';
  timestamp: string;
  duration: number;
  status: 'granted' | 'denied' | 'revoked';
  appOp: string;
}

export class CAMicAdapter extends ASFAdapter<string, CameraMicEvent[]> {
  name = 'Camera & Microphone Forensics';
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

  protected async runCommand(serial: string): Promise<CameraMicEvent[]> {
    if (!serial || serial.length === 0) {
      const detectResult = await this.spawnProcess('adb', ['devices']).catch(() => '');
      const match = detectResult.match(/\n(\S+)\s+device/);
      if (match) serial = match[1];
      else throw new Error('No Android device detected. Please connect your device via USB and enable USB debugging.');
    }

    const events: CameraMicEvent[] = [];

    // Try appops first
    try {
      const appOpsOutput = await this.spawnProcess(
        'adb',
        ['-s', serial, 'shell', 'dumpsys', 'appops']
      );

      const cameraEvents = this.parseAppOpsModeWatchers(appOpsOutput, 'camera');
      const micEvents = this.parseAppOpsModeWatchers(appOpsOutput, 'microphone');

      if (cameraEvents.length > 0 || micEvents.length > 0) {
        events.push(...cameraEvents, ...micEvents);
      }
    } catch {
      // Ignore appops errors
    }

    // Fallback to logcat - more reliable on Android 14
    try {
      const logcatOutput = await this.spawnProcess(
        'adb',
        ['-s', serial, 'logcat', '-d', '-t', '1000']
      );
      const logEvents = this.parseLogcat(logcatOutput);
      events.push(...logEvents);
    } catch {
      // No logcat data available
    }

    // If still empty, try to get permission status from package list
    if (events.length === 0) {
      try {
        const packages = await this.spawnProcess(
          'adb',
          ['-s', serial, 'shell', 'pm', 'list', 'packages', '-3', '--user', '0']
        );
        const pkgLines = packages.split('\n').filter(l => l.trim().startsWith('package:'));
        for (const line of pkgLines.slice(0, 50)) {
          const pkgName = line.replace('package:', '').trim();
          if (!pkgName) continue;

          try {
            const pkgDump = await this.spawnProcess(
              'adb',
              ['-s', serial, 'shell', 'dumpsys', 'package', pkgName]
            );

            const hasCamera = pkgDump.includes("android.permission.CAMERA");
            const hasMic = pkgDump.includes("android.permission.RECORD_AUDIO");

            const grantedPerms = new Set<string>();
            let inRequestedSection = false;
            let inInstalledSection = false;

            for (const pLine of pkgDump.split('\n')) {
              const trimmed = pLine.trim();
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
              if (inRequestedSection && trimmed.match(/^(com\.|android\.permission\.)\w+/)) {
                // track requested
              }
              if (inInstalledSection && trimmed.endsWith(': granted=true')) {
                const permName = trimmed.replace(': granted=true', '').trim();
                grantedPerms.add(permName);
              }
            }

            if (hasCamera && grantedPerms.has('android.permission.CAMERA')) {
              events.push({
                packageName: pkgName,
                resource: 'camera',
                timestamp: new Date().toISOString(),
                duration: 0,
                status: 'granted',
                appOp: 'android:camera',
              });
            }
            if (hasMic && grantedPerms.has('android.permission.RECORD_AUDIO')) {
              events.push({
                packageName: pkgName,
                resource: 'microphone',
                timestamp: new Date().toISOString(),
                duration: 0,
                status: 'granted',
                appOp: 'android:microphone',
              });
            }
          } catch {
            // Skip problematic packages
          }
        }
      } catch {
        // Ignore package list errors
      }
    }

    return events;
  }

  // Parse ModeCallback-based format from dumpsys appops
  private parseAppOpsModeWatchers(output: string, resource: 'camera' | 'microphone'): CameraMicEvent[] {
    const events: CameraMicEvent[] = [];
    const opName = resource === 'camera' ? 'CAMERA' : 'RECORD_AUDIO';
    const lines = output.split('\n');

    let inOpSection = false;
    const seenUids = new Set<string>();

    for (const line of lines) {
      // Detect Op CAMERA: or Op RECORD_AUDIO: section
      if (line.trim() === `Op ${opName}:`) {
        inOpSection = true;
        continue;
      }

      // New Op section starts
      if (line.match(/^    Op \w+:$/)) {
        inOpSection = false;
        continue;
      }

      if (!inOpSection) continue;

      // Extract uid from ModeCallback
      const uidMatch = line.match(/from\s+uid=(u?\d+)/);
      if (uidMatch && !seenUids.has(uidMatch[1])) {
        seenUids.add(uidMatch[1]);
        events.push({
          packageName: `uid_${uidMatch[1]}`,
          resource,
          timestamp: new Date().toISOString(),
          duration: 0,
          status: 'granted',
          appOp: resource === 'camera' ? 'android:camera' : 'android:microphone',
        });
      }
    }

    return events;
  }

  private parseLogcat(output: string): CameraMicEvent[] {
    const events: CameraMicEvent[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const cameraMatch = line.match(/Camera.*opened.*by\s+([\w.]+)/);
      if (cameraMatch) {
        events.push({
          packageName: cameraMatch[1],
          resource: 'camera',
          timestamp: new Date().toISOString(),
          duration: 0,
          status: 'granted',
          appOp: 'android:camera',
        });
      }

      const micMatch = line.match(/Audio.*recording.*by\s+([\w.]+)/);
      if (micMatch) {
        events.push({
          packageName: micMatch[1],
          resource: 'microphone',
          timestamp: new Date().toISOString(),
          duration: 0,
          status: 'granted',
          appOp: 'android:microphone',
        });
      }
    }

    return events;
  }
}
