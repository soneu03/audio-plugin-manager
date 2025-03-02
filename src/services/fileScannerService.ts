/**
 * Esta clase proporciona métodos para escanear el sistema de archivos en busca de archivos de plugins.
 * Incluye funcionalidades para:
 * - `shouldOmitPath`: Comprueba si una ruta de archivo debe omitirse basándose en las carpetas configuradas para ignorar.
 * - `findPluginFiles`: Encuentra recursivamente todos los archivos de plugins en un directorio.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Notice, App } from 'obsidian';
import { AudioPluginManagerSettings } from '../types';

export class FileScannerService {
  constructor(private settings: AudioPluginManagerSettings) {}

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
  findPluginFiles(dir: string, files: string[]): void {
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
    } catch (error: any) {
      console.error(`Error reading directory ${dir}:`, error);
      new Notice(`Error reading directory ${dir}: ${error}`);
    }
  }
}