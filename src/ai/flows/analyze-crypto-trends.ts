// src/ai/flows/analyze-crypto-trends.ts
'use server';
/**
 * @fileOverview Analyzes recent cryptocurrency price movements to indicate upward or downward trends.
 *
 * - analyzeCryptoTrend - A function that analyzes cryptocurrency trends.
 * - AnalyzeCryptoTrendInput - The input type for the analyzeCryptoTrend function.
 * - AnalyzeCryptoTrendOutput - The return type for the analyzeCryptoTrend function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit'; // Changed from 'genkit/zod' to 'genkit'

const AnalyzeCryptoTrendInputSchema = z.object({
  cryptoSymbol: z.string().describe('The ticker symbol of the cryptocurrency (e.g., BTC, ETH).'),
  recentPriceData: z.string().describe('A string containing recent price data for the cryptocurrency.'),
});
export type AnalyzeCryptoTrendInput = z.infer<typeof AnalyzeCryptoTrendInputSchema>;

const AnalyzeCryptoTrendOutputSchema = z.object({
  trend: z.enum(['upward', 'downward', 'sideways']).describe('The trend of the cryptocurrency price movement.'),
  confidence: z.number().min(0).max(1).describe('A confidence score (0-1) indicating the reliability of the trend analysis.'),
  reason: z.string().describe('Explanation of why the model determined the trend.'),
});
export type AnalyzeCryptoTrendOutput = z.infer<typeof AnalyzeCryptoTrendOutputSchema>;

export async function analyzeCryptoTrend(input: AnalyzeCryptoTrendInput): Promise<AnalyzeCryptoTrendOutput> {
  return analyzeCryptoTrendFlow(input);
}

const analyzeCryptoTrendPrompt = ai.definePrompt({
  name: 'analyzeCryptoTrendPrompt',
  input: {schema: AnalyzeCryptoTrendInputSchema},
  output: {schema: AnalyzeCryptoTrendOutputSchema},
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `You are an AI assistant specializing in cryptocurrency trend analysis.

  Analyze the recent price movements of {{cryptoSymbol}} based on the following data and determine if the trend is upward, downward, or sideways.

  Recent Price Data: {{recentPriceData}}

  Consider factors such as price increases, decreases, volatility, and overall market conditions.

  Provide a confidence score (0-1) indicating the reliability of your trend analysis.
  Explain your reasoning for the determined trend.

  Ensure that the output is formatted according to the AnalyzeCryptoTrendOutputSchema.
  `,
   config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
});

const analyzeCryptoTrendFlow = ai.defineFlow(
  {
    name: 'analyzeCryptoTrendFlow',
    inputSchema: AnalyzeCryptoTrendInputSchema,
    outputSchema: AnalyzeCryptoTrendOutputSchema,
  },
  async (input): Promise<AnalyzeCryptoTrendOutput> => {
    try {
      const result = await analyzeCryptoTrendPrompt(input);
      if (!result || !result.output) {
        console.error(`analyzeCryptoTrendPrompt for ${input.cryptoSymbol} returned no output or undefined output. Result:`, result);
        const errorOutput: AnalyzeCryptoTrendOutput = {
          trend: 'sideways',
          confidence: 0.1,
          reason: `AI analysis for ${input.cryptoSymbol} failed to produce a valid output. Service may be temporarily unavailable or returned an empty response.`,
        };
        return errorOutput;
      }
      
      const parsedOutput = AnalyzeCryptoTrendOutputSchema.safeParse(result.output);
      if (!parsedOutput.success) {
        console.error(`AI output for ${input.cryptoSymbol} did not match schema. Errors:`, parsedOutput.error.flatten());
        const errorOutput: AnalyzeCryptoTrendOutput = {
          trend: 'sideways',
          confidence: 0.1,
          reason: `AI output for ${input.cryptoSymbol} was malformed. Details: ${parsedOutput.error.flatten().formErrors.join(', ')}`,
        };
        return errorOutput;
      }
      return parsedOutput.data;
    } catch (error) {
      // Log the original error for server-side debugging
      console.error(`Full error object in analyzeCryptoTrendFlow for ${input.cryptoSymbol}:`, error);

      let userFriendlyMessage = `AI analysis failed for ${input.cryptoSymbol}. The AI service might be temporarily unavailable or experiencing issues.`;

      if (error instanceof Error) {
         // You can customize this further based on specific error messages if needed
        if (error.message.includes('Service Unavailable') || error.message.includes('503')) {
            userFriendlyMessage = `AI service for ${input.cryptoSymbol} is currently unavailable. Please try again later.`;
        } else if (error.message.includes('Bad Gateway') || error.message.includes('502')) {
             userFriendlyMessage = `AI service for ${input.cryptoSymbol} experienced a temporary network issue. Please try again later.`;
        } else if (error.message.includes('fetch') && (error.message.toLowerCase().includes('failed to fetch') || error.message.includes('network error'))) {
          userFriendlyMessage = `Network error prevented AI analysis for ${input.cryptoSymbol}. Please check your internet connection.`;
        }
      }
      
      const errorOutput: AnalyzeCryptoTrendOutput = {
        trend: 'sideways',
        confidence: 0.1,
        reason: userFriendlyMessage,
      };
      return errorOutput; // Ensure a well-formed, serializable object is always returned
    }
  }
);
