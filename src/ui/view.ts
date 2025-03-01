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
