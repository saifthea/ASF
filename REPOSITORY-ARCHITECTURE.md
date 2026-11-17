# Repository Architecture Analysis

## 1. ALEAPP

### Overview
ALEAPP is a Python-based forensic analysis tool that processes disk images, backups, and extracted files from Android devices to extract artifacts.

### Entry Points
- **CLI**: `aleapp.py` - Command-line interface
- **GUI**: `aleappGUI.py` - Graphical user interface

### Module Structure
```
ALEAPP/
├── aleapp.py                    # CLI entry point
├── aleappGUI.py                 # GUI entry point
├── scripts/
│   ├── ilapfuncs.py            # Core helper functions
│   ├── lavafuncs.py            # LAVA format utilities
│   ├── version_info.py         # Version information
│   └── artifacts/              # 500+ artifact modules
│       ├── chrome.py
│       ├── gmail.py
│       ├── whatsapp.py
│       └── ... (500+ more)
├── leapp_functions/
│   ├── app/                    # Application-level functions
│   │   ├── artifact_result.py  # Artifact result handling
│   │   ├── output.py           # Output management
│   │   └── platform.py         # Platform detection
│   ├── data_sources/           # Data source handlers
│   │   ├── json_files.py       # JSON file processing
│   │   └── text_files.py       # Text file processing
│   └── lava_launcher.py        # LAVA integration
├── packaging/                  # Build and distribution
│   ├── build.py                # Build script
│   ├── entrypoint.py           # Entry point wrapper
│   └── aleapp.spec             # PyInstaller spec
└── admin/
    ├── scripts/                # Admin/CI scripts
    └── docs/                   # Documentation
```

### How It Works
1. **Input**: Accepts various input types:
   - Disk images (raw, EnCase, FTK, AFF, sparse, RAID, encrypted)
   - Tar/ZIP archives
   - Individual directories
   - Single files

2. **Processing**:
   - Detects input type using Seeker classes
   - Loads appropriate artifact modules
   - Each module extracts specific artifact types
   - Results are aggregated and formatted

3. **Output**:
   - HTML reports
   - TSV (Tab-Separated Values)
   - Timeline data
   - KML (Keyhole Markup Language) for geo data
   - LAVA format (for LEAPP/LAP integration)

### Key Dependencies
- Python 3.11+
- sqlcipher3 (for encrypted SQLite databases)
- protobuf (for Google protocol buffers)
- pillow (image processing)
- xlsxwriter (Excel export)
- simplekml (KML generation)
- mister_skinnylegs (ccl readers)

### Execution
```bash
# CLI
aleapp.exe -t <type> -i <input> -o <output>

# Type options:
# - type 1: Android backup (.ab)
# - type 2: Android file extraction
# - type 3: iPhone backup
# - etc.
```

### Build
- PyInstaller for Windows EXE
- AppImage for Linux
- DMG for macOS
- CI/CD via GitHub Actions

### Communication with Android
- **None direct** - ALEAPP processes extracted data, not live devices
- Requires prior extraction using tools like ADB, backup tools, or disk imaging

---

## 2. TrackerControl

### Overview
TrackerControl is an Android app (fork of NetGuard) that uses a local VPN service to intercept network traffic and identify trackers based on DNS queries and blocklists.

### Entry Points
- **Main Activity**: `ActivityMain` (LAUNCHER)
- **VPN Service**: `ServiceSinkhole` (extends VpnService)

### Module Structure
```
tracker-control-android-master/
├── app/
│   ├── src/main/
│   │   ├── java/
│   │   │   ├── eu/faircode/netguard/
│   │   │   │   ├── ServiceSinkhole.java    # Core VPN service
│   │   │   │   ├── ActivityMain.java       # Main activity
│   │   │   │   ├── ActivitySettings.java   # Settings
│   │   │   │   └── ... (other activities)
│   │   │   └── net/kollnig/missioncontrol/
│   │   │       ├── data/
│   │   │       │   ├── TrackerList.java    # Blocklist engine
│   │   │       │   ├── Tracker.java        # Tracker data model
│   │   │       │   ├── TrackerBlocklist.java
│   │   │       │   ├── BlockingModeLogic.java
│   │   │       │   └── BlocklistManager.java
│   │   │       ├── dns/
│   │   │       │   └── DnsProxyServer.java # Local DoH proxy
│   │   │       ├── wg/
│   │   │       │   ├── WgEgress.kt         # WireGuard management
│   │   │       │   └── WgConfig.kt         # WireGuard config parser
│   │   │       ├── analysis/
│   │   │       │   ├── TrackerAnalysisManager.java
│   │   │       │   └── TrackerSignatureManager.java
│   │   │       └── ... (other modules)
│   │   ├── assets/
│   │   │   ├── xray-blacklist.json         # X-Ray tracker list
│   │   │   ├── disconnect-blacklist.reversed.json
│   │   │   ├── duckduckgo-android-tds.json
│   │   │   ├── trackers.json               # Exodus Privacy
│   │   │   └── GeoLite2-Country.mmdb       # GeoIP database
│   │   └── AndroidManifest.xml
│   └── jni/
│       ├── netguard.h          # Native packet engine
│       ├── ip.c                # IP packet routing
│       ├── dns.c               # DNS processing
│       ├── tls.c               # TLS SNI extraction
│       └── policy.c            # Routing policies
├── wgbridge-rs/
│   ├── wgbridge/               # WireGuard bridge (Rust)
│   └── tc-dns/                 # DNS parser (Rust)
├── docs/                       # Doxygen documentation
└── scripts/                    # Utility scripts
```

