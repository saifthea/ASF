'use client';

import { useState } from 'react';
import { useASFStore } from '../../store/asfStore';
import { useSettingsStore } from '../../store/settingsStore';
import TrafficGraph from '../../components/TrafficGraph';

export default function NetworkTraffic() {
  const { device, connections, setConnections, serial, isScanning, setIsScanning, setScanProgress, setScanError, scanError } = useASFStore();
  const { adbPath } = useSettingsStore();
  const [duration, setDuration] = useState(60);

  const handleStartCapture = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanError(null);

    try {
      setScanProgress(30);

      const response = await fetch('/api/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adbPath, serial }),
      });
      setScanProgress(80);

      const result = await response.json();
      setScanProgress(100);

      if (result.success && result.data) {
        setConnections(result.data);
      } else {
        setScanError(result.error || 'Network capture failed');
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleStopCapture = () => {
    setIsScanning(false);
    setScanProgress(100);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Network Traffic Analyzer</h1>
        <p className="text-gray-400">Capture and analyze network communications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-gray-800 border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Capture Control</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  min="10"
                  max="3600"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!isScanning ? (
                <button
                  onClick={handleStartCapture}
                  disabled={isScanning}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    isScanning
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  Start Capture
                </button>
              ) : (
                <button
                  onClick={handleStopCapture}
                  className="w-full px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Stop Capture
                </button>
              )}

              {isScanning && (
                <div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${useASFStore.getState().scanProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Capturing traffic...</p>
                </div>
              )}

              {scanError && (
                <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{scanError}</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Status</h4>
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
            <h3 className="text-lg font-semibold text-white mb-6">
              Traffic Overview
            </h3>

            {connections && connections.length > 0 ? (
              <div className="space-y-6">
                <TrafficGraph data={connections} />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Total Connections</p>
                    <p className="text-2xl font-bold text-white">{connections.length}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-gray-400 text-sm font-medium">TCP</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {connections.filter((c) => c.protocol === 'TCP').length}
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-gray-400 text-sm font-medium">UDP</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {connections.filter((c) => c.protocol === 'UDP').length}
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-gray-400 text-sm font-medium">Unique IPs</p>
                    <p className="text-2xl font-bold text-white">
                      {new Set(connections.map((c) => c.destinationIp)).size}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No traffic captured yet. Click "Start Capture" to begin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}