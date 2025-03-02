/**
 * Esta clase proporciona métodos para analizar y manipular nombres de archivos,
 * específicamente para plugins de audio. Incluye funcionalidades para:
 * - `getPluginBaseName`: Extrae el nombre base de un plugin a partir de un nombre de archivo.
 * - `sanitizePluginName`: Limpia un nombre de plugin eliminando caracteres especiales y espacios extra.
 * - `cleanPluginName`: Limpia un nombre de plugin eliminando información del desarrollador, la versión y palabras duplicadas.
 * - `extractVersion`: Extrae el número de versión de un nombre de archivo.
 * - `normalizeImageName`: Normaliza un nombre de imagen para seguir una convención consistente.
 */
import * as path from 'path';
import * as fs from 'fs'; // Import the fs module

export class FileNameParser {
  /**
   * Extracts the base name of a plugin from a file name.
   * @param fileName The name of the file.
   * @param developerName The name of the developer (optional).
   * @returns The base name of the plugin.
   */
  getPluginBaseName(fileName: string, developerName: string = ''): string {
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
  sanitizePluginName(name: string): string {
    return name
      .replace(/[\s-]+/g, ' ')
      .trim();
  }

    /**
   * Cleans a plugin name by removing developer name, version information, and duplicate words.
   * @param pluginName The plugin name to clean.
   * @param developerName The cleaned developer name.
   * @param version The version string.
   * @returns The cleaned plugin name.
   */
  cleanPluginName(pluginName: string, developerName: string, version: string): string {
    // Eliminar el nombre del desarrollador del inicio si existe
    let cleanName = pluginName.replace(new RegExp(`^${developerName}\\s*[-_]\\s*`, 'i'), '');
    
    // Eliminar la versión
    cleanName = cleanName.replace(new RegExp(`\\s*${version}\\s*`, 'i'), '');
    
    // Eliminar duplicación del nombre del desarrollador dentro del nombre del plugin
    const duplicateDevPattern = new RegExp(`\\b${developerName}\\s+${developerName}\\b`, 'i');
    cleanName = cleanName.replace(duplicateDevPattern, developerName);
    
    // Eliminar palabras duplicadas consecutivas (como "Audio Audio")
    cleanName = cleanName.replace(/\b(\w+)\s+\1\b/gi, '$1');
    
    return cleanName.trim();
  }

  /**
   * Extracts the version number from a file name.
   * @param fileName The name of the file.
   * @returns The version number, or an empty string if no version is found.
   */
  extractVersion(fileName: string): string {
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
   * Normalizes an image name to follow a consistent naming convention.
   * @param fileName The name of the image file.
   * @param pluginName The name of the plugin.
   * @returns The normalized image name.
   */
  normalizeImageName(fileName: string, pluginName: string): string {
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
}