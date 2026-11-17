'use client';

import { useASFStore } from '../store/asfStore';
import { useSettingsStore } from '../store/settingsStore';
import { DeviceCard } from '../components/DeviceCard';

export default function Dashboard() {
  const { device, setDevice, setSerial, isScanning, setIsScanning, setScanProgress, setScanError } = useASFStore();
  const { adbPath } = useSettingsStore();

  const handleScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanError(null);

    try {
      setScanProgress(30);

      const response = await fetch('/api/device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adbPath }),
      });
      const result = await response.json();
      setScanProgress(100);

      if (result.success && result.data) {
        setDevice(result.data);
        // Store serial for use by other modules
        setSerial(result.metadata?.serial || '');
        // Save adbPath to settings store for consistency
        useSettingsStore.getState().updateSetting('adbPath', adbPath);
      } else {
        setScanError(result.error || 'Scan failed');
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Android Security Forensics Platform</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DeviceCard device={device} onScan={handleScan} isScanning={isScanning} />
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-gray-800 border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={device ? 'text-green-400' : 'text-yellow-400'}>
                  {device ? 'Connected' : 'No Device'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Android</span>
                <span className="text-white">{device?.androidVersion || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Root</span>
                <span className={device?.rootStatus ? 'text-red-400' : 'text-green-400'}>
                  {device?.rootStatus ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-gray-800 border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Available Modules</h3>
            <div className="space-y-2">
              {[
                { name: 'Device Scanner', status: 'ready' },
                { name: 'App Analyzer', status: 'ready' },
                { name: 'Permission Audit', status: 'ready' },
                { name: 'Network Traffic', status: 'pending' },
                { name: 'Data Leakage', status: 'pending' },
                { name: 'Camera & Mic', status: 'pending' },
                { name: 'Malware Detection', status: 'pending' },
                { name: 'Forensic Report', status: 'ready' },
              ].map((module, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <span className="text-sm text-gray-300">{module.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    module.status === 'ready'
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {module.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}