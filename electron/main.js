const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Cargar la aplicación
  const isDev = process.env.NODE_ENV === "development";
  const distPath = path.join(__dirname, "../dist/index.html");

  if (isDev || !fs.existsSync(distPath)) {
    console.log("Cargando en modo desarrollo desde http://localhost:4200");
    mainWindow.loadURL("http://localhost:4200");
    // Abrir las herramientas de desarrollador automáticamente en desarrollo
    mainWindow.webContents.openDevTools();
  } else {
    console.log("Cargando en modo producción desde", distPath);
    mainWindow.loadFile(distPath);
  }

  // Mostrar las herramientas de desarrollador en producción también para debugging
  mainWindow.webContents.openDevTools();

  // Manejar cuando la ventana se cierra
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers para comunicación con el renderer process
ipcMain.handle("read-csv-file", async () => {
  try {
    const csvPath = "C:\\Users\\SantiagoO\\Downloads\\datos_lora.csv";

    // Verificar si el archivo existe
    if (!fs.existsSync(csvPath)) {
      throw new Error(`Archivo no encontrado en: ${csvPath}`);
    }

    // Intentar diferentes codificaciones
    let csvContent;
    const encodings = ["utf8", "latin1", "cp1252", "iso-8859-1"];

    for (const encoding of encodings) {
      try {
        csvContent = fs.readFileSync(csvPath, encoding);
        console.log(`Archivo leído exitosamente con codificación: ${encoding}`);

        // Verificar si el símbolo de grados se lee correctamente
        if (csvContent.includes("°C") || csvContent.includes("°")) {
          console.log("Símbolo de grados detectado correctamente");
          break;
        } else {
          console.log(
            `Codificación ${encoding} no contiene símbolo de grados, intentando siguiente...`
          );
        }
      } catch (err) {
        console.log(`Error con codificación ${encoding}:`, err.message);
        continue;
      }
    }

    // Si no se pudo leer con ninguna codificación, usar utf8 como fallback
    if (!csvContent) {
      csvContent = fs.readFileSync(csvPath, "utf8");
    }

    // Reemplazar caracteres problemáticos si es necesario
    csvContent = csvContent.replace(/\uFFFD/g, "°");

    return { success: true, data: csvContent };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("write-csv-file", async (event, csvContent) => {
  try {
    const csvPath = "C:\\Users\\SantiagoO\\Downloads\\datos_lora.csv";

    // Escribir el archivo CSV
    fs.writeFileSync(csvPath, csvContent, "utf8");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("check-csv-file", async () => {
  try {
    const csvPath = "C:\\Users\\SantiagoO\\Downloads\\datos_lora.csv";
    const exists = fs.existsSync(csvPath);

    if (exists) {
      const stats = fs.statSync(csvPath);
      return {
        success: true,
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
      };
    } else {
      return { success: true, exists: false };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});