### How It Works
1. **VPN Setup**:
   - `ServiceSinkhole` creates a TUN device via VpnService API
   - All device traffic flows through the virtual network interface
   - Native C code inspects IP packets

2. **Tracker Detection**:
   - **DNS-based**: Matches DNS query names against blocklists
   - **IP-based**: Matches resolved A-records against tracker IPs
   - **SNI extraction** (optional): Parses TLS ClientHello for Server Name Indication
   - **Static analysis**: Uses Exodus Privacy signatures to detect tracker libraries in APKs

3. **Blocking**:
   - Three modes: Minimal, Standard, Strict
   - Per-app and per-tracker whitelists
   - Can route traffic through WireGuard tunnels (optional)

### Key Components
- **TrackerList.java**: Core blocklist engine with `findTracker()` method
- **ServiceSinkhole.java**: Main VPN service handling packet inspection
- **WgEgress.kt**: Manages WireGuard tunnel lifecycle
- **DnsProxyServer.java**: Local DNS-over-HTTPS proxy

### Blocklist Sources
1. X-Ray project (~1M apps analyzed)
2. Disconnect Tracker List (Mozilla/Firefox)
3. DuckDuckGo Tracker Radar
4. Steven Black's hosts file
5. Exodus Privacy (for static analysis)

### Build
- Gradle + Android SDK
- Rust toolchain for wgbridge-rs
- Native C compilation via CMake

### Communication with Android
- **On-device**: Runs as Android app using VpnService API
- **No external server by default**: All processing is local
- **Optional remote VPN**: Can route through Mullvad/IVPN/WireGuard

---

## 3. PCAPdroid

### Overview
PCAPdroid is an Android app that captures network traffic using a simulated VPN, records to PCAP files, and provides deep packet inspection using nDPI.

### Entry Points
- **Main Activity**: `MainActivity`
- **Capture Service**: `CaptureService` (extends VpnService)

### Module Structure
```
PCAPdroid-master/
├── app/src/main/
│   ├── java/com/emanuelef/remote_capture/
│   │   ├── CaptureService.java       # Core VPN capture service
│   │   ├── MainActivity.java         # Main UI
│   │   ├── activities/
│   │   │   ├── CaptureCtrl.java      # API control activity
│   │   │   ├── StatsActivity.java    # Statistics
│   │   │   ├── SettingsActivity.java # Settings
│   │   │   └── ... (other activities)
│   │   ├── pcap_dump/
│   │   │   ├── TCPDumper.java        # TCP PCAP export
│   │   │   ├── UDPDumper.java        # UDP PCAP export
│   │   │   └── FileDumper.java       # File PCAP dump
│   │   ├── mitm/
│   │   │   └── MitmAPI.java          # mitmproxy AIDL interface
│   │   └── ... (other modules)
│   ├── jni/
│   │   ├── core/
│   │   │   ├── capture_vpn.c         # VPN capture implementation
│   │   │   ├── capture_pcap.c        # PCAP recording
│   │   │   ├── ndpi_config.c         # nDPI protocol config
│   │   │   └── CMakeLists.txt
│   │   ├── pcapd/
│   │   │   └── pcapd.c               # Root-mode libpcap daemon
│   │   └── common/                   # Shared utilities
│   └── AndroidManifest.xml
├── submodules/
│   ├── nDPI                          # Deep packet inspection library
│   ├── zdtun                         # TUN/TAP interface
│   ├── libpcap                       # Packet capture library
│   ├── PCAPdroid-mitm                # mitmproxy add-on
│   └── PCAPdroid-ushark-bin          # TLS decryption tool
├── docs/
│   └── app_api.md                    # Third-party API documentation
└── tools/
    └── pcapdroid_mitm.py             # mitmproxy plugin
```

