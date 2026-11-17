import { ASFAdapter } from './ASFAdapter';

export interface LeakageFinding {
  ruleId: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  filePath: string;
  lineNumber?: number;
  match: string;
  recommendation: string;
  cwe?: string;
  owasp?: string;
}

export class DataLeakageAdapter extends ASFAdapter<string, LeakageFinding[]> {
  name = 'Data Leakage Analyzer';
  version = '1.0.0';
  license = 'LGPL-3.0';
  protected command = 'adb';
  protected args: string[] = [];

  async validate(input: string): Promise<boolean> {
    return typeof input === 'string';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.spawnProcess('adb', ['version']);
      return result.includes('adb version');
    } catch {
      return false;
    }
  }

  protected async runCommand(target: string): Promise<LeakageFinding[]> {
    const findings: LeakageFinding[] = [];

    // If target is an APK path (local file)
    if (target.endsWith('.apk')) {
      try {
        const output = await this.spawnProcess('mobsfscan', [
          '--json',
          '--type', 'android',
          target,
        ]);
        return this.parseMobSFOutput(output);
      } catch {
        // Fallback if mobsfscan not installed
        return [];
      }
    }

    // Otherwise treat as serial or package name: analyze via ADB dumpsys
    let serial = target;
    if (!serial || serial.length === 0) {
      const detectResult = await this.spawnProcess('adb', ['devices']).catch(() => '');
      const match = detectResult.match(/\n(\S+)\s+device/);
      if (match) serial = match[1];
    }
    try {
      const packagesOutput = await this.spawnProcess(
        'adb',
        ['-s', serial, 'shell', 'pm', 'list', 'packages', '-3', '--user', '0']
      );

      const packages: string[] = [];
      for (const line of packagesOutput.split('\n')) {
        const match = line.match(/package:(\S+)/);
        if (match) packages.push(match[1]);
      }

      for (const pkg of packages.slice(0, 10)) { // limit to 10 for performance
        try {
          const dump = await this.spawnProcess(
            'adb',
            ['-s', serial, 'shell', 'dumpsys', 'package', pkg]
          );

          if (dump.includes('保护') || dump.match(/Resolver Table/) && dump.includes('filter')) {
            // Android 14+: exported components show "ClassName filter" in resolver tables
            const resolverMatch = dump.match(/(Activity|Service|Receiver) Resolver Table:/);
            if (resolverMatch) {
              findings.push({
                ruleId: 'ANDROID_EXPORTED_COMPONENT',
                title: `Exported Component without Permission in ${pkg}`,
                description: 'Component is exported and accessible to other applications without permission protection.',
                severity: 'warning',
                filePath: pkg,
                match: 'Resolver Table detected',
                recommendation: 'Ensure exported components are protected by proper permissions.',
                cwe: 'CWE-926',
                owasp: 'M7: Client Code Quality',
              });
            }
          }

          if (dump.includes('android.intent.action.SEND') || dump.includes('ACTION_SEND')) {
            findings.push({
              ruleId: 'ANDROID_INTENT_SNIFFING',
              title: `Potential Intent Sniffing in ${pkg}`,
              description: 'App exports intent filters that can intercept broadcast or data intents.',
              severity: 'info',
              filePath: pkg,
              match: 'ACTION_SEND',
              recommendation: 'Use LocalBroadcastManager or explicit intents where possible.',
              cwe: 'CWE-927',
              owasp: 'M1: Improper Platform Usage',
            });
          }
        } catch {
          // Skip package on error
        }
      }
    } catch {
      // ADB error
    }

    return findings;
  }

  private parseMobSFOutput(output: string): LeakageFinding[] {
    try {
      const data = JSON.parse(output);
      const findings: LeakageFinding[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const result of data.results) {
          if (result.findings && Array.isArray(result.findings)) {
            for (const finding of result.findings) {
              findings.push({
                ruleId: finding.rule_id || 'unknown',
                title: finding.message || 'No title',
                description: finding.description || '',
                severity: finding.severity || 'info',
                filePath: finding.file_path || result.file_path || 'unknown',
                lineNumber: finding.line_number,
                match: finding.match || '',
                recommendation: finding.recommendation || '',
                cwe: finding.cwe,
                owasp: finding.owasp,
              });
            }
          }
        }
      }
      return findings;
    } catch {
      return [];
    }
  }
}