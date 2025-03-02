import { 
    AudioPluginManagerSettings, 
    ScanResults,
    ParsedFileName,
    PluginFiles,
    DeveloperPlugins
} from './types';
import { Notice } from 'obsidian';
import { StatusBar } from './ui/statusBar';
import { NoteGenerator } from './noteGenerator';
import { ZipManager } from './zipManager';
import * as path from 'path';
import * as fs from 'fs';
import { FileRenamer } from './fileRenamer';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const DOCUMENTATION_EXTENSIONS = ['.md', '.pdf', '.txt'];
const INSTALLER_EXTENSIONS = ['.zip', '.exe', '.msi'];
const DEVELOPER_LOG_FILENAME = '_developer_changes.log';
const MARKDOWN_INDEX_FILENAME = 'Plugins-Index.md';

export class PluginScanner {
  private stopRequested: boolean = false;
  private logCallback: ((message: string) => void) | null = null;

  constructor(
    private settings: AudioPluginManagerSettings,
    private noteGenerator: NoteGenerator,
    private statusBar: StatusBar
  ) {
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
   * Checks if a file has already been processed and has the correct naming format.
   * @param fileName The name of the file.
   * @param developerName The name of the developer.
   * @param pluginName The name of the plugin.
   * @returns True if the file is already processed, false otherwise.
   */
  private isFileAlreadyProcessed(fileName: string, developerName: string, pluginName: string): boolean {
    const hasCorrectSeparator = fileName.includes(' - ');
    const hasNoUnderscores = !fileName.includes('_');
    const versionMatch = fileName.match(/\d+(\.\d+)*\.[a-zA-Z]+$/);
    const hasVersionAndExt = versionMatch !== null;

    return hasCorrectSeparator && hasNoUnderscores && hasVersionAndExt;
  }

  /**
   * Extracts the base name of a plugin from a file name.
   * @param fileName The name of the file.
   * @param developerName The name of the developer (optional).
   * @returns The base name of the plugin.
   */
  private getPluginBaseName(fileName: string, developerName: string = ''): string {
    let baseName = path.basename(fileName, path.extname(fileName));

    baseName = baseName
      .replace(/[\s-]+/g, ' ')
      .trim();

    if (developerName) {
      const devNamePattern = new RegExp(`^${developerName}\\s*[-_]\\s*`, 'i');
      baseName = baseName.replace(devNamePattern, '');
    }

    baseName = baseName.replace(/\s*(v\d+(\.\d+)*|PC|Windows|x64|Setup)$/i, '');
    return baseName;
  }

  /**
   * Sanitizes a plugin name to remove special characters and extra spaces.
   * @param name The plugin name to sanitize.
   * @returns The sanitized plugin name.
   */
  private sanitizePluginName(name: string): string {
    return name
      .replace(/[\s-]+/g, ' ')
      .trim();
  }

  /**
   * Normalizes a file name to follow a consistent naming convention.
   * @param filePath The path to the file.
   * @param developer The name of the developer.
   * @param pluginName The name of the plugin.
   * @returns The normalized file name.
   */
  private normalizeFileName(filePath: string, developer: string, pluginName: string): string {
    const baseFileName = path.basename(filePath);
    const version = this.extractVersion(baseFileName);
    const friendlyDeveloper = developer.replace(/_/g, ' ').trim();
    const cleanPluginName = this.cleanPluginName(pluginName, friendlyDeveloper, version);
    const ext = path.extname(baseFileName);

    const finalName = cleanPluginName.toLowerCase().startsWith(friendlyDeveloper.toLowerCase())
      ? `${cleanPluginName}${version}${ext}`
      : `${friendlyDeveloper} - ${cleanPluginName}${version}${ext}`;

    return finalName;
  }

  /**
   * Cleans a plugin name by removing developer name and version information.
   * @param pluginName The plugin name to clean.
   * @param friendlyDeveloper The cleaned developer name.
   * @param version The version string.
   * @returns The cleaned plugin name.
   */
  private cleanPluginName(pluginName: string, friendlyDeveloper: string, version: string): string {
    return pluginName
      .replace(new RegExp(`^${friendlyDeveloper}\\s*[-_]\\s*`, 'i'), '')
      .replace(new RegExp(`\\s*${version}\\s*`, 'i'), '')
      .replace(new RegExp(`^${friendlyDeveloper}\\s+${friendlyDeveloper}\\s*`, 'i'), friendlyDeveloper)
      .trim();
  }

  /**
   * Extracts the version number from a file name.
   * @param fileName The name of the file.
   * @returns The version number, or an empty string if no version is found.
   */
  private extractVersion(fileName: string): string {
    const versionPatterns = [
      /v?(\d+\.\d+\.\d+)/i,
      /v?(\d+\.\d+)/i,
      /v?(\d+)/i
    ];

    for (const pattern of versionPatterns) {
      const match = fileName.match(pattern);
      if (match) {
        const version = match[0];
        return version.startsWith('v') ? version : `${version}`;
      }
    }

    return '';
  }

  /**
   * Processes a single file, renaming it if necessary.
   * @param filePath The path to the file.
   * @param developerPath The path to the developer directory.
   * @param pluginName The name of the plugin.
   * @returns The new path of the file, or the original path if renaming fails or is not needed.
   */
  private async processFile(filePath: string, developerPath: string, pluginName: string): Promise<string> {
    const currentFileName = path.basename(filePath);
    const parsedName = FileRenamer.parseFileName(currentFileName);
    const newFileName = FileRenamer.normalizePluginFileName(parsedName, developerPath);

    // Si el nombre actual ya es el correcto, no hacer nada
    if (currentFileName === newFileName) {
      this.log(`File name unchanged (already correct): ${currentFileName}`);
      return filePath;
    }

    const newPath = path.join(developerPath, newFileName);

    try {
      await fs.promises.access(developerPath, fs.constants.W_OK);
        await fs.promises.rename(filePath, newPath);
        this.log(`Renamed: ${currentFileName} -> ${newFileName}`);
      return newPath;
    } catch (error: any) {
      if (error.code === 'EACCES') {
        throw new Error(`No write permission in directory: ${developerPath}`);
      }
      console.error(`Error renaming file ${filePath}:`, error);
      return filePath;
    }
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
   * Checks if a file path should be omitted based on the configured folders to ignore.
   * @param filePath The path to the file.
   * @returns True if the file path should be omitted, false otherwise.
   */
  private shouldOmitPath(filePath: string): boolean {
    return this.settings.foldersToIgnore.some(folder =>
      filePath.includes(`${path.sep}${folder}${path.sep}`) ||
      filePath.endsWith(`${path.sep}${folder}`)
    );
  }

  /**
   * Recursively finds all plugin files in a directory.
   * @param dir The directory to search.
   * @param files An array to store the found files.
   */
  private findPluginFiles(dir: string, files: string[]): void {
    if (this.shouldOmitPath(dir)) return;

    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
          this.findPluginFiles(fullPath, files);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (this.settings.extensions.includes(ext) && !this.shouldOmitPath(fullPath)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
      new Notice(`Error reading directory ${dir}: ${error}`); // Consider a more user-friendly message
    }
  }

  /**
   * Creates a log entry for a developer.
   * @param developerPath The path to the developer directory.
   * @param logEntry The log entry to write.
   */
  private async createDeveloperLog(developerPath: string, logEntry: string): Promise<void> {
    const logFilePath = path.join(developerPath, DEVELOPER_LOG_FILENAME);
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${logEntry}\n`;
    try {
      await fs.promises.appendFile(logFilePath, logLine);
    } catch (error: any) {
      console.error(`Error writing to developer log: ${error}`);
      new Notice(`Error writing to developer log: ${error}`);
    }
  }

  /**
   * Normalizes an image name to follow a consistent naming convention.
   * @param fileName The name of the image file.
   * @param pluginName The name of the plugin.
   * @returns The normalized image name.
   */
  private normalizeImageName(fileName: string, pluginName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    
    // Limpiar el nombre del plugin
    const cleanPluginName = pluginName
        .replace(/[^a-zA-Z0-9\s]/g, '') // Eliminar caracteres especiales
        .trim()
        .replace(/\s+/g, '_'); // Reemplazar espacios con guiones bajos
    
    // Obtener el nombre base actual del archivo (sin extensión)
    const currentBaseName = path.basename(fileName, ext)
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase();
    
    // Si el nombre actual ya es correcto, devolver el nombre original
    if (currentBaseName === cleanPluginName.toLowerCase()) {
        return fileName;
    }
    
    // Construir el nuevo nombre
    let newName = `${cleanPluginName}${ext}`;
    
    // Verificar si el archivo ya existe y añadir numeración si es necesario
    const dirPath = path.dirname(fileName);
    let counter = 1;
    let finalPath = path.join(dirPath, newName);
    
    while (fs.existsSync(finalPath)) {
        newName = `${cleanPluginName}-${counter}${ext}`;
        finalPath = path.join(dirPath, newName);
        counter++;
    }
    
    return newName;
  }

  private parseFileName(fileName: string): ParsedFileName {
    const ext = path.extname(fileName);
    let baseName = path.basename(fileName, ext);
    
    // Expresiones regulares para cada parte
    const developerRegex = /^([^-]+?)(?:\s*[-_]\s*|\s+)/;
    const versionRegex = /\s+(?:v?[\d.]+|v\d+)(?:\s*|$)/i;
    const platformRegex = /\s+(?:x64|x86|win(?:dows)?(?:64)?|mac|osx|linux)(?:\s*|$)/i;
    const suffixRegex = /\s+(?:installer|setup|full)(?:\s*|$)/i;

    // Extraer cada parte
    const developerMatch = baseName.match(developerRegex);
    const developer = developerMatch ? developerMatch[1].trim() : '';
    baseName = baseName.replace(developerRegex, '');

    const versionMatch = baseName.match(versionRegex);
    const version = versionMatch ? versionMatch[0].trim() : '';
    baseName = baseName.replace(versionRegex, '');

    const platformMatch = baseName.match(platformRegex);
    const platform = platformMatch ? platformMatch[0].trim() : '';
    baseName = baseName.replace(platformRegex, '');

    const suffixMatch = baseName.match(suffixRegex);
    const suffix = suffixMatch ? suffixMatch[0].trim() : '';
    baseName = baseName.replace(suffixRegex, '');
    return {
        developer: developer,
        pluginName: baseName.trim(),
        platform: platform,
        version: version,
        suffix: suffix,
        extension: ext.toLowerCase()
    };
  }

  private normalizePluginFileName(parsedName: ParsedFileName, developerFolder: string): string {
    const developer = path.basename(developerFolder);
    let fileName = `${developer} - ${parsedName.pluginName}`;
    
    if (parsedName.platform) fileName += ` ${parsedName.platform}`;
    if (parsedName.version) fileName += ` ${parsedName.version}`;
    
    return fileName + parsedName.extension.toLowerCase();
}

  /**
   * Processes all files for a given plugin.
   * @param pluginFiles An array of file paths to process.
   * @param developerPath The path to the developer directory.
   * @param pluginName The name of the plugin.
   * @returns An array of processed file paths.
   */
  private async processAllFiles(pluginFiles: string[], developerPath: string, pluginName: string): Promise<string[]> {
    const results = await Promise.allSettled(
      pluginFiles.map(file => this.processFile(file, developerPath, pluginName))
    );

    const processedFiles: string[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        processedFiles.push(result.value);
      } else {
        console.error(`Error processing file: ${result.reason}`);
        // Optionally re-throw or handle the error.
      }
    });

    return processedFiles;
  }

  /**
   * Categorizes files into different types (documentation, images, other).
   * @param files An array of file paths to categorize.
   * @param pluginName The name of the plugin.
   * @param developerPath The path to the developer directory.
   * @returns A PluginFiles object containing categorized files.
   */
  private async categorizeFiles(files: string[], pluginName: string, developerPath: string): Promise<PluginFiles> {
    const result: PluginFiles = {
      documentationFiles: [],
      imageFiles: [],
      otherFiles: []
    };

    // Identify installation and zip files first
    const pluginFiles = files.filter(file => INSTALLER_EXTENSIONS.includes(path.extname(file).toLowerCase()));

    // Process installation and zip files
    for (const file of pluginFiles) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.zip') {
        result.zipFile = file;
      } else if (ext === '.exe' || ext === '.msi') {
        result.executableFile = file;
      }
    }

    // Get base names of plugins
    const pluginBaseNames = pluginFiles.map(file =>
      this.getPluginBaseName(path.basename(file))
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
    );

    // Process the rest of the files
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const fileName = path.basename(file);

      if (pluginFiles.includes(file)) {
        continue; // Already processed
      } else if (DOCUMENTATION_EXTENSIONS.includes(ext)) {
        result.documentationFiles.push(file);
      } else if (IMAGE_EXTENSIONS.includes(ext)) {
        const imageBaseName = path.basename(fileName, ext)
          .toLowerCase()
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .trim();

        const matchingPlugin = pluginBaseNames.find(pluginName =>
          imageBaseName.includes(pluginName)
        );

        if (matchingPlugin) {
          const normalizedImageName = this.normalizeImageName(fileName, matchingPlugin);
          const dirPath = path.dirname(file);
          const newImagePath = path.join(dirPath, normalizedImageName);

            if (fileName === normalizedImageName) {
                // El nombre ya está correcto
                this.log(`Image name unchanged (already correct): ${fileName}`);
                result.imageFiles.push(file);
          } else {
    try {
                    fs.renameSync(file, newImagePath);
                    result.imageFiles.push(newImagePath);
                    this.log(`Renamed image: ${fileName} -> ${normalizedImageName}`);
                } catch (error) {
                    console.error(`Error renaming image file: ${error}`);
                    result.imageFiles.push(file);
                }
            }
        } else {
            result.imageFiles.push(file);
        }
      } else {
        result.otherFiles.push(file);
      }
    }

    return result;
  }

  /**
   * Creates a Markdown index file for all plugins.
   * @param allPlugins A map of all plugins, grouped by developer.
   * @returns The path to the created Markdown index file.
   */
  private async createMarkdownIndex(allPlugins: Map<string, DeveloperPlugins>): Promise<string> {
    try {
      const markdownPath = path.join(this.settings.mainFolder, '../Desarrolladores/Index.md');
      let markdownContent = `# Índice de Plugins de Audio\n\n`;
      markdownContent += `Actualizado: ${new Date().toLocaleString()}\n\n`;
      const totalDevelopers = allPlugins.size;
      const totalPlugins = Array.from(allPlugins.values())
        .reduce((sum, dev) => sum + Object.keys(dev).length, 0);

      markdownContent += `## Resumen\n\n`;
      markdownContent += `- Desarrolladores: ${totalDevelopers}\n`;
      markdownContent += `- Plugins: ${totalPlugins}\n\n`;
      markdownContent += `## Plugins por Desarrollador\n\n`;

      const sortedDevelopers = Array.from(allPlugins.keys()).sort();

      for (const developer of sortedDevelopers) {
        const developerPlugins = allPlugins.get(developer)!;

        markdownContent += `### ${developer}\n\n`;
        markdownContent += `[[Desarrolladores/${developer}/${developer}|Ver todos los plugins de ${developer}]]\n\n`;
        const sortedPlugins = Object.entries(developerPlugins).sort(([a], [b]) => a.localeCompare(b));

        for (const [pluginName, files] of sortedPlugins) {
          markdownContent += `#### ${pluginName}\n\n`;

          if (files.imageFiles.length > 0) {
            const firstImage = files.imageFiles[0];
            markdownContent += `![[Desarrolladores/${developer}/${path.basename(firstImage)}]]\n\n`;
          }
          if (files.zipFile) {
            markdownContent += `- 📦 [[Desarrolladores/${developer}/${path.basename(files.zipFile)}|Archivo ZIP]]\n`;
          }

          if (files.executableFile) {
            markdownContent += `- ⚙️ [[Desarrolladores/${developer}/${path.basename(files.executableFile)}|Instalador]]\n`;
          }

          if (files.documentationFiles.length > 0) {
            markdownContent += `- 📚 Documentación:\n`;
            for (const doc of files.documentationFiles) {
              markdownContent += `  - [[Desarrolladores/${developer}/${path.basename(doc)}|${path.basename(doc)}]]\n`;
            }
          }

          if (files.otherFiles.length > 0) {
            markdownContent += `- 📄 Otros archivos:\n`;
            for (const other of files.otherFiles) {
              markdownContent += `  - [[Desarrolladores/${developer}/${path.basename(other)}|${path.basename(other)}]]\n`;
            }
          }

          markdownContent += `\n---\n\n`;
        }
      }

      const dir = path.dirname(markdownPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await fs.promises.writeFile(markdownPath, markdownContent, 'utf8');
      this.log(`Índice Markdown generado: ${markdownPath}`);

      return markdownPath;
    } catch (error: any) {
      console.error('Error creating markdown index:', error);
      new Notice(`Error creating markdown index: ${error}`);
      throw error;
    }
  }

  /**
   * Scans and processes all plugins in the main folder.
   * @param onProgress A callback function to report progress (optional).
   * @returns A ScanResults object containing statistics about the scan.
   */
  async scanAndProcessPlugins(onProgress?: (progress: number) => void): Promise<ScanResults> {
    let developersProcessed = 0;
    let pluginsCompressed = 0;
    let zipsCreated = 0;

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
      this.findPluginFiles(developerPath, files);

      const pluginsGrouped: { [key: string]: string[] } = {};

      for (const file of files) {
        const baseName = this.getPluginBaseName(path.basename(file), developerName);
        if (!pluginsGrouped[baseName]) {
          pluginsGrouped[baseName] = [];
        }
        pluginsGrouped[baseName].push(file);
      }

      for (const pluginName of Object.keys(pluginsGrouped)) {
        if (this.stopRequested) break;

        const pluginFiles = pluginsGrouped[pluginName];
        const processedFiles = await this.processAllFiles(pluginFiles, developerPath, pluginName);

        developerPlugins[pluginName] = await this.categorizeFiles(processedFiles, pluginName, developerPath);

        await this.createDeveloperLog(developerPath,
          `Processed plugin: ${pluginName}\n` +
          `  Files processed: ${pluginFiles.length}\n` +
          `  Files renamed: ${pluginFiles.map(f => path.basename(f)).join(', ')}`
        );
      }

      allPlugins.set(developerName, developerPlugins);

      if (onProgress) {
        const progress = (developerFolders.indexOf(developerPath) + 1) / developerFolders.length * 100;
        onProgress(progress);
      }
    }

    await this.createMarkdownIndex(allPlugins);

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