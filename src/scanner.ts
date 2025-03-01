// scanners.ts
import * as fs from 'fs';
import * as path from 'path';
import { Notice } from 'obsidian';
import { PluginInfo, AudioPluginManagerSettings, ScanResults } from './types';
import { ZipManager } from './zipManager';
import { NoteGenerator } from './noteGenerator';
import { StatusBar } from './ui/statusBar';

export class PluginScanner {
  private stopRequested: boolean = false;

  constructor(
    private settings: AudioPluginManagerSettings,
    private noteGenerator: NoteGenerator,
    private statusBar: StatusBar
  ) {}
  
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

  private getPluginBaseName(fileName: string): string {
    let baseName = path.basename(fileName, path.extname(fileName));
    if (fileName.includes('.vst3')) {
      baseName = baseName.replace(/\.vst3$/, '');
    }
    return baseName;
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

  private async createMarkdownIndex(
    allPlugins: PluginInfo[],
    developersProcessed: number,
    pluginsCompressed: number,
    zipsCreated: number
  ): Promise<string> {
    try {
      const markdownPath = path.join(this.settings.mainFolder, 'Plugins-Index.md');
      
      let markdownContent = `# Índice de Plugins Audio\n\n`;
      markdownContent += `Generado automáticamente el ${new Date().toLocaleString()}\n\n`;
      markdownContent += `## Resumen\n\n`;
      markdownContent += `- Desarrolladores: ${developersProcessed}\n`;
      markdownContent += `- Plugins: ${pluginsCompressed}\n`;
      markdownContent += `- Archivos ZIP: ${zipsCreated}\n\n`;
      markdownContent += `## Plugins por desarrollador\n\n`;
      
      const pluginsByDeveloper: { [key: string]: PluginInfo[] } = {};
      
      for (const plugin of allPlugins) {
        if (!pluginsByDeveloper[plugin.developer]) {
          pluginsByDeveloper[plugin.developer] = [];
        }
        pluginsByDeveloper[plugin.developer].push(plugin);
      }
      
      for (const developer of Object.keys(pluginsByDeveloper).sort()) {
        markdownContent += `### ${developer}\n\n`;
        for (const plugin of pluginsByDeveloper[developer]) {
          markdownContent += `- ${plugin.name} (${plugin.formats})\n`;
        }
        markdownContent += `\n`;
      }
      
      fs.writeFileSync(markdownPath, markdownContent, 'utf8');
      console.log(`Archivo Markdown generado: ${markdownPath}`);
      
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
    
    const allPlugins: PluginInfo[] = [];
    
    for (const developerPath of developerFolders) {
      if (this.stopRequested) {
        console.log('Scan stopped by user.');
        break;
      }

      const developerName = path.basename(developerPath);
      console.log(`Procesando carpeta del desarrollador: ${developerName}`);
      
      const files: string[] = [];
      this.findPluginFiles(developerPath, files);
      
      if (files.length > 0) {
        const pluginsGrouped: { [key: string]: string[] } = {};
        
        for (const file of files) {
          const baseName = this.getPluginBaseName(path.basename(file));
          if (!pluginsGrouped[baseName]) {
            pluginsGrouped[baseName] = [];
          }
          pluginsGrouped[baseName].push(file);
        }
        
        for (const pluginName of Object.keys(pluginsGrouped)) {
          if (this.stopRequested) {
            console.log('Scan stopped by user.');
            break;
          }

          const pluginFiles = pluginsGrouped[pluginName];
          const zipPath = path.join(developerPath, `${pluginName}.zip`);
          
          try {
            await ZipManager.createZipFile(zipPath, pluginFiles, this.statusBar);
            
            if (!this.stopRequested) {
            pluginsCompressed++;
            zipsCreated++;
            }
            
            console.log(`  - Creado archivo ZIP: ${pluginName}.zip con ${pluginFiles.length} archivo(s)`);
            
            const uniqueFormats = Array.from(new Set(
              pluginFiles.map(file => path.extname(file))
            )).join(', ');
            
            console.log(`    Formatos incluidos: ${uniqueFormats}`);
            
            const pluginInfo: PluginInfo = {
              name: pluginName,
              developer: developerName,
              formats: uniqueFormats,
              filePath: zipPath,
              fileCount: pluginFiles.length,
              dateAdded: new Date().toISOString().split('T')[0]
            };
            
            allPlugins.push(pluginInfo);
            
            if (this.settings.autoGenerateNotes) {
              await this.noteGenerator.createPluginNote(pluginName, pluginInfo, pluginFiles);
            }
          } catch (error) {
            console.error(`  - Error al comprimir el plugin ${pluginName}:`, error);
          }
        }
      } else {
        console.log(`  - No se encontraron archivos compatibles en esta carpeta`);
      }
      
      developersProcessed++;
      
      if (onProgress) {
        const progress = (developersProcessed / developerFolders.length) * 100;
        onProgress(progress);
      }
    }
    
    const jsonPath = path.join(this.settings.mainFolder, 'plugins-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(allPlugins, null, 2), 'utf8');
    
    const markdownPath = await this.createMarkdownIndex(allPlugins, developersProcessed, pluginsCompressed, zipsCreated);
    
    try {
      await this.noteGenerator.importMarkdownIndex(markdownPath);
      new Notice('Plugin index imported to your vault');
    } catch (error) {
      console.error('Error importing markdown index:', error);
      new Notice(`Error importing index: ${error.message}`);
    }
    
    return {
      developers: developersProcessed,
      plugins: pluginsCompressed,
      zips: zipsCreated,
      stopped: this.stopRequested
    };
  }
}