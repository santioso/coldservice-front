const { contextBridge, ipcRenderer } = require("electron");

// Exponer APIs seguras al renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Leer archivo CSV
  readCSVFile: () => ipcRenderer.invoke("read-csv-file"),

  // Escribir archivo CSV
  writeCSVFile: (csvContent) =>
    ipcRenderer.invoke("write-csv-file", csvContent),

  // Verificar si existe el archivo CSV
  checkCSVFile: () => ipcRenderer.invoke("check-csv-file"),

  // Verificar si estamos en Electron
  isElectron: () => true,
});
