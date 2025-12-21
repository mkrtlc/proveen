# Extract Brand Edge Function

This Supabase Edge Function extracts brand information from a website URL using OpenRouter (with GPT-4o-mini).

## Setup

1. **Deploy the function:**
   ```bash
   supabase functions deploy extract-brand
   ```

2. **Set the OpenRouter API key:**
   ```bash
   supabase secrets set OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

## Usage

The function is called automatically when a user enters a website URL in the Brand Settings page.

## Environment Variables

- `OPENROUTER_API_KEY` - Your OpenRouter API key (required)

## Model Used

- `openai/gpt-4o-mini` - Fast and cost-effective model for brand extraction

## Response Format

```json
{
  "name": "Brand Name",
  "primaryColor": "#000000",
  "secondaryColor": "#171717",
  "accentColor": "#404040",
  "logoUrl": "https://example.com/logo.png",
  "backgroundPattern": "https://example.com/pattern.png"
}
```
