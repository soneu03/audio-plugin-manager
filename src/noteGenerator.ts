/**
 * Esta clase proporciona métodos para generar notas en el vault de Obsidian.
 * Incluye funcionalidades para:
 * - `createPluginNote`: Crea una nota para un plugin específico con información y lista de archivos.
 * - `importMarkdownIndex`: Importa un índice Markdown existente al vault de Obsidian.
 */
// noteGenerator.ts
import { App, TFile } from 'obsidian';
import { PluginInfo, AudioPluginManagerSettings } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class NoteGenerator {
  constructor(
    private app: App, 
    private settings: AudioPluginManagerSettings
  ) {}

  async createPluginNote(pluginName: string, pluginInfo: PluginInfo, pluginFiles: string[]): Promise<void> {
    try {
      let notePath: string;

      if (this.settings.saveNotesInPluginFolder) {
        // Guardar en la carpeta del plugin
        const developerFolder = path.dirname(pluginInfo.filePath);
        notePath = path.join(developerFolder, `${pluginName}.md`);
      } else {
        // Guardar en la carpeta personalizada
        const basePath = (this.app.vault.adapter as any).basePath || '';
        const notesFolder = path.join(basePath, this.settings.notesFolder);
        
        // Asegurar que la carpeta existe
        if (!fs.existsSync(notesFolder)) {
          fs.mkdirSync(notesFolder, { recursive: true });
        }
        
        notePath = path.join(notesFolder, `${pluginName}.md`);
      }

      // Crear contenido con frontmatter YAML
      let noteContent = `---
type: plugin
developer: ${pluginInfo.developer}
formats: ${pluginInfo.formats}
date_added: ${pluginInfo.dateAdded}
path: ${pluginInfo.filePath}
---

# ${pluginName}

Plugin de audio de ${pluginInfo.developer}.

## Archivos incluidos

`;
      
      // Añadir lista de archivos
      for (const file of pluginFiles) {
        noteContent += `- ${path.basename(file)}\n`;
      }
      
      // Guardar nota
      fs.writeFileSync(notePath, noteContent, 'utf8');
      
    } catch (error) {
      console.error('Error creating plugin note:', error);
    }
  }

  async importMarkdownIndex(indexPath: string): Promise<void> {
    try {
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        
        // Create or update the index file in the vault
        const vaultPath = 'Audio Plugins/Index.md';
        const dir = path.dirname(vaultPath);
        
        // Ensure the directory exists
        if (!this.app.vault.getAbstractFileByPath(dir)) {
          await this.app.vault.createFolder(dir);
        }
        
        // Create or update the file
        const existingFile = this.app.vault.getAbstractFileByPath(vaultPath);
        if (existingFile instanceof TFile) {
          await this.app.vault.modify(existingFile, content);
        } else {
          await this.app.vault.create(vaultPath, content);
        }
      }
    } catch (error) {
      console.error('Error importing markdown index:', error);
      throw error;
    }
  }
}