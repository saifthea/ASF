import { InstalledApp } from '../adapters/AppAnalyzerAdapter';

interface Props {
  apps: InstalledApp[];
  selectedApp?: string | null;
  onAppSelect?: (packageName: string) => void;
}

export default function AppList({ apps, selectedApp, onAppSelect }: Props) {
  if (!apps || apps.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No apps available.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-96">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-800">
          <tr className="border-b border-gray-700">
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Package Name</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Version</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">System</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => (
            <tr
              key={app.packageName}
              onClick={() => onAppSelect?.(app.packageName)}
              className={`border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/30 ${
                selectedApp === app.packageName ? 'bg-blue-900/30' : ''
              }`}
            >
              <td className="py-2 px-3 text-white">{app.packageName}</td>
              <td className="py-2 px-3 text-gray-300">{app.versionName}</td>
              <td className="py-2 px-3">
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    app.isSystem
                      ? 'bg-purple-900/40 text-purple-300'
                      : 'bg-green-900/40 text-green-300'
                  }`}
                >
                  {app.isSystem ? 'System' : 'User'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}