// types.ts
/**
 * Este archivo define las interfaces y tipos utilizados en el plugin Audio Plugin Manager.
 * Incluye:
 * - `PluginInfo`: Interfaz para la información de un plugin.
 * - `AudioPluginManagerSettings`: Interfaz para la configuración del plugin.
 * - `DEFAULT_SETTINGS`: Configuración por defecto del plugin.
 * - `ScanResults`: Interfaz para los resultados del escaneo de plugins.
 * - `PluginFiles`: Interfaz para los archivos de un plugin categorizados.
 * - `DeveloperPlugins`: Interfaz para la estructura de plugins por desarrollador.
 */

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

export interface PluginFiles {
    zipFile?: string;
    executableFile?: string;
    documentationFiles: string[];
    imageFiles: string[];
    otherFiles: string[];
}

export interface DeveloperPlugins {
    [pluginName: string]: PluginFiles;
}

export interface ParsedFileName {
    developer: string;
    pluginName: string;
    platform: string;
    version: string;
    suffix: string;
    extension: string;
}