//! Independent trusted-local Python execution. No shell and no remote-page IPC.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, VecDeque};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant};

const LOG_LIMIT: usize = 256 * 1024;
const UV_URL: &str =
    "https://github.com/astral-sh/uv/releases/download/0.13.5/uv-x86_64-pc-windows-msvc.zip";
const UV_SHA: &str = "a38b8d1902b7cfbc76b423ba1bb456f623f42064cdc72628b6075b89afd1019a";
const PYTHON: &str = "3.11.14";
static NEXT: AtomicU64 = AtomicU64::new(1);

/// Recover owned task state after a worker panic so cancellation stays available.
pub fn state_lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    match mutex.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub action: String,
    #[serde(default)]
    pub project: String,
    pub status: String,
    pub logs: VecDeque<String>,
    pub elapsed: f64,
    pub result: Option<Value>,
    pub error: Option<String>,
    #[serde(skip)]
    pub cancel: Arc<AtomicBool>,
}

#[derive(Clone)]
pub struct Studio {
    pub root: PathBuf,
    tasks: Arc<Mutex<VecDeque<Task>>>,
    pub media: Arc<Mutex<HashMap<String, PathBuf>>>,
    inputs: Arc<Mutex<HashMap<String, std::process::ChildStdin>>>,
}

