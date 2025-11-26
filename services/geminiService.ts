import { GoogleGenAI, Type } from "@google/genai";
import Anthropic from '@anthropic-ai/sdk';
import { StoryNode, WorldSettings, StoryStyle, ChatMessage } from "../types";

// Helper to get Gemini client
const getGeminiClient = () => new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
});

// Helper to get Anthropic client (fallback)
const getAnthropicClient = () => new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

// Models
const MODEL_TEXT = "gemini-2.0-flash-exp";
const MODEL_IMAGE = "gemini-2.0-flash-exp";
const MODEL_VIDEO = "veo-2-generate-preview";


// Helper function to retry operations with exponential backoff
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 5, initialDelay = 2000, onStatusUpdate?: (msg: string) => void): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429) or resource exhausted
      const isRateLimit = error?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('Quota exceeded');

      if (isRateLimit && i < maxRetries - 1) {
        let delay = initialDelay * Math.pow(2, i);

        // Try to extract specific retry delay from error details
        // The error structure often contains details array with RetryInfo
        if (error.details) {
          const retryInfo = error.details.find((d: any) => d['@type']?.includes('RetryInfo'));
          if (retryInfo && retryInfo.retryDelay) {
            // retryDelay format is often "39s" or similar
            const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
            if (!isNaN(seconds)) {
              delay = (seconds * 1000) + 1000; // Add 1s buffer
              console.log(`Server requested retry delay: ${seconds}s. Waiting ${delay}ms...`);
            }
          }
        }

        // Also check for simple message parsing "Please retry in X s"
        const match = error?.message?.match(/retry in ([0-9.]+)s/);
        if (match && match[1]) {
          const seconds = parseFloat(match[1]);
          if (!isNaN(seconds)) {
            delay = (seconds * 1000) + 1000; // Add 1s buffer
            console.log(`Parsed retry delay from message: ${seconds}s. Waiting ${delay}ms...`);
          }
        }

        const msg = `Rate limit hit. Retrying in ${Math.ceil(delay / 1000)}s...`;
        console.warn(msg);
        if (onStatusUpdate) onStatusUpdate(msg);

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
  throw lastError;
}

/**
 * Generates a full story skeleton (nodes and connections) from a master prompt.
 */
export const generateStorySkeleton = async (prompt: string, settings: WorldSettings): Promise<StoryNode[]> => {
  let systemInstruction = `
    You are an expert interactive fiction writer and game designer.
    Create a branching story skeleton based on the user's prompt.
    Return a list of at least 10 nodes.
    Ensure nodes are connected logically.
    Position x and y should be spaced out (e.g., increments of 300).
    The IDs should be unique strings.
    Each node must include a 'mediaType' field, default to 'image'.
    
    Game Mechanics requested:
  `;

  if (settings.useInventory) {
    systemInstruction += `\n- Inventory system enabled`;
  }
  if (settings.useEconomy) {
    systemInstruction += `\n- Economy system enabled (gold)`;
  }
  if (settings.useCombat) {
    systemInstruction += `\n- Combat system enabled (HP)`;
  }

  return retryOperation(async () => {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              content: { type: Type.STRING, description: "The story content for this node." },
              mediaType: { type: Type.STRING, enum: ["image", "video"], description: "Type of media for this node." },
              position: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER }
                },
                required: ["x", "y"]
              },
              connections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    targetNodeId: { type: Type.STRING },
                    label: { type: Type.STRING, description: "Text on the button to choose this path." }
                  },
                  required: ["id", "targetNodeId", "label"]
                }
              }
            },
            required: ["id", "title", "content", "position", "connections", "mediaType"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as StoryNode[];
    }
    throw new Error("Failed to generate skeleton");
  });
};

/**
 * Generates descriptive text or dialogue for a specific node, considering the overall story context.
 */
