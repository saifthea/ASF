'use client';

import { useState } from 'react';
import {
  useSettingsStore,
  HashAlgorithm,
  ScanDepth,
  LogLevel,
} from '../../store/settingsStore';
import {
  Terminal,
  Wrench,
  FolderOpen,
  Network,
  Settings as SettingsIcon,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

const TABS = [
  { id: 'adb', label: 'ADB & Connection', icon: Terminal },
  { id: 'tools', label: 'Tools & Dependencies', icon: Wrench },
  { id: 'evidence', label: 'Evidence & Case', icon: FolderOpen },
  { id: 'network', label: 'Network & Proxy', icon: Network },
  { id: 'advanced', label: 'Advanced / Engine', icon: SettingsIcon },
];

export default function SettingsPage() {
  const {
    adbPath,
    autoDetectDevice,
    mobsfscanPath,
    mvtPath,
    aaptPath,
    apktoolPath,
    jadxPath,
    yaraRulesDir,
    evidenceDirectory,
    hashAlgorithm,
    investigatorName,
    agency,
    caseId,
    capturePort,
    proxyEnabled,
    proxyHost,
    proxyPort,
    scanDepth,
    logLevel,
    updateSetting,
    resetSettings,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState('adb');
  const [testResult, setTestResult] = useState<null | {
    success: boolean;
    message: string;
    devices: { serial: string; state: string }[];
  }>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adbPath }),
      });
      const result = await response.json();
      if (result.success) {
        setTestResult({
          success: true,
          message: `ADB ${result.data.adbVersion}`,
          devices: result.data.devices,
        });
      } else {
        setTestResult({
          success: false,
          message: result.error,
          devices: [],
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test gagal',
        devices: [],
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm">
          Konfigurasi forensic environment dan engine
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 p-6">
          {/* 1. ADB & Connection */}
          {activeTab === 'adb' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  ADB &amp; Connection Settings
                </h2>
                <p className="text-sm text-gray-400">
                  Konfigurasi binary Android Debug Bridge dan deteksi perangkat
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ADB Binary Path
                  </label>
                  <input
                    type="text"
                    value={adbPath}
                    onChange={(e) => updateSetting('adbPath', e.target.value)}
                    placeholder="adb"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Path ke binary ADB (contoh: C:\platform-tools\adb.exe)
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDetectDevice}
                    onChange={(e) =>
                      updateSetting('autoDetectDevice', e.target.checked)
                    }
                    className="w-4 h-4 rounded bg-gray-900 border-gray-600 text-blue-500"
                  />
                  <span className="text-sm text-gray-300">
                    Auto-detect device (otomatis memilih perangkat yang terhubung)
                  </span>
                </label>

                <div className="pt-4 border-t border-gray-700">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Terminal className="w-4 h-4" />
                    )}
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>

                  {testResult && (
                    <div
                      className={`mt-4 p-4 rounded-lg border ${
                        testResult.success
                          ? 'bg-green-900/30 border-green-700'
                          : 'bg-red-900/30 border-red-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {testResult.success ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            testResult.success
                              ? 'text-green-300'
                              : 'text-red-300'
                          }`}
                        >
                          {testResult.success
                            ? 'Koneksi Berhasil'
                            : 'Koneksi Gagal'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mb-2">
                        {testResult.message}
                      </p>
                      {testResult.devices.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">
                            Perangkat terdeteksi:
                          </p>
                          <ul className="text-xs text-gray-300 space-y-1">
                            {testResult.devices.map((d, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <code className="bg-gray-900 px-2 py-0.5 rounded">
                                  {d.serial}
                                </code>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs ${
                                    d.state === 'device'
                                      ? 'bg-green-900/50 text-green-300'
                                      : 'bg-yellow-900/50 text-yellow-300'
                                  }`}
                                >
                                  {d.state}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. Tools & Dependencies */}
          {activeTab === 'tools' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  Tools &amp; Dependencies
                </h2>
                <p className="text-sm text-gray-400">
                  Path ke binary eksternal yang digunakan oleh adapter
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    mobsfscan
                  </label>
                  <input
                    type="text"
                    value={mobsfscanPath}
                    onChange={(e) =>
                      updateSetting('mobsfscanPath', e.target.value)
                    }
                    placeholder="mobsfscan"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Dipakai: Data Leakage Analyzer
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    mvt
                  </label>
                  <input
                    type="text"
                    value={mvtPath}
                    onChange={(e) => updateSetting('mvtPath', e.target.value)}
                    placeholder="mvt"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Dipakai: Malware Behavior Detection
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    aapt
                  </label>
                  <input
                    type="text"
                    value={aaptPath}
                    onChange={(e) => updateSetting('aaptPath', e.target.value)}
                    placeholder="aapt"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Dipakai: Malware Detection (aapt dump badging)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    apktool
                  </label>
                  <input
                    type="text"
                    value={apktoolPath}
                    onChange={(e) =>
                      updateSetting('apktoolPath', e.target.value)
                    }
                    placeholder="apktool"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Opsional — reverse engineering APK
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    jadx
                  </label>
                  <input
                    type="text"
                    value={jadxPath}
                    onChange={(e) => updateSetting('jadxPath', e.target.value)}
                    placeholder="jadx"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Opsional — decompile APK ke Java
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    YARA Rules Directory
                  </label>
                  <input
                    type="text"
                    value={yaraRulesDir}
                    onChange={(e) =>
                      updateSetting('yaraRulesDir', e.target.value)
                    }
                    placeholder="./yara-rules"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Opsional — direktori rules YARA
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Evidence & Case Metadata */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  Evidence &amp; Case Metadata
                </h2>
                <p className="text-sm text-gray-400">
                  Pengaturan penyimpanan laporan dan metadata kasus
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Evidence Directory
                  </label>
                  <input
                    type="text"
                    value={evidenceDirectory}
                    onChange={(e) =>
                      updateSetting('evidenceDirectory', e.target.value)
                    }
                    placeholder="./evidence"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Direktori default penyimpanan laporan dan bukti
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hash Algorithm
                  </label>
                  <select
                    value={hashAlgorithm}
                    onChange={(e) =>
                      updateSetting(
                        'hashAlgorithm',
                        e.target.value as HashAlgorithm
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sha256">SHA-256</option>
                    <option value="md5">MD5</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Algorithm untuk hash file bukti
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Investigator Name
                    </label>
                    <input
                      type="text"
                      value={investigatorName}
                      onChange={(e) =>
                        updateSetting('investigatorName', e.target.value)
                      }
                      placeholder="John Doe"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Agency
                    </label>
                    <input
                      type="text"
                      value={agency}
                      onChange={(e) => updateSetting('agency', e.target.value)}
                      placeholder="Cybercrime Division"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Case ID
                    </label>
                    <input
                      type="text"
                      value={caseId}
                      onChange={(e) => updateSetting('caseId', e.target.value)}
                      placeholder="CASE-2026-001"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Network Traffic & Proxy */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  Network Traffic &amp; Proxy
                </h2>
                <p className="text-sm text-gray-400">
                  Pengaturan port intercept dan proxy lokal
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Capture Port
                  </label>
                  <input
                    type="number"
                    value={capturePort}
                    onChange={(e) =>
                      updateSetting(
                        'capturePort',
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="8080"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Port untuk intercept traffic jaringan
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={proxyEnabled}
                    onChange={(e) =>
                      updateSetting('proxyEnabled', e.target.checked)
                    }
                    className="w-4 h-4 rounded bg-gray-900 border-gray-600 text-blue-500"
                  />
                  <span className="text-sm text-gray-300">
                    Enable local proxy
                  </span>
                </label>

                {proxyEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Proxy Host
                      </label>
                      <input
                        type="text"
                        value={proxyHost}
                        onChange={(e) =>
                          updateSetting('proxyHost', e.target.value)
                        }
                        placeholder="127.0.0.1"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Proxy Port
                      </label>
                      <input
                        type="number"
                        value={proxyPort}
                        onChange={(e) =>
                          updateSetting(
                            'proxyPort',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="8888"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Advanced / Engine */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  Advanced / Engine
                </h2>
                <p className="text-sm text-gray-400">
                  Pengaturan tingkat detail scan dan logging
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Scan Depth
                  </label>
                  <select
                    value={scanDepth}
                    onChange={(e) =>
                      updateSetting('scanDepth', e.target.value as ScanDepth)
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="quick">Quick — scan dasar, cepat</option>
                    <option value="deep">Deep — scan mendalam, semua modul</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Quick: device info + app list. Deep: semua modul aktif.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Log Level
                  </label>
                  <select
                    value={logLevel}
                    onChange={(e) =>
                      updateSetting('logLevel', e.target.value as LogLevel)
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="debug">Debug — semua detail</option>
                    <option value="info">Info — pesan biasa</option>
                    <option value="warn">Warning — hanya peringatan</option>
                    <option value="error">Error — hanya error</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Level logging untuk proses forensic
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <button
                    onClick={resetSettings}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
