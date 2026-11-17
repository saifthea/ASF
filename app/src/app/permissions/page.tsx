'use client';

import { useState } from 'react';
import { useASFStore } from '../../store/asfStore';
import { useSettingsStore } from '../../store/settingsStore';
import PermissionMatrix from '../../components/PermissionMatrix';

export default function PermissionAudit() {
  const { device, apps, permissions, setPermissions, serial, isScanning, setIsScanning, setScanProgress, setScanError, scanError } = useASFStore();
  const { adbPath } = useSettingsStore();
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRisk, setFilterRisk] = useState<string>('');

  const handleScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanError(null);

    try {
      setScanProgress(30);

      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adbPath, serial }),
      });
      setScanProgress(80);

      const result = await response.json();
      setScanProgress(100);

      if (result.success && result.data) {
        setPermissions(result.data);
      } else {
        setScanError(result.error || 'Permission audit failed');
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsScanning(false);
    }
  };

  const filteredPermissions = permissions?.filter((p) => {
    if (selectedApp && p.packageName !== selectedApp) return false;
    if (filterStatus === 'granted' && !p.granted) return false;
    if (filterStatus === 'not-granted' && p.granted) return false;
    if (filterRisk && p.riskLevel !== filterRisk) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Permission Audit</h1>
        <p className="text-gray-400">Audit dangerous permissions and app-ops history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-gray-800 border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Audit Control</h3>
            <button
              onClick={handleScan}
              disabled={isScanning}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isScanning
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isScanning ? 'Auditing...' : 'Audit Permissions'}
            </button>

            {isScanning && (
              <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${useASFStore.getState().scanProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {scanError && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{scanError}</p>
              </div>
            )}

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Filter by App
              </label>
              <select
                value={selectedApp}
                onChange={(e) => setSelectedApp(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Apps</option>
                {apps?.map(app => (
                  <option key={app.packageName} value={app.packageName}>
                    {app.packageName}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="granted">Granted</option>
                <option value="not-granted">Not Granted</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Filter by Risk Level
              </label>
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-lg border bg-gray-800 border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
              Permission Matrix
            </h3>

            {filteredPermissions && filteredPermissions.length > 0 ? (
              <PermissionMatrix permissions={filteredPermissions} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No permissions audited yet. Click "Audit Permissions" to begin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}