// AI bar labels for the Part 2 dialog.
import { CARD_LABELS, ORGS } from './model.js';

export function barLabel(label) {
  if (label === 'skip') return 'SKIP';
  if (label === 'intervene') return 'INTERVENE';
  if (ORGS[label]) return ORGS[label].support;
  if (label.startsWith('flip:')) return `FLIP ${CARD_LABELS[label.slice(5)]}`;
  return label.toUpperCase();
}
