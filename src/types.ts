// types.ts
// Interfaz para la información de un plugin
export interface PluginInfo {
  name: string;
  developer: string;
  formats: string;
  filePath: string;
  fileCount: number;
  dateAdded: string;
}

// Configuración del plugin
export interface AudioPluginManagerSettings {
  mainFolder: string;
  extensions: string[];
  foldersToIgnore: string[];
  lastScanDate: string;
  autoGenerateNotes: boolean;
  notesFolder: string;
  saveNotesInPluginFolder: boolean; // Nueva configuración
}

export const DEFAULT_SETTINGS: AudioPluginManagerSettings = {
  mainFolder: '',
  extensions: ['.dll', '.vst3', '.exe', '.msi', '.iso', '.dmg'],
  foldersToIgnore: ['Samples', 'Presets', 'Documentation', 'Manual'],
  lastScanDate: '',
  autoGenerateNotes: true,
  notesFolder: 'Plugins',
  saveNotesInPluginFolder: true // Por defecto, guardar en la carpeta del plugin
};

export interface ScanResults {
  developers: number;
  plugins: number;
  zips: number;
  stopped: boolean;  // Nuevo campo para indicar si el escaneo fue detenido
}
