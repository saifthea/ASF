# Android Compatibility Matrix

## Executive Summary

ASF targets Android versions from **8.0 Oreo (API 26)** to the **latest Android version (Android 14+ / API 34+)**, with **Windows 11** as the investigation workstation using **USB/ADB** without requiring device root.

This document establishes the verified capability matrix for each Android version, distinguishing between officially supported features, limited capabilities, root-dependent operations, and unsupported functions.

---

## Android Version Support Matrix

| Feature / Capability | Android 8.0 (API 26) | Android 9 (API 28) | Android 10 (API 29) | Android 11 (API 30) | Android 12 (API 31) | Android 13 (API 33) | Android 14+ (API 34+) | Baseline Method | Requires Root? | Requires Companion App? |
|----------------------|-----------------------|--------------------|---------------------|---------------------|---------------------|---------------------|-----------------------|-----------------|----------------|-------------------------|
| **Device Info & Prop Extraction** | FULL | FULL | FULL | FULL | FULL | FULL | FULL | ADB `getprop` | No | No |
| **Installed Apps Inventory** | FULL | FULL | FULL | LIMITED (Package Visibility) | LIMITED (Package Visibility) | LIMITED (Package Visibility) | LIMITED (Package Visibility) | ADB `pm list packages` | No | No |
| **APK Pulling (non-system)** | FULL | FULL | FULL | FULL | FULL | FULL | FULL | ADB `pm path` + `pull` | No | No |
| **ADB Backup (.ab)** | FULL | FULL | LIMITED (Apps can opt-out) | DEPRECATED / LIMITED | RESTRICTED | RESTRICTED | RESTRICTED | ADB `backup` | No | No |
| **Dumpsys System State** | FULL | FULL | FULL | FULL | FULL | FULL | FULL | ADB `dumpsys` | No | No |
| **Logcat Collection** | FULL | FULL | FULL | FULL | FULL | FULL | FULL | ADB `logcat -d` | No | No |
| **App Permission Audit** | FULL | FULL | FULL | FULL | FULL | FULL | FULL | ADB `dumpsys package` | No | No |
| **App Usage Stats** | FULL | FULL | FULL | FULL | FULL | FULL | FULL | ADB `dumpsys usagestats` | No | No |
| **Battery & Power Stats** | FULL | FULL | FULL | FULL | FULL | FULL | FULL | ADB `dumpsys batterystats` | No | No |
| **Network Traffic Logging (Real-time)** | FULL | FULL | FULL | FULL | FULL | FULL | FULL | VpnService | No | **YES** (PCAPdroid/TC) |
| **DNS Tracker Detection** | FULL | FULL | FULL | FULL | FULL | FULL | FULL | VpnService | No | **YES** (TrackerControl) |
| **TLS/HTTPS Decryption** | LIMITED | LIMITED | LIMITED | LIMITED | LIMITED | LIMITED | LIMITED | mitmproxy + CA Cert | No | **YES** (PCAPdroid-mitm) |
| **Private App Database Access** | NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | Direct File Access | **YES** | No |
| **Browser History Extraction** | NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | File Pull | **YES** | No |
| **Retrospective Camera Log** | NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | LIMITED (AppOps) | LIMITED (AppOps) | LIMITED (AppOps) | LIMITED (AppOps) | AppOps / Dumpsys | No | No |
| **Retrospective Microphone Log**| NOT SUPPORTED | NOT SUPPORTED | NOT SUPPORTED | LIMITED (AppOps) | LIMITED (AppOps) | LIMITED (AppOps) | LIMITED (AppOps) | AppOps / Dumpsys | No | No |
| **Media File Metadata Scan** | FULL | FULL | FULL | LIMITED (Scoped Storage) | LIMITED (Scoped Storage) | LIMITED (Scoped Storage) | LIMITED (Scoped Storage) | MediaStore / ADB pull | No | No |
| **Static Code Analysis (APK)** | FULL | FULL | FULL | FULL | FULL | FULL | FULL | mobsfscan / dexlib2 | No | No |
| **Bugreport Extraction** | FULL | FULL | FULL | FULL | FULL | FULL | FULL | ADB `bugreport` | No | No |

---

## Android Version Breakdown & Limitations

### Android 8.0 / 8.1 Oreo (API 26-27)
- **Status**: OFFICIALLY SUPPORTED (Baseline minimum)
- **Full Capabilities**:
  - Full access to package lists via `pm list packages`.
  - ADB backup (`adb backup`) supported for most applications.
  - Complete `dumpsys` access for permissions, battery, usage, and netstats.
- **Limitations**:
  - No native Privacy Dashboard or camera/mic access indicators.
- **Root Requirements**:
  - Private app storage (`/data/data/<package>/`) requires root.

### Android 9 Pie (API 28)
- **Status**: OFFICIALLY SUPPORTED
- **Key Changes**:
  - Restricted access to `/proc/net` (requires netstats dumpsys).
  - Restrictions on non-standard SELinux domains.
- **Impact on ASF**: Network statistics must rely on `dumpsys netstats` rather than directly parsing `/proc/net/dev`.

### Android 10 (API 29)
- **Status**: OFFICIALLY SUPPORTED
- **Key Changes**:
  - Introduction of Scoped Storage (restricts direct filesystem navigation).
  - MAC address randomization for Wi-Fi connections.
  - ADB backup restrictions begin for certain system apps.
