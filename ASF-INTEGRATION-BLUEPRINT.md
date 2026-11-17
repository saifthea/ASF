# ASF Integration Blueprint

## Overview

This blueprint defines how the 6 reference technology repositories map to the planned **ASF (Android Security Forensics)** core functional modules, detailing the required adapter wrappers, data flows, and technical integration interfaces.

---

## ASF Core Module Mapping

```
+-----------------------------------------------------------------------------------+
|                            ASF NEXT.JS DASHBOARD UI                               |
+-----------------------------------------------------------------------------------+
                                          |
                                 [Process IPC / CLI / APIs]
                                          v
+-----------------------------------------------------------------------------------+
|                               ASF ADAPTER LAYER                                   |
|   +-------------------+  +-------------------+  +-----------------------------+   |
|   | ADB Native Adapter|  | Acquisition Adap. |  | Static Analysis Adapter     |   |
|   | (Node-adb/Custom) |  | (androidqf/MVT)   |  | (mobsfscan/DEX/Manifest)    |   |
|   +-------------------+  +-------------------+  +-----------------------------+   |
|   +-------------------+  +-------------------+  +-----------------------------+   |
|   | Forensic Adapter  |  | Network Adapter   |  | Tracker & Permission Adap.  |   |
|   | (ALEAPP / SQLite) |  | (PCAPdroid API)   |  | (TrackerControl Data/Engine)|   |
|   +-------------------+  +-------------------+  +-----------------------------+   |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                               ASF ENGINE MODULES                                  |
|  1. Device Scanner               7. Microphone Forensics                          |
|  2. Application Analyzer         8. Gallery & Media Forensics                     |
|  3. Permission Audit             9. Malware Behavior Detection                    |
|  4. Network Traffic Analyzer    10. Privacy Incident Correlation Engine           |
|  5. Data Leakage Analyzer       11. Forensic Timeline                             |
|  6. Camera Forensics            12. Forensic Reporting                            |
+-----------------------------------------------------------------------------------+
```

---

## Detailed Module Integration Breakdown

### Module 1: Device Scanner
- **Target Capability**: USB/ADB connection management, device hardware info, OS version, boot properties, root status, build fingerprinting.
- **Relevant Repositories**: `androidqf`, `ALEAPP`
- **Adapter Requirements**:
  - `ADBDeviceAdapter`: Wraps `adb getprop`, `adb shell dumpsys`, and `androidqf` environment/root detection modules.
  - Returns standardized JSON object with device metadata, serial, battery status, root status, and Android API level.

### Module 2: Application Analyzer
- **Target Capability**: Inventory of installed apps, system vs non-system classification, APK extraction, static vulnerability scanning, tracking library identification.
- **Relevant Repositories**: `mobsfscan`, `TrackerControl` (ClassyShark/Exodus signatures), `androidqf` (packages/APK pull), `ALEAPP` (`installedapps.py`)
- **Adapter Requirements**:
  - `AppInventoryAdapter`: Calls ADB `pm list packages -f -u` or parses `androidqf` `packages.json`.
  - `MobSFScanAdapter`: Spawns `mobsfscan --json <extracted_apk_dir>` to perform static vulnerability audits.
  - `TrackerSignatureAdapter`: Integrates Exodus Privacy signature matching engine (from TrackerControl logic) to flag known ad/tracking SDKs in pulled APK DEX files.

### Module 3: Permission Audit
- **Target Capability**: Comprehensive audit of requested, granted, and dangerous permissions across all apps, identify over-privileged apps and permission abuse.
- **Relevant Repositories**: `mobsfscan` (manifest rules), `ALEAPP` (`permissions.py`, `appOpsModes.py`), `androidqf` (`dumpsys package`)
- **Adapter Requirements**:
  - `PermissionAuditAdapter`: Parses `adb shell dumpsys package <pkg>` and AndroidManifest.xml parsed by `mobsfscan`.
  - Maps permissions against OWASP MASVS risk categories and flags dangerous combinations (e.g., `CAMERA` + `INTERNET` + `RECEIVE_BOOT_COMPLETED`).

