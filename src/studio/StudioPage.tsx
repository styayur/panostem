import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { IS_TAURI } from "../lib/commands";
import { useSettingsStore } from "../stores/settingsStore";
import { localize } from "../learning/types";
import { conceptById } from "../lib/concepts";
import { useWorkbenchStore } from "../workbench/workbenchStore";
import { studioText as ui } from "./uiText";
import * as backend from "./backend";
import {
  safePath,
  type Project,
  type RunResult,
  type SceneMetadata,
  type Task,
} from "./contracts";
import { exportShare, importShare, shareMime, type Share } from "./share";
import { useSceneRegistry } from "./registry";
import "./studio.css";
import { knowledgeModels, knowledgeModelById } from "../knowledge/catalog";
import { useModelSelection } from "../knowledge/selection";
const PythonEditor = lazy(() => import("./PythonEditor"));
const inputText = (file: Uint8Array) => new TextDecoder().decode(file);

export default function StudioPage() {
  const locale = useSettingsStore((s) => s.settings.ui_locale);
  const t = (key: keyof typeof ui) => localize(ui[key], locale);
  const [path, setPath] = useState(
    () => localStorage.getItem("panostem.project-path") ?? "",
  );
  const [archive, setArchive] = useState("");
  const [sandboxPath, setSandboxPath] = useState("");
  const [template, setTemplate] = useState("curves");
  const [project, setProject] = useState<Project | null>(null);
  const [file, setFile] = useState(""),
    [text, setText] = useState(""),
    [saved, setSaved] = useState("");
  const [newFile, setNewFile] = useState("helpers.py");
  const [toolPaths, setToolPaths] = useState(""),
    [asset, setAsset] = useState(""),
    [assetTarget, setAssetTarget] = useState("assets/image.png");
  const [line, setLine] = useState(1);
  const [entry, setEntry] = useState("main.py"),
    [scene, setScene] = useState("CurveScene");
  const [resolution, setResolution] = useState("854x480"),
    [fps, setFps] = useState(30),
    [format, setFormat] = useState("mp4");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [trusted, setTrusted] = useState(false),
    [installConsent, setInstallConsent] = useState(false),
    [depConsent, setDepConsent] = useState(false);
  const [runtime, setRuntime] = useState<Record<string, unknown>>({
    installed: false,
  });
  const [jobs, setJobs] = useState<Task[]>([]),
    [history, setHistory] = useState<RunResult[]>([]);
  const [output, setOutput] = useState<RunResult | null>(null),
    [mediaPath, setMediaPath] = useState(""),
    [mediaUrl, setMediaUrl] = useState("");
  const [share, setShare] = useState<Share | null>(null),
    [shareMedia, setShareMedia] = useState("");
  const [title, setTitle] = useState(""),
    [license, setLicense] = useState("Unspecified"),
    [includeSource, setIncludeSource] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const [activeLog, setActiveLog] = useState("");
  const [consoleText, setConsoleText] = useState("");
  const requests = useRef(new Map<string, Record<string, unknown>>()),
    lastDone = useRef("");
  const activeProject = useRef("");
  const dirty = text !== saved;
  const running = jobs.some((j) => j.status === "running");
  const register = useSceneRegistry((s) => s.register);
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await work();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const diagnostics = async () =>
    setRuntime(await backend.request({ action: "diagnostics" }));

  useEffect(() => {
    if (!IS_TAURI) return;
    let active = true;
    backend
      .request<Record<string, unknown>>({ action: "diagnostics" })
      .then((r) => active && setRuntime(r))
      .catch((e) => active && setError(String(e)));
    const timer = setInterval(
      () =>
        backend
          .tasks()
          .then((list) => {
            if (!active) return;
            setJobs(list);
            const job = list[0];
            if (
              job &&
              job.status !== "running" &&
              lastDone.current !== job.id
            ) {
              lastDone.current = job.id;
              if (job.error) setError(job.error);
              if (job.status === "completed" && job.action === "install")
                diagnostics().catch((e) => setError(String(e)));
              if (
                job.status === "completed" &&
                job.action === "run" &&
                job.result &&
                job.project === activeProject.current
              ) {
                setOutput(job.result);
                setIncludeSource(false);
                setMediaPath(job.result.media[0]?.path ?? "");
                setHistory((h) => [job.result!, ...h].slice(0, 50));
              }
            }
          })
          .catch((e) => active && setError(String(e))),
      750,
    );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setMediaUrl("");
    if (project && mediaPath)
      backend
        .media(project.root, mediaPath)
        .then((url) => active && setMediaUrl(url))
        .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [project?.root, mediaPath]);
  useEffect(() => {
    if (!share || !shareMedia) return;
    const data = share.files[shareMedia];
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(data).buffer], { type: shareMime(shareMedia) }),
    );
    setMediaUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [share, shareMedia]);

  const confirmDiscard = () => !dirty || window.confirm(t("discard"));
  const loadFile = async (name: string, at = 1, current = project) => {
    if (!current || !confirmDiscard()) return;
    const result = await backend.request<{ text: string }>({
      action: "read",
      project: current.root,
      file: name,
    });
    setFile(name);
    setText(result.text);
    setSaved(result.text);
    setLine(at);
  };
  const accept = async (p: Project) => {
    activeProject.current = p.root;
    setProject(p);
    setPath(p.root);
    localStorage.setItem("panostem.project-path", p.root);
    setTrusted(false);
    setDepConsent(false);
    setValues({});
    setShare(null);
    setIncludeSource(false);
    setOutput(null);
    setMediaPath("");
    setMediaUrl("");
    if (p.metadata) {
      register(p.metadata);
      setTitle(p.metadata.title);
      setLicense(p.metadata.license);
      setEntry(p.metadata.entry);
      setScene(p.metadata.scene);
    } else {
      setTitle(p.root.split(/[\\/]/).pop() ?? "Scene");
      setLicense("Unspecified");
      setEntry(p.scenes[0]?.file ?? "main.py");
      setScene(p.scenes[0]?.name ?? "");
    }
    setFile("");
    setText("");
    setSaved("");
    const first =
      p.metadata?.entry ?? p.files.find((f) => f.path.endsWith(".py"))?.path;
    if (first) {
      const r = await backend.request<{ text: string }>({
        action: "read",
        project: p.root,
        file: first,
      });
      setFile(first);
      setText(r.text);
      setSaved(r.text);
    }
    setHistory(await backend.request({ action: "outputs", project: p.root }));
  };
  const projectAction = (action: string, chosenTemplate = template) =>
    run(async () => {
      if (!confirmDiscard()) return;
      const p = await backend.request<Project>({
        action,
        project: path,
        template: chosenTemplate,
        archive,
      });
      await accept(p);
    });
  const save = () =>
    run(async () => {
      if (!project) return;
      const p = await backend.request<Project>({
        action: "save",
        project: project.root,
        file,
        text,
      });
      setProject(p);
      setSaved(text);
      setTrusted(false);
      setDepConsent(false);
      setStatus(t("saved"));
      if (p.metadata) register(p.metadata);
    });
  const start = (mode: string) =>
    run(async () => {
      if (!project) return;
      if (dirty) throw new Error(t("saveFirst"));
      const req = {
        action: "run",
        project: project.root,
        entry,
        scene,
        mode,
        format,
        resolution,
        fps,
        parameters: values,
        trust: trusted,
        revision: project.revision,
      };
      const id = await backend.start(req);
      requests.current.set(id, req);
      setActiveLog(id);
      setShare(null);
    });
  const imported = async (f: File) => {
    if (f.size > 512 * 1024 * 1024)
      throw new Error("Share ZIP exceeds 512 MiB");
    const s = await importShare(new Uint8Array(await f.arrayBuffer()));
    setMediaUrl("");
    setShare(s);
    register(s.manifest.scene);
    setShareMedia(
      s.manifest.files.find((x) => x.role === "video" || x.role === "frame")
        ?.path ?? "",
    );
    setTitle(s.manifest.scene.title);
    setLicense(s.manifest.scene.license);
    setIncludeSource(false);
  };
  const example = async (key = "oscillator") => {
    const model=key.startsWith("knowledge-")?knowledgeModelById.get(key.slice(10)):undefined;
    if(key!=="oscillator"&&!model?.sharePath)throw new Error("No cleared scene share is available for this model");
    const response = await fetch(
      `${import.meta.env.BASE_URL}${model?.sharePath?`${model.sharePath}?v=${model.shareHash}`:"examples/oscillator.panostem.zip"}`,
    );
    if (!response.ok)
      throw new Error(
        "Example share is unavailable; import a local share ZIP instead",
      );
    const bytes=await response.arrayBuffer();
    if(model?.shareHash){
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(n=>n.toString(16).padStart(2,"0")).join("");
      if(digest!==model.shareHash)throw new Error("Model share hash does not match reviewed catalog");
    }
    await imported(new File([bytes], `${key}.panostem.zip`));
  };
  useEffect(() => {
    const selection=useModelSelection.getState();
    if(selection.template&&knowledgeModelById.has(selection.template))setTemplate(`knowledge-${selection.template}`);
    const requested=selection.example?`knowledge-${selection.example}`:new URLSearchParams(location.search).get("example");
    if(requested==="oscillator"||(requested?.startsWith("knowledge-")&&knowledgeModelById.get(requested.slice(10))?.sharePath))void run(()=>example(requested));
    selection.clear();
  }, []);
  const download = (bytes: Uint8Array, name: string) => {
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(bytes).buffer], { type: "application/zip" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const shareExport = () =>
    run(async () => {
      if (share) {
        const data = await exportShare(
          { ...share.manifest.scene, title, license },
          share.manifest.files
            .filter((f) => includeSource || f.role !== "source")
            .map((f) => ({ ...f, data: share.files[f.path] })),
        );
        download(data, "scene.panostem.zip");
        return;
      }
      if (!project || !output) throw new Error(t("emptyOutput"));
      const m: SceneMetadata = {
        ...(output.metadata ??
          project.metadata ?? {
            version: 1,
            id: scene,
            description: "",
            concept_ids: [],
            learning_objectives: [],
            parameters: {},
          }),
        version: 1,
        title,
        license,
        entry: output.entry,
        scene: output.scene,
      };
      const items = [];
      for (const f of output.media) {
        const url = await backend.media(project.root, f.path);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Cannot read output: ${f.path}`);
        const name = f.path.split("/").pop()!;
        items.push({
          path: `media/${name}`,
          role: (name === "thumbnail.png"
            ? "thumbnail"
            : name.endsWith(".png")
              ? "frame"
              : "video") as "thumbnail" | "frame" | "video",
          data: new Uint8Array(await response.arrayBuffer()),
        });
      }
      if (includeSource) {
        const current = await backend.request<Project>({
          action: "inspect",
          project: project.root,
        });
        if (dirty || current.revision !== output.revision) {
          throw new Error(t("sourceMismatch"));
        }
        const source = file.endsWith(".py") ? file : output.entry;
        const r = await backend.request<{ text: string }>({
          action: "read_run_source",
          project: project.root,
          run_id: output.output.split(/[\\/]/).pop(),
          file: source,
        });
        items.push({
          path: `source/${source}`,
          role: "source" as const,
          data: new TextEncoder().encode(r.text),
        });
      }
      const bytes = await exportShare(m, items);
      download(bytes, "scene.panostem.zip");
    });
  const navigate = (id: string) => {
    useWorkbenchStore.getState().open(id, { type: "resource" });
    useSettingsStore.getState().setPage("search");
  };
  const chosen = jobs.find((j) => j.id === activeLog) ?? jobs[0];
  const shownPath = share ? shareMedia : mediaPath;
  const sceneMeta = share?.manifest.scene ?? project?.metadata;
  const button = (key: keyof typeof ui, fn: () => void, disabled = false) => (
    <button type="button" disabled={busy || disabled} onClick={fn}>
      {t(key)}
    </button>
  );

  return (
    <div
      className={`studio ${IS_TAURI ? "studio-desktop" : "studio-web"}`}
      data-testid="manimgl-studio"
    >
      <header className="studio-heading">
        <div>
          <h1>{t("studio")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <label className="studio-upload">
          {t("importShare")}
          <input
            type="file"
            accept=".zip"
            aria-label={t("importShare")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) run(() => imported(f));
              e.target.value = "";
            }}
          />
        </label>
      </header>
      {!IS_TAURI && (
        <div className="studio-boundary">
          <p>{t("webBoundary")}</p>
          {button("example", () => run(example))}
        </div>
      )}
      {error && (
        <p role="alert" className="studio-error">
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      {IS_TAURI && (
        <>
          <details className="studio-runtime" open={!runtime.installed}>
            <summary>
              {t("runtime")}: {t(runtime.installed ? "ready" : "missing")}
            </summary>
            <pre>{JSON.stringify(runtime, null, 2)}</pre>
            <p>ManimGL 1.7.2 / f427fc67 · CPython 3.11.14</p>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={installConsent}
                onChange={(e) => setInstallConsent(e.target.checked)}
              />
              {t("installConsent")}
            </label>
            <div className="studio-actions">
              {button(
                "install",
                () =>
                  run(async () =>
                    setActiveLog(
                      await backend.start({
                        action: "install",
                        authorize_install: installConsent,
                      }),
                    ),
                  ),
                !installConsent || running,
              )}
              {button("diagnose", () => run(diagnostics), running)}
            </div>
            <label>
              {t("tools")}
              <textarea
                rows={3}
                value={toolPaths}
                onChange={(e) => setToolPaths(e.target.value)}
              />
            </label>
            {button(
              "saveTools",
              () =>
                run(async () =>
                  setRuntime(
                    await backend.request({
                      action: "configure_tools",
                      paths: toolPaths
                        .split(/\r?\n/)
                        .map((p) => p.trim())
                        .filter(Boolean),
                    }),
                  ),
                ),
              running,
            )}
            {button(
              "selftest",
              () => projectAction("create", "blank"),
              running || !path,
            )}
          </details>
          <section className="studio-project">
            <label>
              {t("project")}
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={
                  String(runtime.platform).includes("win")
                    ? "D:\\ManimProjects\\my-scene"
                    : "/home/user/ManimProjects/my-scene"
                }
              />
            </label>
            <label>
              {t("template")}
              <select
                aria-label={t("template")}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                {(
                  [
                    "blank",
                    "curves",
                    "geometry3d",
                    "physics",
                    "updater",
                  ] as const
                ).map((x) => (
                  <option key={x} value={x}>
                    {t(x)}
                  </option>
                ))}
                {knowledgeModels.map(model=><option key={model.id} value={`knowledge-${model.id}`}>{localize(model.title,locale)}</option>)}
              </select>
            </label>
            <div className="studio-actions">
              {button("open", () => projectAction("inspect"), running)}
              {button("create", () => projectAction("create"), running)}
            </div>
            <details>
              <summary>
                {t("importProject")} / {t("exportProject")}
              </summary>
              <label>
                {t("archive")}
                <input
                  value={archive}
                  onChange={(e) => setArchive(e.target.value)}
                />
              </label>
              <div className="studio-actions">
                {button(
                  "importProject",
                  () => projectAction("import"),
                  running,
                )}
                {button(
                  "exportProject",
                  () =>
                    run(async () => {
                      if (project) {
                        const r = await backend.request<{
                          path: string;
                          sha256: string;
                        }>({
                          action: "export",
                          project: project.root,
                          archive,
                        });
                        setStatus(`${r.path} SHA-256 ${r.sha256}`);
                      }
                    }),
                  !project || running,
                )}
              </div>
            </details>
          </section>
          {!project && <p className="studio-empty">{t("noProject")}</p>}
          {project && (
            <div className="studio-workspace">
              <aside className="studio-files" aria-label={t("files")}>
                <h2>{t("files")}</h2>
                {project.files.map((f) => (
                  <button
                    key={f.path}
                    type="button"
                    aria-current={file === f.path ? "true" : undefined}
                    onClick={() => run(() => loadFile(f.path))}
                  >
                    {f.path}
                  </button>
                ))}
                <label>
                  {t("filename")}
                  <input
                    value={newFile}
                    onChange={(e) => setNewFile(e.target.value)}
                  />
                </label>
                {button(
                  "newFile",
                  () =>
                    run(async () => {
                      safePath(newFile);
                      if (project.files.some((f) => f.path === newFile))
                        throw new Error("File already exists");
                      if (!confirmDiscard()) return;
                      const p = await backend.request<Project>({
                        action: "save",
                        project: project.root,
                        file: newFile,
                        text: "",
                      });
                      setProject(p);
                      setFile(newFile);
                      setText("");
                      setSaved("");
                      setTrusted(false);
                      setDepConsent(false);
                    }),
                  running,
                )}
                {button(
                  "trash",
                  () =>
                    run(async () => {
                      if (
                        !file ||
                        !confirmDiscard() ||
                        !window.confirm(`${t("confirmTrash")}\n${file}`)
                      )
                        return;
                      const p = await backend.request<Project>({
                        action: "trash",
                        project: project.root,
                        file,
                      });
                      setProject(p);
                      setFile("");
                      setText("");
                      setSaved("");
                      setTrusted(false);
                      setDepConsent(false);
                    }),
                  !file || running,
                )}
                <details>
                  <summary>{t("addAsset")}</summary>
                  <label>
                    {t("asset")}
                    <input
                      value={asset}
                      onChange={(e) => setAsset(e.target.value)}
                    />
                  </label>
                  <label>
                    {t("assetTarget")}
                    <input
                      value={assetTarget}
                      onChange={(e) => setAssetTarget(e.target.value)}
                    />
                  </label>
                  {button(
                    "addAsset",
                    () =>
                      run(async () => {
                        setProject(
                          await backend.request({
                            action: "add_asset",
                            project: project.root,
                            source: asset,
                            file: assetTarget,
                          }),
                        );
                        setTrusted(false);
                        setDepConsent(false);
                      }),
                    running,
                  )}
                </details>
              </aside>
              <section className="studio-code">
                <div className="studio-code-toolbar">
                  <strong>{file}</strong>
                  <span>{dirty ? t("dirty") : t("saved")}</span>
                  {button("save", save, !file || running)}
                </div>
                <Suspense fallback={<p>…</p>}>
                  <PythonEditor
                    readOnly={busy}
                    value={text}
                    onChange={(value) => {
                      setText(value);
                      setTrusted(false);
                      setDepConsent(false);
                    }}
                    line={line}
                    label={t("editor")}
                  />
                </Suspense>
                {project.errors.map((e, i) => (
                  <button
                    type="button"
                    className="studio-diagnostic"
                    key={i}
                    onClick={() => run(() => loadFile(e.file, e.line))}
                  >
                    {e.file}:{e.line} {e.message}
                  </button>
                ))}
              </section>
              <aside className="studio-run">
                <label>
                  {t("entry")}
                  <input
                    list="studio-entries"
                    value={entry}
                    onChange={(e) => setEntry(e.target.value)}
                  />
                  <datalist id="studio-entries">
                    {project.files
                      .filter((f) => f.path.endsWith(".py"))
                      .map((f) => (
                        <option key={f.path}>{f.path}</option>
                      ))}
                  </datalist>
                </label>
                <label>
                  {t("scene")}
                  <input
                    list="studio-scenes"
                    value={scene}
                    onChange={(e) => setScene(e.target.value)}
                  />
                  <datalist id="studio-scenes">
                    {project.scenes
                      .filter((s) => s.file === entry)
                      .map((s) => (
                        <option key={s.name}>{s.name}</option>
                      ))}
                  </datalist>
                </label>
                <div className="studio-options">
                  <label>
                    {t("resolution")}
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    >
                      {["854x480", "1280x720", "1920x1080", "3840x2160"].map(
                        (v) => (
                          <option key={v}>{v}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    {t("fps")}
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={fps}
                      onChange={(e) => setFps(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    {t("format")}
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                    >
                      {["mp4", "gif", "mov"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {Object.entries(project.metadata?.parameters ?? {}).length >
                  0 && (
                  <fieldset>
                    <legend>{t("parameters")}</legend>
                    {Object.entries(project.metadata!.parameters!).map(
                      ([name, s]) => (
                        <label key={name}>
                          {name}
                          <input
                            type={
                              s.type === "boolean"
                                ? "checkbox"
                                : s.type === "string"
                                  ? "text"
                                  : "number"
                            }
                            min={s.min}
                            max={s.max}
                            step={s.type === "integer" ? 1 : "any"}
                            checked={
                              s.type === "boolean"
                                ? Boolean(values[name] ?? s.default)
                                : undefined
                            }
                            value={
                              s.type === "boolean"
                                ? undefined
                                : String(values[name] ?? s.default)
                            }
                            onChange={(e) =>
                              setValues((v) => ({
                                ...v,
                                [name]:
                                  s.type === "boolean"
                                    ? e.target.checked
                                    : s.type === "string"
                                      ? e.target.value
                                      : Number(e.target.value),
                              }))
                            }
                          />
                        </label>
                      ),
                    )}
                  </fieldset>
                )}
                <label className="studio-check studio-trust">
                  <input
                    type="checkbox"
                    disabled={busy || dirty || running}
                    checked={trusted}
                    onChange={(e) => setTrusted(e.target.checked)}
                  />
                  {t("trust")}
                </label>
                <div className="studio-actions">
                  {button(
                    "preview",
                    () => start("preview"),
                    !trusted || dirty || running,
                  )}
                  {button(
                    "render",
                    () => start("render"),
                    !trusted || dirty || running,
                  )}
                  {button(
                    "frame",
                    () => start("frame"),
                    !trusted || dirty || running,
                  )}
                </div>
                <p className="studio-note">{t("previewNote")}</p>
                <details>
                  <summary>{t("dependencies")}</summary>
                  {button("dependencies", () =>
                    run(() => loadFile("requirements.txt")),
                  )}
                  <label className="studio-check">
                    <input
                      type="checkbox"
                      disabled={busy || dirty || running}
                      checked={depConsent}
                      onChange={(e) => setDepConsent(e.target.checked)}
                    />
                    {t("dependencyConsent")}
                  </label>
                  {button(
                    "installDependencies",
                    () =>
                      run(async () =>
                        setActiveLog(
                          await backend.start({
                            action: "dependencies",
                            project: project.root,
                            revision: project.revision,
                            authorize_dependencies: depConsent,
                          }),
                        ),
                      ),
                    !depConsent || dirty || running,
                  )}
                </details>
                <details>
                  <summary>{t("sandbox")}</summary>
                  <p className="studio-note">{t("sandboxNote")}</p>
                  <label>
                    {t("sandboxPath")}
                    <input
                      value={sandboxPath}
                      onChange={(e) => setSandboxPath(e.target.value)}
                    />
                  </label>
                  {button(
                    "sandbox",
                    () =>
                      run(async () => {
                        const r = await backend.request<{ path: string }>({
                          action: "sandbox_export",
                          project: project.root,
                          sandbox_directory: sandboxPath,
                          entry,
                          scene,
                          mode: "render",
                          format,
                          resolution,
                          fps,
                          parameters: values,
                        });
                        setStatus(r.path);
                      }),
                    running || dirty || !sandboxPath,
                  )}
                </details>
              </aside>
            </div>
          )}
        </>
      )}
      <div className="studio-results">
        <section className="studio-playback">
          <div className="studio-player">
            <h2>{t("output")}</h2>
            {!share && history.length > 0 && (
              <select
                aria-label={t("output")}
                value={output?.output ?? ""}
                onChange={(e) => {
                  const r =
                    history.find((h) => h.output === e.target.value) ?? null;
                  setOutput(r);
                  setIncludeSource(false);
                  setMediaPath(r?.media[0]?.path ?? "");
                }}
              >
                <option value="">—</option>
                {history.map((h) => (
                  <option key={h.output} value={h.output}>
                    {h.scene} {h.output.split(/[\\/]/).pop()}
                  </option>
                ))}
              </select>
            )}
            {share ? (
              <select
                aria-label={t("output")}
                value={shareMedia}
                onChange={(e) => setShareMedia(e.target.value)}
              >
                {share.manifest.files
                  .filter((f) =>
                    ["video", "thumbnail", "frame"].includes(f.role),
                  )
                  .map((f) => (
                    <option key={f.path}>{f.path}</option>
                  ))}
              </select>
            ) : (
              output && (
                <select
                  value={mediaPath}
                  aria-label={t("mediaFile")}
                  onChange={(e) => setMediaPath(e.target.value)}
                >
                  {output.media.map((f) => (
                    <option key={f.path}>{f.path}</option>
                  ))}
                </select>
              )
            )}
            {mediaUrl ? (
              shownPath.endsWith(".png") || shownPath.endsWith(".gif") ? (
                <img src={mediaUrl} alt={title} />
              ) : (
                <video
                  src={mediaUrl}
                  controls
                  preload="metadata"
                  aria-label={title}
                />
              )
            ) : (
              <p className="studio-empty">{t("emptyOutput")}</p>
            )}
            {output && !share && (
              <p className="studio-output-path">{output.output}</p>
            )}
            {output &&
              !share &&
              project &&
              button(
                "remove",
                () =>
                  run(async () => {
                    if (
                      !window.confirm(`${t("confirmRemove")}\n${output.output}`)
                    )
                      return;
                    const id = output.output
                      .replaceAll("\\", "/")
                      .split("/")
                      .pop();
                    await backend.request({
                      action: "delete_output",
                      project: project.root,
                      file: `renders/${id}`,
                    });
                    setOutput(null);
                    setMediaPath("");
                    setMediaUrl("");
                    setHistory(
                      await backend.request({
                        action: "outputs",
                        project: project.root,
                      }),
                    );
                  }),
                running,
              )}
          </div>
          <div className="studio-sharing">
            <h2>{t("share")}</h2>
            <label>
              {t("title")}
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              {t("license")}
              <input
                value={license}
                onChange={(e) => setLicense(e.target.value)}
              />
            </label>
            {sceneMeta && (
              <>
                <p>{sceneMeta.description}</p>
                <div className="studio-concepts">
                  {sceneMeta.concept_ids.map((id) => (
                    <button key={id} type="button" onClick={() => navigate(id)}>
                      {t("navigate")}:{" "}
                      {locale === "en"
                        ? conceptById.get(id)!.en
                        : locale === "zh-CN"
                          ? conceptById.get(id)!.zh_cn
                          : conceptById.get(id)!.zh_tw}
                    </button>
                  ))}
                </div>
                <ul>
                  {sceneMeta.learning_objectives.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </>
            )}
            <label className="studio-check">
              <input
                type="checkbox"
                checked={includeSource}
                onChange={(e) => setIncludeSource(e.target.checked)}
              />
              {t("includeSource")}
            </label>
            {button("exportShare", shareExport, !share && !output)}
            <p className="studio-note">{t("shareNotice")}</p>
          </div>
        </section>
        {share &&
          share.manifest.files
            .filter((f) => f.role === "source" || f.role === "notice")
            .map((f) => (
              <details key={f.path}>
                <summary>
                  {f.path} ({t("source")})
                </summary>
                <pre className="studio-shared-source">
                  {inputText(share.files[f.path])}
                </pre>
              </details>
            ))}
        {IS_TAURI && jobs.length > 0 && (
          <section className="studio-tasks">
            <h2>{t("tasks")}</h2>
            <select
              value={chosen?.id ?? ""}
              aria-label={t("tasks")}
              onChange={(e) => setActiveLog(e.target.value)}
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {t(
                    j.action === "run"
                      ? "renderTask"
                      : j.action === "install"
                        ? "install"
                        : "dependencies",
                  )}
                  : {t(j.status)} ({j.elapsed.toFixed(1)}s) {j.id}
                </option>
              ))}
            </select>
            {chosen && (
              <>
                <div className="studio-actions">
                  <span
                    role="status"
                    className="studio-task-state"
                    data-status={chosen.status}
                  >
                    {t(chosen.status)}
                  </span>
                  <span>{chosen.elapsed.toFixed(1)}s</span>
                  {button(
                    "stop",
                    () => run(() => backend.cancel(chosen.id)),
                    chosen.status !== "running",
                  )}
                  {button(
                    "retry",
                    () =>
                      run(async () => {
                        const request = requests.current.get(chosen.id);
                        if (request) {
                          // Consent belongs to the currently reviewed revision, including retries.
                          if (
                            !project ||
                            dirty ||
                            !trusted ||
                            request.project !== project.root ||
                            request.revision !== project.revision
                          )
                            throw new Error(t("saveFirst"));
                          const id = await backend.start(request);
                          requests.current.set(id, request);
                          setActiveLog(id);
                        }
                      }),
                    running ||
                      !requests.current.has(chosen.id) ||
                      dirty ||
                      !trusted,
                  )}
                </div>
                <pre tabIndex={0} className="studio-log">
                  {chosen.logs.join("")}
                  {chosen.error && `\n${chosen.error}`}
                </pre>
                <div className="studio-tracebacks">
                  {Array.from(
                    chosen.logs
                      .join("")
                      .matchAll(/File "([^"]+)", line (\d+)/g),
                  )
                    .slice(-10)
                    .map((m, i) => {
                      const normalized = m[1].replaceAll("\\", "/");
                      const capturedRoot =
                        chosen.result?.execution_root ??
                        (project
                          ? `${project.root}/renders/${chosen.id}/.execution`
                          : "");
                      const roots = [capturedRoot, project?.root ?? ""].map(
                        (root) => root.replaceAll("\\", "/") + "/",
                      );
                      const prefix = roots.find((root) =>
                        normalized.startsWith(root),
                      );
                      const rel = prefix ? normalized.slice(prefix.length) : "";
                      return project?.files.some((f) => f.path === rel) ? (
                        <button
                          key={i}
                          onClick={() => run(() => loadFile(rel, Number(m[2])))}
                        >
                          {rel}:{m[2]}
                        </button>
                      ) : null;
                    })}
                </div>
              </>
            )}
            {chosen?.status === "running" && chosen.action === "run" && (
              <div className="studio-console">
                <label>
                  {t("console")}
                  <input
                    value={consoleText}
                    onChange={(e) => setConsoleText(e.target.value)}
                  />
                </label>
                {button("send", () =>
                  run(async () => {
                    await backend.consoleInput(chosen.id, consoleText);
                    setConsoleText("");
                  }),
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
