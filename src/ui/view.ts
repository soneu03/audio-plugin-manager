/**
 * Esta clase define la vista del plugin Audio Plugin Manager.
 * Incluye funcionalidades para:
 * - `getViewType`: Obtiene el tipo de vista.
 * - `getDisplayText`: Obtiene el texto a mostrar en la pestaña de la vista.
 * - `onOpen`: Se ejecuta al abrir la vista, creando la interfaz de usuario.
 * - `onClose`: Se ejecuta al cerrar la vista, realizando tareas de limpieza si es necesario.
 */
// ui/view.ts
import { ItemView, WorkspaceLeaf } from 'obsidian';
import AudioPluginManager from '../main';

export const AUDIO_PLUGIN_VIEW = 'audio-plugin-view';

export class AudioPluginView extends ItemView {
  private plugin: AudioPluginManager;

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
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl('h2', { text: 'Audio Plugin Manager' });
    
    // Aquí puedes agregar más elementos UI para la gestión de plugins
    const scanButton = container.createEl('button', { text: 'Scan Plugins' });
    scanButton.addEventListener('click', async () => {
      await this.plugin.scanPlugins();
    });
  }

  async onClose(): Promise<void> {
    // Cleanup if needed
  }
}
