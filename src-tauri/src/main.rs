// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::args().any(|arg| arg == "--verify-build") {
        use sha2::{Digest, Sha256};
        use std::io::Write;
        #[cfg(feature = "tauri")]
        let (bundle_identifier, product, app_version) = {
            let context: tauri::Context<tauri::Wry> = tauri::generate_context!();
            let config = context.config();
            (
                config.identifier.clone(),
                config.product_name.clone().unwrap_or_default(),
                config.version.clone().unwrap_or_default(),
            )
        };
        #[cfg(not(feature = "tauri"))]
        let (bundle_identifier, product, app_version) = {
            let config: serde_json::Value =
                serde_json::from_str(include_str!("../tauri.conf.json"))?;
            (
                config["identifier"]
                    .as_str()
                    .ok_or("Missing bundle identifier")?
                    .to_owned(),
                config["productName"]
                    .as_str()
                    .ok_or("Missing product name")?
                    .to_owned(),
                config["version"]
                    .as_str()
                    .ok_or("Missing app version")?
                    .to_owned(),
            )
        };
        let templates: [(&str, &[u8]); 14] = [
            (
                "newton",
                include_bytes!("../runtime/examples/knowledge_newton.py"),
            ),
            (
                "bisection",
                include_bytes!("../runtime/examples/knowledge_bisection.py"),
            ),
            (
                "oscillator",
                include_bytes!("../runtime/examples/knowledge_oscillator.py"),
            ),
            (
                "gradient",
                include_bytes!("../runtime/examples/knowledge_gradient.py"),
            ),
            (
                "square",
                include_bytes!("../runtime/examples/knowledge_square.py"),
            ),
            (
                "polar",
                include_bytes!("../runtime/examples/knowledge_polar.py"),
            ),
            (
                "linear",
                include_bytes!("../runtime/examples/knowledge_linear.py"),
            ),
            (
                "union",
                include_bytes!("../runtime/examples/knowledge_union.py"),
            ),
            (
                "means",
                include_bytes!("../runtime/examples/knowledge_means.py"),
            ),
            (
                "wave",
                include_bytes!("../runtime/examples/knowledge_wave.py"),
            ),
            (
                "heat",
                include_bytes!("../runtime/examples/knowledge_heat.py"),
            ),
            (
                "beam",
                include_bytes!("../runtime/examples/knowledge_beam.py"),
            ),
            (
                "electric",
                include_bytes!("../runtime/examples/knowledge_electric.py"),
            ),
            (
                "control",
                include_bytes!("../runtime/examples/knowledge_control.py"),
            ),
        ];
        let template_hashes: std::collections::BTreeMap<_, _> = templates
            .iter()
            .map(|(name, bytes)| (*name, format!("{:x}", Sha256::digest(bytes))))
            .collect();
        let info = serde_json::json!({
            "product": product,
            "version": env!("CARGO_PKG_VERSION"),
            "app_version": app_version,
            "bundle_identifier": bundle_identifier,
            "runtime_commit": "f427fc67df75513be0cd3f3329e327a9a19401c3",
            "requirements_sha256": format!("{:x}", Sha256::digest(include_bytes!("../runtime/requirements.lock"))),
            "controller_sha256": format!("{:x}", Sha256::digest(include_bytes!("../runtime/controller.py"))),
            "knowledge_catalog_sha256": format!("{:x}", Sha256::digest(include_bytes!("../runtime/examples/knowledge_catalog.json"))),
            "knowledge_helpers_sha256": format!("{:x}", Sha256::digest(include_bytes!("../runtime/examples/knowledge_helpers.py"))),
            "knowledge_template_hashes": template_hashes,
        });
        writeln!(std::io::stdout(), "{info}")?;
        return Ok(());
    }
    stem_visual_explorer_lib::run();
    Ok(())
}
