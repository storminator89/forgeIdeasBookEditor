import { contextBridge, ipcRenderer } from "electron";

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  node: string;
}

export interface EnvStatus {
  hasEncryptionKey: boolean;
  encryptionKeyGenerated: boolean;
  databaseUrl: string;
  envFile: string;
}

const electronAPI = {
  getEnvStatus: (): Promise<EnvStatus> => ipcRenderer.invoke("app:getEnvStatus"),
  getInfo: (): Promise<AppInfo> => ipcRenderer.invoke("app:getInfo"),
  openUserDataDir: (): Promise<string> =>
    ipcRenderer.invoke("app:openUserDataDir"),
  openLogsDir: (): Promise<string> => ipcRenderer.invoke("app:openLogsDir"),
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke("app:openExternal", url),
} as const;

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
