import { WiroAIInput, WiroAIOutput, BrandConfig, SocialPlatform, CreativeFormat } from './types';

// Helper for HMAC-SHA256 Signature using Web Crypto API
async function generateSignature(secret: string, nonce: string, apiKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiKey);
    const messageData = encoder.encode(secret + nonce);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureWithBuffer = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        messageData
    );

    // Convert buffer to hex string
    return Array.from(new Uint8Array(signatureWithBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export class WiroAIService {
    private static API_URL = 'https://api.wiro.ai/v1';
    private static MODEL = 'google/nano-banana-pro';

    static async generateContent(input: WiroAIInput, brandConfig?: BrandConfig): Promise<WiroAIOutput> {
        const apiKey = import.meta.env.VITE_WIRO_API_KEY;
        const apiSecret = import.meta.env.VITE_WIRO_API_SECRET;

        // Fallback to simulation if keys are missing or default
        if (!apiKey || !apiSecret || apiKey.includes('your_api_key')) {
            console.warn('Wiro AI API keys missing. Using simulator.');
            return this.simulateGeneration(input);
        }

        try {
            // 1. Validate Logo BEFORE generating prompt
            // This ensures that if we have an unsupported logo (like SVG), the prompt KNOWS about it
            // and forcefully requests "Text Only" style instead of asking for a logo that won't be uploaded.
            let validLogoUrl = brandConfig?.logos?.primary;
            if (validLogoUrl) {
                // Check for SVG
                const isSvg = validLogoUrl.toLowerCase().includes('.svg');
                if (isSvg) {
                    console.warn('Unsupported SVG logo detected. Forcing text-only mode.');
                    validLogoUrl = undefined;
                }
            }

            // Create effective config for prompt generation
            const effectiveBrandConfig = brandConfig ? {
                ...brandConfig,
                logos: {
                    ...brandConfig.logos,
                    primary: validLogoUrl
                }
            } : undefined;

            // 1. Prepare Prompt using the effective config (with potentially removed logo)
            const prompt = this.constructPrompt(input, effectiveBrandConfig);

            // 2. Submit Task
            // Get specs again to pass technical params (redundant lookup but clean)
            const specs = this.PLATFORM_SPECS[input.socialPlatform][input.format];

            // Pass the validLogoUrl to submitTask (if it's undefined, no image will be uploaded)
            const taskId = await this.submitTask(apiKey, apiSecret, prompt, specs.ratio, specs.resolution, validLogoUrl);

            // 3. Poll for Result
            const wiroImageUrl = await this.pollTask(apiKey, apiSecret, taskId);

            // 4. Use CDN URL directly (save-image endpoint not implemented)
            // Images are stored in Supabase storage during creativeSlice upload
            let finalImageUrl = wiroImageUrl;

            return {
                quote: this.extractQuote(input.testimonialContent), // Reuse logic to get a short quote for display
                sentiment: 0.9, // We don't get sentiment from this image model, so default high
                hashtags: ['#proveen', '#generated'],
                imageUrl: finalImageUrl
            };

        } catch (error) {
            console.error('Wiro AI Generation Failed:', error);
            // Fallback on failure
            return this.simulateGeneration(input);
        }
    }

    private static async submitTask(apiKey: string, apiSecret: string, prompt: string, ratio: string, resolution: string, logoUrl?: string): Promise<string> {
        const nonce = Math.floor(Date.now() / 1000).toString();
        const signature = await generateSignature(apiSecret, nonce, apiKey);

        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('aspectRatio', ratio);
        formData.append('resolution', "1K"); // API might strict on '1K', '2K' enums. Logic: Use 1K for now but could map resolution if API supported custom strings.
        // Actually, let's keep it '1K' if that's what the API requires, but we passed resolution string for future proofing or prompt use.
        // If API expects strict Enum, we might ignore resolution arg in formData or map it. 
        // Let's assume for now we just pass ratio.

        // Handle Logo: URL vs Local File
        if (logoUrl) {
            try {
                // Check if logo is SVG (Wiro AI API doesn't support SVG, only: png, jpg, jpeg, gif)
                const isSvg = logoUrl.toLowerCase().includes('.svg') || logoUrl.toLowerCase().endsWith('.svg');

                if (isSvg) {
                    console.warn("SVG logo files are not supported by Wiro AI API. Skipping logo upload. Generation will continue without logo.");
                    // Skip SVG files - generation can proceed without logo
                } else {
                    let filename = 'logo.png';
                    let blob: Blob;

                    // Determine filename from URL
                    const urlPath = logoUrl.split('?')[0]; // Remove query params
                    const urlFilename = urlPath.split('/').pop() || 'logo.png';

                    // Determine file extension from URL or default to png
                    if (urlFilename.includes('.')) {
                        filename = urlFilename;
                    } else if (logoUrl.includes('.png')) {
                        filename = 'logo.png';
                    } else if (logoUrl.includes('.jpg') || logoUrl.includes('.jpeg')) {
                        filename = 'logo.jpg';
                    } else if (logoUrl.includes('.gif')) {
                        filename = 'logo.gif';
                    }

                    // Fetch the image (works for both local and remote URLs)
                    const response = await fetch(logoUrl);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch logo: ${response.status} ${response.statusText}`);
                    }

                    // Get the blob with proper content type
                    blob = await response.blob();

                    // Double-check MIME type to ensure it's a supported format
                    const mimeType = blob.type.toLowerCase();
                    const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];

                    if (!supportedTypes.includes(mimeType) && mimeType !== '') {
                        // If MIME type is set and not supported, skip it
                        console.warn(`Logo MIME type "${mimeType}" is not supported. Supported types: png, jpg, jpeg, gif. Skipping logo upload.`);
                    } else {
                        // Append as file to FormData
                        formData.append('inputImage', blob, filename);
                    }
                }
            } catch (e) {
                console.error("Failed to load logo for upload:", e);
                // Skip logo if we can't load it - generation can continue without logo
                console.warn("Continuing without logo - generation may proceed with text-only prompt");
            }
        }

        const response = await fetch(`${this.API_URL}/Run/${this.MODEL}`, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'x-nonce': nonce,
                'x-signature': signature,
                // 'Content-Type': 'multipart/form-data' // Browser sets this automatically with boundary
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`API Submit Failed: ${response.status} ${err}`);
        }

        const data = await response.json();
        if (!data.result) {
            throw new Error(`API returned false result: ${JSON.stringify(data.errors)}`);
        }

        return data.taskid;
    }

    private static async pollTask(apiKey: string, apiSecret: string, taskId: string): Promise<string> {
        const maxAttempts = 30; // 30 attempts * 2s = 60s timeout
        let attempts = 0;

        while (attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

            const nonce = Math.floor(Date.now() / 1000).toString();
            const signature = await generateSignature(apiSecret, nonce, apiKey);

            const response = await fetch(`${this.API_URL}/Task/Detail`, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'x-nonce': nonce,
                    'x-signature': signature,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ taskid: taskId })
            });

            if (!response.ok) continue;

            const data = await response.json();
            if (!data.result || !data.tasklist || data.tasklist.length === 0) continue;

            const task = data.tasklist[0];

            if (task.status === 'task_postprocess_end') {
                console.log('Wiro AI Task Completed:', task); // Debug log
                // Success
                if (task.outputs && task.outputs.length > 0) {
                    return task.outputs[0].url;
                }
                console.error('Task completed but no outputs:', JSON.stringify(task, null, 2));
                throw new Error('Task completed but no output found.');
            } else if (task.status === 'task_cancel') {
                throw new Error('Task was cancelled.');
            }
            // Continue polling for other statuses
        }

        throw new Error('Polling timed out.');
    }

    private static PLATFORM_SPECS: Record<SocialPlatform, Record<CreativeFormat, { ratio: string; resolution: string; promptSuffix: string }>> = {
        Instagram: {
            Post: { ratio: '1:1', resolution: '1024x1024', promptSuffix: 'Square format, optimized for Instagram Feed.' },
            Story: { ratio: '9:16', resolution: '1080x1920', promptSuffix: 'Vertical full-screen format, optimized for Instagram Story with clear safe zones.' }
        },
        LinkedIn: {
            Post: { ratio: '1:1', resolution: '1200x1200', promptSuffix: 'Professional square format, optimized for LinkedIn Feed.' },
            Story: { ratio: '9:16', resolution: '1080x1920', promptSuffix: 'Vertical format, corporate professional style for LinkedIn.' }
        },
        Twitter: {
            Post: { ratio: '1:1', resolution: '1080x1080', promptSuffix: 'Square format, high visibility for Twitter.' }, // Twitter supports 16:9 too but 1:1 is safe
            Story: { ratio: '9:16', resolution: '1080x1920', promptSuffix: 'Vertical format for Fleet-style content.' }
        },
        Facebook: {
            Post: { ratio: '1:1', resolution: '1080x1080', promptSuffix: 'Square format, optimized for Facebook Feed.' },
            Story: { ratio: '9:16', resolution: '1080x1920', promptSuffix: 'Vertical format, optimized for Facebook Stories.' }
        }
    };

    private static constructPrompt(input: WiroAIInput, brandConfig?: BrandConfig): string {
        // Build comprehensive color description from brand config
        let colors = 'Use vibrant professional colors.';
        if (brandConfig?.colors) {
            const colorParts: string[] = [];
            if (brandConfig.colors.primary) {
                colorParts.push(`Primary: ${brandConfig.colors.primary}`);
            }
            if (brandConfig.colors.secondary) {
                colorParts.push(`Secondary: ${brandConfig.colors.secondary}`);
            }
            if (brandConfig.colors.accent) {
                colorParts.push(`Accent: ${brandConfig.colors.accent}`);
            }
            if (brandConfig.colors.background) {
                colorParts.push(`Background: ${brandConfig.colors.background}`);
            }
            if (brandConfig.colors.text) {
                colorParts.push(`Text: ${brandConfig.colors.text}`);
            }
            if (colorParts.length > 0) {
                colors = `Brand Colors: ${colorParts.join(', ')}. Use these colors throughout the design - primary for main elements, secondary for supporting elements, accent for highlights, background for the base, and text color for all text content.`;
            }
        }

        const font = brandConfig?.typography?.fontFamily || 'Helvetica';

        const specs = this.PLATFORM_SPECS[input.socialPlatform][input.format];

        // Use full testimonial content instead of truncating
        // The API should handle long text appropriately
        const testimonialText = input.testimonialContent;

        // Build reviewer information section if provided
        let reviewerSection = '';
        if (input.reviewerInfo) {
            const parts: string[] = [];
            if (input.reviewerInfo.includeName && input.reviewerInfo.name) {
                parts.push(`Reviewer Name: ${input.reviewerInfo.name} - Display the name in small, subtle text (approximately 12-14px font size, occupying less than 5% of the image height).`);
            }
            if (input.reviewerInfo.includeRating && input.reviewerInfo.rating !== undefined) {
                const stars = '⭐'.repeat(input.reviewerInfo.rating) + '☆'.repeat(5 - input.reviewerInfo.rating);
                parts.push(`Rating: ${input.reviewerInfo.rating}/5 ${stars} - Display as small stars near the reviewer name.`);
            }
            if (input.reviewerInfo.includeAvatar && input.reviewerInfo.avatar) {
                parts.push('Include reviewer profile picture/avatar in the design - The avatar should be small and compact (approximately 32-40px diameter, circular, occupying less than 2% of the image area). Position it discretely, typically in a corner or bottom section alongside the name.');
            }
            if (parts.length > 0) {
                reviewerSection = `\nReviewer Information:\n- ${parts.join('\n- ')}\nIMPORTANT: Keep all reviewer elements (name, avatar, rating) small and unobtrusive. They should complement the testimonial text, not dominate the design.`;
            }
        }

        // Add additional prompt instructions if provided
        const additionalInstructions = input.additionalPrompt
            ? `\n\nAdditional Design Modifications:\n- ${input.additionalPrompt}\n`
            : '';

        // Determine Logo instruction
        const logoInstruction = brandConfig?.logos?.primary
            ? 'Logo: Incorporate the logo from the input image naturally into the composition (e.g. bottom corner or watermark).'
            : `Brand Name: Display the brand name "${brandConfig?.name || 'Brand'}" TEXT ONLY in the design (e.g. bottom corner or watermark). DO NOT generate a logo icon or symbol. Use text only for the brand identity.`;

        return `Create a high-quality, professional social media image for ${input.socialPlatform}.
        Format: ${input.format} (${specs.ratio}). ${specs.promptSuffix}
        Resolution: ${specs.resolution}.

Brand Identity:
- ${colors}
- Style: Professional, minimal, premium.
- ${logoInstruction}

Content:
- Testimonial Text to Display: "${testimonialText}"
- Typography: ${font}, bold and legible. Use brand-compliant font colors that ensure high contrast against the background. Avoid black text on dark backgrounds. Ensure all text fits within the canvas with generous padding (at least 15% from all edges) to prevent cutoff.${reviewerSection}${input.cta ? `\n- Call to Action: Display "${input.cta}" prominently, styled as a button or action text using the brand primary color.` : ''}${additionalInstructions}

Visuals:
- Layout: Center-weighted composition with safe zones. Keep text away from edges.
- Background: Use the brand background color as the base. Create abstract gradient or soft texture incorporating brand primary, secondary, and accent colors.
- Color Application: Apply brand colors strategically - primary for main elements and CTAs, secondary for supporting elements, accent for highlights and emphasis.
- Contrast: Ensure all text is easily readable. Do not place dark text on dark backgrounds. Use light text/white if the background is dark.
- Atmosphere: Inspiring, trustworthy, glowing.
- Lighting: Soft studio lighting.
- Quality: Photorealistic, 4k, core detail.`;
    }

    private static extractQuote(content: string): string {
        const words = content.split(' ');
        return words.slice(0, Math.min(words.length, 12)).join(' ') + (words.length > 12 ? '...' : '');
    }

    private static async simulateGeneration(input: WiroAIInput): Promise<WiroAIOutput> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2500));

        const newQuote = this.extractQuote(input.testimonialContent);
        const sentiment = input.testimonialContent.toLowerCase().includes('great') ? 0.9 : 0.7;

        return {
            quote: newQuote,
            sentiment,
            hashtags: ['#proveen', '#customerfeedback', `#${input.socialPlatform.toLowerCase()}`],
            imageUrl: '/assets/generated_placeholder.png'
        };
    }
}