### Module 4: Network Traffic Analyzer
- **Target Capability**: Real-time traffic inspection, connection logging, DNS query inspection, host/IP extraction, PCAP export.
- **Relevant Repositories**: `PCAPdroid`, `TrackerControl`
- **Adapter Requirements**:
  - `PCAPdroidControlAdapter`: Communicates via Intent API (`com.emanuelef.remote_capture.activities.CaptureCtrl`) or ADB command interface to start/stop capture and stream PCAP/HAR output to ASF engine.
  - `NetworkLogAdapter`: Parses PCAP/HAR streams and categorizes connections by app UID, host, ASN, and protocol using nDPI signatures.

### Module 5: Data Leakage Analyzer
- **Target Capability**: Detection of unencrypted data transmissions, sensitive API keys in APKs, clipboard leaks, background data transfers.
- **Relevant Repositories**: `TrackerControl` (blocklists/DoH), `PCAPdroid` (HTTP/HTTPS inspection), `mobsfscan` (hardcoded secrets/cleartext HTTP checks)
- **Adapter Requirements**:
  - `DataLeakageAdapter`: Correlates static `mobsfscan` findings (e.g., `android:usesCleartextTraffic="true"`) with dynamic network logs from `PCAPdroidAdapter` to flag unencrypted data leaks.

### Module 6: Camera Forensics
- **Target Capability**: Identify applications with camera permissions, historical usage events (where available via AppOps), active camera access detection.
- **Relevant Repositories**: `ALEAPP` (`appOpsAccesses.py`, `camera.py`), `androidqf` (`dumpsys appops`)
- **Adapter Requirements**:
  - `CameraAuditAdapter`: Executes `adb shell dumpsys appops` and parses AppOps state history for `OP_CAMERA`.
  - Correlates with static APK analysis to flag background camera access potential.
  - Displays explicit `LIMITED CAPABILITY` badge if retrospective timestamps are unavailable on target Android version.

### Module 7: Microphone Forensics
- **Target Capability**: Identify apps with audio recording permissions, AppOps audio recording timestamps, background mic access detection.
- **Relevant Repositories**: `ALEAPP` (`appOpsAccesses.py`), `androidqf` (`dumpsys appops`)
- **Adapter Requirements**:
  - `MicrophoneAuditAdapter`: Parses `dumpsys appops` for `OP_RECORD_AUDIO` and `OP_PHONE_CALL_MICROPHONE`.
  - Displays explicit `LIMITED CAPABILITY` badge for non-root retrospective limits.

### Module 8: Gallery & Media Forensics
- **Target Capability**: Media file metadata analysis, EXIF extraction, hidden album identification, carved image analysis.
- **Relevant Repositories**: `ALEAPP` (`samsungGallery.py`, `mediaStore.py`, `exif.py`), `androidqf` (`files`)
- **Adapter Requirements**:
  - `MediaForensicsAdapter`: Processes extracted media artifacts or ADB-pulled DCIM/Pictures using Python EXIF/metadata parsers adapted from ALEAPP.

### Module 9: Malware Behavior Detection
- **Target Capability**: Spyware detection (Pegasus, Predator, etc.), suspicious process identification, persistence mechanism audit (init scripts, accessibility services).
- **Relevant Repositories**: `MVT`, `androidqf`, `mobsfscan`
- **Adapter Requirements**:
  - `MVTAdapter`: Spawns `mvt-android check-androidqf <archive>` or `check-bugreport <bugreport.zip>` with `--no-update-check` flag.
  - `MalwareBehaviorAdapter`: Audits running processes (`ps -A`), accessibility services (`settings get secure enabled_accessibility_services`), and device admin apps (`dumpsys device_policy`).