- **Impact on ASF**: Media forensics must rely on MediaStore database or user-granted storage access. Real MAC address cannot be retrieved via standard API.

### Android 11 (API 30)
- **Status**: OFFICIALLY SUPPORTED
- **Key Changes**:
  - **Package Visibility Restrictions**: Apps must declare `<queries>` tag to see other installed packages.
  - **ADB Backup Deprecation**: `adb backup` disabled by default for apps targeting API 30+ unless `android:allowBackup="true"` is explicitly declared.
  - AppOps framework expanded for location, camera, and microphone tracking.
- **Impact on ASF**:
  - ADB `pm list packages` still works over ADB connection.
  - ADB backup cannot be relied upon for arbitrary third-party application private data.
  - Camera and Microphone access history can be parsed from `dumpsys appops`.

### Android 12 / 12L (API 31-32)
- **Status**: OFFICIALLY SUPPORTED
- **Key Changes**:
  - Introduction of Privacy Dashboard (Camera, Mic, Location indicators).
  - Approximate vs. Precise location permissions.
  - Bluetooth permissions separated from Location.
- **Impact on ASF**:
  - Enhanced AppOps telemetry available in `dumpsys appops` for camera/mic indicators.
  - Companion apps (TrackerControl/PCAPdroid) must handle new foreground service requirements.

### Android 13 (API 33)
- **Status**: OFFICIALLY SUPPORTED
- **Key Changes**:
  - Granular Media Permissions (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`).
  - Notification Permission (`POST_NOTIFICATIONS`) required for foreground services.
  - Wi-Fi permission separated from Location (`NEARBY_WIFI_DEVICES`).
- **Impact on ASF**:
  - Companion APKs require explicitly requesting `POST_NOTIFICATIONS` for VPN background services.
  - Media scans over ADB remain functional.

### Android 14+ (API 34+)
- **Status**: OFFICIALLY SUPPORTED (VERIFIED COMPATIBILITY)
- **Key Changes**:
  - Stricter Foreground Service types (`FOREGROUND_SERVICE_SPECIAL_USE` for VpnService).
  - Minimum target SDK enforcement (blocks installation of very old APKs).
  - Enhanced app isolation and memory protection.
- **Impact on ASF**:
  - TrackerControl and PCAPdroid companion APKs must declare `FOREGROUND_SERVICE_SPECIAL_USE` in manifest (already present in both reference codebases).
  - ADB commands remain fully functional.

---

## Detailed Tool-Specific Compatibility

### 1. ALEAPP
- **OS Support**: Agnostic (analyzes extracted data).
- **Artifact Coverage**:
  - Android 8-10: 100% artifact module applicability.
  - Android 11-14+: Artifacts depend on extraction method (bugreport vs. backup vs. file pull).
- **Root Requirement**: NONE for public storage/bugreports; REQUIRED for `/data/data/` private databases.

### 2. TrackerControl
- **OS Support**: Android 5.0 (API 21) to Android 14+ (API 34+).
- **Target SDK**: API 34.
- **Root Requirement**: NONE (uses `VpnService`).
- **Limitations**:
  - Cannot intercept HTTPS content (DNS/SNI based only).
  - Requires user to install companion APK on target device.

### 3. PCAPdroid
- **OS Support**: Android 6.0 (API 23) to Android 14+ (API 34+).
- **Target SDK**: API 37.
- **Root Requirement**: NONE for standard VPN mode; OPTIONAL root mode for libpcap.
- **Limitations**:
  - TLS decryption requires installing mitmproxy add-on APK and user CA certificate installation.
  - Paid features (Firewall, Malware detection, PCAPNG) restricted by license key check.

### 4. MVT (Mobile Verification Toolkit)
- **OS Support**: Android 8.0+.
- **Root Requirement**: NONE for backup/bugreport analysis; REQUIRED for direct filesystem dumps.
- **Input Compatibility**:
  - `check-backup`: Android 8-10 (full), Android 11+ (limited).
  - `check-bugreport`: Android 8-14+ (full).
  - `check-androidqf`: Android 8-14+ (full).

### 5. mobsfscan
- **OS Support**: Agnostic (analyzes source code/APKs).
- **Root Requirement**: NONE.

### 6. androidqf
- **OS Support**: Android 8.0+.
- **Root Requirement**:
  - Baseline acquisition (getprop, packages, dumpsys, bugreport, APK pull, logcat): NO ROOT.
  - Advanced collection (browser history, Magisk modules): REQUIRES ROOT.

---

## Summary Status Labels for ASF Interface

When presenting features to the user, ASF must display exact capability labels:

- `SUPPORTED`: Feature works fully via ADB on target Android OS without root.
- `LIMITED CAPABILITY`: Feature works with restrictions (e.g., AppOps history instead of full camera log; backup restricted to allowed apps).
- `REQUIRES COMPANION APP`: Feature requires installing TrackerControl or PCAPdroid on device.
- `REQUIRES ROOT`: Feature cannot be performed without root access (e.g., private app DB access).
- `NOT SUPPORTED`: Feature is impossible on target OS version due to platform restrictions.

**NEVER generate simulated data under any circumstances.**