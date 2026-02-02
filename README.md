# SAFE bar and lounge App

On first run, open Settings and enter SMTP_USER, SMTP_PASS (Google App Password), SMTP_TO, SMTP_NAME.

> **Windows SmartScreen may warn.** Click **More info** → **Run anyway**.

**Build Info:** (SHA256) `87C2AC275DA3F54091C760ED9072D34D6886CAD56F70EAE4399BF506ABD20B9D`

A desktop application for managing SAFE bar and lounge operations.
This version can be built for both 64-bit (x64) and 32-bit (ia32) Windows systems.

## 📦 Features

* Works on Windows 32-bit and 64-bit
* Built using Electron
* Optimized for business use
* Easy to install and run

## 🖥️ Requirements

* Node.js (v18+ recommended)
* npm or yarn
* Windows PC (32-bit or 64-bit)

## ⚙️ Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/Start-Up-Kampala-Programmers/safe-bar-manager.git
    cd safe-bar-manager
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

## 🏗️ Building for Your Architecture

### 64-bit build (x64)

```bash
npx electron-builder --win --x64
```

**Output:** `dist/SAFE_Bar_Manager_Setup_x64.exe`

### 32-bit build (ia32) — works on both 32-bit and 64-bit Windows

```bash
npx electron-builder --win --ia32
```

**Output:** `dist/SAFE_Bar_Manager_Setup_ia32.exe`

### 🛠️ Rebuilding Native Modules for 32-bit

If your app uses native Node modules:

```bash
npm rebuild --arch=ia32 --platform=win32
```

### ▶️ Running in Development

```bash
npm start
```

## 📂 Output Files

* **Installer:** Located in the `dist` folder
* **Portable App:** Located in the `dist/win-ia32-unpacked` or `dist/win-x64-unpacked` folder

## 📜 License

Proprietary – Not for redistribution without permission.

## ⬇️ Download

Choose the version for your PC:

* [64-bit Windows](https://drive.google.com/drive/u/0/folders/1sttMQRHPDS7Awc_lykQnPzQWbOgMvgtG)
* [32-bit Windows](https://drive.google.com/file/d/1AFgK0QdV4eQBhl6xXrL6_qdDFkyVYOfe/view?usp=drive_link)
