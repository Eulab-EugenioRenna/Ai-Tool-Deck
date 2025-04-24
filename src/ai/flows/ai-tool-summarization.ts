'use server';
/**
 * @fileOverview Summarizes an AI tool based on provided information.
 *
 * - summarizeAiTool - A function that summarizes an AI tool.
 * - SummarizeAiToolInput - The input type for the summarizeAiTool function.
 * - SummarizeAiToolOutput - The return type for the summarizeAiTool function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {analyzeWebsite, WebsiteMetadata} from '@/services/website-analyzer';
import {analyzeGithubRepo, GithubMetadata} from '@/services/github-analyzer';

const SummarizeAiToolInputSchema = z.object({
  name: z.string().describe('The name of the AI tool.'),
  link: z.string().describe('The link to the AI tool website or GitHub repository.'),
  category: z.string().optional().describe('The category of the AI tool (optional).'),
  source: z.string().describe('The source where the AI tool was discovered (e.g., Product Hunt, Twitter).'),
});
export type SummarizeAiToolInput = z.infer<typeof SummarizeAiToolInputSchema>;

const SummarizeAiToolOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the AI tool (max 3 lines).'),
  category: z.string().describe('The category of the AI tool.'),
  tags: z.array(z.string()).describe('Tags associated with the AI tool.'),
  apiAvailable: z.boolean().describe('Whether the tool has an API available'),
});
export type SummarizeAiToolOutput = z.infer<typeof SummarizeAiToolOutputSchema>;

export async function summarizeAiTool(input: SummarizeAiToolInput): Promise<SummarizeAiToolOutput> {
  return summarizeAiToolFlow(input);
}

const summarizeAiToolPrompt = ai.definePrompt({
  name: 'summarizeAiToolPrompt',
  input: {
    schema: z.object({
      name: z.string().describe('The name of the AI tool.'),
      link: z.string().describe('The link to the AI tool website or GitHub repository.'),
      category: z.string().optional().describe('The category of the AI tool (optional).'),
      source: z.string().describe('The source where the AI tool was discovered (e.g., Product Hunt, Twitter).'),
      websiteDescription: z.string().optional().describe('Website description, if available'),
      websiteKeywords: z.string().optional().describe('Website keywords, if available'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A concise summary of the AI tool (max 3 lines).'),
      category: z.string().describe('The category of the AI tool.'),
      tags: z.array(z.string()).describe('Tags associated with the AI tool.'),
      apiAvailable: z.boolean().describe('Whether the tool has an API available'),
    }),
  },
  prompt: `You are an AI agent specializing in discovering, organizing, and classifying AI tools. Create a concise summary of the AI tool (max 3 lines), determine its category and relevant tags, and determine if it has an API.

Tool Name: {{name}}
Link: {{link}}
Category (if known): {{category}}
Source: {{source}}
Website Description: {{websiteDescription}}
Website Keywords: {{websiteKeywords}}

Summary:`, // Removed Handlebars await function
});

const summarizeAiToolFlow = ai.defineFlow<
  typeof SummarizeAiToolInputSchema,
  typeof SummarizeAiToolOutputSchema
>(
  {
    name: 'summarizeAiToolFlow',
    inputSchema: SummarizeAiToolInputSchema,
    outputSchema: SummarizeAiToolOutputSchema,
  },
  async input => {
    let websiteMetadata: WebsiteMetadata | GithubMetadata | null = null;
    try {
      if (input.link.includes('github.com')) {
        websiteMetadata = await analyzeGithubRepo(input.link);
      } else {
        websiteMetadata = await analyzeWebsite(input.link);
      }
    } catch (e) {
      console.warn(
        `Failed to analyze website for AI tool ${input.name} at ${input.link}: ${e}`
      );
    }

    const {output} = await summarizeAiToolPrompt({
      ...input,
      websiteDescription: websiteMetadata?.description ?? '',
      websiteKeywords: websiteMetadata?.keywords?.join(',') ?? '',
    });
    return output!;
  }
);
