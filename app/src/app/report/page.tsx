'use client';

import { useState } from 'react';
import { useASFStore } from '../../store/asfStore';
import { ReportBuilder, type TimelineEvent, type ForensicReport } from '../../lib/ReportBuilder';
import type { ASFAdapterResult } from '../../types/adapter';

export default function ForensicReport() {
  const {
    device,
    apps,
    permissions,
    connections,
    leakageFindings,
    camMicEvents,
    malwareResults,
    timelineEvents,
    setTimelineEvents,
    forensicReport,
    setForensicReport,
    isScanning,
    setIsScanning,
    scanProgress,
    setScanProgress,
    scanError,
    setScanError,
  } = useASFStore();

  const [serial, setSerial] = useState('');

  const handleGenerate = async () => {
    if (!device) {
      setScanError('No device connected. Please scan a device first.');
      return;
    }
    if (!serial.trim()) {
      setScanError('ADB serial number is required.');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanError(null);

    try {
      // Step 1: Call server-side API to run the timeline adapter
      setScanProgress(20);
      const execResponse = await fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial: serial.trim(),
          includeLogcat: true,
          logcatLines: 1000,
          includeAppInstallDates: true,
          apps,
        }),
      });

      if (!execResponse.ok) {
        const errBody = await execResponse.json().catch(() => null);
        throw new Error(errBody?.error || `Server error ${execResponse.status}`);
      }

      const result: ASFAdapterResult<TimelineEvent[]> = await execResponse.json();
      setScanProgress(80);

      if (result.success && result.data) {
        setTimelineEvents(result.data);

        // Step 2: Build report client-side (pure data aggregation, no child_process needed)
        const builder = new ReportBuilder();
        const report = builder.buildReport({
          device,
          apps,
          permissions,
          connections,
          leakageFindings,
          cameraMicEvents: camMicEvents,
          malwareResults,
          timeline: result.data,
        });
        setForensicReport(report);
      } else {
        setScanError(result.error || 'Timeline generation failed');
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsScanning(false);
    }
  };

  const downloadJSON = () => {
    if (!forensicReport) return;
    const blob = new Blob([JSON.stringify(forensicReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${forensicReport.reportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadHTML = () => {
    if (!forensicReport) return;
    const builder = new ReportBuilder();
    const html = builder.exportHTML(forensicReport);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${forensicReport.reportId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const riskColor = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  };

  const sevColor: Record<string, string> = {
    info: 'text-gray-400',
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Forensic Timeline & Report</h1>
        <p className="text-gray-400">Aggregate events into a unified timeline and generate a comprehensive investigation report.</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-gray-800 border-gray-700 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Report Control</h3>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                ADB Serial
              </label>
              <input
                type="text"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Enter adb device serial..."
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isScanning || !device || !serial}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isScanning || !device || !serial
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isScanning ? 'Generating...' : 'Generate Report'}
            </button>

            {isScanning && (
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {scanError && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{scanError}</p>
              </div>
            )}

            {forensicReport && (
              <div className="space-y-2 pt-4 border-t border-gray-700">
                <p className="text-sm font-medium text-gray-300">Export</p>
                <button
                  onClick={downloadHTML}
                  className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
                >
                  Download HTML
                </button>
                <button
                  onClick={downloadJSON}
                  className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
                >
                  Download JSON
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {!forensicReport ? (
            <div className="rounded-lg border bg-gray-800 border-gray-700 p-12 text-center">
              <p className="text-gray-500 mb-2">No report generated yet.</p>
              <p className="text-sm text-gray-600">
                Enter the ADB serial and click "Generate Report" to begin.
              </p>
            </div>
          ) : (
            <>
              {/* Summary card */}
              <div className="rounded-lg border bg-gray-800 border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Report Summary</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    forensicReport.summary.riskLevel === 'critical' ? 'bg-red-900/50 text-red-400' :
                    forensicReport.summary.riskLevel === 'high' ? 'bg-orange-900/50 text-orange-400' :
                    forensicReport.summary.riskLevel === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                    'bg-green-900/50 text-green-400'
                  }`}>
                    {forensicReport.summary.riskLevel.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Risk Score</p>
                    <p className={`text-2xl font-bold ${riskColor[forensicReport.summary.riskLevel]}`}>
                      {forensicReport.summary.overallRiskScore}/100
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Apps Analyzed</p>
                    <p className="text-2xl font-bold text-white">{forensicReport.summary.appsAnalyzed}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Timeline Events</p>
                    <p className="text-2xl font-bold text-white">{forensicReport.summary.timelineEvents}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Malicious Apps</p>
                    <p className="text-2xl font-bold text-red-400">{forensicReport.summary.malwareVerdicts.malicious}</p>
                  </div>
                </div>

                {/* Findings */}
                {forensicReport.findings.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-semibold text-white mb-3">Key Findings</h3>
                    <ul className="space-y-2">
                      {forensicReport.findings.map((finding, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-blue-400 mt-0.5">•</span>
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {forensicReport.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-md font-semibold text-white mb-3">Recommendations</h3>
                    <ul className="space-y-2">
                      {forensicReport.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-green-400 mt-0.5">✓</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="rounded-lg border bg-gray-800 border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Forensic Timeline ({timelineEvents.length} events)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Timestamp</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Source</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Event Type</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Severity</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timelineEvents.slice(-50).reverse().map((event, idx) => (
                        <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-2 px-3 text-gray-400 font-mono text-xs">
                            {new Date(event.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                              {event.source}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-white">{event.eventType}</td>
                          <td className={`py-2 px-3 font-medium ${sevColor[event.severity]}`}>
                            {event.severity}
                          </td>
                          <td className="py-2 px-3 text-gray-400 max-w-xs truncate">
                            {event.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {timelineEvents.length > 50 && (
                  <p className="text-sm text-gray-500 mt-3">
                    Showing last 50 of {timelineEvents.length} events
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
