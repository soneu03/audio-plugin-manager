/**
 * Esta clase define la vista del plugin Audio Plugin Manager.
 * Incluye funcionalidades para:
 * - `getViewType`: Obtiene el tipo de vista.
 * - `getDisplayText`: Obtiene el texto a mostrar en la pestaña de la vista.
 * - `onOpen`: Se ejecuta al abrir la vista, creando la interfaz de usuario.
 * - `onClose`: Se ejecuta al cerrar la vista, realizando tareas de limpieza si es necesario.
 */
// ui/view.ts
import { ItemView, WorkspaceLeaf, Setting } from 'obsidian';
import AudioPluginManager from '../main';

export const AUDIO_PLUGIN_VIEW = 'audio-plugin-view';

export class AudioPluginView extends ItemView {
  private plugin: AudioPluginManager;
  private isScanning: boolean = false;
  private progressBar: HTMLProgressElement;
  private logContainer: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: AudioPluginManager) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return AUDIO_PLUGIN_VIEW;
  }

  getDisplayText(): string {
    return 'Audio Plugin Manager';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    container.createEl('h1', { text: 'Audio Plugin Manager' });

    // Scan Button
    const scanButton = new Setting(container)
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
      }).settingEl;

    // Progress Bar
    this.progressBar = container.createEl('progress');
    this.progressBar.max = 100;
    this.progressBar.value = 0;
    this.progressBar.style.width = '100%';
    this.progressBar.style.marginTop = '20px';
    this.progressBar.style.backgroundColor = 'var(--background-secondary)'; // Ensure background is visible
    this.progressBar.style.color = 'var(--text-normal)'; // Ensure text is visible
    this.progressBar.style.display = 'block'; // Ensure it's not hidden
    this.progressBar.style.height = '10px'; // Give it a height

    // Log Container
    container.createEl('h3', { text: 'Registro de Acciones' });
    this.logContainer = container.createEl('div', {
      cls: 'audio-plugin-log-container'
    });

    // Apply styles directly to the log container element
    this.logContainer.style.marginTop = '20px';
    this.logContainer.style.padding = '10px';
    this.logContainer.style.backgroundColor = 'var(--background-secondary)';
    this.logContainer.style.borderRadius = '5px';
    this.logContainer.style.maxHeight = '200px';
    this.logContainer.style.overflowY = 'auto';
    this.logContainer.style.fontFamily = 'monospace'; // Style log entries directly
    this.logContainer.style.fontSize = '12px';

    container.createEl('style', {
      text: `
        .audio-plugin-log-entry {
          font-family: monospace;
          padding: 2px 0;
          font-size: 12px;
        }
      `
    });

    
  }

  async onClose(): Promise<void> {
    // Cleanup if needed
  }

  private updateLog(message: string) {
    const logEntry = this.logContainer.createEl('div', {
      text: `${new Date().toLocaleTimeString()} - ${message}`,
      cls: 'audio-plugin-log-entry'
    });

    // Apply styles directly to the log entry element
    logEntry.style.fontFamily = 'monospace';
    logEntry.style.padding = '2px 0';
    logEntry.style.fontSize = '12px';

    while (this.logContainer.children.length > 10) {
      this.logContainer.firstChild?.remove();
    }

    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }
}
