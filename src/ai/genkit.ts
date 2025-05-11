
import { genkit, type Plugin } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

let googleAiPluginInstance: Plugin<any> | null = null;
let aiEnabled = false;

if (process.env.GOOGLE_API_KEY) {
  try {
    // Attempt to create the plugin instance.
    // Note: googleAI() might not throw an error on instantiation for a missing key,
    // but rather on first use. This structure is a precaution.
    googleAiPluginInstance = googleAI();
    aiEnabled = true;
  } catch (e) {
    console.error("Error initializing GoogleAI plugin. AI features may be degraded or unavailable.", e);
    aiEnabled = false;
  }
} else {
  console.warn(
    'GOOGLE_API_KEY is not set in the server environment. Google AI features will be unavailable.'
  );
  aiEnabled = false;
}

const pluginsToUse: Plugin<any>[] = [];
if (googleAiPluginInstance) {
  pluginsToUse.push(googleAiPluginInstance);
}

// Initialize Genkit with plugins that were successfully prepared.
// If pluginsToUse is empty, Genkit initializes without model providers from Google AI.
export const ai = genkit({
  plugins: pluginsToUse,
  // Set a default model only if the Google AI plugin is successfully loaded and enabled.
  // Otherwise, prompts will need to specify a model or Genkit will error if no model provider is found.
  ...(aiEnabled && pluginsToUse.length > 0 ? { model: 'googleai/gemini-1.5-flash-latest' } : {})
});

/**
 * Checks if the AI system is configured and operational.
 * This means the API key was present and the Google AI plugin was presumably loaded.
 * @returns {boolean} True if AI is considered operational, false otherwise.
 */
export const isAiOperational = (): boolean => {
  // aiEnabled reflects if the API key was found and plugin instantiation didn't immediately throw.
  // pluginsToUse.length > 0 confirms a plugin was actually added.
  return aiEnabled && pluginsToUse.length > 0;
};
