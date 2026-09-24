#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      #[cfg(any(windows, target_os = "macos", target_os = "linux"))]
      {
        app.handle()
          .plugin(tauri_plugin_updater::Builder::new().build())?;

        // Silent check on launch; failures (offline, etc.) must not crash the app.
        let handle = app.handle().clone();
        tauri::async_runtime::spawn(async move {
          if let Err(e) = check_for_updates(handle).await {
            log::warn!("updater: {e}");
          }
        });
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(any(windows, target_os = "macos", target_os = "linux"))]
async fn check_for_updates(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
  use tauri_plugin_updater::UpdaterExt;

  let Some(update) = app.updater()?.check().await? else {
    return Ok(());
  };

  log::info!(
    "updater: downloading {} -> {}",
    update.current_version,
    update.version
  );

  update
    .download_and_install(|_, _| {}, || {})
    .await?;

  log::info!("updater: installed, restarting");
  app.restart();
}
