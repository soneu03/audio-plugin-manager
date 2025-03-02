/**
 * Esta clase proporciona métodos para gestionar la barra de estado del plugin.
 * Incluye funcionalidades para:
 * - `update`: Actualiza el texto de la barra de estado.
 * - `showProgress`: Muestra el progreso de una tarea en la barra de estado.
 * - `finishProgress`: Finaliza el modo de progreso y restaura el texto predeterminado o muestra un mensaje final.
 */
// ui/statusBar.ts
import { Plugin } from 'obsidian';

export class StatusBar {
  private statusBarEl: HTMLElement;
  private plugin: Plugin;
  private defaultText: string = 'Audio Plugin Manager';
  private progressMode: boolean = false;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    this.statusBarEl = this.plugin.addStatusBarItem();
    this.update();
  }

  update(lastScanDate?: string) {
    if (this.progressMode) return; // No actualizar en modo progreso
    
    if (lastScanDate) {
      this.statusBarEl.setText(`Last scan: ${lastScanDate}`);
    } else {
      this.statusBarEl.setText(this.defaultText);
    }
  }

  // Método para mostrar progreso (0-100)
  showProgress(percentage: number, message?: string) {
    this.progressMode = true;
    const progressText = message 
      ? `${message}: ${percentage.toFixed(1)}%` 
      : `Progress: ${percentage.toFixed(1)}%`;
    this.statusBarEl.setText(progressText);
  }

  // Método para finalizar el modo progreso
  finishProgress(message?: string) {
    this.progressMode = false;
    if (message) {
      this.statusBarEl.setText(message);
      // Restaurar después de 3 segundos
      setTimeout(() => this.update(), 3000);
    } else {
      this.update();
    }
  }
}