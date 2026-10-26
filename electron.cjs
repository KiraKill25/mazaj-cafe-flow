const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

let mainWindow = null;

process.on('uncaughtException', (error) => {
  dialog.showErrorBox('CRITICAL CRASH', error.stack || error.toString());
  app.quit();
});

async function startApp() {
  try {
    const basePath = app.isPackaged ? process.resourcesPath : __dirname;
    const serverScript = path.join(basePath, '.output', 'server', 'index.mjs');

    if (!fs.existsSync(serverScript)) {
      dialog.showErrorBox('MISSING SERVER', `Could not find server entry at:\n${serverScript}`);
      app.quit();
      return;
    }

    // Set working directory and environment variables for Nitro
    const serverDir = path.dirname(serverScript);
    process.chdir(serverDir);

    process.env.PORT = '3000';
    process.env.HOST = '127.0.0.1';
    process.env.NODE_ENV = 'production';

    // Start the Nitro server in the background (non-blocking)
    import(pathToFileURL(serverScript).href).catch((err) => {
      dialog.showErrorBox('SERVER RUNTIME ERROR', err.message);
    });

    // Create the browser window immediately
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      autoHideMenuBar: true
    });

    // Give the server 1.5 seconds to spin up, then load localhost
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3000').catch((err) => {
        dialog.showErrorBox('LOAD URL ERROR', err.message);
      });
    }, 1500);

  } catch (err) {
    dialog.showErrorBox('STARTUP ERROR', err.stack || err.toString());
  }
}

app.whenReady().then(() => {
  startApp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      startApp();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
