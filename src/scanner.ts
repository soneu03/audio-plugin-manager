/**
 * Esta clase proporciona métodos para escanear y procesar archivos de plugins.
 * Incluye funcionalidades para:
 * - `setLogCallback`: Establece la función de callback para registrar mensajes.
 * - `requestStop`: Solicita la detención del escaneo de plugins.
 * - `resetStop`: Restablece la solicitud de detención, permitiendo que el escaneo de plugins continúe.
 * - `exportPluginsAsZip`: Exporta una lista de plugins a un archivo zip.
 * - `createDeveloperLog`: Crea un archivo de registro en la carpeta del desarrollador para rastrear las operaciones de cambio de nombre de archivo.
 * - `scanAndProcessPlugins`: Escanea y procesa todos los plugins en la carpeta principal.
 */
import { 
  AudioPluginManagerSettings, 
  ScanResults,
  DeveloperPlugins
} from './types';
import { Notice } from 'obsidian';
import { StatusBar } from './ui/statusBar';
import { NoteGenerator } from './noteGenerator';
import { ZipManager } from './zipManager';
import * as path from 'path';
import * as fs from 'fs';
import { FileScannerService } from './services/fileScannerService';
import { FileNameParser } from './services/fileNameParser';
import { PluginCategorizer } from './services/pluginCategorizer';
import { MarkdownGenerator } from './services/markdownGenerator';
import { PluginProcessor } from './services/pluginProcessor';

const MARKDOWN_INDEX_FILENAME = 'Plugins-Index.md';

export class PluginScanner {
  private stopRequested: boolean = false;
  private logCallback: ((message: string) => void) | null = null;
  private fileScannerService: FileScannerService;
  private fileNameParser: FileNameParser;
  private pluginCategorizer: PluginCategorizer;
  private markdownGenerator: MarkdownGenerator;
  private pluginProcessor: PluginProcessor;

  constructor(
    private settings: AudioPluginManagerSettings,
    private noteGenerator: NoteGenerator,
    private statusBar: StatusBar
  ) {
    this.fileScannerService = new FileScannerService(settings);
    this.fileNameParser = new FileNameParser();
    this.pluginCategorizer = new PluginCategorizer();
    this.markdownGenerator = new MarkdownGenerator(settings);
    this.pluginProcessor = new PluginProcessor(settings, this.log.bind(this));

    if (!fs.existsSync(this.settings.mainFolder)) {
      throw new Error(`La carpeta '${this.settings.mainFolder}' no existe.`);
    }
  }

  /**
   * Sets the callback function for logging messages.
   * @param callback A function that accepts a string message.
   */
  setLogCallback(callback: (message: string) => void): void {
    this.logCallback = callback;
  }

  /**
   * Logs a message to the console and displays a notice in Obsidian.
   * @param message The message to log.
   */
  private log(message: string): void {
    if (this.logCallback) {
      this.logCallback(message);
    }
    console.log(message);
    new Notice(message);
  }

  /**
   * Requests the plugin scanner to stop processing.
   */
  public requestStop(): void {
    this.stopRequested = true;
  }

  /**
   * Resets the stop request, allowing the plugin scanner to continue processing.
   */
  public resetStop(): void {
    this.stopRequested = false;
  }

  /**
   * Exports a list of plugins to a zip file.
   * @param pluginPaths An array of plugin paths to include in the zip file.
   * @param outputPath The path to save the zip file.
   */
  async exportPluginsAsZip(pluginPaths: string[], outputPath: string): Promise<void> {
    try {
      await ZipManager.createZipFile(outputPath, pluginPaths, this.statusBar);
      new Notice(`Plugins exported successfully to ${outputPath}`);
    } catch (error: any) {
      console.error('Error exporting plugins:', error);
      new Notice(`Error exporting plugins: ${error.message}`);
    }
  }

  /**
   * Scans and processes all plugins in the main folder.
   * @param onProgress A callback function to report progress (optional).
   * @returns A ScanResults object containing statistics about the scan.
   */
  async scanAndProcessPlugins(onProgress?: (progress: number) => void): Promise<ScanResults> {
    const developerFolders = fs.readdirSync(this.settings.mainFolder, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(this.settings.mainFolder, dirent.name));

    const allPlugins: Map<string, DeveloperPlugins> = new Map();

    for (const developerPath of developerFolders) {
      if (this.stopRequested) {
        this.log('Scan stopped by user.');
        break;
      }

      const developerName = path.basename(developerPath);
      const developerPlugins: DeveloperPlugins = {};

      const files: string[] = [];
      this.fileScannerService.findPluginFiles(developerPath, files);

      const pluginsGrouped: { [key: string]: string[] } = {};

      for (const file of files) {
        const baseName = this.fileNameParser.getPluginBaseName(path.basename(file), developerName);
        if (!pluginsGrouped[baseName]) {
          pluginsGrouped[baseName] = [];
        }
        pluginsGrouped[baseName].push(file);
      }

      for (const pluginName of Object.keys(pluginsGrouped)) {
        if (this.stopRequested) break;

        const pluginFiles = pluginsGrouped[pluginName];
        const processedFiles = await this.pluginProcessor.processAllFiles(pluginFiles, developerPath, pluginName);

        developerPlugins[pluginName] = this.pluginCategorizer.categorizeFiles(processedFiles);
      }

      allPlugins.set(developerName, developerPlugins);

      if (onProgress) {
        const progress = (developerFolders.indexOf(developerPath) + 1) / developerFolders.length * 100;
        onProgress(progress);
      }
    }

    await this.markdownGenerator.createMarkdownIndex(allPlugins);

    const jsonPath = path.join(this.settings.mainFolder, 'plugins-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(Array.from(allPlugins.entries()), null, 2), 'utf8');
    try {
      await this.noteGenerator.importMarkdownIndex(path.join(this.settings.mainFolder, MARKDOWN_INDEX_FILENAME));
      new Notice('Plugin index imported to your vault');
    } catch (error: any) {
      console.error('Error importing markdown index:', error);
      new Notice(`Error importing index: ${error.message}`);
    }

    return {
      developers: allPlugins.size,
      plugins: Array.from(allPlugins.values()).reduce((sum, dev) => sum + Object.keys(dev).length, 0),
      zips: Array.from(allPlugins.values())
        .flatMap(dev => Object.values(dev))
        .filter(files => files.zipFile)
        .length,
      stopped: this.stopRequested
    };
  }
}