import { downloadCard } from './cardUtils.js';

export const $ = (selector) => document.querySelector(selector);

export function downloadCardImage(selector, prefix = 'card-') {
  downloadCard(selector, prefix);
}