export const generateNodeText = async (
  allNodes: StoryNode[],
  currentNodeId: string,
  userTextPrompt: string,
  masterPrompt: string
): Promise<string> => {
  return retryOperation(async () => {
    const currentNode = allNodes.find(n => n.id === currentNodeId);
    if (!currentNode) {
      throw new Error("Current node not found.");
    }

    let context = `Overall story idea: "${masterPrompt}"\n\n`;
    context += `Current Node(ID: ${currentNode.id}, Title: "${currentNode.title}") content so far: \n"${currentNode.content}"\n\n`;

    // Find direct previous nodes for more immediate context
    const previousNodes: StoryNode[] = [];
    for (const node of allNodes) {
      if (node.connections.some(conn => conn.targetNodeId === currentNode.id)) {
        previousNodes.push(node);
      }
    }

    if (previousNodes.length > 0) {
      context += "Context from previous passages (title and truncated content):\n";
      previousNodes.forEach(prevNode => {
        context += `- From Node "${prevNode.title}"(ID: ${prevNode.id}): "${prevNode.content.substring(0, 150)}..."\n`;
      });
      context += "\n";
    }

    const systemInstruction = `
      You are an expert interactive fiction writer.
      Your task is to expand on the current story node's content, making it vivid and engaging.
      Keep the generated text concise, suitable for a single story passage(maximum 150 - 200 words).
      Strictly adhere to the overall story idea and the immediate context provided.
      Incorporate the user's specific prompt for this passage.
    `;

    const fullPrompt = `
      Story Context:
      ${context}

      User's specific prompt for this passage: "${userTextPrompt}"

      Generate the content for the current node, expanding on its existing content based on the user's prompt and the story context.
      Make it concise and suitable for a single passage.
    `;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: fullPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7, // A bit creative but focused
          maxOutputTokens: 200 // Limit output length to ensure conciseness
        }
      });
      return response.text || "";
    } catch (error) {
      console.warn("Gemini failed, falling back to Claude...", error);

      // Fallback to Claude
      const anthropic = getAnthropicClient();
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        system: systemInstruction,
        messages: [
          { role: "user", content: fullPrompt }
        ]
      });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      if (!text) throw new Error("No text returned from Claude");
      return text.trim();
    }
  });
};

/**
 * Generates an image or video using the appropriate model.
 */
