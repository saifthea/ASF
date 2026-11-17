import { create } from 'zustand';
import { DeviceInfo } from '../adapters/DeviceScannerAdapter';
import { InstalledApp } from '../adapters/AppAnalyzerAdapter';
import { PermissionEntry } from '../adapters/PermissionAuditAdapter';
import { ConnectionLog } from '../adapters/NetworkTrafficAdapter';
import { LeakageFinding } from '../adapters/DataLeakageAdapter';
import { CameraMicEvent } from '../adapters/CameraMicAdapter';
import { MalwareResult } from '../adapters/MalwareAdapter';
import { TimelineEvent, ForensicReport } from '../lib/ReportBuilder';

interface ASFState {
  // Device
  device: DeviceInfo | null;
  setDevice: (device: DeviceInfo | null) => void;

  // Apps
  apps: InstalledApp[];
  setApps: (apps: InstalledApp[]) => void;
  selectedApp: InstalledApp | null;
  setSelectedApp: (app: InstalledApp | null) => void;

  // Permissions
  permissions: PermissionEntry[];
  setPermissions: (perms: PermissionEntry[]) => void;

  // Network
  connections: ConnectionLog[];
  setConnections: (conns: ConnectionLog[]) => void;

  // Leakage
  leakageFindings: LeakageFinding[];
  setLeakageFindings: (findings: LeakageFinding[]) => void;

  // Camera/Mic
  camMicEvents: CameraMicEvent[];
  setCamMicEvents: (events: CameraMicEvent[]) => void;

  // Malware
  malwareResults: MalwareResult[];
  setMalwareResults: (results: MalwareResult[]) => void;

  // Timeline
  timelineEvents: TimelineEvent[];
  setTimelineEvents: (events: TimelineEvent[]) => void;

  // Forensic Report
  forensicReport: ForensicReport | null;
  setForensicReport: (report: ForensicReport | null) => void;

  // UI State
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
  scanProgress: number;
  setScanProgress: (progress: number) => void;
  scanError: string | null;
  setScanError: (error: string | null) => void;

  // Device serial
  serial: string | null;
  setSerial: (serial: string | null) => void;

  // Evidence
  evidenceId: string | null;
  setEvidenceId: (id: string | null) => void;
  evidencePath: string | null;
  setEvidencePath: (path: string | null) => void;

  // Reset
  resetAll: () => void;
}

const initialState = {
  device: null,
  apps: [],
  selectedApp: null,
  permissions: [],
  connections: [],
  leakageFindings: [],
  camMicEvents: [],
  malwareResults: [],
  timelineEvents: [],
  forensicReport: null,
  currentStep: 0,
  isScanning: false,
  scanProgress: 0,
  scanError: null,
  serial: null,
  evidenceId: null,
  evidencePath: null,
};

export const useASFStore = create<ASFState>((set) => ({
  ...initialState,

  setDevice: (device) => set({ device }),
  setApps: (apps) => set({ apps }),
  setSelectedApp: (app) => set({ selectedApp: app }),
  setPermissions: (perms) => set({ permissions: perms }),
  setConnections: (conns) => set({ connections: conns }),
  setLeakageFindings: (findings) => set({ leakageFindings: findings }),
  setCamMicEvents: (events) => set({ camMicEvents: events }),
  setMalwareResults: (results) => set({ malwareResults: results }),
  setTimelineEvents: (events) => set({ timelineEvents: events }),
  setForensicReport: (report) => set({ forensicReport: report }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setScanError: (error) => set({ scanError: error }),
  setSerial: (serial) => set({ serial }),
  setEvidenceId: (id) => set({ evidenceId: id }),
  setEvidencePath: (path) => set({ evidencePath: path }),
  resetAll: () => set(initialState),
}));