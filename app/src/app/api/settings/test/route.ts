import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

/**
 * POST /api/settings/test
 * Body: { adbPath?: string, serial?: string }
 *
 * Server-side ADB connection test:
 * - `adbPath version` → validasi binary ADB
 * - `adb devices` → daftar perangkat yang terhubung
 * - `adb -s <serial> get-state` → status perangkat tertentu
 */
export async function POST(request: Request) {
  try {
    const { adbPath = 'adb', serial } = await request.json();

    // 1. Cek binary ADB
    const versionOutput = await runCommand(adbPath, ['version'], 10000);
    if (versionOutput.includes('adb version') || versionOutput.includes('Android Debug Bridge')) {
      // ok
    } else {
      return NextResponse.json(
        { success: false, error: `Binary ADB tidak valid: "${adbPath}"` },
        { status: 400 }
      );
    }

    // 2. Daftar perangkat
    const devicesOutput = await runCommand(adbPath, ['devices'], 10000);
    const lines = devicesOutput.split('\n').slice(1);
    const devices = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [deviceSerial, state] = line.split('\t');
        return { serial: deviceSerial, state: state?.trim() };
      });

    // 3. Cek perangkat tertentu
    let deviceState: string | null = null;
    if (serial) {
      const found = devices.find((d) => d.serial === serial);
      if (found) {
        deviceState = found.state;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: `Perangkat "${serial}" tidak ditemukan. Perangkat terdeteksi: ${devices.map((d) => d.serial).join(', ') || 'none'}`,
            devices,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        adbVersion: versionOutput.trim(),
        devices,
        deviceState,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `Test gagal: ${error.message}`
            : 'Test gagal (error tidak diketahui)',
      },
      { status: 500 }
    );
  }
}

function runCommand(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error(`Timeout: "${cmd} ${args.join(' ')}" melebihi ${timeoutMs}ms`));
      }
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Gagal menjalankan "${cmd}": ${err.message}`));
      }
    });

    child.on('close', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout || stderr);
        } else {
          reject(new Error(`Exit code ${code}: ${stderr || stdout}`.trim()));
        }
      }
    });
  });
}