export const generateNodeMedia = async (
  mediaPrompt: string,
  mediaType: 'image' | 'video',
  model: 'flux-schnell' | 'flux-dev-gguf' | 'sdxl' = 'flux-schnell',
  width: number = 512,
  height: number = 512,
  onStatusUpdate?: (msg: string) => void
): Promise<string> => {
  return retryOperation(async () => {
    if (mediaType === 'image') {
      // Call image.golinelli.ai directly for image generation
      // @ts-ignore - Vite env variables
      const FLUX_API_URL = import.meta.env.VITE_FLUX_API_URL || 'https://image.golinelli.ai';
      // @ts-ignore - Vite env variables
      const FLUX_API_KEY = import.meta.env.VITE_FLUX_API_KEY;

      if (!FLUX_API_KEY) {
        throw new Error("VITE_FLUX_API_KEY not configured. Please add it to .env.local");
      }

      if (onStatusUpdate) onStatusUpdate(`Generating image with ${model}...`);

      const response = await fetch(`${FLUX_API_URL}/generate`, {
        method: "POST",
        headers: {
          "X-API-Key": FLUX_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: mediaPrompt,
          model_id: model,
          steps: 3,  // Reduced from 4 for faster generation
          width: width,
          height: height
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Flux API error: ${error}`);
      }

      const result = await response.json();

      // Response format: { image_base64: "...", message: "Success" }
      if (result.image_base64) {
        // Convert base64 to data URL
        return `data:image/png;base64,${result.image_base64}`;
      }

      throw new Error(result.message || "Failed to generate image");
    } else { // mediaType === 'video'
      // Check API key for paid models
      if (typeof window.aistudio !== 'undefined' && !await window.aistudio.hasSelectedApiKey()) {
        await window.aistudio.openSelectKey();
        // Assume key selection was successful, proceed to retry.
        // If it fails again, the API call will throw an error.
      }

      const ai = getGeminiClient(); // Get a fresh client instance for the video model
      let operation = await ai.models.generateVideos({
        model: MODEL_VIDEO,
        prompt: mediaPrompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        if (onStatusUpdate) onStatusUpdate("Generating video... (polling)");
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink && process.env.API_KEY) {
        // Append API key to the download link
        return `${downloadLink}&key=${process.env.API_KEY}`;
      }
      throw new Error("Failed to generate video or retrieve download link.");
    }
  }, 5, 2000, onStatusUpdate);
};

/**
 * Generates a visual style for the story player based on a prompt.
 * Now supports advanced styling with fonts, textures, and layout modes.
 */
export const generateStoryStyle = async (stylePrompt: string): Promise<StoryStyle> => {
  const systemInstruction = `
      You are an expert UI/UX designer specializing in book and story interfaces.
      Create a comprehensive visual style definition (JSON) for a story interface based on the user's prompt.
      The style should be cohesive, accessible, and match the mood of the prompt.
      
      AVAILABLE FONTS BY CATEGORY:
      - Modern: Inter, Poppins, Montserrat, Roboto, Open Sans
      - Serif: Playfair Display, Merriweather, Lora, Crimson Text, Libre Baskerville, EB Garamond
      - Calligraphic: Great Vibes, Tangerine, Pinyon Script, Alex Brush, Allura, Dancing Script
      - Medieval: Cinzel, Cinzel Decorative, Uncial Antiqua, MedievalSharp, Almendra, Pirata One
      - Fantasy: Metamorphous, Grenze Gotisch, Creepster, Nosifer, Eater, Rye
      - Typewriter: Special Elite, Courier Prime, Cutive Mono, Anonymous Pro
      - Handwritten: Caveat, Kalam, Indie Flower, Shadows Into Light, Patrick Hand
      
      LAYOUT MODES:
      - standard: Classic single-column centered layout
      - book: Two-page spread with image on left, text on right (like an illustrated book)
      - scroll: Vertical scroll with decorative edges
      - manuscript: Illuminated manuscript style with ornate borders
      
      TEXTURE TYPES:
      - none: No texture
      - paper: Subtle paper grain
      - parchment: Aged parchment look
      - leather: Leather texture
      - fabric: Woven fabric pattern
      - stone: Stone/marble texture
      - wood: Wood grain
      
      ORNAMENT STYLES (for book layout):
      - none: No ornaments
      - simple: Simple line dividers
      - elegant: Curved elegant dividers
      - medieval: Gothic/medieval decorations
      - art-nouveau: Art nouveau flourishes
      
      Return a JSON object with these properties:
      {
        "background": "CSS background (color or gradient)",
        "textColor": "Text color hex",
        "accentColor": "Accent/button color hex",
        "fontFamily": "Body font from the list above, with fallback",
        "titleFontFamily": "Title font (can be different, more decorative)",
        "fontCategory": "modern|serif|calligraphic|medieval|fantasy|typewriter|handwritten",
        "animationClass": "fade-in|slide-up|zoom-in|blur-in",
        "layoutMode": "standard|book|scroll|manuscript",
        "textureType": "none|paper|parchment|leather|fabric|stone|wood",
        "textureColor": "Base color for texture hex",
        "textureOpacity": 0.3 (number 0-1),
        "pageColor": "Page background color for book mode hex",
        "pageEdgeColor": "Page edge tint color hex",
        "pageShadow": true/false,
        "ornamentStyle": "none|simple|elegant|medieval|art-nouveau",
        "titleFontSize": "CSS size like 2rem",
        "textFontSize": "CSS size like 1.1rem",
        "customCss": "Optional extra CSS"
      }
      
      Match the style to the mood: medieval stories should use medieval fonts and parchment textures,
      horror should use dark colors and creepy fonts, fairy tales should be whimsical, etc.
  `;

  return retryOperation(async () => {
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: `Create a comprehensive visual style for: "${stylePrompt}"`,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              background: { type: Type.STRING },
              textColor: { type: Type.STRING },
              accentColor: { type: Type.STRING },
              fontFamily: { type: Type.STRING },
              titleFontFamily: { type: Type.STRING },
              fontCategory: { type: Type.STRING, enum: ["modern", "serif", "calligraphic", "medieval", "fantasy", "typewriter", "handwritten"] },
              animationClass: { type: Type.STRING, enum: ["fade-in", "slide-up", "zoom-in", "blur-in"] },
              layoutMode: { type: Type.STRING, enum: ["standard", "book", "scroll", "manuscript"] },
              textureType: { type: Type.STRING, enum: ["none", "paper", "parchment", "leather", "fabric", "stone", "wood"] },
              textureColor: { type: Type.STRING },
              textureOpacity: { type: Type.NUMBER },
              pageColor: { type: Type.STRING },
              pageEdgeColor: { type: Type.STRING },
              pageShadow: { type: Type.BOOLEAN },
              ornamentStyle: { type: Type.STRING, enum: ["none", "simple", "elegant", "medieval", "art-nouveau"] },
              titleFontSize: { type: Type.STRING },
              textFontSize: { type: Type.STRING },
              customCss: { type: Type.STRING }
            },
            required: ["background", "textColor", "accentColor", "fontFamily", "animationClass"]
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as StoryStyle;
      }
      throw new Error("Failed to generate style");
    } catch (error) {
      console.warn("Gemini failed, falling back to Claude...", error);

      // Fallback to Claude
      const anthropic = getAnthropicClient();
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1500,
        system: systemInstruction,
        messages: [
          { role: "user", content: `Create a comprehensive visual style for: "${stylePrompt}"` }
        ]
      });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      if (!text) throw new Error("No text returned from Claude");

      // Extract JSON from Claude's response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as StoryStyle;
      }
      throw new Error("Failed to parse JSON from Claude response");
    }
  });
};


/**
 * Generates JavaScript code for a node's interaction based on a description.
 */
export const generateInteractionCode = async (description: string, worldSettings: WorldSettings, currentStyle?: StoryStyle): Promise<string> => {
  let systemInstruction = `
      You are an expert JavaScript developer for interactive fiction games that run in web browsers.
      Generate safe, executable JavaScript code based on the user's description.
      
      The code will run in a sandboxed environment where:
  - 'gameState' is a global object for storing state.
      - 'log(message)' is a function to display text to the player.
      - 'renderGame(htmlString)' is a function to render interactive HTML elements in a dedicated container.
      - 'container' is the HTMLElement for the interactive game area.

    CRITICAL BROWSER REQUIREMENTS:
  - Games are played in a BROWSER using KEYBOARD and MOUSE
      - ALWAYS add keyboard event listeners (keydown, keyup) for games
      - ALWAYS add mouse event listeners (click, mousedown, mouseup, mousemove) for interactive elements
      - Use addEventListener() for ALL interactive elements - NEVER use inline onclick attributes
      - Test for common keys: Space, Enter, Arrow keys, WASD, etc.
      
    ACCESSIBILITY & CONTRAST REQUIREMENTS:
  - Text MUST be readable with high contrast against background
      - Use contrasting colors (light text on dark bg, or dark text on light bg)
      - Add text shadows or backgrounds if needed for readability
      - Example: text-shadow: 0 0 4px rgba(0,0,0,0.8) for light text on varied backgrounds
      
    IMPORTANT:
  - Use 'gameState' (lowercase) for all state variables.
      - Do NOT use 'State' or 'state'.
      - Do NOT use 'alert()', 'prompt()', or 'confirm()'.
      - For interactive elements, use 'renderGame()' to inject HTML.
      - ALWAYS add event listeners AFTER rendering HTML.
      
      Available Systems:
  `;

  if (worldSettings.useInventory) {
    systemInstruction += `\n - gameState.inventory: string[] (player's items)`;
  }
  if (worldSettings.useEconomy) {
    systemInstruction += `\n- gameState.gold: number (player's currency)`;
  }
  if (worldSettings.useCombat) {
    systemInstruction += `\n- gameState.hp: number (player's health)`;
    systemInstruction += `\n- gameState.maxHp: number (player's max health)`;
  }

  // Add style information if available
  if (currentStyle) {
    systemInstruction += `\n\nSTYLE THEME (use these colors for harmonious design):`;
    systemInstruction += `\n- Background: ${currentStyle.background}`;
    systemInstruction += `\n- Text Color: ${currentStyle.textColor}`;
    systemInstruction += `\n- Accent Color: ${currentStyle.accentColor}`;
    systemInstruction += `\n- Font Family: ${currentStyle.fontFamily}`;
    systemInstruction += `\n\nWhen creating HTML with renderGame(), use these colors to match the story's aesthetic.`;
    systemInstruction += `\nIMPORTANT: Ensure text color (${currentStyle.textColor}) has good contrast with background.`;
    systemInstruction += `\nIf background is light, use dark text. If background is dark, use light text.`;
    systemInstruction += `\nAdd text-shadow for better readability: text-shadow: 0 0 4px rgba(0,0,0,0.8);`;
  }

  systemInstruction += `\n\nEXAMPLES OF CORRECT CODE:

// Example 1: Button with click listener
renderGame('<button id="myBtn" style="padding: 10px; background: #4CAF50; color: white; border: none; cursor: pointer;">Click Me</button>');
document.getElementById('myBtn').addEventListener('click', () => {
  log('Button clicked!');
  gameState.score = (gameState.score || 0) + 1;
});

// Example 2: Keyboard game
renderGame('<div id="game" style="width: 400px; height: 300px; background: #222; color: #fff; padding: 20px; text-shadow: 0 0 4px rgba(0,0,0,0.8);">Press SPACE to jump!</div>');
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    log('You jumped!');
  }
});

// Example 3: Mouse tracking
renderGame('<canvas id="canvas" width="400" height="300" style="border: 2px solid #fff; background: #000;"></canvas>');
const canvas = document.getElementById('canvas');
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  // Draw at mouse position
});
      
      FORMATTING RULES:
      - Return ONLY the JavaScript code, no markdown, no explanations.
      - Use proper indentation (2 spaces per level).
      - Put each statement on its own line.
      - Add line breaks between logical sections.
      - Format the code for readability.
      - ALWAYS add event listeners for interactive elements.
    `;

  try {
    return await retryOperation(async () => {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: description,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7
        }
      });

      if (response.text) {
        let code = response.text.trim();
        code = code.replace(/```javascript\n?/g, '').replace(/```\n?/g, '');
        return code;
      }
      throw new Error("Failed to generate interaction code");
    });
  } catch (error) {
    console.warn("Gemini failed, falling back to Claude...", error);

    // Fallback to Claude
    const anthropic = getAnthropicClient();
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 4000,
      system: systemInstruction,
      messages: [
        { role: "user", content: description }
      ]
    });

    let code = msg.content[0].type === 'text' ? msg.content[0].text : '';
    if (!code) throw new Error("No code returned from Claude");

    // Clean up markdown
    code = code.trim().replace(/```javascript\n?/g, '').replace(/```\n?/g, '');
    return code;
  }
};

/**
 * Iteratively modify existing JavaScript code based on user feedback
 */
export const iterateCode = async (
  currentCode: string,
  userMessage: string,
  conversationHistory: ChatMessage[],
  context: { worldSettings: WorldSettings; currentStyle?: StoryStyle }
): Promise<string> => {
  return retryOperation(async () => {
    const ai = getGeminiClient();

    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      conversationHistory.forEach(msg => {
        conversationContext += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
      });
    }

    let systemInstruction = `
      You are a code iteration assistant. The user has existing JavaScript code and wants to modify it.
      
      IMPORTANT RULES:
      1. Return ONLY the complete modified JavaScript code
      2. Use lowercase 'gameState' (not 'State' or 'state')
      3. Maintain the existing code structure unless explicitly asked to change it
      4. Make ONLY the changes requested by the user
      5. Do not add explanations or markdown - just the code
      
      FORMATTING RULES:
      - Use proper indentation (2 spaces per level)
      - Put each statement on its own line
      - Add line breaks between logical sections
      - Format the code for readability
      
      Available in gameState:
    `;

    if (context.worldSettings.useInventory) {
      systemInstruction += `\n- gameState.inventory: string[] (player's items)`;
    }
    if (context.worldSettings.useEconomy) {
      systemInstruction += `\n- gameState.gold: number (player's currency)`;
    }
    if (context.worldSettings.useCombat) {
      systemInstruction += `\n- gameState.hp: number (player's health)`;
      systemInstruction += `\n- gameState.maxHp: number (player's max health)`;
    }

    if (context.currentStyle) {
      systemInstruction += `\n\nCurrent story style:`;
      systemInstruction += `\n- Background: ${context.currentStyle.background}`;
      systemInstruction += `\n- Text Color: ${context.currentStyle.textColor}`;
      systemInstruction += `\n- Accent Color: ${context.currentStyle.accentColor}`;
      systemInstruction += `\n- Font: ${context.currentStyle.fontFamily}`;
    }

    systemInstruction += `\n\nCurrent code:\n\`\`\`javascript\n${currentCode}\n\`\`\``;
    systemInstruction += conversationContext;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: `User request: ${userMessage}`,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      if (response.text) {
        let code = response.text.trim();
        code = code.replace(/^```(?:javascript|js)?\n?/gm, '');
        code = code.replace(/\n?```$/gm, '');
        return code.trim();
      }
      throw new Error("Failed to iterate code");
    } catch (error) {
      console.warn("Gemini failed, falling back to Claude...", error);

      // Fallback to Claude
      const anthropic = getAnthropicClient();
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        system: systemInstruction,
        messages: [
          { role: "user", content: `User request: ${userMessage}` }
        ]
      });

      let code = msg.content[0].type === 'text' ? msg.content[0].text : '';
      if (!code) throw new Error("No code returned from Claude");

      // Clean up markdown
      code = code.trim();
      code = code.replace(/^```(?:javascript|js)?\n?/gm, '');
      code = code.replace(/\n?```$/gm, '');
      return code.trim();
    }
  });
};

