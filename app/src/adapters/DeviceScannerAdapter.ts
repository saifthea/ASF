import { ASFAdapter } from './ASFAdapter';

export interface DeviceInfo {
  model: string;
  manufacturer: string;
  androidVersion: string;
  sdkVersion: string;
  buildNumber: string;
  bootloader: string;
  rootStatus: boolean;
  usbDebugging: boolean;
  batteryLevel: number;
  screenResolution: string;
  cpuArch: string;
  totalRam: string;
  storageTotal: string;
  storageUsed: string;
}

export class DeviceScannerAdapter extends ASFAdapter<{ adbPath: string; serial?: string }, DeviceInfo> {
  name = 'Device Scanner';
  version = '1.0.0';
  license = 'MIT';
  protected command = 'adb';
  protected args: string[] = [];

  private adbPath: string;

  constructor(adbPath: string = 'adb') {
    super();
    this.adbPath = adbPath;
  }

  async validate(input: { adbPath: string; serial?: string }): Promise<boolean> {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.spawnProcess(this.adbPath, ['version']);
      return result.includes('adb version');
    } catch {
      return false;
    }
  }

  protected async runCommand(input: { adbPath: string; serial?: string }): Promise<DeviceInfo> {
    if (input?.adbPath) this.adbPath = input.adbPath;

    // Direct adb args construction with optional target device (-s <serial>)
    const getAdbArgs = (cmdArgs: string[]): string[] => {
      if (input?.serial) {
        return ['-s', input.serial, ...cmdArgs];
      }
      return cmdArgs;
    };

    const getprop = async (prop: string): Promise<string> => {
      try {
        const output = await this.spawnProcess(this.adbPath, getAdbArgs(['shell', 'getprop', prop]));
        return output.trim() || 'unknown';
      } catch {
        return 'unknown';
      }
    };

    const model = await getprop('ro.product.model');
    const manufacturer = await getprop('ro.product.manufacturer');
    const androidVersion = await getprop('ro.build.version.release');
    const sdkVersion = await getprop('ro.build.version.sdk');
    const buildNumber = await getprop('ro.build.id');

    let bootloader = 'unknown';
    try {
      bootloader = await getprop('ro.boot.bootloader');
    } catch {
      bootloader = 'unknown';
    }

    const rootStatus = await this.checkRootStatus(input?.serial);
    const usbDebugging = await this.checkUSBDebugging(input?.serial);

    let batteryLevel = 0;
    try {
      const batteryOutput = await this.spawnProcess(this.adbPath, getAdbArgs(['shell', 'dumpsys', 'battery']));
      const levelMatch = batteryOutput.match(/level:\s*(\d+)/);
      if (levelMatch) batteryLevel = parseInt(levelMatch[1], 10);
    } catch {
      batteryLevel = 0;
    }

    let screenResolution = 'unknown';
    try {
      const wmOutput = await this.spawnProcess(this.adbPath, getAdbArgs(['shell', 'wm', 'size']));
      const match = wmOutput.match(/Physical size: (\d+x\d+)/);
      if (match) screenResolution = match[1];
    } catch {
      screenResolution = 'unknown';
    }

    let cpuArch = 'unknown';
    try {
      const archOutput = await getprop('ro.product.cpu.abi');
      cpuArch = archOutput !== 'unknown' ? archOutput : await getprop('ro.abi');
    } catch {
      cpuArch = 'unknown';
    }

    let totalRam = 'unknown';
    let storageTotal = 'unknown';
    let storageUsed = 'unknown';

    // RAM from /proc/meminfo
    try {
      const memOutput = await this.spawnProcess(this.adbPath, getAdbArgs(['shell', 'cat', '/proc/meminfo']));
      const memMatch = memOutput.match(/MemTotal:\s*(\d+)\s*kB/);
      if (memMatch) {
        totalRam = (parseInt(memMatch[1], 10) / 1024 / 1024).toFixed(2) + ' GB';
      }
    } catch {
      totalRam = 'unknown';
    }

    // Storage from df /data
    try {
      const dfOutput = await this.spawnProcess(this.adbPath, getAdbArgs(['shell', 'df', '-h', '/data']));
      const lines = dfOutput.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 3) {
          storageTotal = parts[1] || 'unknown';
          storageUsed = parts[2] || 'unknown';
        }
      }
    } catch {
      storageTotal = 'unknown';
      storageUsed = 'unknown';
    }

    return {
      model,
      manufacturer,
      androidVersion,
      sdkVersion,
      buildNumber,
      bootloader,
      rootStatus,
      usbDebugging,
      batteryLevel,
      screenResolution,
      cpuArch,
      totalRam,
      storageTotal,
      storageUsed,
    };
  }

  private async checkRootStatus(serial?: string): Promise<boolean> {
    try {
      const args = serial ? ['-s', serial, 'shell', 'which', 'su'] : ['shell', 'which', 'su'];
      const output = await this.spawnProcess(this.adbPath, args);
      return output.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async checkUSBDebugging(serial?: string): Promise<boolean> {
    try {
      // Check both global and secure namespaces — ADB state may be stored in either
      const argsGlobal = serial ? ['-s', serial, 'shell', 'settings', 'get', 'global', 'adb_enabled'] : ['shell', 'settings', 'get', 'global', 'adb_enabled'];
      const outputGlobal = await this.spawnProcess(this.adbPath, argsGlobal).catch(() => '');
      if (outputGlobal.trim() === '1') return true;

      const argsSecure = serial ? ['-s', serial, 'shell', 'settings', 'get', 'secure', 'adb_enabled'] : ['shell', 'settings', 'get', 'secure', 'adb_enabled'];
      const outputSecure = await this.spawnProcess(this.adbPath, argsSecure).catch(() => '');
      return outputSecure.trim() === '1';
    } catch {
      return false;
    }
  }
}