### Module 10: Privacy Incident Correlation Engine
- **Target Capability**: Cross-module event correlation to detect complex privacy incidents (e.g., App X accessed Camera at 14:00, opened socket to host Y at 14:01).
- **Relevant Repositories**: All 6 reference repositories contribute input data.
- **Adapter Requirements**:
  - `CorrelationEngine`: ASF core TypeScript engine running in Node.js. Ingests normalized event objects from all adapters into local SQLite database and executes correlation queries.

### Module 11: Forensic Timeline
- **Target Capability**: Unified chronological view of all device events (boot, app install, permission grant, network connection, appOps access, system log).
- **Relevant Repositories**: `ALEAPP` (timeline builder), `MVT` (timeline export)
- **Adapter Requirements**:
  - `TimelineAdapter`: Aggregates timestamps from ALEAPP SQLite output, MVT JSON output, PCAPdroid connection logs, and ADB logcat into a unified SQLite timeline schema (`events` table with `timestamp`, `source`, `app_id`, `event_type`, `severity`, `details`).

### Module 12: Forensic Reporting
- **Target Capability**: Generation of comprehensive, executive, and technical investigation reports in HTML, PDF, and JSON formats.
- **Relevant Repositories**: `ALEAPP` (artifact_report.py), `mobsfscan` (SARIF/JSON formatters)
- **Adapter Requirements**:
  - `ReportGeneratorAdapter`: Combines structured data from SQLite database into Next.js/Tailwind CSS interactive reports and standalone single-file HTML reports.

---

## Repository Integration Feasibility Categorization

| Repository | Integration Feasibility Category | Technical Rationale |
|------------|---------------------------------|---------------------|
| **androidqf** | **DIRECT CLI INTEGRATION** | Self-contained Go executable. Accepts flags (`-non-interactive`, `-output`, `-module`), streams output to ZIP archive over ADB. Easy to invoke from Node.js `child_process`. |
| **MVT** | **DIRECT CLI INTEGRATION** | Python CLI (`mvt-android`). Integrates cleanly via `child_process.spawn('mvt-android', ['check-androidqf', path, '--json', out_dir, '--no-update-check'])`. |
| **mobsfscan** | **DIRECT CLI / API INTEGRATION** | Python package with clean CLI (`mobsfscan --json <path>`) and standard Python API. Ideal for standalone execution. |
| **ALEAPP** | **DIRECT CLI / REFERENCE ADAPTER** | CLI executable (`aleapp.py -t <type> -i <input> -o <output>`). Outputs structured SQLite/TSV/JSON data easily consumable by ASF Node.js backend. Artifact modules can also serve as reference algorithms for custom Node/Python adapters. |
| **TrackerControl** | **REFERENCE ONLY / DATA ADAPTATION** | Android app (Java/Rust). Cannot be run as CLI on Windows. Value lies in adapting its blocklist datasets (`xray-blacklist.json`, `trackers.json`, `hosts.txt`) and importing its Exodus signature matching logic into ASF backend. |
| **PCAPdroid** | **COMPANION APP / API INTEGRATION** | Android app. Captured network data can be controlled via Intent API (`CaptureCtrl`) or extracted as PCAP files via local HTTP/TCP export to ASF Windows host. |

---

## Technical Adapter Interface Standard

Every ASF adapter must implement the following TypeScript interface in the ASF codebase:

```typescript
export interface ASFAdapterResult<T> {
  success: boolean;
  timestamp: string;
  moduleName: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  limitationsNoted: string[];
}

export interface IASFAdapter<TInput, TOutput> {
  readonly adapterId: string;
  readonly name: string;
  readonly targetRepo: string;
  readonly feasibilityCategory: 'DIRECT CLI INTEGRATION' | 'API INTEGRATION' | 'SDK/LIBRARY INTEGRATION' | 'REFERENCE ONLY' | 'COMPANION APP';
  
  checkAvailability(): Promise<boolean>;
  execute(input: TInput): Promise<ASFAdapterResult<TOutput>>;
}
```