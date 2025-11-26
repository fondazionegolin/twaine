<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/13CsNbz8GYPXCYcF8swkVuSkruElqJZ8V

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up API keys in `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   FAL_API_KEY=your_fal_api_key_here
   ```
   
   - Get Gemini API key from: https://aistudio.google.com/apikey
   - Get fal.ai API key from: https://fal.ai/dashboard/keys

3. Run the app:
   ```bash
   npm run dev
   ```
