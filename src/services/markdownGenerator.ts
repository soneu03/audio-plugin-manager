/**
 * Esta clase proporciona métodos para generar contenido Markdown.
 * Incluye funcionalidades para:
 * - `createMarkdownIndex`: Crea un archivo de índice Markdown para todos los plugins, agrupados por desarrollador.
 */
import * as path from 'path';
import * as fs from 'fs';
import { Notice } from 'obsidian';
import { AudioPluginManagerSettings, DeveloperPlugins } from '../types';

export class MarkdownGenerator {
  constructor(private settings: AudioPluginManagerSettings) {}

  /**
   * Creates a Markdown index file for all plugins.
   * @param allPlugins A map of all plugins, grouped by developer.
   * @returns The path to the created Markdown index file.
   */
  async createMarkdownIndex(allPlugins: Map<string, DeveloperPlugins>): Promise<string> {
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
      console.log(`Índice Markdown generado: ${markdownPath}`);

      return markdownPath;
    } catch (error: any) {
      console.error('Error creating markdown index:', error);
      new Notice(`Error creating markdown index: ${error}`);
      throw error;
    }
  }
}