/**
 * Iteratively refine master prompt based on user feedback
 */
export const iterateMasterPrompt = async (
  currentPrompt: string,
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<string> => {
  return retryOperation(async () => {
    const ai = getGeminiClient();

    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      conversationHistory.forEach(msg => {
        conversationContext += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
      });
    }

    const systemInstruction = `
      You are a story prompt refinement assistant. The user has a master story prompt and wants to refine it.
      
      IMPORTANT RULES:
      1. Return ONLY the refined prompt text
      2. Make ONLY the changes requested by the user
      3. Maintain the core story concept unless explicitly asked to change it
      4. Keep the prompt concise but descriptive
      5. Do not add explanations or meta-commentary - just the refined prompt
      
      Current prompt:
      "${currentPrompt}"
      ${conversationContext}
    `;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: `User request: ${userMessage}`,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
        },
      });

      if (response.text) {
        return response.text.trim();
      }
      throw new Error("Failed to iterate prompt");
    } catch (error) {
      console.warn("Gemini failed, falling back to Claude...", error);

      // Fallback to Claude
      const anthropic = getAnthropicClient();
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        system: systemInstruction,
        messages: [
          { role: "user", content: `User request: ${userMessage}` }
        ]
      });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      if (!text) throw new Error("No text returned from Claude");
      return text.trim();
    }
  });
};

