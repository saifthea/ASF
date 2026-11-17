# Technical Limitations & Risk Assessment

## Executive Summary

This document defines the hard technical boundaries of the ASF platform when operating under the baseline constraints: **Android 8.0+, USB/ADB connection, no root, Windows 11 host**. Every limitation listed here is a platform or tooling constraint that ASF must surface transparently to the investigator via `NOT SUPPORTED` or `LIMITED CAPABILITY` status labels. **ASF must never simulate or fabricate data to mask these limitations.**

---

## 1. ADB Without Root — What Is IMPOSSIBLE

### 1.1 Access to Private App Databases
- **Limitation**: Files under `/data/data/<package>/` (app private databases, SharedPreferences, caches) are owned by the app UID and protected by Android's filesystem permissions. ADB `adb pull` will fail with "Permission denied" on non-rooted devices.
- **Impact on ASF Modules**: Application Analyzer (deep DB inspection), Data Leakage Analyzer (local message stores), Camera/Microphone Forensics (app-specific logs).
- **Workaround Available**:
  - `adb backup` (limited to apps with `allowBackup=true`; largely unusable on Android 11+ for arbitrary third-party apps).
  - Bugreport-based extraction (contains only sanitized subsets, not full databases).
  - If the app has a file provider or exports to shared storage, specific files may be accessible.
- **Status Label**: `NOT SUPPORTED` (without root); `LIMITED CAPABILITY` where partial data is reachable.

### 1.2 Reading HTTPS Content
- **Limitation**: ADB has no mechanism to intercept or decrypt encrypted TLS traffic. Content of HTTPS sessions is unreadable without either:
  - A user-installed CA certificate on the device + a man-in-the-middle proxy (PCAPdroid-mitm add-on), **and**
  - The target app not using certificate pinning (most security-conscious apps pin, defeating MITM entirely).
- **Impact on ASF Modules**: Network Traffic Analyzer (payload level), Data Leakage Analyzer (content verification), Malware Behavior Detection (C2 communication content).
- **What CAN be seen without decryption**: DNS queries (domain names), TLS SNI (server names, research mode), connection endpoints, IP/ASN, timing, volume. This is metadata — not content.
- **Status Label**: `NOT SUPPORTED` for payload content; `LIMITED CAPABILITY` for metadata-level analysis.

### 1.3 Retrospective Camera Activity History
- **Limitation**: Android does not maintain a universal, queryable camera-usage history accessible via ADB. What is available:
  - **Android 12+**: Privacy Dashboard camera usage indicators — but these are session summaries, not a complete forensic log, and cannot be fully extracted via plain ADB `dumpsys appops` on all OEM builds.
  - **All versions**: `dumpsys appops` shows current permission state (allowed/denied/ignored) and limited access counters, not a timestamped retrospective event log.
  - **Photo artifacts**: Recently captured images/videos in MediaStore or camera app folders can *infer* camera use indirectly, but cannot prove when/what was captured.
- **Impact on ASF Modules**: Camera Forensics.
- **Status Label**: `LIMITED CAPABILITY` (current state + indirect inference); `NOT SUPPORTED` for complete retrospective timeline.

### 1.4 Retrospective Microphone Activity History
- **Limitation**: Same as camera — no universal ADB-accessible mic-usage event log. `dumpsys appops` (`OP_RECORD_AUDIO`) shows state/usage counters, not a forensic timeline. Android 12+ indicators are user-facing only.
- **Impact on ASF Modules**: Microphone Forensics.
- **Status Label**: `LIMITED CAPABILITY`.

### 1.5 Verifying Specific Data Was Sent Over Network
- **Limitation**: ASF cannot retroactively confirm that a specific image/document was exfiltrated over the network, because:
  - Traffic capture is only possible **prospectively** (from the moment capture starts) via PCAPdroid/TrackerControl on-device.
  - Encrypted content cannot be matched to specific files even during capture (see 1.2).
  - Local deletion of a file leaves no universal audit trail in ADB-accessible stores.
- **What CAN be done**: Prospective capture starting at investigation time can record the *connection* (app, destination, time, volume) during which a transfer could have occurred. Correlation with app behavior logs is probabilistic, not conclusive.
- **Status Label**: `LIMITED CAPABILITY` (prospective, metadata-level only).

---

## 2. Platform/Version-Induced Limitations

| Limitation | Affected Android Versions | Detail |
|-----------|---------------------------|--------|
| Package visibility restrictions | 11+ | Companion apps need `<queries>` declarations to enumerate other apps. ADB (`pm list packages`) is unaffected. |
| ADB backup deprecation | 11+ | `adb backup` no longer works for most third-party apps; private data acquisition via backup is effectively dead. |
| Scoped Storage | 10+ | Direct filesystem enumeration of app-adjacent user files is restricted; MediaStore is the sanctioned access path. |
| Randomized MAC address | 10+ | Wi-Fi MAC cannot be used as a stable device fingerprint. |
| Foreground service restrictions | 14+ | Companion VPN apps require `FOREGROUND_SERVICE_SPECIAL_USE` declaration (already present in TrackerControl and PCAPdroid). |
| Notification permission | 13+ | Companion apps require `POST_NOTIFICATIONS` for VPN background service to remain visible; without it, capture may be blocked. |
| AppOps history granularity | Varies by OEM | OEM skins (OneUI, MIUI, ColorOS) alter `dumpsys appops` output; PENDING VERIFICATION per OEM. |

---

## 3. Tool-Specific Limitations

### 3.1 ALEAPP
- Cannot run against a live device — requires prior extraction (bugreport, backup, file pull, or disk image).
- Artifact module coverage is per-app; apps without a dedicated module yield only generic artifact coverage.
- Encrypted app databases (SQLCipher) require keys/PRAGMAs that are often unobtainable without root.

