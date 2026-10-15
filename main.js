// ======================================================
// EDIT THIS ONE LINE: put your Nexora website address here
const SITE_URL = "https://nexora-nu-eight-99.vercel.app";
// ======================================================

const { app, BrowserWindow, Tray, Menu, shell, session, nativeImage, desktopCapturer, dialog } = require("electron");
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
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
  });
  win.setMenuBarVisibility(false);
  win.loadURL(SITE_URL);
  win.webContents.on("before-input-event", (e, i) => {
    if (i.type === "keyDown" && (i.key === "F5" || (i.control && i.key.toLowerCase() === "r"))) { win.webContents.reloadIgnoringCache(); e.preventDefault(); }
  });
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
  win.on("close", (e) => { if (!quitting) { e.preventDefault(); hiddenAt = Date.now(); win.hide(); } });
}

let hiddenAt = 0;
function showWin() {
  if (!win) return;
  // Coming back from the tray: load the newest version of the site
  if (hiddenAt && Date.now() - hiddenAt > 30000) win.webContents.reloadIgnoringCache();
  hiddenAt = 0;
  win.show(); win.focus();
}

app.whenReady().then(() => {
  // Allow notifications, microphone (voice chat) and clipboard for the Nexora site only
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => {
    const ok = ["notifications", "media", "display-capture", "clipboard-sanitized-write"].includes(perm);
    cb(ok && wc.getURL().startsWith(SITE_URL));
  });

  // Screen sharing: ask which screen or window to share
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ["screen", "window"], thumbnailSize: { width: 0, height: 0 } });
      const list = sources.slice(0, 12);
      if (!list.length) return callback({});
      const r = await dialog.showMessageBox(win, {
        type: "question", title: "Share your screen", message: "What do you want to share?",
        buttons: [...list.map((s) => s.name.slice(0, 60)), "Cancel"], cancelId: list.length, defaultId: 0, noLink: true
      });
      if (r.response >= list.length) return callback({});
      callback({ video: list[r.response] });
    } catch (e) { callback({}); }
  });

  createWindow();

  const icon = nativeImage.createFromPath(path.join(__dirname, "build", "icon.png")).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip("Nexora");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Nexora", click: showWin },
    { label: "Refresh", click: () => win && win.webContents.reloadIgnoringCache() },
    { label: "Quit", click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on("click", showWin);
});

app.on("second-instance", showWin);
app.on("before-quit", () => { quitting = true; });
app.on("window-all-closed", () => {});