/**
 * Story Update Result interface
 */
interface StoryUpdateResult {
  action: 'add_nodes' | 'modify_nodes' | 'delete_nodes' | 'update_connections' | 'full_regenerate';
  nodesToAdd?: StoryNode[];
  nodesToModify?: Partial<StoryNode & { id: string }>[];
  nodeIdsToDelete?: string[];
  newConnections?: { sourceId: string; targetId: string; label: string }[];
  message: string;
}

/**
 * Iterate on story structure based on natural language request.
 * Takes full context of current nodes and applies requested changes.
 */
export const iterateStory = async (
  masterPrompt: string,
  userRequest: string,
  nodesContext: string,
  worldSettings: WorldSettings,
  conversationHistory: ChatMessage[]
): Promise<StoryUpdateResult> => {
  return retryOperation(async () => {
    const ai = getGeminiClient();

    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      conversationHistory.slice(-6).forEach(msg => {
        conversationContext += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
      });
    }

    let gameSystemsInfo = '';
    if (worldSettings.useInventory) gameSystemsInfo += '- Inventory system enabled\n';
    if (worldSettings.useEconomy) gameSystemsInfo += '- Economy system (gold) enabled\n';
    if (worldSettings.useCombat) gameSystemsInfo += '- Combat system (HP) enabled\n';

    const systemInstruction = `
You are a story structure assistant for an interactive fiction game engine.
The user wants to modify their story based on natural language requests.

MASTER STORY PROMPT:
"${masterPrompt}"

GAME SYSTEMS:
${gameSystemsInfo || 'None enabled'}

CURRENT STORY STRUCTURE:
${nodesContext}
${conversationContext}

IMPORTANT RULES:
1. Analyze the user's request and determine what changes to make
2. Return a JSON object with the appropriate action and data
3. When adding nodes, generate unique IDs (use format: node_[timestamp]_[random])
4. Position new nodes logically (increment x by 300 for branches, y by 200 for depth)
5. Maintain story coherence with existing nodes
6. Keep node content concise but engaging (2-4 paragraphs)
7. Connection labels should be action-oriented (e.g., "Enter the cave", "Run away")

RESPONSE FORMAT (JSON only, no markdown):
{
  "action": "add_nodes" | "modify_nodes" | "delete_nodes" | "update_connections",
  "nodesToAdd": [{ id, title, content, position: {x, y}, connections: [{id, targetNodeId, label}], mediaType: "image" }],
  "nodesToModify": [{ id: "existing_node_id", title?: "new title", content?: "new content" }],
  "nodeIdsToDelete": ["node_id_1", "node_id_2"],
  "newConnections": [{ sourceId, targetId, label }],
  "message": "Human-readable summary of what was changed"
}

Only include the fields relevant to the action. The "message" field is always required.
`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: `User request: ${userRequest}`,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: {
                type: Type.STRING,
                enum: ["add_nodes", "modify_nodes", "delete_nodes", "update_connections"]
              },
              nodesToAdd: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    mediaType: { type: Type.STRING, enum: ["image", "video"] },
                    position: {
                      type: Type.OBJECT,
                      properties: {
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER }
                      },
                      required: ["x", "y"]
                    },
                    connections: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          targetNodeId: { type: Type.STRING },
                          label: { type: Type.STRING }
                        },
                        required: ["id", "targetNodeId", "label"]
                      }
                    }
                  },
                  required: ["id", "title", "content", "position"]
                }
              },
              nodesToModify: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["id"]
                }
              },
              nodeIdsToDelete: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              newConnections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sourceId: { type: Type.STRING },
                    targetId: { type: Type.STRING },
                    label: { type: Type.STRING }
                  },
                  required: ["sourceId", "targetId", "label"]
                }
              },
              message: { type: Type.STRING }
            },
            required: ["action", "message"]
          }
        },
      });

      if (response.text) {
        const result = JSON.parse(response.text) as StoryUpdateResult;
        return result;
      }
      throw new Error("Failed to iterate story");
    } catch (error) {
      console.warn("Gemini failed for iterateStory, falling back to Claude...", error);

      // Fallback to Claude
      const anthropic = getAnthropicClient();
      const claudeMsg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        system: systemInstruction + "\n\nRespond with valid JSON only, no markdown code blocks.",
        messages: [
          { role: "user", content: `User request: ${userRequest}` }
        ]
      });

      const claudeText = claudeMsg.content[0].type === 'text' ? claudeMsg.content[0].text : '';
      if (!claudeText) throw new Error("No response from Claude");

      // Clean up potential markdown
      let cleanJson = claudeText.trim();
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/gm, '');
      cleanJson = cleanJson.replace(/\n?```$/gm, '');

      const result = JSON.parse(cleanJson) as StoryUpdateResult;
      return result;
    }
  });
};