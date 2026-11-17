import { ASFAdapter } from './ASFAdapter';
import { DeviceInfo } from './DeviceScannerAdapter';
import { InstalledApp } from './AppAnalyzerAdapter';
import { PermissionEntry } from './PermissionAuditAdapter';
import { ConnectionLog } from './NetworkTrafficAdapter';
import { LeakageFinding } from './DataLeakageAdapter';
import { CameraMicEvent } from './CameraMicAdapter';
import { MalwareResult } from './MalwareAdapter';

// Unified timeline schema (Module 11 blueprint: `events` table)
export type EventSource = 'aleapp' | 'mvt' | 'pcapdroid' | 'logcat' | 'system' | 'app';
export type TimelineSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface TimelineEvent {
  timestamp: string; // ISO 8601
  source: EventSource;
  appId: string | null;
  eventType: string;
  severity: TimelineSeverity;
  details: string;
}

export interface TimelineInput {
  serial: string;
  logcatLines?: number;
  includeLogcat?: boolean;
  includeAppInstallDates?: boolean;
  apps?: InstalledApp[];
}

// ---------------------------------------------------------------------------
// Module 12: Forensic Reporting
// ---------------------------------------------------------------------------

export interface ReportSectionSummary {
  total: number;
  high: number;
  critical: number;
}

export interface ForensicReport {
  reportId: string;
  generatedAt: string;
  generatedBy: string;
  device: DeviceInfo | null;
  summary: {
    overallRiskScore: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    appsAnalyzed: number;
    highRiskPermissions: number;
    leakageFindings: number;
    cameraMicEvents: number;
    malwareVerdicts: { malicious: number; suspicious: number; clean: number; unknown: number };
    networkConnections: number;
    timelineEvents: number;
  };
  deviceInfo: DeviceInfo | null;
  apps: InstalledApp[];
  permissions: PermissionEntry[];
  connections: ConnectionLog[];
  leakageFindings: LeakageFinding[];
  cameraMicEvents: CameraMicEvent[];
  malwareResults: MalwareResult[];
  timeline: TimelineEvent[];
  findings: string[];
  recommendations: string[];
}

export interface ReportGenerationInput {
  device?: DeviceInfo | null;
  apps?: InstalledApp[];
  permissions?: PermissionEntry[];
  connections?: ConnectionLog[];
  leakageFindings?: LeakageFinding[];
  cameraMicEvents?: CameraMicEvent[];
  malwareResults?: MalwareResult[];
  timeline?: TimelineEvent[];
  generatedBy?: string;
}

