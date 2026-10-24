//! Exercises the same runtime manager as Tauri without touching the user profile.
use std::io::{Read, Write};
use std::path::PathBuf;
use std::time::{Duration, Instant};
use stem_visual_explorer_lib::studio::Studio;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let root = PathBuf::from(
        std::env::args()
            .nth(1)
            .ok_or("Provide an isolated runtime root")?,
    );
    let mut input = String::new();
    std::io::stdin().read_to_string(&mut input)?;
    let request: serde_json::Value = serde_json::from_str(&input)?;
    let studio = Studio::new(root)?;
    if ["install", "run", "dependencies"].contains(&request["action"].as_str().unwrap_or("")) {
        let id = studio.start(request.clone())?;
        let started = Instant::now();
        let cancel_after = request["cancel_after_seconds"].as_f64();
        loop {
            let task = studio
                .snapshot()
                .into_iter()
                .find(|t| t.id == id)
                .ok_or("Task disappeared from history")?;
            if task.status != "running" {
                writeln!(
                    std::io::stdout(),
                    "{}",
                    serde_json::to_string_pretty(&task)?
                )?;
                if task.status == "failed" {
                    std::process::exit(1);
                }
                break;
            }
            if cancel_after.is_some_and(|s| started.elapsed().as_secs_f64() > s) {
                studio.cancel(&id)?;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
    } else {
        writeln!(
            std::io::stdout(),
            "{}",
            serde_json::to_string_pretty(&studio.request(request)?)?
        )?;
    }
    Ok(())
}
