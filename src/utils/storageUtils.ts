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

/**
 * Uploads an image to Supabase Storage bucket 'product-images'.
 * If the bucket exists and upload succeeds, returns the public URL with CDN caching (31536000s).
 * If storage upload fails (e.g. bucket doesn't exist yet or permission denied), returns null
 * so the caller can safely use the optimized compact dataUrl as fallback.
 */
export async function uploadProductImage(
  file: File | Blob,
  fileName: string
): Promise<string | null> {
  if (!supabase || !supabaseUrl) return null;

  try {
    const { blob } = await optimizeImage(file, 400, 0.65);
    const bucket = 'product-images';
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `items/${cleanFileName}_${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        contentType: blob.type || 'image/webp',
        upsert: true,
        cacheControl: '31536000', // 1 year browser disk cache!
      });

    if (uploadError) {
      console.warn('[Storage] Supabase storage upload skipped (falling back to compact local image):', uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) {
      console.log('[Storage] Product image uploaded to CDN:', data.publicUrl);
      return data.publicUrl;
    }
  } catch (err) {
    console.warn('[Storage] Exception uploading to Supabase storage, using fallback:', err);
  }

  return null;
}
