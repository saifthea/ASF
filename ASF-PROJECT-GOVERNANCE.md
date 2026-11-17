# ASF Project Governance

## Project Overview

**ASF (Android Security Forensics)** is a security investigation platform focused on identifying suspicious activities, unauthorized data transmissions, potential personal information leaks, camera and microphone activity, and application behavior analysis on Android devices.

## Project Status: Phase 00 - Repository Intelligence

## Governance Rules

### 1. Source Code References are READ-ONLY
- All reference repositories are considered read-only
- No modification, deletion, moving, or overwriting of original files
- No running of formatters, migration scripts, build scripts, or other commands that could modify reference repositories
- If modifications are needed, propose separate adapter or wrapper in ASF environment

### 2. Integration Through Adapters
- All integrations must be done through specially created adapters in ASF
- Use official APIs, CLI, SDK, or interfaces available
- Avoid direct dependence on unstable internal implementations
- Each adapter must have documentation for input, output, dependencies, error handling, and technical constraints

### 3. Do Not Remove Original Functions
- Do not remove functions, modules, features, or capabilities of reference repositories
- Do not refactor the original source code
- If features are not needed for ASF, simply ignore them through the adapter

### 4. Do Not Change Licenses
- Original licenses must be preserved
- Do not change copyright, attribution, or license notices
- Audit repository and dependency licenses before integration
- Identify source code distribution obligations and attribution
- Do not claim reference code as ASF-created code

### 5. No Sending of Investigation Data to External Services
- All evidence, logs, databases, device metadata, and investigation results must remain local
- Prohibited from sending investigation data to external APIs, analytics, telemetry, cloud storage, or third-party services without explicit user consent
- Do not upload sensitive data to GitHub or Vercel
- Network access for threat database updates should only be an optional feature in the future, with user consent and data sanitization
- Do not automatically send device information to external services

### 6. All ASF Changes Must Be Tracked Through Git
- Use Git for version control
- Do not delete commit history
- No force push
- No reset or clean that could potentially lose work
- Each development stage should produce changes that can be reviewed through Git diff
- Use separate commits for each development stage after approval
- Do not commit automatically without user instruction

## Target Compatibility

- Android minimum 8.0 Oreo
- Android 9 to latest Android version
- Windows 11 as investigation computer
- Device connection through USB and Android Debug Bridge (ADB)
- No root required as baseline requirement

If a feature is not supported on a specific Android version, display NOT SUPPORTED or LIMITED CAPABILITY status. Do not generate simulated data.

## Main Technologies

- Next.js
- React
- TypeScript
- Node.js
- Tailwind CSS
- SQLite
- Android Debug Bridge (ADB)
- pnpm as package manager

Development commands:
- `pnpm install`
- `pnpm dev`

Do not use npm as the primary package manager.

Vercel is only a safe deployment option for the dashboard and does not contain sensitive investigation data. ADB and device forensics processes still run locally on Windows.

## Phase 00 Scope

This document covers Phase 00: Repository Intelligence, which includes:
1. Repository Inventory
2. Architecture Analysis
3. License & Dependency Audit
4. Integration Feasibility
5. Android Compatibility Audit
6. Security & Privacy Audit
7. ASF Integration Blueprint
8. Risk & Limitation Assessment

## Execution Constraints for Phase 00

- No dashboard creation
- No Next.js app creation
- No dependency installation
- No running reference repositories
- No modifying repository configuration
- No changing licenses
- No deleting or moving files
- No integration
- No Git commits
- No sending data externally

Focus only on static inspection, static analysis, and ASF documentation creation.