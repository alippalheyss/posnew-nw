# Zero-Cost Cloudflare CDN for Supabase Storage

By default, every image loaded in the app transfers bandwidth directly out of Supabase (`.supabase.co/storage/v1/...`). 

By putting **Cloudflare Free CDN** in front of your Supabase storage, Cloudflare caches every image globally at edge data centers. After the first load, **100% of image requests are served from Cloudflare's cache, costing 0 MB of Supabase storage egress**.

---

## 3-Minute Setup using Cloudflare Workers (Free Tier)

### Step 1: Create a Free Cloudflare Worker
1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Create Worker**.
2. Name it `pos-image-cdn` and click **Deploy**.
3. Click **Edit code** and paste the following 20 lines into `worker.js`:

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Replace with your actual Supabase URL
    const SUPABASE_ORIGIN = "https://zmbbgfpzgfcsoexybrle.supabase.co";

    // Forward the request to Supabase Storage
    const targetUrl = `${SUPABASE_ORIGIN}${url.pathname}${url.search}`;
    const response = await fetch(targetUrl, {
      cf: {
        // Cache images at Cloudflare Edge for 1 year
        cacheEverything: true,
        cacheTtl: 31536000,
      }
    });

    // Add browser cache headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
};
```
4. Click **Deploy**. Your worker URL will look like: `https://pos-image-cdn.<your-subdomain>.workers.dev`.

---

### Step 2: Configure in MVPOS
Add this single environment variable to your project:

In `.env` or Vercel Environment Variables:
```env
VITE_STORAGE_CDN_URL=https://pos-image-cdn.<your-subdomain>.workers.dev
```

### Result:
- When products with images are loaded on any POS device, phone, or tablet, the images are served instantly from Cloudflare Edge.
- **Supabase Storage Egress drops to 0 MB**.
