'use client';

import {summarizeAiTool} from '@/ai/flows/ai-tool-summarization';
import {AiToolCard} from '@/components/ai-tool-card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {toast} from '@/hooks/use-toast';
import {useEffect, useState} from 'react';
import {v4 as uuidv4} from 'uuid';

interface SummarizeAiToolOutput {
  summary: string;
  category: string;
  tags: string[];
  apiAvailable: boolean;
  name: string;
}

function AiToolForm() {
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [aiToolSummary, setAiToolSummary] = useState<SummarizeAiToolOutput | undefined>(undefined);
  const [savedTools, setSavedTools] = useState<string[]>([]); // Array of tool names

  useEffect(() => {
    // Load saved tools from local storage on component mount
    const storedTools = localStorage.getItem('savedTools');
    if (storedTools) {
      setSavedTools(JSON.parse(storedTools));
    }
  }, []);

  useEffect(() => {
    // Save tools to local storage whenever savedTools changes
    localStorage.setItem('savedTools', JSON.stringify(savedTools));
  }, [savedTools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (savedTools.includes(name)) {
      toast({
        title: 'Duplicate Tool',
        description: 'This AI tool has already been saved.',
        variant: 'destructive',
      });
      return;
    }

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
        summary: summary,
        name: name,
        link: link,
        category: category,
        source: source,
      });

      setSavedTools(prevTools => [...prevTools, name]); // Add tool name to savedTools

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
    // TODO: Implement saving to your desired database or service here
    // Example:
    // await fetch('/api/save-data', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(data),
    // });
    console.log('Data to be saved:', data);
  };

  return (
    <section id="form" className="mb-8">
      <h2 className="text-xl font-semibold mb-2">Add New AI Tool:</h2>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <Label htmlFor="name">Tool Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter tool name"
            value={name}
            onChange={e => setName(e.target.value)}
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
            onChange={e => setLink(e.target.value)}
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
            onChange={e => setCategory(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="source">Source (e.g., Product Hunt, X)</Label>
          <Input
            id="source"
            type="text"
            placeholder="Enter source"
            value={source}
            onChange={e => setSource(e.target.value)}
            required
          />
        </div>
        <Button type="submit">Summarize AI Tool</Button>
      </form>

      {aiToolSummary && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">AI Tool Summary:</h2>
          <AiToolCard aiTool={aiToolSummary} />
        </div>
      )}
    </section>
  );
}

export default function FormPage() {
  return (
    <div className="container mx-auto p-4">
      <AiToolForm />
    </div>
  );
}
