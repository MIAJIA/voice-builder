/**
 * Image compression utilities for Voice Builder
 * Compresses images before sending to Claude Vision API
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: CompressOptions = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  format: 'jpeg',
};

/**
 * Compress an image from a base64 string
 * @param base64 - The base64 encoded image (with or without data URI prefix)
 * @param options - Compression options
 * @returns Compressed base64 string with data URI prefix
 */
export async function compressImage(
  base64: string,
  options: CompressOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        const maxW = opts.maxWidth!;
        const maxH = opts.maxHeight!;

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use white background for JPEG (no transparency)
        if (opts.format === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64
        const mimeType = opts.format === 'png' ? 'image/png' : 'image/jpeg';
        const compressed = canvas.toDataURL(mimeType, opts.quality);

        resolve(compressed);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Handle base64 with or without data URI prefix
    img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  });
}

/**
 * Extract base64 data and media type from a data URI
 * @param dataUri - The data URI string
 * @returns Object with base64 data and media type
 */
export function parseDataUri(dataUri: string): { base64: string; mediaType: string } {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URI format');
  }
  return {
    mediaType: match[1],
    base64: match[2],
  };
}

/**
 * Check if a string is a valid image data URI
 */
export function isImageDataUri(str: string): boolean {
  return /^data:image\/(jpeg|png|gif|webp);base64,/.test(str);
}

/**
 * Get image dimensions from a base64 string
 */
export async function getImageDimensions(
  base64: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  });
}