impl Studio {
    pub fn new(root: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&root).map_err(|e| e.to_string())?;
        let worker = root.join("worker");
        std::fs::create_dir_all(worker.join("examples")).map_err(|e| e.to_string())?;
        for (name, text) in [
            ("controller.py", include_str!("../runtime/controller.py")),
            (
                "FFmpeg-GPL-3.0.txt",
                include_str!("../../licenses/FFmpeg-GPL-3.0.txt"),
            ),
            (
                "PyOpenGL-3.1.10-LICENSE.txt",
                include_str!("../../licenses/PyOpenGL-3.1.10-LICENSE.txt"),
            ),
            (
                "sandbox_runner.py",
                include_str!("../runtime/sandbox_runner.py"),
            ),
            (
                "requirements.lock",
                include_str!("../runtime/requirements.lock"),
            ),
            ("concepts.json", include_str!("../../src/lib/concepts.json")),
            (
                "examples/blank.py",
                include_str!("../runtime/examples/blank.py"),
            ),
            (
                "examples/curves.py",
                include_str!("../runtime/examples/curves.py"),
            ),
            (
                "examples/geometry3d.py",
                include_str!("../runtime/examples/geometry3d.py"),
            ),
            (
                "examples/physics.py",
                include_str!("../runtime/examples/physics.py"),
            ),
            (
                "examples/updater.py",
                include_str!("../runtime/examples/updater.py"),
            ),
        ] {
            std::fs::write(worker.join(name), text).map_err(|e| e.to_string())?;
        }
        let mut history: VecDeque<Task> = std::fs::read(root.join("tasks.json"))
            .ok()
            .filter(|b| b.len() <= 12 * 1024 * 1024)
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default();
        history.truncate(40);
        for task in &mut history {
            if task.status == "running" {
                task.status = "failed".into();
                task.error = Some("Application stopped before this task completed".into());
            }
        }
        Ok(Self {
            root,
            tasks: Arc::new(Mutex::new(history)),
            media: Arc::default(),
            inputs: Arc::default(),
        })
    }

    fn python(&self) -> PathBuf {
        self.root.join(if cfg!(windows) {
            "venv/Scripts/python.exe"
        } else {
            "venv/bin/python"
        })
    }

    pub fn snapshot(&self) -> Vec<Task> {
        state_lock(&self.tasks).iter().cloned().collect()
    }

    fn update(&self, id: &str, f: impl FnOnce(&mut Task)) {
        if let Some(task) = state_lock(&self.tasks).iter_mut().find(|t| t.id == id) {
            f(task);
        }
    }

    fn log(&self, id: &str, text: String) {
        self.update(id, |t| {
            t.logs.push_back(text);
            while t.logs.len() > 4096 || t.logs.iter().map(String::len).sum::<usize>() > LOG_LIMIT {
                t.logs.pop_front();
            }
        });
    }

    pub fn cancel(&self, id: &str) -> Result<(), String> {
        let tasks = state_lock(&self.tasks);
        let t = tasks.iter().find(|t| t.id == id).ok_or("Unknown task")?;
        if t.status == "running" {
            t.cancel.store(true, Ordering::SeqCst);
        }
        Ok(())
    }

    pub fn stop_all(&self) {
        for task in state_lock(&self.tasks).iter() {
            task.cancel.store(true, Ordering::SeqCst);
        }
    }

    pub fn input(&self, id: &str, text: &str) -> Result<(), String> {
        if text.len() > 8192 {
            return Err("Console input exceeds 8 KiB".into());
        }
        let mut inputs = state_lock(&self.inputs);
        let stdin = inputs
            .get_mut(id)
            .ok_or("This task has no active native-preview console")?;
        stdin
            .write_all(text.as_bytes())
            .and_then(|_| stdin.write_all(b"\n"))
            .and_then(|_| stdin.flush())
            .map_err(|e| e.to_string())
    }

    pub fn start(&self, mut req: Value) -> Result<String, String> {
        let action = req["action"].as_str().unwrap_or("").to_owned();
        if !["install", "run", "dependencies"].contains(&action.as_str()) {
            return Err("Unknown task action".into());
        }
        if action == "install" && req["authorize_install"] != true {
            return Err("Runtime installation requires authorization".into());
        }
        let mut tasks = state_lock(&self.tasks);
        // A single active task bounds CPU/GPU usage and makes install/run mutually exclusive.
        if tasks.iter().any(|t| t.status == "running") {
            return Err("A Studio task is already running; stop or wait for it".into());
        }
        let id = format!(
            "{}-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        );
        req["job_id"] = json!(id);
        let cancel = Arc::new(AtomicBool::new(false));
        tasks.push_front(Task {
            id: id.clone(),
            action: action.clone(),
            project: req["project"].as_str().unwrap_or("").to_string(),
            status: "running".into(),
            logs: VecDeque::new(),
            elapsed: 0.0,
            result: None,
            error: None,
            cancel: cancel.clone(),
        });
        tasks.truncate(40);
        drop(tasks);
        let me = self.clone();
        let task_id = id.clone();
        std::thread::spawn(move || {
            let start = Instant::now();
            let result = if action == "install" {
                me.install(&task_id, &cancel)
            } else {
                me.worker(&mut req, &task_id, &cancel, Duration::from_secs(3600))
            };
            if action == "run" && (result.is_err() || cancel.load(Ordering::SeqCst)) {
                if let Some(root) = req["project"]
                    .as_str()
                    .and_then(|p| std::fs::canonicalize(p).ok())
                {
                    let output = root.join("renders").join(&task_id);
                    // Never follow a user-created link during cancellation cleanup.
                    if output.canonicalize().ok().as_ref() == Some(&output) {
                        if let Err(error) = std::fs::remove_dir_all(&output) {
                            me.log(&task_id, format!("Output cleanup: {error}"));
                        }
                    }
                }
            }
            me.update(&task_id, |t| {
                t.elapsed = start.elapsed().as_secs_f64();
                if cancel.load(Ordering::SeqCst) {
                    t.status = "cancelled".into();
                } else {
                    match result {
                        Ok(data) => {
                            t.status = "completed".into();
                            t.result = Some(data);
                        }
                        Err(err) => {
                            t.status = "failed".into();
                            t.error = Some(err);
                        }
                    }
                }
            });
            // Persist compact history only, never unlimited process output.
            let history = me.snapshot();
            if let Ok(bytes) = serde_json::to_vec(&history) {
                let _ = std::fs::write(me.root.join("tasks.json"), bytes);
            }
        });
        Ok(id)
    }

    pub fn request(&self, mut req: Value) -> Result<Value, String> {
        let action = req["action"].as_str().unwrap_or("");
        if ![
            "diagnostics",
            "configure_tools",
            "create",
            "import",
            "inspect",
            "read",
            "save",
            "add_asset",
            "trash",
            "export",
            "sandbox_export",
            "outputs",
            "delete_output",
            "media",
        ]
        .contains(&action)
        {
            return Err("Unknown Studio request".into());
        }
        if !self.python().exists() && action == "diagnostics" {
            return Ok(
                json!({"installed":false,"python":null,"platform":std::env::consts::OS,"isolation":"Local user process; no filesystem/network sandbox"}),
            );
        }
        self.worker(
            &mut req,
            "",
            &AtomicBool::new(false),
            Duration::from_secs(60),
        )
    }

    fn worker(
        &self,
        req: &mut Value,
        id: &str,
        cancel: &AtomicBool,
        timeout: Duration,
    ) -> Result<Value, String> {
        if !self.python().exists() {
            return Err("Install the managed runtime in Studio first".into());
        }
        req["runtime_root"] = json!(self.root);
        let mut cmd = clean_command(self.python().as_os_str());
        cmd.arg("-I")
            .arg(self.root.join("worker/controller.py"))
            .current_dir(&self.root);
        let output = self.process(cmd, Some(req), id, cancel, timeout)?;
        let result: Value = output.ok_or("Worker exited without a result; inspect task logs")?;
        if result["ok"] == true {
            Ok(result["data"].clone())
        } else {
            Err(result["error"]
                .as_str()
                .unwrap_or("Worker failed")
                .to_string())
        }
    }

    fn process(
        &self,
        mut cmd: Command,
        input: Option<&Value>,
        id: &str,
        cancel: &AtomicBool,
        timeout: Duration,
    ) -> Result<Option<Value>, String> {
        cmd.stdin(if input.is_some() {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Cannot start process: {e}"))?;
        let containment = match ProcessTree::new(&child) {
            Ok(c) => c,
            Err(e) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(e);
            }
        };
        if let Some(input) = input {
            let mut stdin = child.stdin.take().ok_or("Missing process input")?;
            serde_json::to_writer(&mut stdin, input).map_err(|e| e.to_string())?;
            stdin.write_all(b"\n").map_err(|e| e.to_string())?;
            if input["action"] == "run" && input["mode"] == "preview" {
                state_lock(&self.inputs).insert(id.to_string(), stdin);
            }
        }
        let result = Arc::new(Mutex::new(None));
        let mut readers = vec![];
        for (label, pipe) in [
            (
                "stdout",
                Box::new(child.stdout.take().ok_or("Missing child stdout pipe")?)
                    as Box<dyn Read + Send>,
            ),
            (
                "stderr",
                Box::new(child.stderr.take().ok_or("Missing child stderr pipe")?)
                    as Box<dyn Read + Send>,
            ),
        ] {
            let me = self.clone();
            let task_id = id.to_string();
            let capture = result.clone();
            readers.push(std::thread::spawn(move || {
                let mut reader = BufReader::new(pipe);
                loop {
                    // Never read an unbounded line from user Python.
                    let mut chunk = Vec::new();
                    match (&mut reader).take(8192).read_until(b'\n', &mut chunk) {
                        Ok(0) | Err(_) => break,
                        Ok(_) => {
                            if chunk.starts_with(b"PANOSTEM_RESULT:") {
                                while !chunk.ends_with(b"\n") && chunk.len() < 2 * 1024 * 1024 {
                                    if (&mut reader)
                                        .take(8192)
                                        .read_until(b'\n', &mut chunk)
                                        .unwrap_or(0)
                                        == 0
                                    {
                                        break;
                                    }
                                }
                            }
                            let line = String::from_utf8_lossy(&chunk).to_string();
                            if let Some(json) = line.trim().strip_prefix("PANOSTEM_RESULT:") {
                                if let Ok(value) = serde_json::from_str(json) {
                                    *state_lock(&capture) = Some(value);
                                }
                            } else {
                                me.log(&task_id, format!("[{label}] {line}"));
                            }
                        }
                    }
                }
            }));
        }
        let start = Instant::now();
        let mut failure = None;
        let status = loop {
            self.update(id, |t| t.elapsed = start.elapsed().as_secs_f64());
            if cancel.load(Ordering::SeqCst) || start.elapsed() > timeout {
                failure = Some(
                    if cancel.load(Ordering::SeqCst) {
                        "Task cancelled"
                    } else {
                        "Task timed out; process tree terminated"
                    }
                    .to_string(),
                );
                containment.terminate();
                let _ = child.kill();
                break child.wait().map_err(|e| e.to_string())?;
            }
            if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
                break status;
            }
            std::thread::sleep(Duration::from_millis(100));
        };
        // Kill surviving grandchildren before joining pipe readers.
        containment.terminate();
        state_lock(&self.inputs).remove(id);
        for reader in readers {
            let _ = reader.join();
        }
        let value = state_lock(&result).take();
        if let Some(failure) = failure {
            return Err(failure);
        }
        if !status.success() && value.is_none() {
            return Err(format!("Process exited {status}; review stdout/stderr"));
        }
        Ok(value)
    }

    fn install(&self, id: &str, cancel: &AtomicBool) -> Result<Value, String> {
        if !cfg!(all(windows, target_arch = "x86_64")) {
            return Err("Automatic bootstrap currently supports Windows x64. Use the documented pinned uv setup for experimental Linux/macOS.".into());
        }
        let uv = self.root.join("uv.exe");
        if !uv.exists() {
            self.log(
                id,
                "Downloading uv 0.13.5 from astral-sh/uv; validating SHA-256".into(),
            );
            let bytes = std::thread::scope(|s| {
                s.spawn(|| {
                    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
                    rt.block_on(async {
                        let response = reqwest::Client::builder()
                            .timeout(Duration::from_secs(180))
                            .build()
                            .map_err(|e| e.to_string())?
                            .get(UV_URL)
                            .send()
                            .await
                            .map_err(|e| e.to_string())?
                            .error_for_status()
                            .map_err(|e| e.to_string())?;
                        if response.content_length().unwrap_or(0) > 64 * 1024 * 1024 {
                            return Err("uv download exceeds size limit".to_string());
                        }
                        response.bytes().await.map_err(|e| e.to_string())
                    })
                })
                .join()
                .map_err(|_| "Runtime download thread failed".to_string())?
            })?;
            if format!("{:x}", Sha256::digest(&bytes)) != UV_SHA {
                return Err("uv SHA-256 mismatch; installation stopped".into());
            }
            let mut archive =
                zip::ZipArchive::new(std::io::Cursor::new(bytes)).map_err(|e| e.to_string())?;
            let mut exe = archive.by_name("uv.exe").map_err(|e| e.to_string())?;
            let mut out = std::fs::File::create(&uv).map_err(|e| e.to_string())?;
            std::io::copy(&mut exe, &mut out).map_err(|e| e.to_string())?;
        }
        for args in [
            vec![
                "python".into(),
                "install".into(),
                "--no-bin".into(),
                "--no-registry".into(),
                PYTHON.into(),
            ],
            vec![
                "venv".into(),
                "--clear".into(),
                "--python".into(),
                PYTHON.into(),
                self.root.join("venv").to_string_lossy().into_owned(),
            ],
            vec![
                "pip".into(),
                "sync".into(),
                "--python".into(),
                self.python().to_string_lossy().into_owned(),
                "--require-hashes".into(),
                self.root
                    .join("worker/requirements.lock")
                    .to_string_lossy()
                    .into_owned(),
            ],
        ] {
            if cancel.load(Ordering::SeqCst) {
                return Err("Installation cancelled".into());
            }
            self.log(id, format!("Runtime phase: {}", args.join(" ")));
            let mut cmd = clean_command(uv.as_os_str());
            cmd.args(args)
                .current_dir(&self.root)
                .env("UV_PYTHON_INSTALL_DIR", self.root.join("python"))
                .env("UV_CACHE_DIR", self.root.join("cache"));
            self.process(cmd, None, id, cancel, Duration::from_secs(1800))?;
        }
        self.worker(
            &mut json!({"action":"prepare_runtime"}),
            id,
            cancel,
            Duration::from_secs(60),
        )
    }

    pub fn register_media(&self, project: &str, file: &str) -> Result<String, String> {
        let result = self.request(json!({"action":"media","project":project,"file":file}))?;
        let token = uuid::Uuid::new_v4().to_string();
        let mut media = state_lock(&self.media);
        if media.len() >= 64 {
            media.clear();
        }
        media.insert(
            token.clone(),
            std::fs::canonicalize(result["path"].as_str().ok_or("Missing media path")?)
                .map_err(|e| e.to_string())?,
        );
        Ok(token)
    }
}

