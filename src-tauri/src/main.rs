// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if std::env::args().any(|arg| arg == "--verify-build") {
        use sha2::{Digest, Sha256};
        #[cfg(feature = "tauri")]
        let bundle_identifier = {
            let context: tauri::Context<tauri::Wry> = tauri::generate_context!();
            context.config().identifier.clone()
        };
        #[cfg(not(feature = "tauri"))]
        let bundle_identifier =
            serde_json::from_str::<serde_json::Value>(include_str!("../tauri.conf.json")).unwrap()
                ["identifier"]
                .as_str()
                .unwrap()
                .to_string();
        println!(
            "{}",
            serde_json::json!({
                "product": "Panostem",
                "version": env!("CARGO_PKG_VERSION"),
            "bundle_identifier": bundle_identifier,
                "runtime_commit": "f427fc67df75513be0cd3f3329e327a9a19401c3",
                "requirements_sha256": format!("{:x}", Sha256::digest(include_bytes!("../runtime/requirements.lock"))),
                "controller_sha256": format!("{:x}", Sha256::digest(include_bytes!("../runtime/controller.py"))),
            })
        );
        return;
    }
    stem_visual_explorer_lib::run()
}
