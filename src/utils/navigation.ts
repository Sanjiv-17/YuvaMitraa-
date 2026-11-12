/**
 * Safely open external links in an iFrame-friendly manner without window.open
 */
export function openExternalUrl(url: string): void {
  if (!url || typeof window === 'undefined') return;
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.location.assign(url);
  }
}
