// settings.ts
/**
 * Esta clase define la pestaña de configuración del plugin Audio Plugin Manager.
 * Incluye funcionalidades para:
 * - `display`: Muestra la interfaz de configuración del plugin.
 * - `updateLog`: Agrega una entrada al registro de acciones.
 */
import { App, PluginSettingTab, Setting } from 'obsidian';
import AudioPluginManager from './main';

export class AudioPluginManagerSettingTab extends PluginSettingTab {
  plugin: AudioPluginManager;
  private isScanning: boolean = false;
  private stopScan: boolean = false;
  private progressBar: HTMLProgressElement;
  private logContainer: HTMLElement;
  constructor(app: App, plugin: AudioPluginManager) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private updateLog(message: string) {
    const logEntry = this.logContainer.createEl('div', {
      text: `${new Date().toLocaleTimeString()} - ${message}`,
      cls: 'audio-plugin-log-entry'
    });

    while (this.logContainer.children.length > 10) {
      this.logContainer.firstChild?.remove();
    }

    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('style', {
      text: `
        .audio-plugin-log-container {
          margin-top: 20px;
          padding: 10px;
          background-color: var(--background-secondary);
          border-radius: 5px;
          max-height: 200px;
          overflow-y: auto;
        }
        .audio-plugin-log-entry {
          font-family: monospace;
          padding: 2px 0;
          font-size: 12px;
        }
      `
    });

    containerEl.createEl('h2', { text: 'Audio Plugin Manager Settings' });

    new Setting(containerEl)
      .setName('Main Folder')
      .setDesc('Path to the folder containing your audio plugins')
      .addText(text => text
        .setPlaceholder('e.g., D:\\Sound\\Plugins')
        .setValue(this.plugin.settings.mainFolder)
        .onChange(async (value) => {
          this.plugin.settings.mainFolder = value;
          await this.plugin.saveSettings();
          this.updateLog('Carpeta principal actualizada');
        }));

    new Setting(containerEl)
      .setName('File Extensions')
      .setDesc('File extensions to include when scanning')
      .addText(text => text
        .setPlaceholder('e.g., .dll, .vst3, .exe')
        .setValue(this.plugin.settings.extensions.join(', '))
        .onChange(async (value) => {
          this.plugin.settings.extensions = value
            .split(',')
            .map(ext => ext.trim())
            .filter(ext => ext.length > 0);
          await this.plugin.saveSettings();
          this.updateLog('Extensiones actualizadas');
        }));

    new Setting(containerEl)
      .setName('Folders to Ignore')
      .setDesc('Folders to ignore when scanning')
      .addText(text => text
        .setPlaceholder('e.g., Samples, Presets, Documentation')
        .setValue(this.plugin.settings.foldersToIgnore.join(', '))
        .onChange(async (value) => {
          this.plugin.settings.foldersToIgnore = value
            .split(',')
            .map(folder => folder.trim())
            .filter(folder => folder.length > 0);
          await this.plugin.saveSettings();
          this.updateLog('Carpetas ignoradas actualizadas');
        }));

    new Setting(containerEl)
      .setName('Auto-generate Notes')
      .setDesc('Automatically generate a note for each plugin')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoGenerateNotes)
        .onChange(async (value) => {
          this.plugin.settings.autoGenerateNotes = value;
          await this.plugin.saveSettings();
          this.updateLog(`Generación automática de notas ${value ? 'activada' : 'desactivada'}`);
        }));

    new Setting(containerEl)
      .setName('Save Notes Location')
      .setDesc('Choose where to save plugin notes')
      .addDropdown(dropdown => dropdown
        .addOption('plugin', 'In Plugin Folder')
        .addOption('custom', 'In Custom Folder')
        .setValue(this.plugin.settings.saveNotesInPluginFolder ? 'plugin' : 'custom')
        .onChange(async (value) => {
          this.plugin.settings.saveNotesInPluginFolder = value === 'plugin';
          notesFolderSetting.settingEl.style.display = 
            value === 'custom' ? 'block' : 'none';
          await this.plugin.saveSettings();
          this.updateLog(`Ubicación de notas cambiada a: ${value === 'plugin' ? 'carpeta del plugin' : 'carpeta personalizada'}`);
        }));

    const notesFolderSetting = new Setting(containerEl)
      .setName('Custom Notes Folder')
      .setDesc('Enter the folder name where plugin notes will be stored')
      .addText(text => text
        .setPlaceholder('e.g., Plugins')
        .setValue(this.plugin.settings.notesFolder)
        .onChange(async (value) => {
          this.plugin.settings.notesFolder = value;
          await this.plugin.saveSettings();
          this.updateLog('Carpeta de notas personalizada actualizada');
        }));

    notesFolderSetting.settingEl.style.display = 
      this.plugin.settings.saveNotesInPluginFolder ? 'none' : 'block';

    this.progressBar = containerEl.createEl('progress');
    this.progressBar.max = 100;
    this.progressBar.value = 0;
    this.progressBar.style.width = '100%';
    this.progressBar.style.marginTop = '20px';

    containerEl.createEl('h3', { text: 'Registro de Acciones' });
    this.logContainer = containerEl.createEl('div', {
      cls: 'audio-plugin-log-container'
    });

    // Botón de escaneo
    new Setting(containerEl)
      .setName('Scan Plugins')
      .setDesc('Scan for audio plugins in the main folder')
      .addButton(button => {
        button
          .setButtonText('Scan')
          .onClick(async () => {
            if (this.isScanning) {
              button.setButtonText('Stopping...');
              button.setDisabled(true);
              this.updateLog('Deteniendo escaneo (se completará el ZIP actual)...');
              this.plugin.requestScanStop();
              return;
            }

            this.isScanning = true;
            button.setButtonText('Stop');
            this.progressBar.value = 0;
            this.updateLog('Iniciando escaneo de plugins...');

            // Conectar el sistema de logging usando el nuevo método
            this.plugin.setPluginScannerLogCallback((message) => {
              this.updateLog(message);
            });

            try {
              const results = await this.plugin.scanPlugins((progress) => {
                this.progressBar.value = progress;
                if (progress % 10 === 0) {
                  this.updateLog(`Progreso del escaneo: ${Math.round(progress)}%`);
                }
              });

              if (results.stopped) {
                this.updateLog('Escaneo detenido por el usuario');
              } else {
                this.updateLog(`Escaneo completado: ${results.plugins} plugins procesados`);
              }
            } catch (error) {
              this.updateLog(`Error durante el escaneo: ${error.message}`);
            } finally {
              this.isScanning = false;
              button.setButtonText('Scan');
              button.setDisabled(false);
            }
          });
      });
  }
}
