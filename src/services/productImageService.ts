/**
 * Service to search and fetch high quality product images matching product names and barcodes
 * Uses free public APIs (Open Food Facts, Wikipedia, Openverse) with zero API keys required.
 */

import { uploadProductImage } from '@/utils/storageUtils';

export interface OnlineProductImage {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  source: 'Barcode DB' | 'Wikipedia' | 'Openverse';
}

/**
 * Searches online repositories for product packaging and photos matching query / barcode
 */
export async function searchProductImages(query: string, barcode?: string): Promise<OnlineProductImage[]> {
  const cleanQuery = (query || '').trim();
  const cleanBarcode = (barcode || '').trim().replace(/\D/g, '');
  const results: OnlineProductImage[] = [];
  const seenUrls = new Set<string>();

  const addImage = (img: OnlineProductImage) => {
    if (!img.url || seenUrls.has(img.url)) return;
    seenUrls.add(img.url);
    results.push(img);
  };

  // 1. Try Barcode Lookup first if a valid retail barcode is available (EAN-13, EAN-8, UPC-A)
  if (cleanBarcode && cleanBarcode.length >= 8) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://world.openfoodfacts.net/api/v0/product/${cleanBarcode}.json`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const p = data?.product;
        const imgUrl = p?.image_front_url || p?.image_url;
        const thumbUrl = p?.image_front_small_url || p?.image_small_url || imgUrl;
        if (imgUrl) {
          addImage({
            id: `barcode-${cleanBarcode}`,
            title: p?.product_name || cleanQuery || 'Official Packaging',
            url: imgUrl,
            thumbnail: thumbUrl || imgUrl,
            source: 'Barcode DB'
          });
        }
      }
    } catch {
      // Barcode lookup fallback
    }
  }

  if (!cleanQuery) return results;

  // 2. Fetch from Wikipedia Image API and Openverse in parallel
  const fetches: Promise<any>[] = [];

  // Wikipedia Page Images Search
  fetches.push(
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          cleanQuery
        )}&gsrlimit=10&prop=pageimages&pithumbsize=500&format=json&origin=*`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          const pages = Object.values(data?.query?.pages || {}) as any[];
          for (const page of pages) {
            if (page.thumbnail?.source) {
              addImage({
                id: `wiki-${page.pageid || Math.random()}`,
                title: page.title || cleanQuery,
                url: page.thumbnail.source,
                thumbnail: page.thumbnail.source,
                source: 'Wikipedia'
              });
            }
          }
        }
      } catch {
        // Silent fallback
      }
    })()
  );

  // Openverse Public Retail / Commercial Image Search
  fetches.push(
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(cleanQuery)}&page_size=8`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          const items = (data?.results || []) as any[];
          for (const item of items) {
            const imgUrl = item.url || item.thumbnail;
            if (imgUrl) {
              addImage({
                id: `openverse-${item.id || Math.random()}`,
                title: item.title || cleanQuery,
                url: imgUrl,
                thumbnail: item.thumbnail || imgUrl,
                source: 'Openverse'
              });
            }
          }
        }
      } catch {
        // Silent fallback
      }
    })()
  );

  await Promise.allSettled(fetches);
  return results;
}

/**
 * Downloads an online image and saves it permanently to Supabase Storage bucket as an optimized WebP.
 * If CORS prevents direct blob download, safely falls back to returning the public image URL.
 */
export async function saveOnlineImageToBucket(imageUrl: string, productCode: string): Promise<string> {
  if (!imageUrl) return '';

  try {
    const res = await fetch(imageUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const uploadResult = await uploadProductImage(blob, productCode || 'prod');
      if (uploadResult.url) {
        return uploadResult.bucketPath || uploadResult.url;
      }
    }
  } catch {
    // If CORS prevents canvas conversion or direct fetch, the external URL will be used directly
  }

  return imageUrl;
}
