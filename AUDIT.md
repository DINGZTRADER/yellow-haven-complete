# 🧾 SAFE Bar and Lounge – Security, Architecture & Fraud-Control Audit

**Audit Type:** Pre-Production Readiness & Fraud-Prevention Audit  
**Platform:** Electron Desktop App (Windows 32-bit & 64-bit)  
**Status:** ⚠️ NOT PRODUCTION-READY (Critical issues identified)  
**Audit Focus:** Security hardening, architectural stability, fraud-proofing, deployment safety

## 1. Executive Summary (Non-Technical)

SAFE Bar and Lounge addresses a real and serious business risk:

> Staff smuggling unauthorized alcohol and under-reporting sales.

However, in its current state, the application itself introduces high security risk, data-loss risk, and crash-on-launch instability. If deployed as-is:

* Any staff member with basic computer knowledge could access the operating system, steal credentials, or manipulate records.
* Stock and sales data could be lost or corrupted.
* The app could fail to start on customer machines.
* Fraud detection logic would be unreliable.

**Conclusion:**
The app must be hardened and stabilized first before any new fraud-prevention features are added.

## 2. Architecture Audit

### 2.1 Current Architecture (Observed)

| Component | Status | Risk |
| :--- | :--- | :--- |
| Electron Renderer | ❌ Full Node access | Critical |
| Electron Main | ⚠️ Mixed responsibilities | High |
| Express Server (port 3000) | ❌ Redundant | High |
| Data Storage | ❌ JSON files | High |
| Credential Storage | ❌ .env files | Critical |
| File Writes | ❌ Program Files | Critical |

### 2.2 Required Target Architecture (Mandatory)

**Electron Main Process**

* Security-hardened BrowserWindow
* ipcMain (all business logic)
* SQLite database
* Secure config store (electron-store)
* File output → userData / Documents

**Electron Renderer**

* UI only (no Node access)
* Role-based screens
* IPC calls via preload.js

**Preload Script**

* contextBridge (whitelisted APIs only)

## 3. Critical Security Findings (BLOCKERS)

These must be fixed before production.

### 🔴 3.1 Node Integration Enabled (CRITICAL)

**Finding**

* nodeIntegration: true
* contextIsolation: false

**Impact**

* Renderer has full OS access
* Any injected script can:
  * Read files
  * Modify inventory
  * Steal SMTP credentials
  * Install malware
* Risk Level: 🔥🔥🔥🔥🔥 (Unacceptable)

**Mandatory Fix**

1. nodeIntegration: false
2. contextIsolation: true
3. preload: path.join(__dirname, 'preload.js')
4. Expose only required IPC functions via contextBridge.

### 🔴 3.2 Credential Storage via .env (CRITICAL)

**Finding**

* SMTP credentials stored in .env
* .env does not exist in packaged apps

**Impact**

* App breaks in production
* Credentials are insecure
* Impossible to rotate credentials safely

**Mandatory Fix**

1. Implement Settings UI
2. Store credentials using `electron-store`
3. Encrypted at rest
4. Located in `app.getPath('userData')`

### 🔴 3.3 Missing File Dependency (CRASH)

**Finding**
`require('./lib/generateReport')`

* File does not exist.

**Impact**

* App crashes immediately on launch
* Installer appears “broken”

**Mandatory Fix (Choose One)**

* Restore generateReport.js OR
* Remove dependency and use existing jspdf implementation

### 🔴 3.4 Writing Files to App Directory (CRITICAL)

**Finding**

* Reports and data written to source directories

**Impact**

* Windows blocks writes in Program Files
* Silent failures
* Data loss

**Mandatory Fix**

* All writes must go to: `app.getPath('userData')` or `app.getPath('documents')`

### 🔴 3.5 Express Server Inside Electron (HIGH)

**Finding**

* Separate Express server on port 3000

**Impact**

* Port conflicts
* Firewall issues
* Attack surface expanded
* No benefit in desktop app

**Mandatory Fix**

1. Remove Express entirely
2. Move logic to `ipcMain.handle(...)`
3. IPC communication only

## 4. Data Integrity & Storage Audit

### 4.1 Current State: JSON Files ❌

**Risks**

* Corruption during concurrent writes
* No locking
* No audit trail
* Easy to edit manually

### 4.2 Required State: SQLite ✅

**Why SQLite**

* ACID-compliant
* Single file
* Fast
* Perfect for offline desktop apps

**Minimum Tables Required**

* users
* roles
* inventory
* transactions
* stock_adjustments
* audit_logs

## 5. Fraud Prevention Control Audit

### 5.1 Core Fraud Risks Identified

| Risk | Current Coverage |
| :--- | :--- |
| Staff smuggling own alcohol | ❌ None |
| Selling without recording | ❌ None |
| Under-reporting sales | ❌ None |
| Fake stock counts | ❌ None |
| Blame shifting | ❌ None |

### 5.2 Mandatory Fraud Controls (System-Level)

**A. Bottle Identity Control**

* Every bottle must be registered by manager
* Assigned a system ID
* No sale allowed for unregistered bottles

**B. Staff-Linked Transactions**

* Every sale records: Staff ID, Timestamp, Bottle ID
* No anonymous sales

**C. Shift-Based Inventory Locking**

* Opening stock snapshot
* Closing stock snapshot
* System auto-calculates: Expected Stock – Actual Stock = Discrepancy

**D. Discrepancy Flagging**

* Any mismatch logged
* Visible to manager & owner
* Cannot be deleted

**E. Immutable Audit Log**

* Append-only logs
* Cannot be edited by staff
* Includes: Login attempts, Sales, Stock edits, Overrides

## 6. Role-Based Access Control Audit

### Required Permissions Model

| Role | Permissions |
| :--- | :--- |
| Bar Staff | Sell drinks only |
| Manager | Approve stock, review discrepancies |
| Owner | Full access, analytics, overrides |

**Rules**

* **Staff cannot:**
  * Add stock
  * Edit inventory
  * Delete transactions
* Manager overrides are logged
* Owner actions are logged

## 7. UI/UX Security Audit

**UI Must Enforce Security**

* No hidden admin buttons
* No keyboard shortcuts for bypass
* Role-specific dashboards
* Locked screens on inactivity
* Clear visual separation of roles

**Important Principle**

* A beautiful UI that allows fraud is worse than an ugly secure one.

## 8. Deployment & Distribution Audit

**Current Status**

* Installers generated correctly
* SmartScreen warnings expected

**Required Pre-Release Checklist**

* [ ] Node integration disabled
* [ ] Context isolation enabled
* [ ] Preload IPC only
* [ ] SQLite implemented
* [ ] Credentials stored securely
* [ ] Express removed
* [ ] Crash on launch fixed
* [ ] File paths corrected
* [ ] Audit logs immutable

## 9. Final Verdict

**🚫 Do NOT Release Yet**

SAFE Bar and Lounge has strong business potential, but:

* Security flaws undermine fraud prevention
* Architecture is unstable
* Data integrity is not guaranteed

**✅ Green Light Only After:**
Security hardening → Architecture stabilization → Data integrity → Fraud controls