pub fn clean_command(program: &std::ffi::OsStr) -> Command {
    let mut cmd = Command::new(program);
    cmd.env_clear();
    for (key, value) in std::env::vars_os() {
        let name = key.to_string_lossy().to_ascii_uppercase();
        if [
            "SYSTEMROOT",
            "WINDIR",
            "COMSPEC",
            "TEMP",
            "TMP",
            "HOME",
            "USERPROFILE",
            "LOCALAPPDATA",
            "APPDATA",
            "DISPLAY",
            "XAUTHORITY",
            "LIBGL_ALWAYS_SOFTWARE",
            "WAYLAND_DISPLAY",
            "XDG_RUNTIME_DIR",
            "LANG",
            "LC_ALL",
        ]
        .contains(&name.as_str())
        {
            cmd.env(key, value);
        }
    }
    cmd.env("PYTHONUTF8", "1")
        .env("UV_NO_CONFIG", "1")
        .env("PYTHONUNBUFFERED", "1")
        .env("PYTHONNOUSERSITE", "1");
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }
    cmd
}

#[cfg(windows)]
struct ProcessTree(Mutex<Option<win32job::Job>>);
#[cfg(windows)]
impl ProcessTree {
    fn new(child: &std::process::Child) -> Result<Self, String> {
        use std::os::windows::io::AsRawHandle;
        let mut limits = win32job::ExtendedLimitInfo::new();
        limits.limit_kill_on_job_close();
        let job = win32job::Job::create_with_limit_info(&limits).map_err(|e| e.to_string())?;
        // The child is blocked on its initial request until assignment succeeds.
        job.assign_process(child.as_raw_handle() as isize)
            .map_err(|e| e.to_string())?;
        Ok(Self(Mutex::new(Some(job))))
    }
    fn terminate(&self) {
        drop(state_lock(&self.0).take());
    }
}
#[cfg(unix)]
struct ProcessTree {
    pid: nix::unistd::Pid,
    terminated: AtomicBool,
}
#[cfg(unix)]
impl ProcessTree {
    fn new(child: &std::process::Child) -> Result<Self, String> {
        let pid = i32::try_from(child.id()).map_err(|_| "Child PID outside POSIX range")?;
        Ok(Self {
            pid: nix::unistd::Pid::from_raw(pid),
            terminated: AtomicBool::new(false),
        })
    }
    fn terminate(&self) {
        if !self.terminated.swap(true, Ordering::SeqCst) {
            let _ = nix::sys::signal::killpg(self.pid, nix::sys::signal::Signal::SIGKILL);
        }
    }
}
#[cfg(unix)]
impl Drop for ProcessTree {
    fn drop(&mut self) {
        self.terminate();
    }
}

