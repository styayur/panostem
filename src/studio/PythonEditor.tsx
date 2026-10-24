import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { useSettingsStore } from "../stores/settingsStore";
import { useEffect, useRef } from "react";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";

export default function PythonEditor({
  value,
  onChange,
  readOnly = false,
  line = 1,
  label,
}: {
  value: string;
  onChange?: (text: string) => void;
  readOnly?: boolean;
  line?: number;
  label: string;
}) {
  const ref = useRef<ReactCodeMirrorRef>(null);
  const theme = useSettingsStore((s) => s.settings.theme);
  useEffect(() => {
    const view = ref.current?.view;
    if (!view) return;
    const pos = view.state.doc.line(
      Math.min(Math.max(1, line), view.state.doc.lines),
    ).from;
    view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
  }, [line]);
  return (
    <CodeMirror
      ref={ref}
      value={value}
      onChange={onChange}
      extensions={[python()]}
      readOnly={readOnly}
      theme={theme === "dark" ? "dark" : "light"}
      aria-label={label}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: !readOnly,
        foldGutter: true,
        autocompletion: true,
      }}
      height="100%"
    />
  );
}
