import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(req: NextRequest) {
  try {
    const { adbPath, serial, packageName } = await req.json();

    if (!packageName) {
      return NextResponse.json({ success: false, error: 'packageName is required' }, { status: 400 });
    }

    const cmd = adbPath || 'adb';
    // Build base args: if serial is provided, use -s flag
    const baseArgs: string[] = serial ? ['-s', serial] : [];

    // Step 1: Try uninstall with multiple strategies
    const uninstallStrategies = [
      [...baseArgs, 'shell', 'pm', 'uninstall', '--user', '0', packageName],
      [...baseArgs, 'shell', 'pm', 'uninstall', '--user', '0', '--all-users', packageName],
      [...baseArgs, 'shell', 'pm', 'uninstall', packageName],
    ];

    for (const args of uninstallStrategies) {
      const result = await executeCommand(cmd, args);
      if (result.success) {
        // Wait for system to process the uninstall
        await new Promise(r => setTimeout(r, 800));

        // Verify the package is actually gone
        const stillInstalled = await verifyPackageInstalled(cmd, baseArgs, packageName);
        if (!stillInstalled) {
          return NextResponse.json({
            success: true,
            message: `Successfully uninstalled ${packageName}`,
            method: 'uninstall'
          });
        }
      }
    }

    // Step 2: Try disabling (for system apps that can't be uninstalled)
    const disabled = await disablePackage(cmd, baseArgs, packageName);
    if (disabled) {
      return NextResponse.json({
        success: true,
        message: `App ${packageName} disabled (system app cannot be uninstalled)`,
        method: 'disable'
      });
    }

    // Step 3: Force stop + disable as last resort
    await forceStopPackage(cmd, baseArgs, packageName);
    const disabledAfterForce = await disablePackage(cmd, baseArgs, packageName);
    if (disabledAfterForce) {
      return NextResponse.json({
        success: true,
        message: `App ${packageName} force stopped and disabled`,
        method: 'force-stop + disable'
      });
    }

    return NextResponse.json({
      success: false,
      error: `Failed to remove ${packageName}. The app may be a critical system component.`
    }, { status: 500 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
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
      // adb pm uninstall returns "Success" on success, "Failure" on failure
      const success = output.toLowerCase().includes('success') && !output.toLowerCase().includes('failure');
      resolve({ success, output });
    });

    child.on('error', (err) => resolve({ success: false, output: err.message }));
  });
}

function verifyPackageInstalled(cmd: string, baseArgs: string[], packageName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [...baseArgs, 'shell', 'pm', 'list', 'packages'];
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';

    child.stdout?.on('data', (d) => { stdout += d.toString(); });

    child.on('close', () => {
      // Check if package is in the list
      const lines = stdout.split('\n');
      const stillInstalled = lines.some(line => line.trim() === `package:${packageName}`);
      resolve(stillInstalled);
    });

    child.on('error', () => resolve(true)); // Assume installed on error
  });
}

function disablePackage(cmd: string, baseArgs: string[], packageName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [...baseArgs, 'shell', 'pm', 'disable', '--user', '0', packageName];
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });

    child.on('close', () => {
      const output = (stdout + stderr).trim().toLowerCase();
      // pm disable returns "Success" or "Package already disabled."
      resolve(output.includes('success') || output.includes('already disabled'));
    });

    child.on('error', () => resolve(false));
  });
}

function forceStopPackage(cmd: string, baseArgs: string[], packageName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [...baseArgs, 'shell', 'am', 'force-stop', packageName];
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    child.on('close', () => resolve(true));
    child.on('error', () => resolve(false));
  });
}