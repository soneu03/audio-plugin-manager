// scanners.ts
import { Notice } from 'obsidian';
import { StatusBar } from './ui/statusBar';
import { PluginInfo, AudioPluginManagerSettings, ScanResults } from './types';
import { NoteGenerator } from './noteGenerator';
import { ZipManager } from './zipManager';
import * as path from 'path';
import * as fs from 'fs';

interface PluginFiles {
  zipFile?: string;
  executableFile?: string;
  documentationFiles: string[];
  imageFiles: string[];
  otherFiles: string[];
}

interface DeveloperPlugins {
  [pluginName: string]: PluginFiles;
}

export class PluginScanner {
  private stopRequested: boolean = false;
  private logCallback: ((message: string) => void) | null = null;

  constructor(
    private settings: AudioPluginManagerSettings,
    private noteGenerator: NoteGenerator,
    private statusBar: StatusBar
  ) {}
  
  setLogCallback(callback: (message: string) => void) {
    this.logCallback = callback;
  }

  private log(message: string) {
    if (this.logCallback) {
      this.logCallback(message);
    }
    console.log(message);
    new Notice(message);
  }

  private isFileAlreadyProcessed(fileName: string, developerName: string, pluginName: string): boolean {
    // Verificar si el archivo ya tiene el formato correcto:
    // 1. Contiene " - " como separador
    const hasCorrectSeparator = fileName.includes(' - ');
    
    // 2. No contiene underscores
    const hasNoUnderscores = !fileName.includes('_');
    
    // 3. Termina con versión y extensión
    const versionMatch = fileName.match(/\d+(\.\d+)*\.[a-zA-Z]+$/);
    const hasVersionAndExt = versionMatch !== null;

    // El archivo está procesado si cumple todas las condiciones
    return hasCorrectSeparator && hasNoUnderscores && hasVersionAndExt;
  }

  private getPluginBaseName(fileName: string, developerName: string = ''): string {
    let baseName = path.basename(fileName, path.extname(fileName));
    
    // Eliminar espacios extras y caracteres especiales
    baseName = baseName
        .replace(/[\s-]+/g, ' ')  // Reemplazar múltiples espacios/guiones con un espacio
        .trim();                  // Eliminar espacios al inicio/final
    
    // Si el nombre comienza con el nombre del desarrollador, eliminarlo
    if (developerName) {
        const devNamePattern = new RegExp(`^${developerName}\\s*[-_]\\s*`, 'i');
        baseName = baseName.replace(devNamePattern, '');
    }
    
    // Eliminar sufijos comunes
    baseName = baseName.replace(/\s*(v\d+(\.\d+)*|PC|Windows|x64|Setup)$/i, '');
    return baseName;
}

  private sanitizePluginName(name: string): string {
    // Mantener el formato amigable
    return name
        .replace(/[\s-]+/g, ' ')  // Reemplazar múltiples espacios/guiones con un espacio
        .trim();                  // Eliminar espacios al inicio/final
  }

  private normalizeFileName(filePath: string, developer: string, pluginName: string): string {
    const baseFileName = path.basename(filePath);
    const version = this.extractVersion(baseFileName);
    
    // Mantener el formato amigable
    const friendlyDeveloper = developer.replace(/_/g, ' ').trim();
    const friendlyPluginName = pluginName.replace(/_/g, ' ').trim();
    
    const ext = path.extname(baseFileName);
    
    // Formato: "Developer - Plugin - Platform Version.ext"
    return `${friendlyDeveloper} - ${friendlyPluginName}${version}${ext}`;
  }
  private extractVersion(fileName: string): string {
    const versionPatterns = [
        /v?(\d+\.\d+\.\d+)/i,  // v1.0.0 o 1.0.0
        /v?(\d+\.\d+)/i,       // v1.0 o 1.0
        /v?(\d+)/i             // v1 o 1
    ];

    for (const pattern of versionPatterns) {
        const match = fileName.match(pattern);
        if (match) {
            // Mantener el formato original de la versión
            return ` ${match[0]}`;
  }
    }

    return '';
}

