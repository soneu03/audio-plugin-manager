/**
 * Esta clase proporciona métodos para procesar archivos de plugins, incluyendo el renombrado.
 * Incluye funcionalidades para:
 * - `processFile`: Procesa un único archivo, renombrándolo si es necesario.
 * - `processAllFiles`: Procesa todos los archivos de un plugin dado.
 */
import * as path from 'path';
import * as fs from 'fs';
import { Notice } from 'obsidian';
import { AudioPluginManagerSettings, PluginFiles } from '../types';
import { FileNameParser } from './fileNameParser'; // Import FileNameParser

const DEVELOPER_LOG_FILENAME = '_developer_changes.log';

export class PluginProcessor {
  private fileNameParser: FileNameParser; // Add FileNameParser instance
  private log: (message: string) => void;

  constructor(
    private settings: AudioPluginManagerSettings,
    log: (message: string) => void
  ) {
    this.fileNameParser = new FileNameParser(); // Initialize FileNameParser
    this.log = log;
  }

  /**
   * Processes a single file, renaming it if necessary.
   * @param filePath The path to the file.
   * @param developerPath The path to the developer directory.
   * @param pluginName The name of the plugin.
   * @returns The new path of the file, or the original path if renaming fails or is not needed.
   */
  async processFile(filePath: string, developerPath: string, pluginName: string): Promise<string> {
    const currentFileName = path.basename(filePath);
    const developer = path.basename(developerPath);
    const ext = path.extname(filePath);

    // Check if the file is an image
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext.toLowerCase());

    let newFileName: string;
    if (isImage) {
      this.log(`Found image file: ${currentFileName}`); // Log the image file
      // Use normalizeImageName to generate the new name
      newFileName = this.fileNameParser.normalizeImageName(filePath, pluginName);
      // Log the image file name to developer_log
      await this.createDeveloperLog(developerPath, `Image file found: ${currentFileName}`);
    } else {
      // Process non-image files as before
      const version = this.fileNameParser.extractVersion(currentFileName); // Use fileNameParser
      const cleanedPluginName = this.fileNameParser.cleanPluginName(pluginName, developer, version); // Use fileNameParser

      // Add "v" to version if it exists and doesn't already have it
      const formattedVersion = version && !version.toLowerCase().startsWith('v') ? `v${version}` : version;

      // Construir el nuevo nombre de archivo
      newFileName = `${cleanedPluginName} ${formattedVersion}${ext}`;
    }

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
   * Processes all files for a given plugin.
   * @param pluginFiles An array of file paths to process.
   * @param developerPath The path to the developer directory.
   * @param pluginName The name of the plugin.
   * @returns An array of processed file paths.
   */
  async processAllFiles(pluginFiles: string[], developerPath: string, pluginName: string): Promise<string[]> {
    const results = await Promise.allSettled(
      pluginFiles.map(file => this.processFile(file, developerPath, pluginName))
    );

    const processedFiles: string[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        processedFiles.push(result.value);
      } else {
        console.error(`Error processing file: ${result.reason}`);
      }
    });

    return processedFiles;
  }

  /**
   * Creates a log file in the developer's folder to track file renaming operations.
   * @param developerPath The path to the developer's folder.
   * @param logContent The content to write to the log file.
   */
  private async createDeveloperLog(developerPath: string, logContent: string): Promise<void> {
    const logPath = path.join(developerPath, DEVELOPER_LOG_FILENAME);
    try {
      fs.appendFileSync(logPath, `${new Date().toLocaleString()} - ${logContent}\n`, 'utf8');
      this.log(`Developer log updated: ${logPath}`);
    } catch (error: any) {
      console.error(`Error creating developer log: ${logPath}`, error);
    }
  }
}