### How It Works
1. **Traffic Capture**:
   - `CaptureService` creates VPN tunnel via VpnService
   - Native C code (`capture_vpn.c`) captures packets
   - nDPI performs deep packet inspection to identify protocols

2. **Data Recording**:
   - PCAP file mode: Writes to local file
   - TCP/UDP exporter: Streams packets to remote collector
   - HTTP server mode: Serves captured data via HTTP
   - PCAP-over-IP: Real-time streaming to Wireshark

3. **TLS Decryption**:
   - Uses mitmproxy add-on (separate APK)
   - Generates SSLKEYLOGFILE with master secrets
   - Ushark decrypts TLS flows in PCAP files

4. **Protocol Identification**:
   - nDPI identifies ~30 protocols (DNS, HTTP, FTP, SMTP, etc.)
   - Attaches protocol info to captured connections

### Key Features
- **Non-root**: Uses VpnService (no root required)
- **Root mode**: Optional libpcap daemon for advanced capture
- **App filtering**: Capture specific apps' traffic
- **Malware detection**: Paid feature using blocklists
- **Firewall**: Paid feature for traffic blocking

### Build
- Android Gradle Plugin
- CMake for native code
- Git submodules for nDPI, zdtun, libpcap

### Communication with Android
- **On-device**: Android app using VpnService
- **API integration**: Intent-based control via `CaptureCtrl` activity
- **Remote export**: TCP/UDP/HTTP streaming to external collectors

---

## 4. MVT (Mobile Verification Toolkit)

### Overview
MVT is a Python-based CLI forensic toolkit that analyzes Android/iOS backups, bugreports, and filesystem dumps to detect spyware (e.g., Pegasus) using Indicators of Compromise (IOCs).

### Entry Points
- **Main CLI**: `mvt` (version, completion, plugins, download-iocs)
- **Android**: `mvt-android` (check-backup, check-bugreport, check-androidqf, check-intrusion-logs)
- **iOS**: `mvt-ios` (check-backup, check-fs, check-sysdiagnose, decrypt-backup)

### Module Structure
```
mvt-main/
├── pyproject.toml                # Python packaging config
├── src/mvt/
│   ├── cli.py                    # Top-level CLI
│   ├── android/
│   │   ├── cli.py                # Android CLI
│   │   ├── cmd_check_backup.py   # Check backup
│   │   ├── cmd_check_bugreport.py
│   │   ├── cmd_check_androidqf.py
│   │   ├── cmd_check_intrusion_logs.py
│   │   ├── modules/              # Forensic check modules
│   │   │   ├── androidqf/
│   │   │   ├── backup/
│   │   │   ├── bugreport/
│   │   │   └── intrusion_logs/
│   │   └── parsers/              # Data parsers
│   ├── ios/
│   │   ├── cli.py                # iOS CLI
│   │   ├── cmd_check_backup.py
│   │   ├── cmd_check_fs.py
│   │   ├── cmd_check_sysdiagnose.py
│   │   ├── decrypt.py            # Backup decryption
│   │   └── modules/
│   │       ├── backup/
│   │       ├── fs/
│   │       ├── mixed/
│   │       └── sysdiagnose/
│   └── common/
│       ├── module_loader.py      # Plugin loading
│       ├── cmd_check_iocs.py     # IOC checking logic
│       ├── updates.py            # IOC download and updates
│       └── virustotal.py         # VirusTotal integration
├── tests/                        # Test suite
└── docs/                         # MkDocs documentation
```

### How It Works
1. **Input**: Accepts various forensic artifacts:
   - Android backups (.ab files)
   - Bugreport ZIP files
   - androidqf acquisition archives
   - AAPM intrusion logs
   - iOS backups (encrypted/unencrypted)
   - iOS filesystem dumps
   - iOS sysdiagnose archives

2. **Processing**:
   - Loads platform-specific modules
   - Each module checks for specific indicators
   - Uses Aho-Corasick algorithm for fast IOC matching
   - Compares findings against STIX2 indicator files

3. **Output**:
   - CLI reports with color coding
   - Optional JSON output
   - VirusTotal hash lookups (if API key provided)

### Plugin Architecture
- **Built-in modules**: Shipped with MVT
- **Installed plugins**: Python packages with `mvt.modules` entry points
- **Custom modules**: Loaded from file paths via `--load-module`

