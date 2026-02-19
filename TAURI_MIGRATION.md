# Tauri Migration Guide

This document describes the migration from Electron to Tauri for the bolt.gives desktop application.

## Overview

The application has been migrated from Electron to Tauri to achieve:
- Smaller bundle sizes
- Better performance
- Improved security
- Native OS integration
- Cross-platform compatibility

## Changes Made

### 1. Removed Electron Dependencies
- Removed `electron`, `electron-builder`, `electron-log`, `electron-store`, `electron-updater`, `@electron/notarize`
- Removed all Electron-related scripts from `package.json`
- Removed `electron/` directory contents (kept for reference)
- Removed `electron-builder.yml` and `electron-update.yml`

### 2. Added Tauri Dependencies
- Added `@tauri-apps/cli` (dev dependency)
- Added Tauri plugin packages:
  - `@tauri-apps/plugin-dialog`
  - `@tauri-apps/plugin-http`
  - `@tauri-apps/plugin-log`
  - `@tauri-apps/plugin-opener`
  - `@tauri-apps/plugin-process`
  - `@tauri-apps/plugin-shell`
  - `@tauri-apps/plugin-store`
  - `@tauri-apps/plugin-updater`

### 3. Created Tauri Configuration
- Created `src-tauri/tauri.conf.json` - Main Tauri configuration
- Created `src-tauri/Cargo.toml` - Rust project configuration
- Created `src-tauri/src/main.rs` - Rust main entry point
- Created `src-tauri/src/lib.rs` - Rust library exports
- Created `src-tauri/build.rs` - Build script
- Created `src-tauri/capabilities/default.json` - Permission capabilities
- Created `src-tauri/Entitlements.plist` - macOS entitlements
- Copied icons to `src-tauri/icons/`

### 4. Updated Build Configuration
- Updated `vite.config.ts` to support Tauri environment variables
- Added `TAURI_PLATFORM` and `TAURI_DEV_HOST` support
- Updated build target to `chrome105` when building for Tauri

### 5. New NPM Scripts
```json
{
  "tauri": "tauri",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build",
  "tauri:build:debug": "tauri build --debug"
}
```

## Development Workflow

### Prerequisites
1. Install Rust: https://rustup.rs/
2. Install system dependencies for Tauri: https://tauri.app/start/prerequisites/

### Running in Development Mode
```bash
# Run the Tauri development server
pnpm tauri:dev

# Or use the CLI directly
pnpm tauri dev
```

### Building for Production
```bash
# Build for current platform
pnpm tauri:build

# Build with debug symbols
pnpm tauri:build:debug
```

## Features Implemented

### 1. Window Management
- Window bounds persistence (saved to store)
- Window restore on startup
- Proper window show/hide handling

### 2. Auto-Updater
- Automatic update checks every 4 hours
- Manual update check via command
- Dialog-based update prompts
- Download and install functionality

### 3. Store/Persistence
- Uses Tauri's store plugin for persistence
- Stores window bounds and app data

### 4. Logging
- Integrated with Tauri's log plugin
- Logs to stdout, log directory, and webview console

### 5. HTTP Requests
- Uses Tauri's HTTP plugin for fetch requests
- Properly handles CORS and security

## API Commands

The following Tauri commands are available:

- `get_app_version()` - Returns the current app version
- `check_for_updates()` - Checks if an update is available
- `show_update_dialog()` - Shows the update dialog to the user

## Bug Fixes

During the migration, the following bugs were fixed:

1. **JSON.parse error handling** - Added try-catch blocks around all `JSON.parse()` calls that read from localStorage:
   - `app/lib/stores/github.ts`
   - `app/lib/stores/netlify.ts`
   - `app/lib/stores/supabase.ts`
   - `app/lib/stores/profile.ts`

## Migration Notes

### From Electron
| Electron Feature | Tauri Equivalent |
|-----------------|------------------|
| `electron-store` | `@tauri-apps/plugin-store` |
| `electron-log` | `@tauri-apps/plugin-log` |
| `electron-updater` | `@tauri-apps/plugin-updater` |
| `ipcMain/ipcRenderer` | Tauri Commands |
| `BrowserWindow` | `WebviewWindow` |
| `Menu` | Tauri Menu API |

### Security
- Tauri uses a capabilities-based permission system
- All permissions are explicitly defined in `capabilities/default.json`
- CSP is disabled for compatibility but can be enabled

## Troubleshooting

### Build Issues
1. Ensure Rust is installed: `rustc --version`
2. Install system dependencies for your platform
3. Run `pnpm install` to install Node dependencies

### Runtime Issues
1. Check the Tauri console for errors
2. Enable debug logging with `RUST_LOG=debug pnpm tauri dev`
3. Check the log files in the app's log directory

## Resources

- [Tauri Documentation](https://tauri.app/)
- [Tauri API Reference](https://tauri.app/reference/)
- [Migration from Electron](https://tauri.app/start/migrate/from-electron/)
