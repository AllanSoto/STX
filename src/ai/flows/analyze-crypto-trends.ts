// src/ai/flows/analyze-crypto-trends.ts
'use server';
/**
 * @fileOverview Analyzes recent cryptocurrency price movements to indicate upward or downward trends.
 *
 * - analyzeCryptoTrend - A function that analyzes cryptocurrency trends.
 * - AnalyzeCryptoTrendInput - The input type for the analyzeCryptoTrend function.
 * - AnalyzeCryptoTrendOutput - The return type for the analyzeCryptoTrend function.
 */

// Not using Genkit for now to ensure stability and prevent "unexpected server response"
// import {ai, isAiOperational} from '@/ai/genkit'; 
import {z} from 'zod'; 

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


// Simplified Server Action to prevent "unexpected response" errors
export async function analyzeCryptoTrend(input: AnalyzeCryptoTrendInput): Promise<AnalyzeCryptoTrendOutput> {
  console.warn(`analyzeCryptoTrend called for ${input.cryptoSymbol}. AI analysis is temporarily providing a default 'sideways' trend to prevent server errors.`);
  
  // Always return a valid, hardcoded response to ensure the server action completes successfully.
  return {
    trend: 'sideways',
    confidence: 0.1, // Low confidence for default response
    reason: 'AI trend analysis is currently providing a default response due to ongoing investigations into server errors. Real-time AI analysis is temporarily disabled.',
  };
}

// All previous Genkit ai.definePrompt and ai.defineFlow code has been removed
// to ensure this Server Action is as simple as possible and doesn't rely on
// potentially problematic external calls or complex Genkit initializations
// that might lead to the "unexpected server response" error.
