'use client';

import { useState } from 'react';
import { useASFStore } from '../../store/asfStore';
import { useSettingsStore } from '../../store/settingsStore';
import CameraMicTimeline from '../../components/CameraMicTimeline';

export default function CameraMicrophoneForensics() {
  const { device, apps, camMicEvents, setCamMicEvents, serial, isScanning, setIsScanning, setScanProgress, setScanError, scanError } = useASFStore();
  const { adbPath } = useSettingsStore();
  const [selectedApp, setSelectedApp] = useState<string>('');

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

      const response = await fetch('/api/camera-mic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adbPath, serial }),
      });
      const result = await response.json();
      setScanProgress(100);

      if (result.success && result.data) {
        setCamMicEvents(result.data);
      } else {
        setScanError(result.error || 'Camera/mic forensics failed');
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsScanning(false);
    }
  };

  const cameraAccessCount = camMicEvents?.filter((e) => e.resource === 'camera').length || 0;
  const micAccessCount = camMicEvents?.filter((e) => e.resource === 'microphone').length || 0;
  const suspiciousCount = camMicEvents?.filter((e) => e.status === 'revoked').length || 0;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Camera & Microphone Forensics</h1>
        <p className="text-gray-400">Investigate camera and microphone access history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-gray-800 border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Forensic Control</h3>

            <div className="space-y-4">
              <button
                onClick={handleScan}
                disabled={isScanning || !device}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  isScanning || !device
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isScanning ? 'Investigating...' : 'Investigate Access'}
              </button>

              {isScanning && (
                <div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${useASFStore.getState().scanProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {scanError && (
                <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{scanError}</p>
                </div>
              )}

              <div>
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
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Access Summary</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-300">Camera Access</span>
                  </div>
                  <span className="text-sm font-medium text-white">{cameraAccessCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-300">Microphone Access</span>
                  </div>
                  <span className="text-sm font-medium text-white">{micAccessCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-300">Suspicious Activity</span>
                  </div>
                  <span className="text-sm font-medium text-white">{suspiciousCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-lg border bg-gray-800 border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
              Access Timeline
            </h3>

            {camMicEvents ? (
              <CameraMicTimeline data={camMicEvents} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No camera/mic access data yet. Click "Investigate Access" to begin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}