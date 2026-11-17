'use client';

import { Smartphone, Battery, Cpu, MemoryStick, Monitor, Activity } from 'lucide-react';

interface DeviceCardProps {
  device: any;
  onScan?: () => void;
  isScanning?: boolean;
}

export function DeviceCard({ device, onScan, isScanning }: DeviceCardProps) {
  if (!device) {
    return (
      <div className="rounded-lg border bg-gray-800 border-gray-700 p-8 text-center">
        <Smartphone className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No Device Connected</h3>
        <p className="text-sm text-gray-500 mb-4">
          Connect an Android device via USB and enable USB Debugging
        </p>
        <button
          onClick={onScan}
          disabled={isScanning}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          <Activity className="w-4 h-4 inline mr-2" />
          {isScanning ? 'Scanning...' : 'Scan Device'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-gray-800 border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-blue-400" />
          Device Information
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400">Model</p>
            <p className="text-sm font-medium text-white">{device.model}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Manufacturer</p>
            <p className="text-sm font-medium text-white">{device.manufacturer}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Android Version</p>
            <p className="text-sm font-medium text-white">{device.androidVersion}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">SDK Level</p>
            <p className="text-sm font-medium text-white">API {device.sdkVersion}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">CPU Architecture</p>
            <p className="text-sm font-medium text-white flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              {device.cpuArch}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Screen Resolution</p>
            <p className="text-sm font-medium text-white flex items-center gap-1">
              <Monitor className="w-3 h-3" />
              {device.screenResolution}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Battery Level</p>
            <p className="text-sm font-medium text-white flex items-center gap-1">
              <Battery className="w-3 h-3" />
              {device.batteryLevel}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">RAM</p>
            <p className="text-sm font-medium text-white flex items-center gap-1">
              <MemoryStick className="w-3 h-3" />
              {device.totalRam}
            </p>
          </div>
        </div>

        {onScan && (
          <button
            onClick={onScan}
            disabled={isScanning}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <Activity className="w-4 h-4 inline mr-2" />
            {isScanning ? 'Scanning...' : 'Re-scan Device'}
          </button>
        )}
      </div>
    </div>
  );
}