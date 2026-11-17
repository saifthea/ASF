import { ASFAdapter } from './ASFAdapter';

export interface ConnectionLog {
  packageName: string;
  destinationIp: string;
  destinationPort: number;
  protocol: 'TCP' | 'UDP';
  bytesSent: number;
  bytesReceived: number;
  connectionCount: number;
  firstSeen: string;
  lastSeen: string;
  domain?: string;
}

export class NetworkTrafficAdapter extends ASFAdapter<string, ConnectionLog[]> {
  name = 'Network Traffic Analyzer';
  version = '1.0.0';
  license = 'GPLv3';
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

  protected async runCommand(serial: string): Promise<ConnectionLog[]> {
    try {
      const output = await this.spawnProcess(
        'adb',
        ['-s', serial, 'shell', 'cat', '/proc/net/tcp']
      );

      return this.parseNetstat(output);
    } catch {
      return [];
    }
  }

  private parseNetstat(output: string): ConnectionLog[] {
    const connections: ConnectionLog[] = [];
    const lines = output.split('\n').slice(2);

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 12) {
        const localAddress = parts[1];
        const remoteAddress = parts[2];
        const state = parts[3];
        const inode = parts[9];

        if (state === '0A' || state === '01') {
          const [localIp, localPort] = this.parseAddress(localAddress);
          const [remoteIp, remotePort] = this.parseAddress(remoteAddress);

          if (remoteIp && remotePort) {
            connections.push({
              packageName: 'unknown',
              destinationIp: remoteIp,
              destinationPort: remotePort,
              protocol: 'TCP',
              bytesSent: 0,
              bytesReceived: 0,
              connectionCount: 1,
              firstSeen: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
            });
          }
        }
      }
    }

    return connections;
  }

  private parseAddress(address: string): [string, number] {
    const [ipHex, portHex] = address.split(':');
    if (!ipHex || !portHex) return ['', 0];

    const ip = this.hexToIp(ipHex);
    const port = parseInt(portHex, 16);

    return [ip, port];
  }

  private hexToIp(hex: string): string {
    const parts = hex.match(/.{1,2}/g);
    if (!parts || parts.length !== 4) return '';

    return parts
      .map(p => parseInt(p, 16))
      .reverse()
      .join('.');
  }
}