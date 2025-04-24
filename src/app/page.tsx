'use client';

import {summarizeAiTool} from '@/ai/flows/ai-tool-summarization';
import {AiToolCard} from '@/components/ai-tool-card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Separator} from '@/components/ui/separator';
import {toast} from '@/hooks/use-toast';
import {useState} from 'react';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pocketbase.eulab.cloud');

export default function Home() {
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [aiToolSummary, setAiToolSummary] = useState<
    | {
        summary: string;
        category: string;
        tags: string[];
        apiAvailable: boolean;
      }
    | undefined
  >(undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const summary = await summarizeAiTool({
        name: name,
        link: link,
        category: category,
        source: source,
      });
      setAiToolSummary(summary);

      // Save the data here
      await saveData({
        summary: summary.summary,
        tags: summary.tags,
        apiAvailable: summary.apiAvailable,
        name: name,
        link: link,
        category: category,
        source: source,
      });

      toast({
        title: 'AI Tool Summarized and Saved!',
        description: 'The AI tool has been successfully summarized and saved.',
      });
    } catch (error: any) {
      console.error('Error summarizing AI tool:', error);
      toast({
        title: 'Error',
        description:
          error?.message || 'Failed to summarize AI tool. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const saveData = async (data: any) => {
    try {
      const record = await pb.collection('tools_ai').create(data);
      console.log('Data saved:', record);
    } catch (error: any) {
      console.error('Error saving to PocketBase:', error);
      toast({
        title: 'Error saving to PocketBase',
        description: error?.message || 'Failed to save AI tool data.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Tool Deck</h1>
      <p className="mb-4">
        Welcome to the AI Tool Deck, your go-to resource for discovering,
        organizing, and classifying AI tools.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4 mb-8">
        <div>
          <Label htmlFor="name">Tool Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter tool name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="link">Link to Website/GitHub</Label>
          <Input
            id="link"
            type="url"
            placeholder="Enter URL"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="category">Category (Optional)</Label>
          <Input
            id="category"
            type="text"
            placeholder="Enter category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="source">Source (e.g., Product Hunt, X)</Label>
          <Input
            id="source"
            type="text"
            placeholder="Enter source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
          />
        </div>
        <Button type="submit">Summarize AI Tool</Button>
      </form>

      <Separator className="my-4" />

      {aiToolSummary && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">
            AI Tool Summary:
          </h2>
          <AiToolCard aiTool={aiToolSummary} />
        </div>
      )}
    </div>
  );
}

