/** Static Web must fail before attempting native execution IPC. */
export function requireDesktop(isDesktop: boolean): void {
  if (!isDesktop) {
    throw new Error("Python execution is available only in the desktop app");
  }
}
