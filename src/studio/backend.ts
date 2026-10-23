import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { IS_TAURI } from "../lib/commands";
import type { Task } from "./contracts";
import { requireDesktop } from "./execution";

function desktop() {
  requireDesktop(IS_TAURI);
}
export async function request<T>(input: Record<string, unknown>): Promise<T> {
  desktop();
  return invoke<T>("studio_request", { request: input });
}
export async function start(input: Record<string, unknown>): Promise<string> {
  desktop();
  return invoke("studio_start", { request: input });
}
export async function tasks(): Promise<Task[]> {
  desktop();
  return invoke("studio_tasks");
}
export async function cancel(id: string): Promise<void> {
  desktop();
  return invoke("studio_cancel", { id });
}
export async function consoleInput(id: string, text: string): Promise<void> {
  desktop();
  return invoke("studio_input", { id, text });
}
export async function media(project: string, file: string): Promise<string> {
  desktop();
  const token = await invoke<string>("studio_media", { project, file });
  return convertFileSrc(token, "panostem-media");
}
