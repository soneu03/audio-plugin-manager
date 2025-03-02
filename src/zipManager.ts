// zipManager.ts
/**
 * Esta clase proporciona métodos para gestionar la creación de archivos ZIP.
 * Incluye funcionalidades para:
 * - `createZipFile`: Crea un archivo ZIP con los archivos proporcionados.
 */

import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { StatusBar } from './ui/statusBar';

export class ZipManager {
  /**
   * Crea un archivo ZIP con los archivos proporcionados
   */
  static async createZipFile(
    zipPath: string, 
    filePaths: string[], 
    statusBar?: StatusBar
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!filePaths || filePaths.length === 0) {
        console.warn('No files to zip. Creating an empty zip file.');
        fs.writeFileSync(zipPath, ''); // Create an empty file
        return resolve();
      }

      const output = fs.createWriteStream(zipPath);

      output.on('close', () => {
        console.log(`Zip file created at ${zipPath}`);
        if (statusBar) {
          statusBar.finishProgress(`ZIP created: ${path.basename(zipPath)}`);
        }
        resolve();
      });

      output.on('end', () => {
        console.log('Data has been drained');
      });

      output.on('error', (err: any) => {
        console.error('Output stream error:', err);
        if (statusBar) {
          statusBar.finishProgress(`Error creating ZIP: ${err.message}`);
        }
        reject(err);
      });

      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('warning', (err: any) => {
        console.warn('Warning during zip creation:', err);
      });

      archive.on('error', (err: any) => {
        console.error('Error during zip creation:', err);
        if (statusBar) {
          statusBar.finishProgress(`Error creating ZIP: ${err.message}`);
        }
        reject(err);
      });

      archive.pipe(output);

      // Calcular el tamaño total para el progreso
      const totalBytes = filePaths.reduce((sum, filePath) => {
        try {
          return sum + fs.statSync(filePath).size;
        } catch (error) {
          console.error(`Error getting file size for ${filePath}:`, error);
          return sum;
        }
      }, 0);
      
      let compressedBytes = 0;

      // Añadir cada archivo al ZIP
      for (const filePath of filePaths) {
        try {
          if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            reject(new Error(`File not found: ${filePath}`));
            return;
          }

          const stat = fs.statSync(filePath);
          if (!stat.isFile()) {
            console.error(`Not a file: ${filePath}`);
            reject(new Error(`Not a file: ${filePath}`));
            return;
          }

          const fileName = path.basename(filePath);

          // Use a stream to handle the file
          const fileStream = fs.createReadStream(filePath);

          fileStream.on('data', (chunk) => {
            compressedBytes += chunk.length;
            // Actualizar la barra de estado con el progreso
            if (statusBar && totalBytes > 0) {
              const percentage = (compressedBytes / totalBytes) * 100;
              statusBar.showProgress(percentage, `Compressing ${path.basename(zipPath)}`);
            }
          });

          archive.append(fileStream, { name: fileName });

        } catch (error) {
          console.error(`Error adding file ${filePath} to zip:`, error);
          if (statusBar) {
            statusBar.finishProgress(`Error adding file to ZIP: ${error.message}`);
          }
          reject(error);
          return;
        }
      }

      archive.finalize();
    });
  }
}