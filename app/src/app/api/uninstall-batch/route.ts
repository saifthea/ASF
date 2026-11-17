import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(req: NextRequest) {
  try {
    const { adbPath, serial, packageNames } = await req.json();

    if (!packageNames || !Array.isArray(packageNames) || packageNames.length === 0) {
      return NextResponse.json({ success: false, error: 'packageNames array is required' }, { status: 400 });
    }

    const cmd = adbPath || 'adb';
    const results: Array<{ packageName: string; success: boolean; method?: string; error?: string }> = [];

    for (const packageName of packageNames) {
      const result = await uninstallSinglePackage(cmd, serial, packageName);
      results.push({ packageName, success: result.success, method: result.method, error: result.error });
    }

    const allSuccess = results.every(r => r.success);
    return NextResponse.json({ success: allSuccess, results });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function uninstallSinglePackage(cmd: string, serial: string | undefined, packageName: string): Promise<{ success: boolean; method?: string; error?: string }> {
  // Step 1: Try uninstall with multiple strategies
  const uninstallStrategies = [
    ['-s', serial, 'shell', 'pm', 'uninstall', '--user', '0', packageName],
    ['-s', serial, 'shell', 'pm', 'uninstall', '--user', '0', '--all-users', packageName],
    ['-s', serial, 'shell', 'pm', 'uninstall', packageName],
  ].filter(args => serial ? true : !args.includes('-s'));

  for (const args of uninstallStrategies) {
    const result = await executeCommand(cmd, args);
    if (result.success) {
      await new Promise(r => setTimeout(r, 500));
      const stillInstalled = await verifyPackageInstalled(cmd, serial, packageName);
      if (!stillInstalled) {
        return { success: true, method: 'uninstall' };
      }
    }
  }

  // Step 2: Try disabling
  const disabled = await disablePackage(cmd, serial, packageName);
  if (disabled) {
    return { success: true, method: 'disable' };
  }

  // Step 3: Force stop + disable
  const forceStopped = await forceStopPackage(cmd, serial, packageName);
  if (forceStopped) {
    const disabledAfterForce = await disablePackage(cmd, serial, packageName);
    if (disabledAfterForce) {
      return { success: true, method: 'force-stop + disable' };
    }
  }

  return { success: false, error: `Failed to remove ${packageName}. May be a critical system component.` };
}

function executeCommand(cmd: string, args: string[]): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });

    child.on('close', () => {
      const output = (stdout + stderr).trim();
      const success = output.toLowerCase().includes('success') && !output.toLowerCase().includes('failure');
      resolve({ success, output });
    });

    child.on('error', () => resolve({ success: false, output: '' }));
  });
}

function verifyPackageInstalled(cmd: string, serial: string | undefined, packageName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = ['-s', serial, 'shell', 'pm', 'list', 'packages'];
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';

    child.stdout?.on('data', (d) => { stdout += d.toString(); });

    child.on('close', () => {
      const lines = stdout.split('\n');
      const stillInstalled = lines.some(line => line.trim() === `package:${packageName}`);
      resolve(stillInstalled);
    });

    child.on('error', () => resolve(true));
  });
}

function disablePackage(cmd: string, serial: string | undefined, packageName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = ['-s', serial, 'shell', 'pm', 'disable', '--user', '0', packageName];
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });

    child.on('close', () => {
      const output = (stdout + stderr).trim().toLowerCase();
      resolve(output.includes('success') || output.includes('already disabled'));
    });

    child.on('error', () => resolve(false));
  });
}

function forceStopPackage(cmd: string, serial: string | undefined, packageName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = ['-s', serial, 'shell', 'am', 'force-stop', packageName];
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    child.on('close', () => resolve(true));
    child.on('error', () => resolve(false));
  });
}