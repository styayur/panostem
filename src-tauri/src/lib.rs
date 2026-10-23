pub mod cache;
#[cfg(feature = "tauri")]
pub mod commands;
pub mod database;
pub mod error;
pub mod models;
pub mod providers;
pub mod search;
pub mod state;
pub mod studio;
pub mod util;
#[cfg(feature = "tauri")]
pub mod windows;

#[cfg(feature = "tauri")]
pub fn run() {
    use tauri::Manager;

    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            let state = state::AppState::load(&app_dir)?;
            app.manage(state);
            #[cfg(debug_assertions)]
            let runtime_dir = std::env::var_os("PANOSTEM_TEST_RUNTIME_DIR")
                .map(std::path::PathBuf::from)
                .unwrap_or_else(|| app_dir.join("panostem-runtime"));
            #[cfg(not(debug_assertions))]
            let runtime_dir = app_dir.join("panostem-runtime");
            app.manage(studio::Studio::new(runtime_dir)?);
            Ok(())
        })
        .invoke_handler(|invoke| {
            let webview = invoke.message.webview();
            if !crate::util::is_app_window(webview.label()) {
                invoke
                    .resolver
                    .reject("WebViewer has no application IPC access");
                return true;
            }
            let handler: fn(tauri::ipc::Invoke<tauri::Wry>) -> bool = tauri::generate_handler![
                commands::search,
                commands::providers_info,
                commands::refresh_provider_index,
                commands::set_provider_enabled,
                commands::clear_cache,
                commands::get_settings,
                commands::save_settings,
                commands::add_favorite,
                commands::remove_favorite,
                commands::list_favorites,
                commands::add_history,
                commands::list_history,
                commands::clear_history,
                commands::open_external,
                commands::open_window,
                commands::close_window,
                commands::toggle_pin,
                commands::open_workspace,
                commands::get_workspace_items,
                commands::get_workspace_resources,
                studio::studio_request,
                studio::studio_start,
                studio::studio_tasks,
                studio::studio_cancel,
                studio::studio_media,
                studio::studio_input,
            ];
            handler(invoke)
        })
        .register_uri_scheme_protocol("panostem-media", |context, request| {
            use std::io::{Read, Seek};
            if !crate::util::is_app_window(context.webview_label()) {
                return tauri::http::Response::builder()
                    .status(403)
                    .body(vec![])
                    .unwrap();
            }
            let state = context.app_handle().state::<studio::Studio>();
            let token = request.uri().path().trim_start_matches('/');
            let path = state.media.lock().unwrap().get(token).cloned();
            let serve = || -> Option<tauri::http::Response<Vec<u8>>> {
                let path = path?;
                if std::fs::canonicalize(&path).ok()? != path {
                    return None;
                }
                let mut file = std::fs::File::open(&path).ok()?;
                let size = file.metadata().ok()?.len();
                if size == 0 || size > 128 * 1024 * 1024 {
                    return None;
                }
                let range = request
                    .headers()
                    .get("range")
                    .and_then(|v| v.to_str().ok())
                    .and_then(|s| s.strip_prefix("bytes="));
                let (start, end) = range
                    .and_then(|s| s.split_once('-'))
                    .and_then(|(a, b)| {
                        Some((
                            a.parse::<u64>().ok()?,
                            if b.is_empty() {
                                size - 1
                            } else {
                                b.parse::<u64>().ok()?
                            },
                        ))
                    })
                    .unwrap_or((0, size - 1));
                if start > end || end >= size {
                    return Some(
                        tauri::http::Response::builder()
                            .status(416)
                            .header("Content-Range", format!("bytes */{size}"))
                            .body(vec![])
                            .ok()?,
                    );
                }
                let mut data = vec![0; (end - start + 1) as usize];
                file.seek(std::io::SeekFrom::Start(start)).ok()?;
                file.read_exact(&mut data).ok()?;
                let mime = match path.extension()?.to_str()? {
                    "mp4" => "video/mp4",
                    "mov" => "video/quicktime",
                    "gif" => "image/gif",
                    "png" => "image/png",
                    _ => return None,
                };
                let mut builder = tauri::http::Response::builder()
                    .status(if range.is_some() { 206 } else { 200 })
                    .header("Content-Type", mime)
                    .header("Accept-Ranges", "bytes")
                    .header("Access-Control-Allow-Origin", "*")
                    .header("X-Content-Type-Options", "nosniff");
                if range.is_some() {
                    builder =
                        builder.header("Content-Range", format!("bytes {start}-{end}/{size}"));
                }
                builder.body(data).ok()
            };
            serve().unwrap_or_else(|| {
                tauri::http::Response::builder()
                    .status(404)
                    .body(vec![])
                    .unwrap()
            })
        })
        .build(tauri::generate_context!())
        .expect("error while building Panostem")
        .run(|app, event| {
            if matches!(
                event,
                tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit
            ) {
                if let Some(state) = app.try_state::<studio::Studio>() {
                    state.stop_all();
                }
            }
        });
}

/// No-op run used when the `tauri` feature is disabled (e.g. `cargo test
/// --no-default-features` for the pure-logic test suite).
#[cfg(not(feature = "tauri"))]
pub fn run() {}
#[cfg(test)]
mod regression_tests;
