# Deploying the Brand Extraction Edge Function

## Prerequisites

1. **Supabase CLI installed** ✅ (Already installed)
2. **Logged into Supabase** (Check with `supabase login`)
3. **Linked to your Supabase project** (Check with `supabase projects list`)

## Step-by-Step Deployment

### 1. Navigate to your project directory
```bash
cd /Users/makif/Downloads/proveen
```

### 2. Login to Supabase (if not already logged in)
```bash
supabase login
```
This will open your browser to authenticate.

### 3. Link to your Supabase project (if not already linked)
```bash
supabase link --project-ref your-project-ref
```
You can find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

Alternatively, if you haven't initialized Supabase in this project:
```bash
supabase init
```

### 4. Deploy the Edge Function
```bash
supabase functions deploy extract-brand
```

### 5. Set the OpenRouter API Key as a Secret
```bash
supabase secrets set OPENROUTER_API_KEY=your_openrouter_api_key_here
```
Replace `your_openrouter_api_key_here` with your actual OpenRouter API key.

**Note:** This project uses OpenRouter instead of OpenAI directly. Get your API key from https://openrouter.ai/

### 6. Verify the deployment
You can test the function by calling it from your app, or check it in the Supabase dashboard:
- Go to: **Edge Functions** in your Supabase dashboard
- You should see `extract-brand` listed

## Alternative: Deploy via Supabase Dashboard

If you prefer using the web interface:

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. Click **Create a new function**
4. Name it `extract-brand`
5. Copy the contents from `supabase/functions/extract-brand/index.ts`
6. Paste it into the editor
7. Click **Deploy**
8. Go to **Settings** → **Edge Functions** → **Secrets**
9. Add `OPENROUTER_API_KEY` with your OpenRouter API key value

## Troubleshooting

### If you get "not logged in" error:
```bash
supabase login
```

### If you get "project not linked" error:
```bash
supabase link --project-ref your-project-ref
```

### If the function doesn't work:
1. Check the function logs in Supabase Dashboard → Edge Functions → extract-brand → Logs
2. Verify the OPENROUTER_API_KEY secret is set correctly
3. Make sure your Supabase project has Edge Functions enabled
4. Verify your OpenRouter API key has sufficient credits

## Testing

After deployment, test it by:
1. Going to your Brand Settings page
2. Entering a website URL (e.g., `stripe.com`)
3. Clicking the extract button
4. Checking the browser console for any errors