  private async processPlugin(filePath: string, developerPath: string, pluginName: string): Promise<void> {
    const developer = path.basename(developerPath);
    const currentFileName = path.basename(filePath);
    
    if (!/^[a-zA-Z0-9\s\-_.]+$/.test(pluginName) || !/^[a-zA-Z0-9\s\-_.]+$/.test(developer)) {
        throw new Error(`Invalid characters in plugin name or developer: ${pluginName} / ${developer}`);
    }

    if (this.isFileAlreadyProcessed(currentFileName, developer, pluginName)) {
        return;
    }

    const newFileName = this.normalizeFileName(filePath, developer, pluginName);
    let newPath = path.join(developerPath, newFileName);

    if (fs.existsSync(newPath)) {
        const timestamp = Date.now();
        const ext = path.extname(newFileName);
        const baseName = newFileName.slice(0, -ext.length);
        newPath = path.join(developerPath, `${baseName}_${timestamp}${ext}`);
    }
    try {
        await fs.promises.access(developerPath, fs.constants.W_OK);
        
        await fs.promises.rename(filePath, newPath);
        await this.createDeveloperLog(developerPath, 
            `Renamed: ${currentFileName} -> ${path.basename(newPath)}`);
    } catch (error) {
        if (error.code === 'EACCES') {
            throw new Error(`No write permission in directory: ${developerPath}`);
    }
        console.error(`Error renaming file ${filePath}:`, error);
      throw error;
    }
  }

  public requestStop() {
    this.stopRequested = true;
    }

  public resetStop() {
    this.stopRequested = false;
  }

  async exportPluginsAsZip(pluginPaths: string[], outputPath: string): Promise<void> {
    try {
      await ZipManager.createZipFile(outputPath, pluginPaths, this.statusBar);
      new Notice(`Plugins exported successfully to ${outputPath}`);
    } catch (error) {
      console.error('Error exporting plugins:', error);
      new Notice(`Error exporting plugins: ${error.message}`);
    }
  }

  private shouldOmitPath(filePath: string): boolean {
    return this.settings.foldersToIgnore.some(folder =>
      filePath.includes(`${path.sep}${folder}${path.sep}`) ||
      filePath.endsWith(`${path.sep}${folder}`)
    );
  }

  private findPluginFiles(dir: string, files: string[]): void {
    if (this.shouldOmitPath(dir)) return;
    
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
  }

  private async createDeveloperLog(developerPath: string, logEntry: string) {
    const logFileName = '_developer_changes.log';
    const logFilePath = path.join(developerPath, logFileName);
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${logEntry}\n`;
    try {
      await fs.promises.appendFile(logFilePath, logLine);
    } catch (error) {
      console.error(`Error writing to developer log: ${error}`);
    }
  }

  private categorizeFiles(files: string[]): PluginFiles {
    const result: PluginFiles = {
      documentationFiles: [],
      imageFiles: [],
      otherFiles: []
    };
        for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const fileName = path.basename(file).toLowerCase();

      if (ext === '.zip') {
        result.zipFile = file;
      } else if (ext === '.exe' || ext === '.msi') {
        result.executableFile = file;
      } else if (['.md', '.pdf', '.txt'].includes(ext)) {
        result.documentationFiles.push(file);
      } else if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
        result.imageFiles.push(file);
            } else {
        result.otherFiles.push(file);
  }
}
    return result;
  }

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

    } catch (error) {
      console.error('Error creating markdown index:', error);
      throw error;
    }
  }
    
  async scanAndProcessPlugins(onProgress?: (progress: number) => void): Promise<ScanResults> {
    if (!fs.existsSync(this.settings.mainFolder)) {
      throw new Error(`La carpeta '${this.settings.mainFolder}' no existe.`);
    }
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
        developerPlugins[pluginName] = this.categorizeFiles(pluginFiles);

        await this.processPlugin(pluginFiles[0], developerPath, pluginName);
        
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
    fs.writeFileSync(jsonPath, JSON.stringify(Array.from(allPlugins.values()), null, 2), 'utf8');
    try {
      await this.noteGenerator.importMarkdownIndex(path.join(this.settings.mainFolder, 'Plugins-Index.md'));
      new Notice('Plugin index imported to your vault');
    } catch (error) {
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