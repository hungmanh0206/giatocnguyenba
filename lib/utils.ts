import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Open the browser's native date picker from a visible control. Safari can
 * ignore a fully transparent date input even when it covers the whole field.
 */
export function openNativeDatePicker(input: HTMLInputElement | null) {
  if (!input || input.disabled) return;

  input.focus({ preventScroll: true });

  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return;
    } catch {
      // Some browsers expose showPicker but still require a click.
    }
  }

  input.click();
}
