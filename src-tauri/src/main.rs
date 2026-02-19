// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::WindowEvent;
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_store::StoreExt;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct WindowBounds {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::LogDir { file_name: Some("bolt-gives".to_string()) }),
                Target::new(TargetKind::Webview),
            ])
            .build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Get the store for persistence
            let store = app.store("app-data.json")?;
            
            // Get the main window
            let window = app.get_webview_window("main").unwrap();
            
            // Restore window bounds from store
            if let Ok(Some(bounds)) = store.get("window-bounds") {
                if let Ok(bounds) = serde_json::from_value::<WindowBounds>(bounds) {
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                        x: bounds.x,
                        y: bounds.y,
                    }));
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                        width: bounds.width,
                        height: bounds.height,
                    }));
                }
            }
            
            // Show window after positioning
            let _ = window.show();
            let _ = window.set_focus();

            // Check for updates in non-dev mode
            #[cfg(not(debug_assertions))]
            {
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    check_update(app_handle).await;
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            check_for_updates,
            show_update_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(not(debug_assertions))]
    {
        match app.updater() {
            Ok(updater) => {
                match updater.check().await {
                    Ok(Some(_)) => Ok(true),
                    Ok(None) => Ok(false),
                    Err(e) => Err(format!("Update check failed: {}", e)),
                }
            }
            Err(e) => Err(format!("Failed to get updater: {}", e)),
        }
    }
    #[cfg(debug_assertions)]
    {
        Ok(false)
    }
}

#[tauri::command]
async fn show_update_dialog(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(not(debug_assertions))]
    {
        use tauri_plugin_dialog::DialogExt;
        
        match app.updater() {
            Ok(updater) => {
                match updater.check().await {
                    Ok(Some(update)) => {
                        let version = update.version.clone();
                        let app_clone = app.clone();
                        
                        app.dialog()
                            .message(&format!("Version {} is available. Would you like to update now?", version))
                            .title("Application Update")
                            .buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancelCustom(
                                "Update".to_string(),
                                "Later".to_string(),
                            ))
                            .show(move |result| {
                                if result {
                                    let app = app_clone.clone();
                                    tauri::async_runtime::spawn(async move {
                                        if let Ok(updater) = app.updater() {
                                            if let Ok(Some(update)) = updater.check().await {
                                                let _ = update.download_and_install(|_, _| {}, || {}).await;
                                            }
                                        }
                                    });
                                }
                            });
                        Ok(())
                    }
                    Ok(None) => Ok(()),
                    Err(e) => Err(format!("Update check failed: {}", e)),
                }
            }
            Err(e) => Err(format!("Failed to get updater: {}", e)),
        }
    }
    #[cfg(debug_assertions)]
    {
        Ok(())
    }
}

async fn check_update(app: tauri::AppHandle) {
    #[cfg(not(debug_assertions))]
    {
        use tauri_plugin_dialog::DialogExt;
        
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(4 * 60 * 60)); // 4 hours
        
        loop {
            interval.tick().await;
            
            if let Ok(updater) = app.updater() {
                if let Ok(Some(update)) = updater.check().await {
                    let version = update.version.clone();
                    let app_clone = app.clone();
                    
                    app.dialog()
                        .message(&format!("Version {} is available. Would you like to update now?", version))
                        .title("Application Update")
                        .buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancelCustom(
                            "Update".to_string(),
                            "Later".to_string(),
                        ))
                        .show(move |result| {
                            if result {
                                let app = app_clone.clone();
                                tauri::async_runtime::spawn(async move {
                                    if let Ok(updater) = app.updater() {
                                        if let Ok(Some(update)) = updater.check().await {
                                            let _ = update.download_and_install(|_, _| {}, || {}).await;
                                        }
                                    }
                                });
                            }
                        });
                }
            }
        }
    }
}
