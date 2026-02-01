import html2canvas from 'html2canvas';

/**
 * Generate an image from an HTML element
 * @param element - The HTML element to capture
 * @param options - html2canvas options
 * @returns Promise<string> - Base64 data URL of the generated image
 */
export async function generateImageFromElement(
  element: HTMLElement,
  options?: Partial<{
    backgroundColor: string;
    scale: number;
    useCORS: boolean;
  }>
): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: options?.backgroundColor || '#f4f1ea',
    scale: options?.scale || 2, // Higher quality
    useCORS: options?.useCORS ?? true,
    logging: false,
  });

  return canvas.toDataURL('image/png');
}

/**
 * Download an image from a data URL
 * @param dataUrl - The base64 data URL
 * @param filename - The filename to save as
 */
export function downloadImage(dataUrl: string, filename: string = 'note-card.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy image to clipboard
 * @param dataUrl - The base64 data URL
 * @returns Promise<boolean> - Whether the copy was successful
 */
export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Use clipboard API
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);

    return true;
  } catch (error) {
    console.error('Failed to copy image to clipboard:', error);
    return false;
  }
}
