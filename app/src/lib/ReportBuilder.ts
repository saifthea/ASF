// Pure-data report builder (Module 12).
// Safe to import from client components — no Node.js built-ins (no child_process).
import type { DeviceInfo } from '../adapters/DeviceScannerAdapter';
import type { InstalledApp } from '../adapters/AppAnalyzerAdapter';
import type { PermissionEntry } from '../adapters/PermissionAuditAdapter';
import type { ConnectionLog } from '../adapters/NetworkTrafficAdapter';
import type { LeakageFinding } from '../adapters/DataLeakageAdapter';
import type { CameraMicEvent } from '../adapters/CameraMicAdapter';
import type { MalwareResult } from '../adapters/MalwareAdapter';
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
    /** Unique apps that have at least one granted high/critical permission */
    highRiskUniqueApps: number;
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

export class ReportBuilder {
  buildReport(input: ReportGenerationInput): ForensicReport {
    const generatedAt = new Date().toISOString();
    const apps = input.apps ?? [];
    const permissions = input.permissions ?? [];
    const connections = input.connections ?? [];
    const leakage = input.leakageFindings ?? [];
    const camMic = input.cameraMicEvents ?? [];
    const malware = input.malwareResults ?? [];
    const timeline = input.timeline ?? [];

    // Count ONLY granted high/critical permissions (more meaningful)
    const highRiskPermissions = permissions.filter(
      (p) => (p.riskLevel === 'high' || p.riskLevel === 'critical') && p.granted
    ).length;

    // How many UNIQUE apps hold at least one granted high-risk permission
    const highRiskUniqueApps = [
      ...new Set(
        permissions
          .filter((p) => (p.riskLevel === 'high' || p.riskLevel === 'critical') && p.granted)
          .map((p) => p.packageName)
      ),
    ].length;

    const malwareVerdicts = {
      malicious: malware.filter((m) => m.verdict === 'malicious').length,
      suspicious: malware.filter((m) => m.verdict === 'suspicious').length,
      clean: malware.filter((m) => m.verdict === 'clean').length,
      unknown: malware.filter((m) => m.verdict === 'unknown').length,
    };

    // Use unique-apps ratio rather than raw count for scoring
    const overallRiskScore = this.computeRiskScore({
      highRiskPermissions,
      highRiskUniqueApps,
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
        highRiskUniqueApps,
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
        highRiskUniqueApps,
        leakage,
        camMic,
        malware,
      }),
    };
  }

  private computeRiskScore(parts: {
    highRiskPermissions: number;
    highRiskUniqueApps: number;
    leakage: number;
    camMic: number;
    malwareVerdicts: { malicious: number; suspicious: number; clean: number; unknown: number };
  }): number {
    let score = 0;
    // Cap at 25 — use ratio-based weighting (unique apps with high-risk perms / total apps)
    const highRiskRatio = parts.appsAnalyzed > 0 ? parts.highRiskUniqueApps / parts.appsAnalyzed : 0;
    score += Math.min(25, highRiskRatio * 25);
    score += Math.min(25, parts.leakage * 5);
    score += Math.min(15, parts.camMic * 3);
    score += Math.min(20, parts.malwareVerdicts.malicious * 20);
    score += Math.min(10, parts.malwareVerdicts.suspicious * 5);
    return Math.min(100, Math.round(score));
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
    const highPermsNotGrants = ctx.permissions.filter(
      (p) => p.riskLevel === 'high' && !p.granted
    );
    if (highPermsNotGrants.length > 0) {
      const pkgs = [...new Set(highPermsNotGrants.map((p) => p.packageName))];
      findings.push(
        `${highPermsNotGrants.length} high-risk permission(s) declared but NOT granted (${pkgs.length} apps) — likely unnecessary.`
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
    highRiskUniqueApps: number;
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
      recs.push(
        `Audit apps holding ${ctx.highRiskPermissions} granted high/critical permission(s) across ${ctx.highRiskUniqueApps} app(s). Revoke unnecessary grants.`
      );
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
    const s = report.summary;

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
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:0.75rem; margin:1rem 0; }
  .card { background:#1e293b; border:1px solid #334155; border-radius:8px; padding:0.9rem; }
  .card .label { font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; }
  .card .value { font-size:1.4rem; font-weight:700; margin-top:0.25rem; }
  .card .sub { font-size:0.7rem; color:#64748b; margin-top:0.15rem; }
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
  .legend { font-size:0.75rem; color:#64748b; margin-top:-0.5rem; margin-bottom:1rem; }
</style>
</head>
<body>
  <h1>ASF — Android Security Forensics Report</h1>
  <p class="meta">
    Report ID: ${esc(report.reportId)} &middot; Generated: ${esc(report.generatedAt)} &middot; By: ${esc(report.generatedBy)}
  </p>

  <div class="risk-banner" style="background:${riskColor[s.riskLevel]}22; color:${riskColor[s.riskLevel]}; border:1px solid ${riskColor[s.riskLevel]}55;">
    Overall Risk: ${esc(s.riskLevel.toUpperCase())} (score ${s.overallRiskScore}/100)
  </div>

  <h2>Summary</h2>
  <div class="grid">
    <div class="card"><div class="label">Apps Analyzed</div><div class="value">${s.appsAnalyzed}</div></div>
    <div class="card">
      <div class="label">Granted High-Risk Perm.</div>
      <div class="value">${s.highRiskPermissions}</div>
      <div class="sub">across ${s.highRiskUniqueApps} unique app(s)</div>
    </div>
    <div class="card"><div class="label">Leakage Findings</div><div class="value">${s.leakageFindings}</div></div>
    <div class="card"><div class="label">Camera/Mic Events</div><div class="value">${s.cameraMicEvents}</div></div>
    <div class="card"><div class="label">Network Connections</div><div class="value">${s.networkConnections}</div></div>
    <div class="card"><div class="label">Timeline Events</div><div class="value">${s.timelineEvents}</div></div>
    <div class="card"><div class="label">Malicious</div><div class="value">${s.malwareVerdicts.malicious}</div></div>
    <div class="card"><div class="label">Suspicious</div><div class="value">${s.malwareVerdicts.suspicious}</div></div>
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
  <p class="legend">Showing all high/critical risk permission entries (${permRows.split('<tr>').length - 1} total). Only <strong>granted</strong> ones contribute to risk scoring.</p>
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
}
