// scanners.ts
import * as fs from 'fs';
import * as path from 'path';
import { Notice } from 'obsidian';
import { PluginInfo, AudioPluginManagerSettings, ScanResults } from './types';
import { ZipManager } from './zipManager';
import { NoteGenerator } from './noteGenerator';
import { StatusBar } from './ui/statusBar'; // Import StatusBar

export class PluginScanner {
  constructor(
    private settings: AudioPluginManagerSettings,
    private noteGenerator: NoteGenerator,
    private statusBar: StatusBar // Inject StatusBar
  ) {}
  
  /**
   * Async function to export plugins as a single zip file.
   * @param pluginPaths An array of file paths to the plugin files.
   * @param outputPath The path where the zip file should be created.
   * @returns A promise that resolves when the zip file is created or rejects if an error occurs.
   */
  async exportPluginsAsZip(pluginPaths: string[], outputPath: string): Promise<void> {
    try {
      // Use ZipManager with the status bar
      await ZipManager.createZipFile(outputPath, pluginPaths, this.statusBar);
      new Notice(`Plugins exported successfully to ${outputPath}`);
    } catch (error) {
      console.error('Error exporting plugins:', error);
      new Notice(`Error exporting plugins: ${error.message}`);
    }
  }

  /**
   * Obtiene el nombre base del plugin sin extensión
   */
  private getPluginBaseName(fileName: string): string {
    let baseName = path.basename(fileName, path.extname(fileName));
    // Si es un archivo .vst3, podría tener formato especial
    if (fileName.includes('.vst3')) {
      baseName = baseName.replace(/\.vst3$/, '');
    }
    return baseName;
  }

  /**
   * Comprueba si una ruta debe omitirse según las carpetas configuradas
   */
  private shouldOmitPath(filePath: string): boolean {
    return this.settings.foldersToIgnore.some(folder => 
      filePath.includes(`${path.sep}${folder}${path.sep}`) || 
      filePath.endsWith(`${path.sep}${folder}`)
    );
  }

