import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      configureServer(server) {
        // Middleware to fetch website metadata
        server.middlewares.use('/api/fetch-brand-settings', async (req, res, next) => {
          console.log(`[Middleware] Hit ${req.url} method=${req.method}`);
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
              try {
                const { url } = JSON.parse(body);
                console.log(`[Middleware] Fetching brand for: ${url}`);

                if (!url) throw new Error('No URL provided');

                // Basic validation
                let targetUrl = url;
                if (!targetUrl.startsWith('http')) {
                  targetUrl = 'https://' + targetUrl;
                }

                const https = await import('https');
                const http = await import('http');
                const client = targetUrl.startsWith('https') ? https : http;

                const fetchUrl = (u) => new Promise((resolve, reject) => {
                  client.get(u, (response) => {
                    // Handle redirects
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                      resolve({ redirect: response.headers.location });
                      return;
                    }
                    if (response.statusCode !== 200) {
                      reject(new Error(`Failed to fetch: ${response.statusCode}`));
                      return;
                    }
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => resolve({ html: data }));
                  }).on('error', reject);
                });

                // Simple redirect handling (1 level)
                let result: any = await fetchUrl(targetUrl);
                if (result.redirect) {
                  result = await fetchUrl(result.redirect);
                }

                if (!result.html) throw new Error('No content found');

                const html = result.html;

                // Simple regex extraction
                const getMeta = (prop) => {
                  const match = html.match(new RegExp(`<meta property="${prop}" content="([^"]*)"`));
                  return match ? match[1] : '';
                };
                const getTag = (tag) => {
                  const match = html.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`));
                  return match ? match[1] : '';
                };

                const title = getMeta('og:site_name') || getTag('title') || '';
                const image = getMeta('og:image');
                // Try to find a favicon/icon
                const iconMatch = html.match(/<link rel=".*icon.*" href="([^"]*)"/);
                let icon = iconMatch ? iconMatch[1] : '';

                // Fix relative URLs for icon
                if (icon && !icon.startsWith('http')) {
                  const urlObj = new URL(targetUrl);
                  if (icon.startsWith('//')) {
                    icon = 'https:' + icon;
                  } else if (icon.startsWith('/')) {
                    icon = `${urlObj.protocol}//${urlObj.host}${icon}`;
                  } else {
                    icon = `${urlObj.protocol}//${urlObj.host}/${icon}`; // approximate
                  }
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  data: {
                    name: title,
                    primaryImage: image, // Use OG image as a candidate for a "logo" or visual asset
                    icon: icon
                  }
                }));
              } catch (err) {
                console.error('Fetch brand failed:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.toString() }));
              }
            });
          } else {
            // If not POST, debug log and pass to next? 
            // Actually, if we hit this route, we should probably handle OPTIONS if it's a preflight.
            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.end();
              return;
            }
            next();
          }
        });

        server.middlewares.use('/api/save-image', async (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
              try {
                const { imageUrl } = JSON.parse(body);
                if (!imageUrl) throw new Error('No imageUrl provided');

                const filename = `creative-${Date.now()}.png`;
                // Save to public assets folder so it's accessible
                // Note: In Vite dev, 'assets' in root usually served. 
                // But user has 'assets' in root based on list_dir.
                // Let's save to the project root 'assets' folder.
                const assetsDir = path.resolve(__dirname, 'assets');
                if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

                const filePath = path.join(assetsDir, filename);

                // Fetch and save using native https to avoid dependencies
                const https = await import('https');
                const http = await import('http'); // Add http support

                await new Promise((resolve, reject) => {
                  const file = fs.createWriteStream(filePath);
                  const client = imageUrl.startsWith('https') ? https : http;

                  client.get(imageUrl, (response) => {
                    if (response.statusCode !== 200) {
                      reject(new Error(`Failed to fetch image: ${response.statusCode}`));
                      return;
                    }
                    response.pipe(file);
                    file.on('finish', () => {
                      file.close();
                      resolve(true);
                    });
                  }).on('error', (err) => {
                    fs.unlink(filePath, () => { }); // Delete the file async
                    reject(err);
                  });
                });

                // Return result
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, localPath: `/assets/${filename}` }));
              } catch (err) {
                console.error('Save failed:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.toString() }));
              }
            });
          } else {
            next();
          }
        });
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
