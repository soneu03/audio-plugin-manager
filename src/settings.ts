import { App, PluginSettingTab, Setting } from 'obsidian';
import AudioPluginManager from './main';

export class AudioPluginManagerSettingTab extends PluginSettingTab {
  plugin: AudioPluginManager;

  constructor(app: App, plugin: AudioPluginManager) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

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
        }));

    new Setting(containerEl)
      .setName('Auto-generate Notes')
      .setDesc('Automatically generate a note for each plugin')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoGenerateNotes)
        .onChange(async (value) => {
          this.plugin.settings.autoGenerateNotes = value;
          await this.plugin.saveSettings();
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
        }));

    notesFolderSetting.settingEl.style.display = 
      this.plugin.settings.saveNotesInPluginFolder ? 'none' : 'block';
  }
}