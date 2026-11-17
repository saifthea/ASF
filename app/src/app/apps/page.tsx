'use client';

import { useState } from 'react';
import { useASFStore } from '../../store/asfStore';
import { useSettingsStore } from '../../store/settingsStore';
import AppList from '../../components/AppList';

export default function AppAnalyzer() {
  const { device, apps, setApps, serial, isScanning, setIsScanning, setScanProgress, setScanError, scanError } = useASFStore();
  const { adbPath } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleScan = async () => {
    if (!device) {
      setScanError('No device connected. Please scan a device first.');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanError(null);

    try {
      setScanProgress(30);

      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adbPath, serial }),
      });
      const result = await response.json();
      setScanProgress(100);

      if (result.success && result.data) {
        setApps(result.data);
      } else {
        setScanError(result.error || 'App scan failed');
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsScanning(false);
    }
  };

  const filteredApps = apps?.filter(app =>
    app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Application Analyzer</h1>
        <p className="text-gray-400">Analyze installed apps on the device</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-gray-800 border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Scan Control</h3>
            <button
              onClick={handleScan}
              disabled={isScanning || !device}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isScanning || !device
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isScanning ? 'Scanning...' : 'Scan Apps'}
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
              <h4 className="text-sm font-medium text-gray-400 mb-2">Device</h4>
              <div className="text-sm text-white">
                {device ? (
                  <div>
                    <p>{device.model}</p>
                    <p className="text-gray-400">Android {device.androidVersion}</p>
                  </div>
                ) : (
                  <span className="text-yellow-400">No device</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-lg border bg-gray-800 border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Installed Apps ({filteredApps.length})
              </h3>
              <input
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {apps && apps.length > 0 ? (
              <AppList apps={filteredApps} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No apps scanned yet. Click "Scan Apps" to begin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}