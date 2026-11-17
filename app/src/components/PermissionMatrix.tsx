'use client';

import { useState, useMemo } from 'react';
import { PermissionEntry } from '../adapters/PermissionAuditAdapter';
import { useSettingsStore } from '../store/settingsStore';
import { useASFStore } from '../store/asfStore';

interface Props {
  permissions: PermissionEntry[];
}

const KNOWN_LABELS: Record<string, string> = {
  'id.dana': 'DANA Indonesia (E-Wallet)',
  'com.deliveree.user': 'Deliveree (Logistics & Delivery)',
  'pl.planmieszkania.android': 'Plan Mieszkania (3D Floor Plan)',
  'com.bekalislam.qurantadabbur': 'Bekal Islam Quran Tadabbur',
  'com.twitter.android': 'X (Twitter)',
  'com.go7game.jewelclassic': 'Jewel Classic (Game)',
  'bubblelevel.spiritlevel.surfacelevel.groundlevel': 'Bubble Level App',
  'musicplayer.playmusic.audioplayer': 'Music & Audio Player',
  'savannah.internet.web.browser': 'Savannah Web Browser',
  'org.ppsspp.ppsspp': 'PPSSPP Emulator',
  'com.adguard.android': 'AdGuard',
  'com.psiphon3.subscription': 'Psiphon 3',
  'com.xui.xhide': 'XHide Calculator (Hide Apps)',
  'com.tongyi.intl': 'Qwen (Tongyi AI)',
  'com.camerasideas.trimmer': 'Video Trimmer',
  'com.inverseai.video_converter': 'Video Converter',
  'com.marc.files': 'Files (Marc)',
  'grant.m4a.to.mp3': 'M4A to MP3 Converter',
  'com.maher4web.hisn': 'Hisn Al-Muslim',
  'com.foxdebug.acodefree': 'Acode Code Editor',
  'com.ng_labs.paint': 'Paint App',
  // System apps
  'com.android.shell': 'Android Shell (System OS)',
  'com.android.emergency': 'Emergency SOS (System OS)',
  'com.google.android.captiveportallogin': 'Captive Portal Login (System OS)',
  'com.google.android.documentsui': 'Documents UI (System OS)',
};

// Package prefixes that indicate system apps
const SYSTEM_PREFIXES = [
  'com.android.',
  'android.',
  'com.google.android.',
  'com.samsung.',
  'com.infinix.',
  'com.transsion.',
  'com.xiaomi.',
];

export function isSystemPackage(packageName: string): boolean {
  if (SYSTEM_PREFIXES.some(p => packageName.startsWith(p))) return true;
  if (packageName === 'com.android.shell' || packageName === 'com.android.emergency') return true;
  return false;
}

export function formatAppLabel(packageName: string, rawLabel?: string): string {
  if (KNOWN_LABELS[packageName]) return KNOWN_LABELS[packageName];
  if (rawLabel && !rawLabel.includes('.') && rawLabel !== packageName) return rawLabel;
  const ignoredPrefixes = ['com', 'org', 'net', 'io', 'gov', 'edu', 'android', 'intl', 'free', 'app'];
  const rawParts = packageName.split('.').filter(p => !ignoredPrefixes.includes(p.toLowerCase()));
  const parts = Array.from(new Set(rawParts));
  if (parts.length > 0) {
    return parts.map(p => {
      const lower = p.toLowerCase();
      if (lower === 'ppsspp') return 'PPSSPP';
      if (lower === 'xui') return 'XUI';
      if (lower === 'wps') return 'WPS Office';
      if (lower === 'dana') return 'DANA';
      if (lower === 'qwen' || lower === 'tongyi') return 'Qwen AI';
      return p.charAt(0).toUpperCase() + p.slice(1);
    }).join(' ');
  }
  return packageName;
}

