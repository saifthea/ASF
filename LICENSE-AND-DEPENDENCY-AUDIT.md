# License and Dependency Audit

## License Summary

| Repository | Primary License | Copyright Holder | License Restrictions | Redistribution Requirements |
|------------|-----------------|------------------|---------------------|-----------------------------|
| ALEAPP | MIT License | Alexis Brignoni (2020) | None | Include copyright notice |
| TrackerControl | GPLv3 | Marcel Kollnig | Copyleft (source code distribution) | Disclose source, same license for derivative works |
| PCAPdroid | GPLv3 | Emanuele Faranda | Copyleft (source code distribution) | Disclose source, same license for derivative works |
| MVT | MVT License 1.1 | Amnesty International / Claudio Guarnieri | Consensual Use Restriction (Section 3.0) | Retain license, obtain data owner consent |
| mobsfscan | LGPL-3.0+ | MobSF | Library modification (source code distribution for lib) | Disclose library source, allow relinking |
| androidqf | MVT License 1.1 | Amnesty International / Claudio Guarnieri | Consensual Use Restriction (Section 3.0) | Retain license, obtain data owner consent |

---

## Detailed License & Dependency Audit by Repository

### 1. ALEAPP

#### Primary License
- **License**: MIT License
- **Copyright**: Copyright (c) 2020 Alexis Brignoni
- **License Text Location**: `d:\Saif\ASF Project\Reference-Tools\ALEAPP\LICENSE`

#### Third-Party Dependencies & Licenses
- **sqlcipher3**: BSD-style / SQLite license
- **protobuf**: BSD 3-Clause
- **pillow**: HPND (Historical Permission Notice and Disclaimer)
- **xlsxwriter**: BSD 2-Clause
- **simplekml**: LGPL-3.0
- **mister_skinnylegs**: MIT / BSD
- **beautifulsoup4**: MIT
- **bencoding**: BitTorrent Open Source License
- **cobble**: MIT
- **hexdump**: WTFPL
- **pathlib2**: MIT

#### License Compatibility & Risks
- **Compatibility**: Highly compatible. MIT is permissive and allows integration with closed-source, commercial, GPL, and LGPL software.
- **Attribution Obligations**: Include original copyright notice in documentation or about screen.
- **Risk Level**: LOW

---

### 2. TrackerControl

#### Primary License
- **License**: GNU General Public License v3.0 (GPLv3)
- **Copyright**: Copyright (C) Marcel Kollnig
- **License Text Location**: `d:\Saif\ASF Project\Reference-Tools\tracker-control-android-master\LICENSE`

#### Third-Party Dependencies & Licenses
- **NetGuard (fork base)**: GPLv3
- **wgbridge-rs / gotatun**: MIT / Apache-2.0 (Mullvad)
- **tc-dns**: MIT / Apache-2.0
- **MaxMind GeoLite2**: Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
- **Exodus Privacy signatures**: MIT
- **Disconnect blocklist**: GPLv3
- **DuckDuckGo TDS**: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (CC BY-NC-SA 4.0)
- **Steven Black hosts**: MIT

#### License Compatibility & Risks
- **Compatibility Concerns**:
  - GPLv3 is a strong copyleft license. If ASF directly links or integrates code from TrackerControl as a library, ASF must be licensed under GPLv3 and release all source code.
  - Integration as a separate CLI or process, or adapting algorithms without copying code, can avoid GPL contamination.
- **Attribution Obligations**: Retain copyright notices, include GPLv3 license text, provide access to source code if distributed.
- **Risk Level**: HIGH (if code is directly copied/linked); LOW (if integrated as separate process/CLI or reference only)

---

### 3. PCAPdroid

#### Primary License
- **License**: GNU General Public License v3.0 (GPLv3)
- **Copyright**: Copyright (C) Emanuele Faranda
- **License Text Location**: `d:\Saif\ASF Project\Reference-Tools\PCAPdroid-master\COPYING`

#### Third-Party Dependencies & Licenses
- **nDPI**: LGPL-3.0
- **zdtun**: GPLv3
- **libpcap**: BSD 3-Clause
- **MaxMind-DB-Reader-java**: Apache-2.0
- **mitmproxy**: MIT
- **ushark**: GPLv3 / MIT

#### License Compatibility & Risks
- **Compatibility Concerns**:
  - GPLv3 copyleft constraints (same as TrackerControl).
  - nDPI is LGPL-3.0, which is compatible with GPLv3.
- **Attribution Obligations**: Retain copyright notices, include GPLv3 license text, provide access to source code if distributed.
- **Risk Level**: HIGH (if code is directly copied/linked); LOW (if integrated as separate process/CLI or API caller)

---

### 4. MVT (Mobile Verification Toolkit)

#### Primary License
- **License**: MVT License 1.1 (Adaptation of Mozilla Public License 2.0 with Consensual Use Restriction)
- **Copyright**: Copyright (c) Amnesty International / Claudio Guarnieri
- **License Text Location**: `d:\Saif\ASF Project\Reference-Tools\mvt-main\LICENSE`