### 3.2 MVT
- Designed by its maintainers for **consensual use only** (MVT License 1.1, Section 3.0). Adversarial forensics without the data owner's consent is **prohibited by the license**, not just by policy.
- Detection is IOC-based: known spyware signatures only. Zero-day or heavily obfuscated implants may be missed.
- Update checks are default-on in the CLI; ASF must always pass `--no-update-check` / `--no-indicator-update-check` to enforce Rule 5.

### 3.3 TrackerControl
- Attribution is **global, not per-app**: DNS-based detection cannot always attribute a tracker connection to the specific app that initiated it (known limitation documented in the project).
- No SSL/TLS interception by design — domain-level detection only (DNS + optional SNI).
- Requires the companion app to be installed and VPN profile authorized by the device user on the target device.
- Optional remote routing features (Mullvad/IVPN/WireGuard) must be **disabled in ASF integration** — they would route the user's traffic through third-party infrastructure, violating Rule 5.

### 3.4 PCAPdroid
- TLS decryption requires the separate mitm add-on APK **and** user installation of a CA certificate on the device — both require on-device user interaction.
- Certificate-pinned apps defeat decryption entirely.
- Firewall, malware detection, and PCAPNG export are **paid features** (billing SKUs) — availability depends on the user's license; ASF must detect and report this, not assume it.
- QUIC traffic may not be fully decodable unless QUIC is blocked/redirected (`block_quic` setting).
- PCAP-over-IP export must be configured to stream **only to the local ASF host** (127.0.0.1 or LAN) — never to an external collector.

### 3.5 mobsfscan
- Static analysis only: no dynamic/behavioral findings. An app can pass static scan and still behave maliciously.
- The assetlinks verification feature performs live HTTP GET requests to domains found in scanned manifests — ASF must disable or sandbox this step for untrusted APKs on segmented networks.
- Detection quality depends on rule recency; rules are bundled and do not auto-update (offline-safe, but can lag new vulnerability patterns).

### 3.6 androidqf
- Baseline acquisition (non-root) does **not** include browser history or Magisk modules — both require root and must be presented as optional.
- APK extraction from `/data/app/` via ADB works on most devices but some OEMs/versions block it; `PENDING VERIFICATION` per device model.
- File hashing on-device is resource-intensive and may be skipped in fast mode — evidence integrity workflow must account for this.

---

## 4. Integration Risk Assessment

### 4.1 License Risk
- **MVT License 1.1 (MVT, androidqf)**: Strictly incompatible with GPL/LGPL code. ASF must run these as separate processes and must document the consensual-use restriction in ASF's own terms.
- **GPLv3 (TrackerControl, PCAPdroid)**: No code copying into ASF. Only data-level integration (blocklists consumed as data, companion app control via ADB/Intent) is permitted.
- **LGPL-3.0 (mobsfscan)**: CLI subprocess invocation is compliant; embedding the Python library into ASF's runtime would require LGPL obligations — avoided by design.
- **MIT (ALEAPP)**: Free to invoke and adapt; attribution must be preserved.

### 4.2 Privacy Risk (mitigations defined)
- MVT's default update checks → adapter flags disabled.
- mobsfscan assetlinks fetches → adapter disables/sandboxes.
- PCAPdroid remote export → adapter binds to localhost only.
- TrackerControl remote VPN routing → adapter disables the feature.
- ALEAPP / androidqf → no network paths; no mitigation needed.

### 4.3 Operational Risk
- **Device state mutation**: Forensic acquisition (backups, log dumps, bugreport generation) can modify device state (e.g., backup completion flags, logcat buffer read markers). ASF must document each acquisition action's side effects before execution and obtain user acknowledgment.
- **Long-running captures**: Real-time traffic capture on-device can drain battery and trigger Android battery optimization to kill the companion app; ASF must warn the user and disable battery optimization for the companion where possible (requires user action).
- **Multiple devices / unstable USB**: ADB disconnections during acquisition corrupt evidence packages; adapters must verify archive integrity (zip test / age verification) post-acquisition.

### 4.4 Evidence Integrity
- All acquisition outputs must be hashed (SHA-256) at write time by the ASF adapter layer and stored in the local SQLite evidence registry.
- No tool in the current set provides built-in chain-of-custody; ASF must implement its own metadata layer (hash, timestamp, method, operator).

---

## 5. Items PENDING VERIFICATION

1. OEM-specific `dumpsys appops` output formats (Samsung OneUI, Xiaomi MIUI, Oppo ColorOS) — must be verified on physical devices per target model.
2. APK pull success rate (`/data/app/`) on Android 14+ across major OEM builds.
3. `adb backup` residual capability on Android 12/13 for user-installed apps targeting older SDKs.
4. Exact bugreport artifact availability differences between Android 8.0 and Android 14 (some sections renamed/removed).
5. PCAPdroid free-version feature boundaries (which dump modes are locked behind billing) — verified in code (`Billing.java`) but final behavior requires runtime confirmation on a physical device.
6. TrackerControl attribution accuracy in multi-app concurrent network sessions.
7. QUIC traffic handling effectiveness of PCAPdroid on recent Android versions with QUIC-dominant CDNs.
8. ALEAPP artifact module applicability to files acquired via ADB file pull vs. backup vs. bugreport (different path layouts per acquisition method).
9. Performance of androidqf non-interactive mode on low-end Android 8.0 devices (timeout behavior).
10. MVT indicator coverage scope for Android spyware (current IOC set recency at time of integration).

**All of the above require physical device testing in a later phase. None may be used to generate simulated data.**