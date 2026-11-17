# Security & Privacy Audit

## Audit Overview

This audit evaluates all 6 reference repositories for potential security and privacy risks, specifically inspecting source code for:
- Telemetry & Analytics
- Automatic updates & network version checks
- External API calls & cloud uploads
- Crash reporting services (Sentry, Crashlytics, Firebase, etc.)
- Transmission of device metadata or forensic evidence

All findings are based strictly on static code analysis. No reference tools were executed during this audit.

---

## Detailed Repository Audit

### 1. ALEAPP
- **Location**: `d:\Saif\ASF Project\Reference-Tools\ALEAPP`
- **External Endpoints**: **NONE at runtime**. A search for network libraries (`requests`, `urllib`, `http.client`) in `scripts/artifacts/` returned zero matches for data transmission.
- **Build-time calls**: `packaging/build.py` uses `urllib.request.urlopen()` to download AppImage packaging tools during build time only.
- **Telemetry / Analytics**: **NONE**. Artifact scripts referencing "analytics" (e.g., `Spotify.py`, `VerizonRDDAnalytics.py`) are parsers that read local analytics files from target apps; they do not transmit anything.
- **Crash Reporting**: NONE.
- **User Consent**: N/A - tool works 100% offline against extracted files.
- **Classification**: **PRIVACY CLEAN**. Fully safe for air-gapped forensic operation.

---

### 2. TrackerControl
- **Location**: `d:\Saif\ASF Project\Reference-Tools\tracker-control-android-master`
- **External Endpoints**:
  - `DnsOverHttpsClient.java`: Connects to user-configured DoH endpoints (Google, Cloudflare, Quad9, or custom).
  - `MullvadProfileGenerator.java`: `https://api.mullvad.net` (optional WireGuard VPN profile generation).
  - `IvpnProfileGenerator.java`: `https://api.ivpn.net` (optional VPN profile generation).
  - `TrackerSignatureManager.java`: `https://reports.exodus-privacy.eu.org/api/trackers` (optional tracker signature updates).
  - `BlocklistManager.java`: Downloads default hosts file from `https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts` when triggered by user.
- **Telemetry / Analytics**: **NONE**. No telemetry or analytics SDKs embedded.
- **Crash Reporting**: NONE.
- **User Consent**: All network connections are explicitly user-initiated (enabling DoH, fetching blocklists, configuring VPN).
- **Classification**: **PRIVACY CLEAN (USER-INITIATED FEATURES ONLY)**. Core filtering logic works completely offline using bundled asset files (`xray-blacklist.json`, `trackers.json`, `hosts.txt`).

---

### 3. PCAPdroid
- **Location**: `d:\Saif\ASF Project\Reference-Tools\PCAPdroid-master`
- **External Endpoints**:
  - `GeoDbUpdater.java`: `https://download.db-ip.com/free/dbip-country-lite-*.mmdb.gz` (optional GeoIP database update).
  - `TCPDumper.java` / `UDPDumper.java`: User-configured collector IP/port for PCAP-over-IP export.
- **Telemetry / Analytics**: **NONE**.
- **Crash Reporting**: **NONE** (ErrorActivity handles unhandled exceptions locally by showing a UI log, not sending reports).
- **User Consent**: All network connections are user-configured (GeoIP download, PCAP streaming destination).
- **Classification**: **PRIVACY CLEAN (USER-INITIATED FEATURES ONLY)**. Packet capture and nDPI inspection function entirely locally on-device.

---

### 4. MVT (Mobile Verification Toolkit)
- **Location**: `d:\Saif\ASF Project\Reference-Tools\mvt-main`
- **External Endpoints**:
  - `updates.py`: Checks PyPI for MVT updates (`https://pypi.org/pypi/mvt/json`) and downloads STIX2 indicators from `https://raw.githubusercontent.com/mvt-project/mvt-indicators/main/indicators.yaml`.
  - `virustotal.py`: `https://www.virustotal.com/api/v3/files/{file_hash}` for file hash lookups when API key is provided.
