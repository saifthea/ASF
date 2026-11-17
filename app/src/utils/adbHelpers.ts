import { spawn } from 'child_process';

export async function autoDetectSerial(adbPath: string): Promise<string> {
  try {
    const devicesOutput = await new Promise<string>((resolve, reject) => {
      const child = spawn(adbPath, ['devices'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      child.stdout?.on('data', (d: Buffer) => { out += d.toString(); });
      child.on('close', (code: number) => code === 0 ? resolve(out) : reject(new Error()));
      child.on('error', reject);
    });

    for (const line of devicesOutput.trim().split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && parts[1] === 'device') {
        return parts[0];
      }
    }
  } catch {}
  return '';
}
