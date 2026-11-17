'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useASFStore } from '../store/asfStore';
import { Activity, Shield, Smartphone, Network, FileSearch, Camera, Bug, FileText, Settings, Menu, X, Home } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'App Analyzer', href: '/apps', icon: Shield },
  { name: 'Permission Audit', href: '/permissions', icon: FileSearch },
  { name: 'Network Traffic', href: '/network', icon: Network },
  { name: 'Data Leakage', href: '/leakage', icon: FileText },
  { name: 'Camera & Mic', href: '/camera-mic', icon: Camera },
  { name: 'Malware Detection', href: '/malware', icon: Bug },
  { name: 'Forensic Report', href: '/report', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { device, isScanning, scanProgress } = useASFStore();

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">ASF</h1>
              <p className="text-xs text-gray-400">Android Security Forensics</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Device Status Footer */}
        <div className="p-4 border-t border-gray-700">
          {device ? (
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Connected Device</span>
                <span className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <p className="text-sm font-medium text-white truncate">{device.model}</p>
              <p className="text-xs text-gray-400">Android {device.androidVersion}</p>
            </div>
          ) : (
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">No device connected</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {navigation.find(n => n.href === pathname)?.name || 'ASF'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Android Security Forensics Platform
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isScanning && (
                <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-medium">Scanning {scanProgress}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}