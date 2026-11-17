import { spawn, ChildProcess } from 'child_process';
import { IASFAdapter, ASFAdapterResult } from '../types/adapter';

export abstract class ASFAdapter<TInput, TOutput> implements IASFAdapter<TInput, TOutput> {
  abstract name: string;
  abstract version: string;
  abstract license: string;
  protected abstract command: string;
  protected abstract args: string[];

  private static adbPathCache: string = 'adb';

  static setAdbPath(path: string): void {
    ASFAdapter.adbPathCache = path || 'adb';
  }

  static getAdbPath(): string {
    return ASFAdapter.adbPathCache;
  }

  async validate(input: TInput): Promise<boolean> {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async execute(input: TInput): Promise<ASFAdapterResult<TOutput>> {
    const startTime = Date.now();
    try {
      if (!(await this.validate(input))) {
        return { success: false, error: 'Input validation failed' };
      }

      const output = await this.runCommand(input);
      const duration = Date.now() - startTime;

      return {
        success: true,
        data: output,
        metadata: {
          duration,
          toolVersion: this.version,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: Date.now() - startTime,
          toolVersion: this.version,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  protected abstract runCommand(input: TInput): Promise<TOutput>;

  protected spawnProcess(cmd: string, args: string[], input?: string): Promise<string> {
    // Resolve 'adb' to the configured ADB binary path
    if (cmd === 'adb') {
      cmd = ASFAdapter.adbPathCache;
    }

    return new Promise((resolve, reject) => {
      const child: ChildProcess = spawn(cmd, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        }
      });

      child.on('error', reject);

      if (input) {
        child.stdin?.write(input);
        child.stdin?.end();
      }
    });
  }
}