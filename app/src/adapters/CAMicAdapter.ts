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

    try {
      // Get UID to package mapping
      const uidMap = await this.getUidPackageMap(serial);

      // Get appops data
      const appOpsOutput = await this.spawnProcess(
        'adb',
        ['-s', serial, 'shell', 'dumpsys', 'appops']
      );

      // Parse camera events
      const cameraEvents = this.parseAppOps(appOpsOutput, 'camera', 'CAMERA', uidMap);
      const micEvents = this.parseAppOps(appOpsOutput, 'microphone', 'RECORD_AUDIO', uidMap);

      events.push(...cameraEvents, ...micEvents);
    } catch {
      // Fallback: try logcat
      try {
        const logcatOutput = await this.spawnProcess(
          'adb',
          ['-s', serial, 'logcat', '-d', '-t', '500']
        );
        const logEvents = this.parseLogcat(logcatOutput);
        events.push(...logEvents);
      } catch {
        // No data available
      }
    }

    return events;
  }

  private async getUidPackageMap(serial: string): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    try {
      const psOutput = await this.spawnProcess(
        'adb',
        ['-s', serial, 'shell', 'ps', '-A', '-o', 'uid,name']
      );
      for (const line of psOutput.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const uid = parseInt(parts[0], 10);
          if (!isNaN(uid)) {
            // Handle multiple packages separated by colon or space
            const pkgParts = parts[1].split(':');
            map.set(uid, pkgParts[0]);
          }
        }
      }
    } catch {
      // Ignore
    }
    return map;
  }

  private parseAppOps(
    output: string,
    resource: 'camera' | 'microphone',
    opName: string,
    uidMap: Map<number, string>
  ): CameraMicEvent[] {
    const events: CameraMicEvent[] = [];
    const lines = output.split('\n');

    let inSection = false;

    for (const line of lines) {
      if (line.includes(`Op ${opName}:`)) {
        inSection = true;
        continue;
      }
      // Stop when we hit next Op section
      if (inSection && line.includes('Op ') && line.includes(':')) {
        break;
      }

      if (inSection) {
        // Parse: #0: ModeCallback{...} op=CAMERA from uid=1000 pid=1814
        const uidMatch = line.match(/from\s+uid=(\d+)/);
        if (uidMatch) {
          const uid = parseInt(uidMatch[1], 10);
          const packageName = uidMap.get(uid) || `uid_${uid}`;
          const timestamp = new Date().toISOString();

          // Check if allowed or denied
          let status: 'granted' | 'denied' | 'revoked' = 'granted';
          if (line.includes('mode=0') || line.includes('denied')) {
            status = 'denied';
          } else if (line.includes('mode=1') || line.includes('allowed')) {
            status = 'granted';
          }

          events.push({
            packageName,
            resource,
            timestamp,
            duration: 0,
            status,
            appOp: resource === 'camera' ? 'android:camera' : 'android:microphone',
          });
        }
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