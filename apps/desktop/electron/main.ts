import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from "electron";
import path from "node:path";
import { ensureUserDataDirs, getPaths } from "./ipc/paths.js";
import { ensureEnvFile, getEnvStatus } from "./ipc/env.js";
import {
  getAppInfo,
  openLogsDir,
  openUserDataDir,
} from "./ipc/shell.js";
import { runMigrationsIfNeeded, migrateImageUrls } from "./migrations.js";
import { startNextServer, stopNextServer } from "./next-server.js";

let mainWindow: BrowserWindow | null = null;
let isShuttingDown = false;

async function bootstrap(): Promise<void> {
  await ensureUserDataDirs();

  const envResult = await ensureEnvFile();

  for (const [k, v] of Object.entries(envResult.envVars)) {
    if (v !== undefined) process.env[k] = v;
  }

  if (envResult.encryptionKeyGenerated) {
    console.log(
      `[desktop] Neuer ENCRYPTION_KEY wurde generiert und gespeichert unter ${envResult.envFile}`,
    );
  }

  try {
    await runMigrationsIfNeeded();
  } catch (err) {
    dialog.showErrorBox(
      "Datenbank-Initialisierung fehlgeschlagen",
      `Prisma konnte die SQLite-Datenbank nicht initialisieren:\n\n${String(err)}`,
    );
    app.exit(1);
    return;
  }

  let serverUrl: string;
  const devUrl = process.env["NEXT_DEV_URL"];
  if (devUrl) {
    serverUrl = devUrl;
  } else {
    try {
      const server = await startNextServer(envResult.envVars);
      serverUrl = server.url;
    } catch (err) {
      dialog.showErrorBox(
        "Server-Start fehlgeschlagen",
        `Der Next.js-Server konnte nicht gestartet werden:\n\n${String(err)}\n\n` +
          `Pruefe die Logs unter ${getPaths().logsDir}.`,
      );
      app.exit(1);
      return;
    }
  }

  if (!devUrl) {
    void migrateImageUrls(serverUrl).catch((err) => {
      console.warn("[desktop] migrateImageUrls failed:", err);
    });
  }

  mainWindow = createMainWindow(serverUrl);
}

function createMainWindow(serverUrl: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: "#0b0b0f",
    title: "Forge Ideas Book Editor",
    icon: resolveIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  void win.loadURL(serverUrl);

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  return win;
}

function resolveIcon(): string | undefined {
  if (!app.isPackaged) return undefined;
  const name =
    process.platform === "win32"
      ? "icon.ico"
      : process.platform === "darwin"
        ? "icon.icns"
        : "icon.png";
  const candidate = path.join(getPaths().webRoot, "resources", name);
  return candidate;
}

function buildAppMenu(): void {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.getName(),
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ] as Electron.MenuItemConstructorOptions[])
      : []),
    {
      label: "Datei",
      submenu: [isMac ? { role: "close" } : { role: "quit" }],
    },
    {
      label: "Bearbeiten",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "Ansicht",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Hilfe",
      submenu: [
        {
          label: "App-Daten-Ordner oeffnen",
          click: () => void openUserDataDir(),
        },
        {
          label: "Logs oeffnen",
          click: () => void openLogsDir(),
        },
        {
          label: "Ueber",
          click: () => {
            const info = getAppInfo();
            void dialog.showMessageBox({
              type: "info",
              title: "Ueber",
              message: `${info.name} ${info.version}`,
              detail: `Electron ${info.electron}\nNode ${info.node}`,
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpc(): void {
  ipcMain.handle("app:getEnvStatus", () => getEnvStatus());
  ipcMain.handle("app:getInfo", () => getAppInfo());
  ipcMain.handle("app:openUserDataDir", () => openUserDataDir());
  ipcMain.handle("app:openLogsDir", () => openLogsDir());
  ipcMain.handle("app:openExternal", (_e, url: string) => {
    if (typeof url !== "string") return;
    return shell.openExternal(url);
  });
}

// Single-instance lock so two app launches don't race on dev.db.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerIpc();
    buildAppMenu();
    void bootstrap();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void bootstrap();
      }
    });
  });

  app.on("window-all-closed", () => {
    isShuttingDown = true;
    void stopNextServer();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    isShuttingDown = true;
    void stopNextServer();
  });
}

void isShuttingDown;
