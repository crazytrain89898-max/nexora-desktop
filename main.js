// ======================================================
// EDIT THIS ONE LINE: put your Nexora website address here
const SITE_URL = "https://nexora-nu-eight-99.vercel.app/";
// ======================================================

const { app, BrowserWindow, Tray, Menu, shell, session, nativeImage } = require("electron");
const path = require("path");

app.setAppUserModelId("app.nexora.desktop");
if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null, tray = null, quitting = false;
const siteHost = new URL(SITE_URL).host;

function createWindow() {
  win = new BrowserWindow({
    width: 1100, height: 760, minWidth: 420, minHeight: 560,
    backgroundColor: "#0d0f14", autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.setMenuBarVisibility(false);
  win.loadURL(SITE_URL);
  win.once("ready-to-show", () => win.show());

  // Links to other websites open in your normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => {
    if (new URL(url).host !== siteHost) { e.preventDefault(); shell.openExternal(url); }
  });
  // If the site can't load (no internet), retry
  win.webContents.on("did-fail-load", (e, code, d, u, isMain) => {
    if (isMain && code !== -3) setTimeout(() => win && win.loadURL(SITE_URL), 4000);
  });

  // Closing the window hides it to the tray so notifications keep working
  win.on("close", (e) => { if (!quitting) { e.preventDefault(); win.hide(); } });
}

function showWin() { if (!win) return; win.show(); win.focus(); }

app.whenReady().then(() => {
  // Allow notifications, microphone (voice chat) and clipboard for the Nexora site only
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => {
    const ok = ["notifications", "media", "clipboard-sanitized-write"].includes(perm);
    cb(ok && wc.getURL().startsWith(SITE_URL));
  });

  createWindow();

  const icon = nativeImage.createFromPath(path.join(__dirname, "build", "icon.png")).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip("Nexora");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Nexora", click: showWin },
    { label: "Quit", click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on("click", showWin);
});

app.on("second-instance", showWin);
app.on("before-quit", () => { quitting = true; });
app.on("window-all-closed", () => {});
