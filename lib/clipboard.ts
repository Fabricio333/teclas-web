/**
 * Put a string on the clipboard, and say whether it worked.
 *
 * `navigator.clipboard` is unavailable on insecure origins and refused by some
 * embedded browsers — the in-app browsers of Instagram and WhatsApp among them,
 * which is exactly where a shared link gets opened. The `execCommand` path is
 * deprecated but still the only thing that works there, so it stays as the
 * fallback rather than the button silently doing nothing.
 *
 * Returns false when both paths fail, so the caller can skip the "copied"
 * confirmation instead of claiming something that did not happen.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Fall through to the selection-based copy below.
  }

  const area = document.createElement('textarea');
  area.value = value;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}
