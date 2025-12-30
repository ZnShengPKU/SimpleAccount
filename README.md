# Account Manager

A cross-platform desktop accounting application built with Electron, React, TypeScript, and Tailwind CSS.

Completely built by ChatGPT and TRAE Solo.

## Features

- **Cross-Platform**: Runs on Windows, macOS, and Linux.
- **Local Database**: Secure local storage using SQLite.
- **Visual Analysis**: Interactive Bar and Pie charts.
- **Smart Categories**: Automatic color generation and history-based shortcuts.
- **Data Management**: Import/Export (JSON) for backup and migration.

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server (Vite + Electron):
   ```bash
   npm run dev
   ```

## Build

To build the executable for the current platform:

```bash
npm run build
```

The executable files (dmg, exe, AppImage) will be generated in the `release` directory.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + Recharts
- **Backend**: Electron (Main Process) + Better-SQLite3
- **State Management**: Zustand
- **Communication**: Electron IPC
