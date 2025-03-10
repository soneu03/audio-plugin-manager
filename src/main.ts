/**
 * This is the main plugin class for the Audio Plugin Manager.
 * It manages the plugin's lifecycle, settings, UI, and core functionality.
 *
 * Methods include:
 * - `onload`: Initializes the plugin, loads settings, initializes components, registers views and commands.
 * - `activateView`: Activates the plugin's view in the workspace.
 * - `updateStatusBar`: Updates the status bar with the last scan date.
 * - `requestScanStop`: Requests the plugin scanner to stop the current scan.
 * - `scanPlugins`: Scans for audio plugins in the configured directory.
 * - `loadSettings`: Loads the plugin settings from data.
 * - `saveSettings`: Saves the plugin settings to data.
 * - `setPluginScannerLogCallback`: Sets the callback function for logging messages from the plugin scanner.
 */
// main.ts
import { 
  App, 
  Plugin, 
  Notice
} from 'obsidian';

import { 
  AudioPluginManagerSettings as APMSettings, 
  DEFAULT_SETTINGS, 
  ScanResults 
} from './types';
import { AudioPluginManagerSettingTab } from './settings';
import { PluginScanner } from './scanner';
import { NoteGenerator } from './noteGenerator';
import { StatusBar } from './ui/statusBar';
import { AUDIO_PLUGIN_VIEW, AudioPluginView } from './ui/view';

export default class AudioPluginManager extends Plugin {
  settings: APMSettings;
  private statusBar: StatusBar;
  private pluginScanner: PluginScanner;
  private noteGenerator: NoteGenerator;

  async onload() {
    await this.loadSettings();
    
    // Inicializar componentes
    this.statusBar = new StatusBar(this);
    this.noteGenerator = new NoteGenerator(this.app, this.settings);
    this.pluginScanner = new PluginScanner(this.settings, this.noteGenerator, this.statusBar);
    
    // Actualizar status bar
    this.updateStatusBar();

    // Add settings tab
    this.addSettingTab(new AudioPluginManagerSettingTab(this.app, this));

    // Register view for plugin management
    this.registerView(
      AUDIO_PLUGIN_VIEW,
      (leaf) => new AudioPluginView(leaf, this)
    );

    // Add ribbon icon
    this.addRibbonIcon('audio-file', 'Audio Plugin Manager', async () => {
      this.activateView();
    });

    // Add commands
    this.addCommand({
      id: 'scan-audio-plugins',
      name: 'Scan Audio Plugins',
      callback: async () => {
        await this.scanPlugins();
      }
    });

    this.addCommand({
      id: 'open-audio-plugin-manager',
      name: 'Open Audio Plugin Manager',
      callback: () => {
        this.activateView();
      }
    });
  }

  async activateView() {
    const workspace = this.app.workspace;
    
    let leaf = workspace.getLeavesOfType(AUDIO_PLUGIN_VIEW)[0];
    
    if (!leaf) {
      // Obtener una hoja y verificar que no sea null
      const rightLeaf = workspace.getRightLeaf(false);
      
      if (rightLeaf) {
        await rightLeaf.setViewState({ type: AUDIO_PLUGIN_VIEW });
        workspace.revealLeaf(rightLeaf);
      } else {
        // Si no hay una hoja disponible en el lado derecho, crear una
        leaf = workspace.getLeaf(true);
        await leaf.setViewState({ type: AUDIO_PLUGIN_VIEW });
        workspace.revealLeaf(leaf);
      }
    } else {
      // Si ya existía una vista, simplemente mostrarla
      workspace.revealLeaf(leaf);
    }
    
    new Notice("Audio Plugin Manager activated!");
  }

  updateStatusBar() {
    this.statusBar.update(this.settings.lastScanDate);
  }

  requestScanStop() {
    if (this.pluginScanner) {
      this.pluginScanner.requestStop();
    }
  }

  async scanPlugins(onProgress?: (progress: number) => void): Promise<ScanResults> {
    try {
      if (!this.settings.mainFolder) {
        new Notice('Please set the main folder in settings first');
        return { developers: 0, plugins: 0, zips: 0, stopped: false };
      }

      new Notice('Scanning audio plugins...');

      // Ejecutar el escaneo
      const results = await this.pluginScanner.scanAndProcessPlugins(onProgress);

      // Actualizar la fecha del último escaneo solo si no fue detenido
      if (!results.stopped) {
      this.settings.lastScanDate = new Date().toLocaleString();
      await this.saveSettings();
      this.updateStatusBar();
      }

      new Notice(
        results.stopped
          ? 'Scan stopped by user'
          : `Scan complete! Found ${results.plugins} plugins from ${results.developers}`
      );

      return results;
    } catch (error) {
      console.error('Error scanning plugins:', error);
      new Notice(`Error scanning plugins: ${error.message}`);
      return { developers: 0, plugins: 0, zips: 0, stopped: false };
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Método público para establecer el callback de logging
  public setPluginScannerLogCallback(callback: (message: string) => void) {
    this.pluginScanner.setLogCallback(callback);
}
}