import { LeakageFinding } from '../adapters/DataLeakageAdapter';

interface Props {
  findings: LeakageFinding[];
  filter?: 'info' | 'warning' | 'error' | 'critical';
}

export default function LeakageFindings({ findings, filter }: Props) {
  if (!findings || findings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No findings to display.</p>
      </div>
    );
  }

  const filtered = filter
    ? findings.filter((f) => f.severity === filter)
    : findings;

  const severityColors: Record<string, string> = {
    critical: 'bg-red-900/50 text-red-300 border-red-700',
    error: 'bg-orange-900/50 text-orange-300 border-orange-700',
    warning: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
    info: 'bg-blue-900/50 text-blue-300 border-blue-700',
  };

  return (
    <div className="space-y-3">
      {filtered.map((finding, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-gray-700 p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-xs border ${
                  severityColors[finding.severity] || severityColors.info
                }`}
              >
                {finding.severity}
              </span>
              <span className="text-xs text-gray-500">{finding.ruleId}</span>
            </div>
            {finding.lineNumber && (
              <span className="text-xs text-gray-500">Line {finding.lineNumber}</span>
            )}
          </div>
          <h4 className="font-semibold text-white mb-1">{finding.title}</h4>
          <p className="text-sm text-gray-400 mb-2">{finding.description}</p>
          <div className="text-xs text-gray-500 font-mono mb-2">
            {finding.filePath}
          </div>
          {finding.recommendation && (
            <div className="mt-2 p-2 bg-gray-900/50 rounded text-xs">
              <span className="text-gray-400">Recommendation: </span>
              <span className="text-gray-300">{finding.recommendation}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}