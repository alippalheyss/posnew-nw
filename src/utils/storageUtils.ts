import { supabase, supabaseUrl } from '@/lib/supabase';

/**
 * Optimizes an image (File or Blob) using HTML5 Canvas:
 * - Resizes to max dimensions (default 400px)
 * - Compresses to WebP (or JPEG fallback) at 0.65 quality
 * - Returns a Blob and compressed Data URL
 */
export async function optimizeImage(
  file: File | Blob,
  maxDimension = 400,
  quality = 0.65
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first for maximum compression, fallback to jpeg
        let mimeType = 'image/webp';
        let dataUrl = canvas.toDataURL(mimeType, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          mimeType = 'image/jpeg';
          dataUrl = canvas.toDataURL(mimeType, quality);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              // Fallback convert dataUrl to blob
              const byteString = atob(dataUrl.split(',')[1]);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              resolve({ blob: new Blob([ab], { type: mimeType }), dataUrl });
            }
          },
          mimeType,
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export interface ImageUploadResult {
  url: string | null;
  error?: string | null;
}

export function isValidCdnUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (
    trimmed.includes('<') ||
    trimmed.includes('>') ||
    trimmed.includes('your-subdomain') ||
    trimmed.includes('example.com')
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Uploads an image to Supabase Storage bucket 'product-images'.
 * Always returns the canonical Supabase public URL to ensure persistent cross-device availability.
 */
export async function uploadProductImage(
  file: File | Blob,
  fileName: string
): Promise<ImageUploadResult> {
  if (!supabase || !supabaseUrl) {
    return { url: null, error: 'Supabase client is not initialized' };
  }

  try {
    const { blob } = await optimizeImage(file, 400, 0.65);
    const bucket = 'product-images';
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'prod';
    const path = `${cleanFileName}_${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        contentType: blob.type || 'image/webp',
        upsert: true,
        cacheControl: '31536000', // 1 year browser disk cache!
      });

    if (uploadError) {
      console.error('[Storage Error] Supabase storage upload failed:', uploadError);
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) {
      const publicUrl = data.publicUrl;
      console.log('[Storage Success] Product image public URL:', publicUrl);
      return { url: publicUrl };
    }

    return { url: null, error: 'Could not obtain public URL from Supabase storage' };
  } catch (err: any) {
    console.error('[Storage Error] Exception during upload:', err);
    return { url: null, error: err.message || 'Unknown upload exception' };
  }
}

/**
 * Transforms a Supabase Storage URL to use the Cloudflare CDN proxy only if VITE_STORAGE_CDN_URL is configured and valid.
 */
export function getStorageCdnUrl(url: string | null | undefined): string {
  if (!url) return '';
  const cdnBase = import.meta.env.VITE_STORAGE_CDN_URL;
  if (cdnBase && isValidCdnUrl(cdnBase) && supabaseUrl && url.startsWith(supabaseUrl)) {
    return url.replace(supabaseUrl, cdnBase.replace(/\/$/, ''));
  }
  return url;
}
