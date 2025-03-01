// noteGenerator.ts
import * as fs from 'fs';
import * as path from 'path';
import { App, TFile } from 'obsidian';
import { PluginInfo } from './types';

export class NoteGenerator {
  constructor(private app: App, private notesFolder: string) {}

  /**
   * Crea una nota para un plugin
   */
  async createPluginNote(pluginName: string, pluginInfo: PluginInfo, pluginFiles: string[]): Promise<void> {
    try {
      const basePath = (this.app.vault.adapter as any).basePath || '';
      const notesFolder = path.join(basePath, this.notesFolder);

      // Asegurar que la carpeta existe
      if (!fs.existsSync(notesFolder)) {
        fs.mkdirSync(notesFolder, { recursive: true });
      }
      
      const notePath = path.join(notesFolder, `${pluginName}.md`);
      
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