### IOC Management
- Downloads from `https://raw.githubusercontent.com/mvt-project/mvt-indicators/main/indicators.yaml`
- Supports GitHub-hosted and direct URL sources
- Cached locally, updated every 12 hours
- Can be disabled with `--no-indicator-update-check`

### Build
- Python 3.10+
- pip install from source or PyPI
- Docker images available

### Communication with Android
- **None direct** - MVT analyzes extracted data, not live devices
- Requires prior acquisition using tools like androidqf, ADB backup, or bugreport

---

## 5. mobsfscan

### Overview
mobsfscan is a Python static analysis tool that uses Semgrep and libsast to scan Android/iOS source code for security vulnerabilities and misconfigurations.

### Entry Points
- **CLI**: `python -m mobsfscan` or `mobsfscan` command
- **Python API**: `from mobsfscan.mobsfscan import MobSFScan`

### Module Structure
```
mobsfscan-main/
├── setup.py                      # Package setup
├── requirements.txt              # Dependencies
├── mobsfscan/
│   ├── __init__.py               # Package metadata (v1.1.0)
│   ├── __main__.py               # CLI entry point
│   ├── mobsfscan.py              # Core scanner (MobSFScan class)
│   ├── settings.py               # Constants and defaults
│   ├── utils.py                  # Configuration and utilities
│   ├── manifest.py               # Android manifest parser
│   ├── manifest_metadata.py      # Manifest metadata checks
│   ├── ios_plist.py              # iOS Info.plist parser
│   ├── network.py                # Assetlinks verification
│   ├── formatters/
│   │   ├── cli.py                # CLI output
│   │   ├── json_fmt.py           # JSON output
│   │   ├── sarif.py              # SARIF 2.1.0 output
│   │   ├── gitlab_sast.py        # GitLab SAST format
│   │   └── sonarqube.py          # SonarQube format
│   └── rules/
│       ├── semgrep/
│       │   ├── java/             # Java Semgrep rules
│       │   ├── kotlin/           # Kotlin Semgrep rules
│       │   ├── swift/            # Swift Semgrep rules
│       │   └── best_practices/   # Best practice rules
│       └── patterns/
│           └── ios/objectivec/   # Objective-C pattern rules
├── tests/                        # Test suite
└── Dockerfile                    # Docker image
```

### How It Works
1. **Input**: Accepts file or directory paths containing:
   - Android source code (Java, Kotlin, XML)
   - iOS source code (Swift, Objective-C, Info.plist)

2. **Processing**:
   - **Semgrep**: Runs Semgrep rules against Java/Kotlin/Swift files
   - **Pattern matcher**: Uses libsast regex rules for Objective-C
   - **Manifest parser**: Checks AndroidManifest.xml for security issues
   - **Info.plist parser**: Checks iOS App Transport Security settings
   - **Best practice inversion**: Detects missing security controls

3. **Output**:
   - CLI (color-coded table)
   - JSON
   - SARIF 2.1.0
   - GitLab SAST
   - SonarQube
   - HTML

### Key Features
- **Multi-language**: Java, Kotlin, Swift, Objective-C
- **No network calls**: All rules bundled locally (except assetlinks check)
- **Configuration**: `.mobsf` YAML file for ignore rules and severity overrides
- **CI/CD ready**: Integrates with GitHub Actions, GitLab CI, SonarQube

### Dependencies
- Python 3.10-3.14
- semgrep 1.172.0
- libsast 3.1.9
- sarif-om 1.0.4
- xmltodict 1.0.4
- tabulate, colorama (CLI)

### Build
- pip install from source or PyPI
- Docker image available
- GitHub Action available

### Communication with Android
- **None** - Pure static analysis tool
- Analyzes source code files, not live devices

---

## 6. androidqf (Android Quick Forensics)

### Overview
androidqf is a Go-based CLI tool that performs forensic data acquisition from Android devices via ADB, producing ZIP archives (optionally age-encrypted) for analysis with MVT.

### Entry Points
- **Main CLI**: `main.go` - Flag parsing and orchestration

