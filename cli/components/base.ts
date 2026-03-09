/**
 * Base Component Class
 *
 * Abstract base for all blessed UI components
 */

import blessed from 'blessed';
import { AppState } from '../app-state';

export abstract class BaseComponent {
  protected box: blessed.Widgets.BoxElement;

  constructor(box: blessed.Widgets.BoxElement) {
    this.box = box;
  }

  abstract render(state: AppState): void;
}