- **Telemetry / Analytics**: **NONE**.
- **Update Checks**: **DEFAULT-ON**, but provides explicit CLI flags to disable: `--no-update-check` and `--no-indicator-update-check`.
- **User Data Transmission**: **NONE**. No device metadata, case information, or extracted evidence is ever uploaded.
- **User Consent**: Opt-out model for update checks; explicit opt-in (key configuration) for VirusTotal.
- **Classification**: **PRIVACY SAFE WITH OPT-OUT**. ASF adapter must pass `--no-update-check` and `--no-indicator-update-check` flags by default to guarantee complete offline operation.

---

### 5. mobsfscan
- **Location**: `d:\Saif\ASF Project\Reference-Tools\mobsfscan-main`
- **External Endpoints**:
  - `network.py`: When scanning Android manifests, if `android:autoVerify="true"` is set, it attempts to verify `https://<domain>/.well-known/assetlinks.json`.
  - **SSRF Hardening**: Implements strict checks rejecting internal/private/multicast/cloud metadata IPs (e.g., `169.254.169.254`, `168.63.129.16`) and pins connections to resolved public IPs.
- **Telemetry / Analytics**: **NONE**. Rules and standards definitions are 100% bundled locally within the package.
- **Crash Reporting**: NONE.
- **User Consent**: Scans operate locally. Assetlinks verification can be managed or isolated via network environment.
- **Classification**: **PRIVACY CLEAN (STATIC SCANNER WITH SSRF-PROTECTED ASSETLINKS CHECK)**.

---

### 6. androidqf
- **Location**: `d:\Saif\ASF Project\Reference-Tools\androidqf-main`
- **External Endpoints**: **NONE**. Zero external network connections. Communication is strictly via local ADB over USB or local socket.
- **Telemetry / Analytics**: **NONE**.
- **Crash Reporting**: NONE.
- **Encryption Security**: Features Age asymmetric encryption (`filippo.io/age`) with authenticated AES-SIV streaming buffer (`minio/sio`) so that evidence remains encrypted on disk.
- **User Consent**: N/A - fully local operation.
- **Classification**: **PRIVACY CLEAN (AIR-GAPPED COMPLIANT)**.

---

## Privacy Audit Summary Matrix

| Repository | Telemetry / Analytics | Cloud Upload | Crash Reporting | External Calls | Network Requirement | Privacy Rating |
|------------|-----------------------|--------------|-----------------|----------------|---------------------|----------------|
| **ALEAPP** | None | None | None | None | Fully Offline | **AIR-GAPPED CLEAN** |
| **TrackerControl** | None | None | None | Optional (DoH, blocklist update) | Offline Default | **USER-INITIATED ONLY** |
| **PCAPdroid** | None | None | None | Optional (GeoIP, PCAP export) | Offline Default | **USER-INITIATED ONLY** |
| **MVT** | None | None | None | Version/IOC check (opt-out), VT lookup | Offline with flags | **REQUIRES ADAPTER FLAGS** |
| **mobsfscan** | None | None | None | Assetlinks check (SSRF-protected) | Offline Default | **PRIVACY CLEAN** |
| **androidqf** | None | None | None | None | Fully Offline | **AIR-GAPPED CLEAN** |

---

## Enforcement in ASF Architecture

To guarantee strict compliance with **Non-Negotiable Rule #5 (No External Data Transmission)**:
1. **Network Isolation**: All ASF adapters running CLI tools (ALEAPP, MVT, mobsfscan, androidqf) will run with network egress disabled or with explicit offline flags (e.g., `--no-update-check`).
2. **Local Processing**: SQLite database storage, report generation, and timeline correlation will run 100% locally on the user's Windows 11 machine.
3. **Opt-In Database Updates**: Any future threat database updates must require explicit user action, explicit confirmation, and sanitized request logs without sending device metadata.