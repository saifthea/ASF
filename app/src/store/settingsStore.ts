import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HashAlgorithm = 'sha256' | 'md5';
export type ScanDepth = 'quick' | 'deep';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface SettingsState {
  // 1. ADB & Connection
  adbPath: string;
  autoDetectDevice: boolean;

  // 2. Tools & Dependencies
  mobsfscanPath: string;
  mvtPath: string;
  aaptPath: string;
  apktoolPath: string;
  jadxPath: string;
  yaraRulesDir: string;

  // 3. Evidence & Case Metadata
  evidenceDirectory: string;
  hashAlgorithm: HashAlgorithm;
  investigatorName: string;
  agency: string;
  caseId: string;

  // 4. Network Traffic & Proxy
  capturePort: number;
  proxyEnabled: boolean;
  proxyHost: string;
  proxyPort: number;

  // 5. Advanced / Engine
  scanDepth: ScanDepth;
  logLevel: LogLevel;

  // Actions
  updateSetting: <K extends keyof Omit<SettingsState, 'updateSetting' | 'resetSettings'>>(
    key: K,
    value: SettingsState[K]
  ) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  adbPath: 'D:\\Saif\\SDK\\platform-tools\\adb.exe',
  autoDetectDevice: true,

  mobsfscanPath: 'mobsfscan',
  mvtPath: 'mvt',
  aaptPath: 'aapt',
  apktoolPath: 'apktool',
  jadxPath: 'jadx',
  yaraRulesDir: '',

  evidenceDirectory: './evidence',
  hashAlgorithm: 'sha256' as HashAlgorithm,
  investigatorName: '',
  agency: '',
  caseId: '',

  capturePort: 8080,
  proxyEnabled: false,
  proxyHost: '127.0.0.1',
  proxyPort: 8888,

  scanDepth: 'quick' as ScanDepth,
  logLevel: 'info' as LogLevel,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateSetting: (key, value) =>
        set((state) => ({ ...state, [key]: value } as SettingsState)),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'asf-settings',
    }
  )
);