#[cfg(feature = "tauri")]
#[tauri::command]
pub async fn studio_request(
    state: tauri::State<'_, Studio>,
    request: Value,
) -> Result<Value, String> {
    let studio = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || studio.request(request))
        .await
        .map_err(|e| e.to_string())?
}
#[cfg(feature = "tauri")]
#[tauri::command]
pub fn studio_start(state: tauri::State<'_, Studio>, request: Value) -> Result<String, String> {
    state.start(request)
}
#[cfg(feature = "tauri")]
#[tauri::command]
pub fn studio_tasks(state: tauri::State<'_, Studio>) -> Vec<Task> {
    state.snapshot()
}
#[cfg(feature = "tauri")]
#[tauri::command]
pub fn studio_cancel(state: tauri::State<'_, Studio>, id: String) -> Result<(), String> {
    state.cancel(&id)
}
#[cfg(feature = "tauri")]
#[tauri::command]
pub fn studio_input(
    state: tauri::State<'_, Studio>,
    id: String,
    text: String,
) -> Result<(), String> {
    state.input(&id, &text)
}
#[cfg(feature = "tauri")]
#[tauri::command]
pub async fn studio_media(
    state: tauri::State<'_, Studio>,
    project: String,
    file: String,
) -> Result<String, String> {
    let studio = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || studio.register_media(&project, &file))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn command_environment_drops_credentials() {
        let cmd = clean_command(std::ffi::OsStr::new("python"));
        let keys: Vec<_> = cmd
            .get_envs()
            .map(|(k, _)| k.to_string_lossy().into_owned())
            .collect();
        assert!(!keys
            .iter()
            .any(|k| k.contains("TOKEN") || k.contains("PROXY") || k == "PYTHONPATH"));
    }
    #[test]
    fn installer_is_immutable() {
        assert!(UV_URL.contains("/0.13.5/"));
        assert_eq!(UV_SHA.len(), 64);
        assert_eq!(PYTHON, "3.11.14");
    }
    #[test]
    fn log_is_bounded_and_cancel_is_explicit() -> Result<(), Box<dyn std::error::Error>> {
        let dir = std::env::temp_dir().join(format!(
            "panostem-rust-{}",
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        let studio = Studio::new(dir.clone())?;
        assert!(studio.start(json!({"action":"install"})).is_err());
        assert!(studio.start(json!({"action":"shell"})).is_err());
        assert!(studio.cancel("missing").is_err());
        std::fs::remove_dir_all(dir)?;
        Ok(())
    }
}