### Module Structure
```
androidqf-main/
├── go.mod                        # Go module definition
├── main.go                       # Entry point and CLI
├── acquisition/
│   ├── acquisition.go            # Acquisition logic
│   ├── streaming_zip.go          # ZIP writer with age encryption
│   ├── streaming_buffer.go       # Streaming buffer
│   └── key.go                    # Age key discovery
├── adb/
│   ├── adb.go                    # ADB client wrapper
│   ├── collector.go              # android-collector management
│   ├── files.go                  # File listing/syncing
│   ├── packages.go               # Package enumeration
│   ├── host_key.go               # ADB host key handling
│   ├── adb_darwin.go             # macOS ADB
│   ├── adb_linux.go              # Linux ADB
│   └── adb_windows.go            # Windows ADB
├── modules/
│   ├── modules.go                # Module registry
│   ├── backup.go                 # ADB backup (.ab)
│   ├── packages.go               # Installed apps + APK download
│   ├── dumpsys.go                # Full dumpsys capture
│   ├── getprop.go                # System properties
│   ├── intrusion_logs.go         # AAPM intrusion logs
│   ├── bugreport.go              # Bugreport generation
│   ├── apex.go                   # APEX packages
│   ├── magisk_modules.go         # Magisk metadata (root)
│   ├── browser_history.go        # Browser DBs (root)
│   ├── processes.go              # Running processes
│   ├── services.go               # Service status
│   ├── selinux.go                # SELinux policy
│   ├── init_scripts.go           # Init script collection
│   ├── settings.go               # Device settings
│   ├── env.go                    # Environment variables
│   ├── root_binaries.go          # Root detection
│   ├── mounts.go                 # Mount table
│   ├── logcat.go                 # Logcat buffer
│   └── logs.go                   # System logs
├── utils/                        # Helper utilities
├── log/                          # Structured logging
├── assets/                       # Bundled ADB binaries
└── android-collector/            # Native binary for device
    └── cmd/find.go               # Efficient file listing
```

### How It Works
1. **Connection**:
   - Uses embedded ADB binary (platform-specific)
   - Supports USB and network (`-connect ip:port`)
   - Device selection via `-serial` flag

2. **Data Acquisition**:
   - Runs 22 modules to collect different data types
   - Streams data into ZIP archive
   - Optional age encryption for output

3. **Output**:
   - Single ZIP archive containing all collected data
   - Optional age encryption
   - Compatible with MVT for analysis

### Data Extracted
- `backup.ab` - Android backup
- `getprop.txt` - System properties
- `dumpsys.txt` - Full dumpsys output
- `packages.json` - Installed packages
- `apks/` - Downloaded APK files
- `apex/` - APEX package listing
- `intrusion_logs/` - AAPM intrusion detection logs
- `magisk_modules/` - Magisk metadata (root required)
- `browser_history/` - Browser databases (root required)
- `processes.json` - Running processes
- `services.txt` - Service status
- `selinux/` - SELinux policy and status
- `settings_*.txt` - Device settings (secure, system, global)
- `init_scripts/` - Init script files
- `logs/` - System logs and logcat
- `bugreport.zip` - Full bugreport

### CLI Flags
```
-verbose/-v          Verbose output
-fast/-f             Fast mode (skip expensive operations)
-list/-l             List modules
-module <name>       Run specific module
-output <path>       Output directory
-serial <id>         Device serial
-connect <ip:port>   Network connection
-backup <sms|all|none>   Backup scope
-download <all|non-system|none>  APK download
-remove-trusted <yes|no>        Skip trusted APKs
-intrusion-logs <yes|no>        Collect intrusion logs
-hash-files <yes|no>            On-device file hashing
-browser-history <yes|no>       Collect browser DBs (root)
-magisk-modules <yes|no>        Collect Magisk metadata (root)
-non-interactive/-n              No prompts
```

### Build
- Go 1.27.3+
- GoReleaser for cross-platform binaries
- Makefile for local builds
- Docker container available

### Communication with Android
- **Direct ADB**: Uses embedded ADB binary
- **USB or network**: Supports both connection methods
- **Root optional**: Some modules require root (browser history, Magisk)

---

## Summary Comparison

| Repository | Type | Platform | Direct Device Access | Output Format |
|------------|------|----------|---------------------|---------------|
| ALEAPP | Forensic analyzer | Desktop (Win/Linux/Mac) | No (processes extracted data) | HTML, TSV, Timeline, KML, LAVA |
| TrackerControl | Network tracker | Android app | Yes (VpnService) | Local logs, CSV export |
| PCAPdroid | Packet capture | Android app | Yes (VpnService) | PCAP, PCAPNG, HAR, streaming |
| MVT | Spyware detector | Desktop (Win/Linux/Mac) | No (processes acquired data) | CLI, JSON, VirusTotal lookup |
| mobsfscan | Static analysis | Desktop (Win/Linux/Mac) | No (analyzes source code) | CLI, JSON, SARIF, HTML, SonarQube |
| androidqf | Data acquisition | Desktop (Win/Linux/Mac) | Yes (ADB) | ZIP archive (age-encrypted) |