export default function PermissionMatrix({ permissions }: Props) {
  const { adbPath } = useSettingsStore();
  const { serial } = useASFStore();
  const [uninstallingApp, setUninstallingApp] = useState<string | null>(null);
  const [uninstallStatus, setUninstallStatus] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showQuickDeleteModal, setShowQuickDeleteModal] = useState(false);
  const [quickDeleting, setQuickDeleting] = useState(false);
  const [deleteResults, setDeleteResults] = useState<{ success: string[]; fail: Array<{ pkg: string; error?: string }> }>({ success: [], fail: [] });

  // Group by unique app (package name) for Quick Delete candidates
  const uniqueApps = useMemo(() => {
    const map = new Map<string, Pick<PermissionEntry, 'label'>>();
    permissions.forEach(p => {
      if (!map.has(p.packageName)) map.set(p.packageName, { label: p.label || '' });
    });
    return Array.from(map.entries());
  }, [permissions]);

  const selectableApps = useMemo(() =>
    uniqueApps.filter(([pkg]) => !isSystemPackage(pkg)),
    [uniqueApps]
  );

  const toggleSelect = (packageName: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(packageName)) next.delete(packageName);
      else next.add(packageName);
      return next;
    });
  };

  const selectAllNonSystem = () => {
    const all = new Set(selectableApps.map(([pkg]) => pkg));
    setSelectedRows(all);
  };

  const clearSelection = () => setSelectedRows(new Set());

  const handleSingleUninstall = async (packageName: string, label: string) => {
    if (isSystemPackage(packageName)) {
      alert(`Aplikasi sistem (${packageName}) tidak bisa dihapus.`);
      return;
    }
    if (!confirm(`Hapus ${label}?`)) return;
    setUninstallingApp(packageName);
    try {
      const res = await fetch('/api/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adbPath, serial, packageName }),
      });
      const data = await res.json();
      if (data.success) {
        setUninstallStatus(prev => ({ ...prev, [packageName]: 'Uninstalled' }));
      } else {
        alert(`Gagal: ${data.error}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setUninstallingApp(null);
    }
  };

  const handleQuickDelete = async () => {
    if (selectedRows.size === 0) return;
    const labels = Array.from(selectedRows).map(pkg => formatAppLabel(pkg)).join('\n• ');
    if (!confirm(`Yakin hapus ${selectedRows.size} aplikasi?\n\n${labels.substring(0, 200)}...`)) return;

    setQuickDeleting(true);
    const packages = Array.from(selectedRows);
    const results: Array<{ pkg: string; ok: boolean }> = [];

    try {
      const res = await fetch('/api/uninstall-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adbPath, serial, packageNames: packages }),
      });
      const data = await res.json();
      if (data.success && data.results) {
        data.results.forEach((r: { packageName: string; success: boolean }) => {
          results.push({ pkg: r.packageName, ok: r.success });
        });
      } else {
        packages.forEach(pkg => results.push({ pkg, ok: false }));
      }
    } catch {
      packages.forEach(pkg => results.push({ pkg, ok: false }));
    }

    const successList = results.filter(r => r.ok).map(r => formatAppLabel(r.pkg));
    const failList = results.filter(r => !r.ok).map(r => ({ pkg: r.pkg, label: formatAppLabel(r.pkg) }));

    setDeleteResults({ success: successList, fail: failList });
    setShowQuickDeleteModal(false);
    setQuickDeleting(false);
    selectedRows.forEach(pkg => setUninstallStatus(prev => ({ ...prev, [pkg]: 'Uninstalled' })));
    setSelectedRows(new Set());
  };

  const riskBadge: Record<string, string> = {
    critical: 'bg-red-900/50 text-red-300 border-red-700',
    high: 'bg-orange-900/50 text-orange-300 border-orange-700',
    medium: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
    low: 'bg-blue-900/50 text-blue-300 border-blue-700',
  };

  return (
    <div className="w-full">
      {/* Quick Delete Toolbar */}
      {permissions.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-800/60 rounded-lg border border-gray-700 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {selectedRows.size > 0
                ? <><span className="text-white font-semibold">{selectedRows.size}</span> dipilih</>
                : `${permissions.length} permission entries`}
            </span>
            <button onClick={selectAllNonSystem} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors">
              Pilih Semua
            </button>
            <button onClick={clearSelection} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors">
              Hapus Pilihan
            </button>
          </div>
          <button
            onClick={() => setShowQuickDeleteModal(true)}
            disabled={selectedRows.size === 0}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Quick Delete ({selectedRows.size})
          </button>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 font-medium">
              <th className="py-2 px-2 w-8"></th>
              <th className="text-left py-2 px-2">Application</th>
              <th className="text-left py-2 px-2">Permission</th>
              <th className="text-center py-2 px-2">Status</th>
              <th className="text-center py-2 px-2">Risk</th>
              <th className="text-center py-2 px-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm, idx) => {
              const displayName = formatAppLabel(perm.packageName, perm.label);
              const isSystem = isSystemPackage(perm.packageName);
              const shortPerm = perm.permission.replace(/^android\.permission\./, '');
              const isSelected = selectedRows.has(perm.packageName);
              return (
                <tr key={idx} className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${isSelected ? 'bg-blue-900/20' : ''}`}>
                  <td className="py-2 px-2 text-center">
                    {!isSystem && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(perm.packageName)}
                        className="w-4 h-4 accent-red-500 cursor-pointer"
                      />
                    )}
                  </td>
                  <td className="py-2 px-2 max-w-[170px]">
                    <div className="font-semibold text-white truncate" title={displayName}>
                      {displayName}
                      {isSystem && (
                        <span className="ml-1 px-1 py-0.2 text-[9px] bg-gray-700 text-gray-300 rounded border border-gray-600">
                          SYSTEM
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono truncate" title={perm.packageName}>
                      {perm.packageName}
                    </div>
                  </td>
                  <td className="py-2 px-2 font-mono text-[11px] text-gray-300 max-w-[180px] truncate" title={perm.permission}>
                    {shortPerm}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${perm.granted ? 'bg-green-900/40 text-green-300 border border-green-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                      {perm.granted ? 'Granted' : 'Denied'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${riskBadge[perm.riskLevel] || riskBadge.low}`}>
                      {perm.riskLevel}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    {uninstallStatus[perm.packageName] ? (
                      <span className="text-[10px] text-gray-500 italic">Uninstalled</span>
                    ) : isSystem ? (
                      <span className="text-[10px] text-gray-500 italic cursor-not-allowed">System OS</span>
                    ) : (
                      <button
                        onClick={() => handleSingleUninstall(perm.packageName, displayName)}
                        disabled={uninstallingApp === perm.packageName}
                        className="px-2 py-0.5 text-[11px] bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors disabled:opacity-50"
                      >
                        {uninstallingApp === perm.packageName ? '...' : 'Delete'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick Delete Modal */}
      {showQuickDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
            <div className="p-5 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Quick Delete — {deleteResults.success.length + deleteResults.fail.length > 0 ? 'Hasil' : selectedRows.size + ' Aplikasi'}
              </h3>
            </div>
            <div className="p-5 max-h-80 overflow-y-auto space-y-2">
              {deleteResults.success.length > 0 && (
                <div>
                  <p className="text-green-400 text-sm font-semibold mb-2">✅ Berhasil dihapus:</p>
                  {deleteResults.success.map(name => (
                    <div key={name} className="text-green-300 text-sm py-1 px-3 bg-green-900/20 rounded">{name}</div>
                  ))}
                </div>
              )}
              {deleteResults.fail.length > 0 && (
                <div>
                  <p className="text-red-400 text-sm font-semibold mb-2">❌ Gagal dihapus:</p>
                  {deleteResults.fail.map(({ pkg, label }) => (
                    <div key={pkg} className="text-red-300 text-sm py-1 px-3 bg-red-900/20 rounded">{label}</div>
                  ))}
                </div>
              )}
              {deleteResults.success.length === 0 && deleteResults.fail.length === 0 && (
                <p className="text-gray-400 text-sm">
                  {selectedRows.size} aplikasi akan dihapus. Pastikan kamu yakin!
                </p>
              )}
            </div>
            <div className="p-5 border-t border-gray-700 flex gap-3">
              {deleteResults.success.length === 0 && deleteResults.fail.length === 0 ? (
                <>
                  <button
                    onClick={() => setShowQuickDeleteModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuickDelete}
                    disabled={quickDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                  >
                    {quickDeleting ? 'Menghapus...' : `Hapus ${selectedRows.size} Aplikasi`}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setDeleteResults({ success: [], fail: [] }); setShowQuickDeleteModal(false); }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
