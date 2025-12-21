# Setting OpenRouter API Key Secret

## Quick Method: Via Supabase Dashboard

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Edge Functions Settings**
   - Click on **Edge Functions** in the left sidebar
   - Click on **Settings** (or go to Project Settings → Edge Functions)

3. **Add the Secret**
   - Find the **Secrets** section
   - Click **Add Secret** or **New Secret**
   - **Name:** `OPENROUTER_API_KEY`
   - **Value:** Your OpenRouter API key (starts with `sk-or-v1-...`)
   - Click **Save** or **Add**

4. **Verify**
   - The secret should now appear in the list
   - Make sure the name is exactly: `OPENROUTER_API_KEY` (case-sensitive)

## Alternative: Via CLI (if project is linked)

If you've linked your project with `supabase link`, you can run:

```bash
supabase secrets set OPENROUTER_API_KEY=your_openrouter_api_key_here
```

## Get Your OpenRouter API Key

1. Go to https://openrouter.ai/keys
2. Sign in or create an account
3. Create a new API key
4. Copy the key (it starts with `sk-or-v1-...`)

## Test After Setting

After setting the secret, test the brand extraction:
1. Go to your Brand Settings page
2. Enter a website URL
3. Click the extract button
4. It should now work!
