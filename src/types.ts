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
}

export const DEFAULT_SETTINGS: AudioPluginManagerSettings = {
  mainFolder: '',
  extensions: ['.dll', '.vst3', '.exe', '.msi', '.iso', '.dmg'],
  foldersToIgnore: ['Samples', 'Presets', 'Documentation', 'Manual'],
  lastScanDate: '',
  autoGenerateNotes: true,
  notesFolder: 'Plugins'
};

export interface ScanResults {
  developers: number;
  plugins: number;
  zips: number;
}
