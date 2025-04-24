'use server';

import {z} from 'zod';

const GithubRepoSchema = z.object({
  owner: z.string(),
  repo: z.string(),
});

async function getGithubMetadata(owner: string, repo: string) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        // Replace with your personal access token for higher rate limits if needed
        // Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
      next: {
        revalidate: 3600, // Revalidate every hour
      },
    });

    if (!response.ok) {
      console.error(
        `GitHub API error for ${owner}/${repo}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();

    // Basic info
    const description = data.description || 'No description provided.';
    const keywords = data.topics || [];
    const title = data.name || 'No title provided.';
    const stars = data.stargazers_count || 0;

    return {
      description,
      keywords,
      title,
      stars,
    };
  } catch (error) {
    console.error(`Failed to fetch GitHub metadata for ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Interface representing the metadata extracted from a GitHub repository.
 */
export interface GithubMetadata {
  /**
   * A brief description of the repository.
   */
  description: string;
  /**
   * Keywords associated with the repository.
   */
  keywords: string[];
  /**
   * The title of the repository.
   */
  title: string;
  /**
   * Indicates the number of stars the repository has.
   */
  stars: number;
}

/**
 * Asynchronously analyzes a GitHub repository to extract metadata.
 *
 * @param url The URL of the GitHub repository to analyze.
 * @returns A promise that resolves to a GithubMetadata object containing the extracted metadata.
 */
export async function analyzeGithubRepo(url: string): Promise<GithubMetadata | null> {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== 'github.com') {
      console.warn(`URL ${url} is not a GitHub URL.`);
      return null;
    }

    const pathSegments = parsedUrl.pathname.slice(1).split('/');
    if (pathSegments.length !== 2) {
      console.warn(`Invalid GitHub URL format: ${url}`);
      return null;
    }

    const [owner, repo] = pathSegments;

    // Validate owner and repo using Zod schema
    GithubRepoSchema.parse({owner, repo});

    const metadata = await getGithubMetadata(owner, repo);
    return metadata;
  } catch (error) {
    console.error(`Error analyzing GitHub repo ${url}:`, error);
    return null;
  }
}
