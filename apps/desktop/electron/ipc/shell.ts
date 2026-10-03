import { app, shell } from "electron";
import { getPaths } from "./paths.js";

export function openUserDataDir(): Promise<string> {
  return shell.openPath(getPaths().userDataDir);
}

export function openLogsDir(): Promise<string> {
  return shell.openPath(getPaths().logsDir);
}

export function openExternalUrl(url: string): Promise<void> {
  return shell.openExternal(url);
}

export function getAppInfo(): { name: string; version: string; electron: string; node: string } {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron ?? "unknown",
    node: process.versions.node,
  };
}
