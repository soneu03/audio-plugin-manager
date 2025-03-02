/**
 * Esta clase proporciona métodos para categorizar archivos de plugins.
 * Incluye funcionalidades para:
 * - `categorizeFiles`: Categoriza archivos en diferentes tipos (documentación, imágenes, otros).
 */
import * as path from 'path';
import * as fs from 'fs';
import { PluginFiles } from '../types';

const DOCUMENTATION_EXTENSIONS = ['.md', '.pdf', '.txt'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const INSTALLER_EXTENSIONS = ['.zip', '.exe', '.msi'];

export class PluginCategorizer {
  /**
   * Categorizes files into different types (documentation, images, other).
   * @param files An array of file paths to categorize.
   * @returns A PluginFiles object containing categorized files.
   */
  categorizeFiles(files: string[]): PluginFiles {
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

    // Process the rest of the files
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (pluginFiles.includes(file)) {
        continue; // Already processed
      } else if (DOCUMENTATION_EXTENSIONS.includes(ext)) {
        result.documentationFiles.push(file);
      } else if (IMAGE_EXTENSIONS.includes(ext)) {
        result.imageFiles.push(file);
      } else {
        result.otherFiles.push(file);
      }
    }

    return result;
  }
}