#### Critical License Clauses
- **Section 3.0 "Consensual Use Restriction"**:
  > "The Licensed Work and any Derivative Works may only be used to process, analyze, or inspect data, systems, or devices where the explicit, informed, and voluntary consent of the owner or authorized user of that data, system, or device has been obtained prior to such use."
  > "Use of the Licensed Work or any Derivative Works for non-consensual surveillance, unauthorized device access, adversarial digital forensics, or any other activity without prior explicit consent is strictly prohibited."

- **Section 3.3 "Incompatibility with Secondary Licenses"**:
  - Marked as "Incompatible With Secondary Licenses" (GPL, LGPL, AGPL).
  - Cannot be combined or re-licensed under GPL, LGPL, or AGPL.

#### Third-Party Dependencies & Licenses
- **click**: BSD 3-Clause
- **rich**: MIT
- **requests**: Apache-2.0
- **PyYAML**: MIT
- **simplejson**: MIT
- **tld**: MPL-2.0
- **packaging**: Apache-2.0 / BSD 2-Clause
- **pydantic**: MIT
- **pyahocorasick**: CPython / BSD
- **cryptography / pycryptodome**: BSD / Apache-2.0 / Public Domain

#### License Compatibility & Risks
- **Consensual Use Constraint**: ASF must ensure that all forensics activities are conducted with explicit user consent. This aligns with ASF's design as a user-permissioned security tool.
- **License Incompatibility**: MVT License 1.1 is explicitly incompatible with GPL and LGPL. Code from MVT **cannot** be mixed into GPL components (like TrackerControl or PCAPdroid derivative code).
- **Integration Strategy**: Must be executed as an independent CLI tool or process adapter without code-level static linking to GPL components.
- **Risk Level**: MEDIUM-HIGH (license complexity requires strict boundary enforcement)

---

### 5. mobsfscan

#### Primary License
- **License**: GNU Lesser General Public License v3.0 or later (LGPL-3.0+)
- **Copyright**: Copyright (c) MobSF / Ajin Abraham
- **License Text Location**: `d:\Saif\ASF Project\Reference-Tools\mobsfscan-main\LICENSE`

#### Third-Party Dependencies & Licenses
- **libsast**: LGPL-3.0
- **semgrep**: LGPL-2.1 (engine) / proprietary (some rules)
- **sarif-om**: MIT
- **jschema-to-python**: MIT
- **tabulate**: MIT
- **colorama**: BSD 3-Clause
- **xmltodict**: MIT

#### License Compatibility & Risks
- **LGPL Dynamics**: LGPL allows linking from proprietary or non-GPL software without requiring the calling application to be LGPL, provided the LGPL library can be modified and relinked.
- **CLI / Python API Integration**: Calling mobsfscan via CLI (`mobsfscan --json`) or calling Python API from a separate process is fully compliant.
- **Risk Level**: LOW

---

### 6. androidqf (Android Quick Forensics)

#### Primary License
- **License**: MVT License 1.1 (same as MVT)
- **Copyright**: Copyright (c) Amnesty International / Claudio Guarnieri
- **License Text Location**: `d:\Saif\ASF Project\Reference-Tools\androidqf-main\LICENSE`

#### Critical License Clauses
- Same Consensual Use Restriction (Section 3.0) and Secondary License Incompatibility as MVT.

#### Third-Party Dependencies & Licenses
- **filippo.io/age**: BSD 3-Clause
- **avast/apkverifier**: Apache-2.0
- **botherder/go-savetime**: MIT
- **google/uuid**: BSD 3-Clause
- **i582/cfmt**: MIT
- **manifoldco/promptui**: BSD 3-Clause
- **minio/sio**: Apache-2.0

#### License Compatibility & Risks
- Same dynamics as MVT: requires consensual use, incompatible with GPL.
- Ideal for **DIRECT CLI INTEGRATION** as a standalone pre-built executable.
- **Risk Level**: MEDIUM (requires boundary enforcement)

---

## Conflict Matrix & Isolation Plan

```
+----------------+--------------+--------------+--------------+
|                | Permissive   | Copyleft     | Consensual   |
|                | (MIT)        | (GPL/LGPL)   | (MVT 1.1)    |
|                | ALEAPP       | TC, PCAPdroid| MVT,         |
|                |              | mobsfscan    | androidqf    |
+----------------+--------------+--------------+--------------+
| Permissive     | Compatible   | Compatible   | Compatible   |
| (MIT)          |              |              |              |
+----------------+--------------+--------------+--------------+
| Copyleft       | Compatible   | Compatible   | INCOMPATIBLE |
| (GPL/LGPL)     |              | within GPL   | (Explicit)   |
+----------------+--------------+--------------+--------------+
| Consensual     | Compatible   | INCOMPATIBLE | Compatible   |
| (MVT 1.1)      |              | (Explicit)   |              |
+----------------+--------------+--------------+--------------+
```

### Isolation Solution: Process-Boundary Architecture
To avoid license conflicts and copyleft contamination:
1. **ASF Main Platform (Next.js/Node.js/TypeScript)**: MIT or proprietary license.
2. **Adapter Layer**: Interacts with reference tools exclusively via process execution (`child_process.spawn`), IPC, stdin/stdout, or filesystem outputs.
3. **No Direct Library Linking**: ASF will **never** directly import or statically link GPL or MVT 1.1 code into the core web server or dashboard process.