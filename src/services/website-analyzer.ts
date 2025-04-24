'use server';

import axios from 'axios';
import * as cheerio from 'cheerio';
import {z} from 'zod';

const MAX_CONTENT_LENGTH = 1024 * 1024 * 2; // 2MB max content length

const WebsiteMetadataSchema = z.object({
  description: z.string(),
  keywords: z.array(z.string()),
  title: z.string(),
  hasApi: z.boolean().optional(),
});

export type WebsiteMetadata = z.infer<typeof WebsiteMetadataSchema>;

/**
 * Asynchronously analyzes a website to extract metadata.
 *
 * @param url The URL of the website to analyze.
 * @returns A promise that resolves to a WebsiteMetadata object containing the extracted metadata.
 */
export async function analyzeWebsite(url: string): Promise<WebsiteMetadata | null> {
  try {
    const response = await axios.get(url, {
      maxContentLength: MAX_CONTENT_LENGTH,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
    });

    if (response.status !== 200) {
      console.warn(`Failed to fetch ${url}: Status ${response.status}`);
      return null;
    }

    const html = response.data;
    const $ = cheerio.load(html);

    const title = $('title').text() || '';
    const description =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';
    const keywordsContent =
      $('meta[name="keywords"]').attr('content') ||
      $('meta[property="og:keywords"]').attr('content') ||
      '';
    const keywords = keywordsContent ? keywordsContent.split(',').map(k => k.trim()) : [];

    // Attempt to detect API presence (very basic check)
    const hasApi =
      !!$('link[rel="service"]').length ||
      html.toLowerCase().includes('api') ||
      html.toLowerCase().includes('restful');

    const metadata: WebsiteMetadata = {
      description,
      keywords,
      title,
      hasApi,
    };

    return metadata;
  } catch (error) {
    console.error(`Error analyzing website ${url}:`, error);
    return null;
  }
}