  /**
   * Busca archivos de plugin de forma recursiva
   */
  private findPluginFiles(dir: string, files: string[]): void {
    if (this.shouldOmitPath(dir)) return;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Recursión para subdirectorios
        this.findPluginFiles(fullPath, files);
      } else if (item.isFile()) {
        // Verificar extensión
        const ext = path.extname(item.name).toLowerCase();
        if (this.settings.extensions.includes(ext) && !this.shouldOmitPath(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  }

  /**
   * Crea el índice de Markdown
   */
  private async createMarkdownIndex(
    allPlugins: PluginInfo[],
    developersProcessed: number,
    pluginsCompressed: number,
    zipsCreated: number
  ): Promise<string> {
    try {
      const markdownPath = path.join(this.settings.mainFolder, 'Plugins-Index.md');
      
      // Crear contenido markdown
      let markdownContent = `# Índice de Plugins Audio\n\n`;
      markdownContent += `Generado automáticamente el ${new Date().toLocaleString()}\n\n`;
      markdownContent += `## Resumen\n\n`;
      markdownContent += `- Desarrolladores: ${developersProcessed}\n`;
      markdownContent += `- Plugins: ${pluginsCompressed}\n`;
      markdownContent += `- Archivos ZIP: ${zipsCreated}\n\n`;
      markdownContent += `## Plugins por desarrollador\n\n`;
      
      // Agrupar plugins por desarrollador
      const pluginsByDeveloper: { [key: string]: PluginInfo[] } = {};
      
      for (const plugin of allPlugins) {
        if (!pluginsByDeveloper[plugin.developer]) {
          pluginsByDeveloper[plugin.developer] = [];
        }
        pluginsByDeveloper[plugin.developer].push(plugin);
      }
      
      // Añadir información de cada desarrollador y sus plugins
      for (const developer of Object.keys(pluginsByDeveloper).sort()) {
        markdownContent += `### ${developer}\n\n`;
        for (const plugin of pluginsByDeveloper[developer]) {
          markdownContent += `- ${plugin.name} (${plugin.formats})\n`;
        }
        markdownContent += `\n`;
      }
      
      // Guardar el archivo markdown
      fs.writeFileSync(markdownPath, markdownContent, 'utf8');
      console.log(`Archivo Markdown generado: ${markdownPath}`);
      
      return markdownPath;
    } catch (error) {
      console.error('Error creating markdown index:', error);
      throw error;
    }
  }

  /**
   * Función principal para escanear y procesar plugins
   */
  async scanAndProcessPlugins(onProgress?: (progress: number) => void, stopScan?: () => boolean): Promise<ScanResults> {
    // Verificar que la carpeta principal existe
    if (!fs.existsSync(this.settings.mainFolder)) {
      throw new Error(`La carpeta '${this.settings.mainFolder}' no existe.`);
    }

    // Contadores para estadísticas
    let developersProcessed = 0;
    let pluginsCompressed = 0;
    let zipsCreated = 0;
    
    // Obtener todas las carpetas de desarrolladores
    const developerFolders = fs.readdirSync(this.settings.mainFolder, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(this.settings.mainFolder, dirent.name));
    
    // Array para almacenar información de todos los plugins
    const allPlugins: PluginInfo[] = [];
    
    // Procesar cada carpeta de desarrollador
    for (const developerPath of developerFolders) {
      if (stopScan && stopScan()) {
        console.log('Scan stopped by user.');
        break;
      }
      const developerName = path.basename(developerPath);
      console.log(`Procesando carpeta del desarrollador: ${developerName}`);
      
      // Obtener todos los archivos con las extensiones admitidas
      const files: string[] = [];
      this.findPluginFiles(developerPath, files);
      
      if (files.length > 0) {
        // Agrupar archivos por nombre base de plugin
        const pluginsGrouped: { [key: string]: string[] } = {};
        
        for (const file of files) {
          const baseName = this.getPluginBaseName(path.basename(file));
          
          if (!pluginsGrouped[baseName]) {
            pluginsGrouped[baseName] = [];
          }
          
          pluginsGrouped[baseName].push(file);
        }
        
        // Comprimir cada plugin en su propio archivo ZIP
        for (const pluginName of Object.keys(pluginsGrouped)) {
          if (stopScan && stopScan()) {
            console.log('Scan stopped by user.');
            break;
          }
          const pluginFiles = pluginsGrouped[pluginName];
          const zipPath = path.join(developerPath, `${pluginName}.zip`);
          
          try {
            // Comprimir archivos
            await ZipManager.createZipFile(zipPath, pluginFiles, this.statusBar);
            
            // Actualizar contadores
            pluginsCompressed++;
            zipsCreated++;
            
            console.log(`  - Creado archivo ZIP: ${pluginName}.zip con ${pluginFiles.length} archivo(s)`);
            
            // Obtener extensiones únicas de los archivos
            const uniqueFormats = Array.from(new Set(
              pluginFiles.map(file => path.extname(file))
            )).join(', ');
            
            console.log(`    Formatos incluidos: ${uniqueFormats}`);
            
            // Guardar información del plugin para el índice
            const pluginInfo: PluginInfo = {
              name: pluginName,
              developer: developerName,
              formats: uniqueFormats,
              filePath: zipPath,
              fileCount: pluginFiles.length,
              dateAdded: new Date().toISOString().split('T')[0] // YYYY-MM-DD
            };
            
            allPlugins.push(pluginInfo);
            
            // Si está activada la generación de notas, crear nota de Obsidian
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
      
      // Update progress
      if (onProgress) {
        const progress = (developersProcessed / developerFolders.length) * 100;
        onProgress(progress);
      }
    }
    
    // Crear archivo JSON con todos los datos
    const jsonPath = path.join(this.settings.mainFolder, 'plugins-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(allPlugins, null, 2), 'utf8');
    
    // Crear archivo Markdown con el índice
    const markdownPath = await this.createMarkdownIndex(allPlugins, developersProcessed, pluginsCompressed, zipsCreated);
    
    // Importar el índice a Obsidian
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
      zips: zipsCreated
    };
  }
}