const SEVERITY_RANK: Record<TimelineSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export class TimelineAdapter extends ASFAdapter<TimelineInput, TimelineEvent[]> {
  name = 'Forensic Timeline';
  version = '1.0.0';
  license = 'MIT';
  protected command = 'adb';
  protected args: string[] = [];

  async validate(input: TimelineInput): Promise<boolean> {
    return typeof input?.serial === 'string' && input.serial.length > 0;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.spawnProcess('adb', ['version']);
      return result.includes('adb version');
    } catch {
      return false;
    }
  }

  protected async runCommand(input: TimelineInput): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];
    const now = new Date().toISOString();

    // 1. System boot event (from boot time property)
    try {
      const bootTime = await this.spawnProcess(
        'adb', ['-s', input.serial, 'shell', 'getprop', 'sys.boot_time']
      ).catch(() => null);
      if (bootTime) {
        const ts = bootTime.trim();
        if (ts && ts !== '1262278102') {
          events.push({
            timestamp: new Date(Number(ts) * 1000).toISOString(),
            source: 'system',
            appId: null,
            eventType: 'device_boot',
            severity: 'info',
            details: `Device boot (sys.boot_time=${ts})`,
          });
        }
      }
    } catch {
      // boot time unavailable — skip
    }

    // 2. ADB logcat (system events: crashes, activity manager, permission grants)
    if (input.includeLogcat !== false) {
      try {
        const lines = input.logcatLines ?? 500;
        const logcat = await this.spawnProcess(
          'adb', ['-s', input.serial, 'shell', 'logcat', '-d', '-t', String(lines)]
        );
        events.push(...this.parseLogcat(logcat, now));
      } catch {
        // logcat unavailable — skip
      }
    }

    // 3. App install timestamps (from AppAnalyzer data if provided)
    if (input.includeAppInstallDates !== false && input.apps) {
      for (const app of input.apps) {
        if (app.installDate) {
          events.push({
            timestamp: this.normalizeTimestamp(app.installDate, now),
            source: 'app',
            appId: app.packageName,
            eventType: 'app_installed',
            severity: 'info',
            details: `Installed ${app.packageName} v${app.versionName} (versionCode ${app.versionCode})`,
          });
        }
        if (app.lastUpdate && app.lastUpdate !== app.installDate) {
          events.push({
            timestamp: this.normalizeTimestamp(app.lastUpdate, now),
            source: 'app',
            appId: app.packageName,
            eventType: 'app_updated',
            severity: 'info',
            details: `Updated ${app.packageName} to v${app.versionName}`,
          });
        }
      }
    }

    // 4. Scan start marker
    events.push({
      timestamp: now,
      source: 'system',
      appId: null,
      eventType: 'scan_started',
      severity: 'info',
      details: 'ASF forensic timeline aggregation started',
    });

    return this.sortEvents(events);
  }

  // ---------------------------------------------------------------------
  // Logcat parsing
  // ---------------------------------------------------------------------

  private parseLogcat(raw: string, fallback: string): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const lines = raw.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      // Typical logcat format: "MM-DD HH:MM:SS.mmm PID TID LEVEL TAG: message"
      const match = line.match(
        /^(\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\.(\d{3})\s+(\d+)\s+(\d+)\s+([VDWIPE])\s+([\w./-]+):\s?(.*)$/
      );

      let timestamp = fallback;
      let level = 'I';
      let tag = '';
      let message = line.trim();

      if (match) {
        const [, monthDay, time, ms, , , lvl, tagVal, msg] = match;
        const year = new Date().getFullYear();
        const [month, day] = monthDay.split('-');
        const [h, m, s] = time.split(':').map(Number);
        const date = new Date(year, Number(month) - 1, Number(day), h, m, s, Number(ms));
        if (!isNaN(date.getTime())) timestamp = date.toISOString();

        level = lvl;
        tag = tagVal;
        message = msg;
      }

      const parsed = this.classifyLogEntry(level, tag, message);
      if (parsed) {
        events.push({
          timestamp,
          source: 'logcat',
          appId: parsed.appId,
          eventType: parsed.eventType,
          severity: parsed.severity,
          details: `[${tag}] ${message.slice(0, 300)}`,
        });
      }
    }

    return events;
  }

  // Classify logcat lines into relevant forensic event types
  private classifyLogEntry(
    level: string,
    tag: string,
    message: string
  ): { appId: string | null; eventType: string; severity: TimelineSeverity } | null {
    const pkgMatch = message.match(/(\S+\.\S+\.\S+)/);
    const appId = pkgMatch ? pkgMatch[1] : null;

    if (level === 'E') {
      return { appId, eventType: 'system_error', severity: 'high', };
    }
    if (message.includes('FATAL EXCEPTION')) {
      return { appId, eventType: 'app_crash', severity: 'critical' };
    }
    if (tag.includes('ActivityManager') && (message.includes('start-activity') || message.includes('Displayed'))) {
      return { appId, eventType: 'activity_start', severity: 'info' };
    }
    if (message.includes('Package Manager') && message.includes('added new package')) {
      return { appId, eventType: 'package_installed', severity: 'medium' };
    }
    if (message.includes('permission') && message.includes('granted')) {
      return { appId, eventType: 'permission_granted', severity: 'medium' };
    }
    if (level === 'W' && tag === 'InputDispatcher') {
      return { appId: null, eventType: 'input_anomaly', severity: 'low' };
    }
    if (level === 'D' || level === 'V') {
      return null; // too noisy for timeline
    }
    return { appId, eventType: 'system_log', severity: 'info' };
  }

  // ---------------------------------------------------------------------
  // Report generation (Module 12)
  // ---------------------------------------------------------------------

  buildReport(input: ReportGenerationInput): ForensicReport {
    const generatedAt = new Date().toISOString();
    const apps = input.apps ?? [];
    const permissions = input.permissions ?? [];
    const connections = input.connections ?? [];
    const leakage = input.leakageFindings ?? [];
    const camMic = input.cameraMicEvents ?? [];
    const malware = input.malwareResults ?? [];
    const timeline = input.timeline ?? [];

    const highRiskPermissions = permissions.filter(
      (p) => p.riskLevel === 'high' || p.riskLevel === 'critical'
    ).length;

    const malwareVerdicts = {
      malicious: malware.filter((m) => m.verdict === 'malicious').length,
      suspicious: malware.filter((m) => m.verdict === 'suspicious').length,
      clean: malware.filter((m) => m.verdict === 'clean').length,
      unknown: malware.filter((m) => m.verdict === 'unknown').length,
    };

    const overallRiskScore = this.computeRiskScore({
      highRiskPermissions,
      leakage: leakage.length,
      camMic: camMic.length,
      malwareVerdicts,
    });

    return {
      reportId: `ASF-${generatedAt.replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}`,
      generatedAt,
      generatedBy: input.generatedBy ?? 'ASF Platform',
      device: input.device ?? null,
      summary: {
        overallRiskScore,
        riskLevel: this.scoreToRisk(overallRiskScore),
        appsAnalyzed: apps.length,
        highRiskPermissions,
        leakageFindings: leakage.length,
        cameraMicEvents: camMic.length,
        malwareVerdicts,
        networkConnections: connections.length,
        timelineEvents: timeline.length,
      },
      deviceInfo: input.device ?? null,
      apps,
      permissions,
      connections,
      leakageFindings: leakage,
      cameraMicEvents: camMic,
      malwareResults: malware,
      timeline,
      findings: this.buildFindings({
        device: input.device ?? null,
        apps,
        permissions,
        connections,
        leakage,
        camMic,
        malware,
        timeline,
      }),
      recommendations: this.buildRecommendations({
        highRiskPermissions,
        leakage,
        camMic,
        malware,
      }),
    };
  }

  private computeRiskScore(parts: {
    highRiskPermissions: number;
    leakage: number;
    camMic: number;
    malwareVerdicts: { malicious: number; suspicious: number; clean: number; unknown: number };
  }): number {
    let score = 0;
    score += Math.min(30, parts.highRiskPermissions * 2);
    score += Math.min(25, parts.leakage * 5);
    score += Math.min(15, parts.camMic * 3);
    score += Math.min(20, parts.malwareVerdicts.malicious * 20);
    score += Math.min(10, parts.malwareVerdicts.suspicious * 5);
    return Math.min(100, score);
  }

  private scoreToRisk(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  private buildFindings(ctx: {
    device: DeviceInfo | null;
    apps: InstalledApp[];
    permissions: PermissionEntry[];
    connections: ConnectionLog[];
    leakage: LeakageFinding[];
    camMic: CameraMicEvent[];
    malware: MalwareResult[];
    timeline: TimelineEvent[];
  }): string[] {
    const findings: string[] = [];

    if (ctx.device?.rootStatus) {
      findings.push('Target device is ROOTED — evidence integrity may be compromised.');
    }
    const criticalPerms = ctx.permissions.filter((p) => p.riskLevel === 'critical' && p.granted);
    if (criticalPerms.length > 0) {
      const pkgs = [...new Set(criticalPerms.map((p) => p.packageName))];
      findings.push(
        `${criticalPerms.length} critical permission(s) granted to ${pkgs.length} app(s): ${pkgs.join(', ')}`
      );
    }
    const malicious = ctx.malware.filter((m) => m.verdict === 'malicious');
    for (const m of malicious) {
      findings.push(`Malware verdict: ${m.packageName} — ${m.summary}`);
    }
    const suspicious = ctx.malware.filter((m) => m.verdict === 'suspicious');
    for (const m of suspicious) {
      findings.push(`Suspicious behavior: ${m.packageName} (confidence ${m.confidence}%)`);
    }
    const criticalLeaks = ctx.leakage.filter((l) => l.severity === 'critical' || l.severity === 'error');
    if (criticalLeaks.length > 0) {
      findings.push(`${criticalLeaks.length} critical leakage finding(s) from static analysis.`);
    }
    const camEvents = ctx.camMic.filter((e) => e.status === 'granted');
    if (camEvents.length > 0) {
      findings.push(`${camEvents.length} camera/microphone access event(s) recorded via AppOps.`);
    }
    const crashes = ctx.timeline.filter((e) => e.eventType === 'app_crash');
    if (crashes.length > 0) {
      findings.push(`${crashes.length} app crash(es) observed in logcat timeline.`);
    }
    if (findings.length === 0) {
      findings.push('No significant security findings detected across analyzed artifacts.');
    }
    return findings;
  }

  private buildRecommendations(ctx: {
    highRiskPermissions: number;
    leakage: LeakageFinding[];
    camMic: CameraMicEvent[];
    malware: MalwareResult[];
  }): string[] {
    const recs: string[] = [];

    if (ctx.malware.some((m) => m.verdict === 'malicious')) {
      recs.push('Remove or quarantine apps flagged as malicious and verify device integrity after removal.');
    }
    if (ctx.malware.some((m) => m.verdict === 'suspicious')) {
      recs.push('Review apps with suspicious verdicts; capture fresh artifacts if behavior recurs.');
    }
    if (ctx.highRiskPermissions > 0) {
      recs.push('Audit apps holding high/critical permissions and revoke unnecessary grants.');
    }
    if (ctx.leakage.length > 0) {
      recs.push('Address leakage findings: enforce TLS, remove hardcoded credentials, review cleartext traffic settings.');
    }
    if (ctx.camMic.some((e) => e.status === 'granted')) {
      recs.push('Correlate camera/microphone access events with active sessions to confirm authorized usage.');
    }
    recs.push('Preserve this report and underlying artifacts as evidence; maintain chain of custody.');
    return recs;
  }

  // ---------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------

  exportJSON(report: ForensicReport): string {
    return JSON.stringify(report, null, 2);
  }

  exportHTML(report: ForensicReport): string {
    const esc = (s: unknown) =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const riskColor = { low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' };

    const timelineRows = report.timeline
      .map(
        (e) => `<tr>
          <td>${esc(e.timestamp)}</td>
          <td><span class="badge">${esc(e.source)}</span></td>
          <td>${esc(e.appId ?? '—')}</td>
          <td>${esc(e.eventType)}</td>
          <td><span class="sev sev-${esc(e.severity)}">${esc(e.severity)}</span></td>
          <td>${esc(e.details)}</td>
        </tr>`
      )
      .join('');

    const malwareRows = report.malwareResults
      .map(
        (m) => `<tr>
          <td>${esc(m.packageName)}</td>
          <td><span class="sev sev-${m.verdict === 'malicious' ? 'critical' : m.verdict === 'suspicious' ? 'high' : 'low'}">${esc(m.verdict)}</span></td>
          <td>${esc(m.confidence)}%</td>
          <td>${esc(m.summary)}</td>
        </tr>`
      )
      .join('');

    const permRows = report.permissions
      .filter((p) => p.riskLevel === 'high' || p.riskLevel === 'critical')
      .map(
        (p) => `<tr>
          <td>${esc(p.packageName)}</td>
          <td>${esc(p.permission)}</td>
          <td>${p.granted ? 'yes' : 'no'}</td>
          <td><span class="sev sev-${esc(p.riskLevel)}">${esc(p.riskLevel)}</span></td>
        </tr>`
      )
      .join('');

    const leakRows = report.leakageFindings
      .map(
        (l) => `<tr>
          <td>${esc(l.ruleId)}</td>
          <td>${esc(l.title)}</td>
          <td>${esc(l.filePath)}${l.lineNumber ? `:${l.lineNumber}` : ''}</td>
          <td><span class="sev sev-${esc(l.severity)}">${esc(l.severity)}</span></td>
          <td>${esc(l.recommendation)}</td>
        </tr>`
      )
      .join('');

    const findingsList = report.findings.map((f) => `<li>${esc(f)}</li>`).join('');
    const recsList = report.recommendations.map((r) => `<li>${esc(r)}</li>`).join('');

    const d = report.deviceInfo;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ASF Forensic Report ${esc(report.reportId)}</title>
<style>
  :root { color-scheme: dark; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background:#0f172a; color:#e2e8f0; margin:0; padding:2rem; }
  h1 { font-size:1.6rem; margin-bottom:0.25rem; }
  h2 { font-size:1.15rem; margin:2rem 0 0.75rem; border-bottom:1px solid #334155; padding-bottom:0.4rem; }
  .meta { color:#94a3b8; font-size:0.85rem; margin-bottom:1.5rem; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:0.75rem; margin:1rem 0; }
  .card { background:#1e293b; border:1px solid #334155; border-radius:8px; padding:0.9rem; }
  .card .label { font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; }
  .card .value { font-size:1.4rem; font-weight:700; margin-top:0.25rem; }
  table { width:100%; border-collapse:collapse; font-size:0.85rem; margin:0.5rem 0 1rem; }
  th, td { text-align:left; padding:0.5rem 0.6rem; border-bottom:1px solid #1e293b; vertical-align:top; }
  th { color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:0.72rem; letter-spacing:0.05em; }
  .badge { background:#1e293b; border:1px solid #475569; border-radius:4px; padding:0.1rem 0.45rem; font-size:0.75rem; }
  .sev { font-weight:600; font-size:0.75rem; padding:0.1rem 0.45rem; border-radius:4px; }
  .sev-info, .sev-low { background:rgba(34,197,94,.15); color:#4ade80; }
  .sev-medium { background:rgba(234,179,8,.15); color:#facc15; }
  .sev-high, .sev-warning { background:rgba(249,115,22,.15); color:#fb923c; }
  .sev-critical, .sev-error, .sev-malicious { background:rgba(239,68,68,.15); color:#f87171; }
  .sev-suspicious { background:rgba(249,115,22,.15); color:#fb923c; }
  .sev-clean, .sev-unknown { background:rgba(148,163,184,.15); color:#94a3b8; }
  ul { padding-left:1.2rem; line-height:1.7; }
  .risk-banner { padding:1rem 1.25rem; border-radius:8px; font-weight:600; margin-bottom:1rem; }
</style>
</head>
<body>
  <h1>ASF — Android Security Forensics Report</h1>
  <p class="meta">
    Report ID: ${esc(report.reportId)} &middot; Generated: ${esc(report.generatedAt)} &middot; By: ${esc(report.generatedBy)}
  </p>

  <div class="risk-banner" style="background:${riskColor[report.summary.riskLevel]}22; color:${riskColor[report.summary.riskLevel]}; border:1px solid ${riskColor[report.summary.riskLevel]}55;">
    Overall Risk: ${esc(report.summary.riskLevel.toUpperCase())} (score ${report.summary.overallRiskScore}/100)
  </div>

  <h2>Summary</h2>
  <div class="grid">
    <div class="card"><div class="label">Apps Analyzed</div><div class="value">${report.summary.appsAnalyzed}</div></div>
    <div class="card"><div class="label">High-Risk Permissions</div><div class="value">${report.summary.highRiskPermissions}</div></div>
    <div class="card"><div class="label">Leakage Findings</div><div class="value">${report.summary.leakageFindings}</div></div>
    <div class="card"><div class="label">Camera/Mic Events</div><div class="value">${report.summary.cameraMicEvents}</div></div>
    <div class="card"><div class="label">Network Connections</div><div class="value">${report.summary.networkConnections}</div></div>
    <div class="card"><div class="label">Timeline Events</div><div class="value">${report.summary.timelineEvents}</div></div>
    <div class="card"><div class="label">Malicious</div><div class="value">${report.summary.malwareVerdicts.malicious}</div></div>
    <div class="card"><div class="label">Suspicious</div><div class="value">${report.summary.malwareVerdicts.suspicious}</div></div>
  </div>

  <h2>Device Information</h2>
  ${
    d
      ? `<div class="grid">
        <div class="card"><div class="label">Model</div><div class="value" style="font-size:1rem">${esc(d.model)}</div></div>
        <div class="card"><div class="label">Manufacturer</div><div class="value" style="font-size:1rem">${esc(d.manufacturer)}</div></div>
        <div class="card"><div class="label">Android Version</div><div class="value" style="font-size:1rem">Android ${esc(d.androidVersion)} (API ${esc(d.sdkVersion)})</div></div>
        <div class="card"><div class="label">Build</div><div class="value" style="font-size:1rem">${esc(d.buildNumber)}</div></div>
        <div class="card"><div class="label">Bootloader</div><div class="value" style="font-size:1rem">${esc(d.bootloader)}</div></div>
        <div class="card"><div class="label">Root Status</div><div class="value" style="font-size:1rem">${d.rootStatus ? 'ROOTED' : 'Not rooted'}</div></div>
        <div class="card"><div class="label">CPU</div><div class="value" style="font-size:1rem">${esc(d.cpuArch)}</div></div>
        <div class="card"><div class="label">Resolution</div><div class="value" style="font-size:1rem">${esc(d.screenResolution)}</div></div>
      </div>`
      : '<p>No device information available.</p>'
  }

  <h2>Key Findings</h2>
  <ul>${findingsList}</ul>

  <h2>Recommendations</h2>
  <ul>${recsList}</ul>

  <h2>Forensic Timeline</h2>
  <table>
    <thead><tr><th>Timestamp</th><th>Source</th><th>App ID</th><th>Event Type</th><th>Severity</th><th>Details</th></tr></thead>
    <tbody>${timelineRows || '<tr><td colspan="6">No timeline events.</td></tr>'}</tbody>
  </table>

  <h2>Malware Verdicts</h2>
  <table>
    <thead><tr><th>Package</th><th>Verdict</th><th>Confidence</th><th>Summary</th></tr></thead>
    <tbody>${malwareRows || '<tr><td colspan="4">No malware analysis performed.</td></tr>'}</tbody>
  </table>

  <h2>High-Risk Permissions</h2>
  <table>
    <thead><tr><th>Package</th><th>Permission</th><th>Granted</th><th>Risk</th></tr></thead>
    <tbody>${permRows || '<tr><td colspan="4">No high/critical risk permissions found.</td></tr>'}</tbody>
  </table>

  <h2>Data Leakage Findings</h2>
  <table>
    <thead><tr><th>Rule</th><th>Title</th><th>Location</th><th>Severity</th><th>Recommendation</th></tr></thead>
    <tbody>${leakRows || '<tr><td colspan="5">No leakage findings.</td></tr>'}</tbody>
  </table>

  <footer style="margin-top:2rem; color:#64748b; font-size:0.75rem;">
    Generated by ASF (Android Security Forensics) &middot; ${esc(report.generatedBy)} &middot; ${esc(report.generatedAt)}
  </footer>
</body>
</html>`;
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  private sortEvents(events: TimelineEvent[]): TimelineEvent[] {
    return [...events].sort((a, b) => {
      const ta = Date.parse(a.timestamp) || 0;
      const tb = Date.parse(b.timestamp) || 0;
      if (ta !== tb) return ta - tb;
      return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    });
  }

  private normalizeTimestamp(ts: string, fallback: string): string {
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? fallback : new Date(parsed).toISOString();
  }
}
