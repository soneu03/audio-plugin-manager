import * as path from 'path';
import * as fs from 'fs';
import { Notice } from 'obsidian';
import { ParsedFileName } from './types';

export class FileRenamer {
    private static readonly VERSION_PATTERNS = [
        /v?(\d+\.\d+\.\d+)/i,  // v1.0.0 o 1.0.0
        /v?(\d+\.\d+)/i,       // v1.0 o 1.0
        /v?(\d+)/i             // v1 o 1
    ];

    private static readonly PLATFORM_PATTERN = /\s+(?:x64|x86|win(?:dows)?(?:64)?|mac|osx|linux)(?:\s*|$)/i;
    private static readonly SUFFIX_PATTERN = /\s+(?:installer|setup|full)(?:\s*|$)/i;

    static parseFileName(fileName: string): ParsedFileName {
        const ext = path.extname(fileName);
        let baseName = path.basename(fileName, ext);
        
        // Expresiones regulares para cada parte
        const developerRegex = /^([^-]+?)(?:\s*[-_]\s*|\s+)/;
        const platformRegex = /\s+(?:x64|x86|win(?:dows)?(?:64)?|mac|osx|linux)(?:\s*|$)/i;
        const versionRegex = /\s+(?:v?(?:\d+\.\d+\.\d+|\d+\.\d+|\d+))(?:\s*|$)/i;
        const suffixRegex = /\s+(?:installer|setup|full)(?:\s*|$)/i;
        
        // Extraer cada parte y limpiar el nombre base
        let developer = '';
        let platform = '';
        let version = '';
        let suffix = '';
        
        // Extraer el desarrollador (si existe)
        const developerMatch = baseName.match(developerRegex);
        if (developerMatch) {
            developer = developerMatch[1].trim();
            baseName = baseName.slice(developerMatch[0].length);
        }

        // Extraer la plataforma (si existe)
        const platformMatch = baseName.match(platformRegex);
        if (platformMatch) {
            platform = platformMatch[0].trim();
            baseName = baseName.replace(platformRegex, ' ');
        }

        // Extraer la versión (si existe)
        const versionMatch = baseName.match(versionRegex);
        if (versionMatch) {
            version = versionMatch[0].trim();
            baseName = baseName.replace(versionRegex, ' ');
        }

        // Extraer el sufijo (si existe)
        const suffixMatch = baseName.match(suffixRegex);
        if (suffixMatch) {
            suffix = suffixMatch[0].trim();
            baseName = baseName.replace(suffixRegex, ' ');
        }
        
        // Limpiar el nombre del plugin (lo que queda después de quitar todo lo demás)
        const pluginName = baseName
            .replace(/[\s-]+/g, ' ')  // Reemplazar múltiples espacios/guiones con un espacio
            .trim();                  // Eliminar espacios al inicio/final
    
        return {
            developer,
            pluginName,
            platform,
            version,
            suffix,
            extension: ext.toLowerCase()
        };
    }

    static normalizePluginFileName(parsedName: ParsedFileName, developerFolder: string): string {
        const developer = path.basename(developerFolder);
        let fileName = `${developer} - ${parsedName.pluginName}`;
        
        if (parsedName.platform) fileName += ` ${parsedName.platform}`;
        if (parsedName.version) fileName += ` ${parsedName.version}`;
        
        return fileName + parsedName.extension.toLowerCase();
    }

    static normalizeImageName(fileName: string, pluginName: string): string {
        const ext = path.extname(fileName).toLowerCase();
        
        // Limpiar el nombre del plugin
        const cleanPluginName = pluginName
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, '_');
        
        // Obtener el nombre base actual del archivo
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

    private static extractVersion(fileName: string): string {
        for (const pattern of this.VERSION_PATTERNS) {
            const match = fileName.match(pattern);
            if (match) {
                return match[0];
            }
        }
        return '';
    }
}