'use client';

import {summarizeAiTool} from '@/ai/flows/ai-tool-summarization';
import {AiToolCard} from '@/components/ai-tool-card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Separator} from '@/components/ui/separator';
import {toast} from '@/hooks/use-toast';
import {useEffect, useState} from 'react';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pocketbase.eulab.cloud');

interface AiTool {
  id: string;
  name: string;
  link: string;
  category: string;
  source: string;
  summary: SummarizeAiToolOutput;
}

interface SummarizeAiToolOutput {
  summary: string;
  category: string;
  tags: string[];
  apiAvailable: boolean;
  name: string;
}

function AiToolForm({onSave}: {onSave: () => void}) {
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [aiToolSummary, setAiToolSummary] = useState<SummarizeAiToolOutput | undefined>(undefined);

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

      await saveData({
        name: name,
        link: link,
        category: category,
        source: source,
        summary: summary,
      });

      toast({
        title: 'AI Tool Summarized and Saved!',
        description: 'The AI tool has been successfully summarized and saved.',
      });

      onSave();
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

function AiToolList() {
  const [aiTools, setAiTools] = useState<AiTool[]>([]);

  useEffect(() => {
    const fetchAiTools = async () => {
      try {
        const records = await pb.collection('tools_ai').getFullList({
          sort: '-created',
        });

        const typedRecords = records.map(record => ({
          id: record.id,
          name: record.name,
          link: record.link,
          category: record.category,
          source: record.source,
          summary: record.summary as SummarizeAiToolOutput,
        }));

        setAiTools(typedRecords as AiTool[]);
      } catch (error: any) {
        console.error('Error fetching AI tools:', error);
        toast({
          title: 'Error',
          description:
            error?.message || 'Failed to fetch AI tools. Please try again.',
          variant: 'destructive',
        });
      }
    };

    fetchAiTools();
  }, []);

  const handleToolSaved = () => {
    fetchAiTools();
  }

  const fetchAiTools = async () => {
    try {
      const records = await pb.collection('tools_ai').getFullList({
        sort: '-created',
      });

      const typedRecords = records.map(record => ({
        id: record.id,
        name: record.name,
        link: record.link,
        category: record.category,
        source: record.source,
        summary: record.summary as SummarizeAiToolOutput,
      }));

      setAiTools(typedRecords as AiTool[]);
    } catch (error: any) {
      console.error('Error fetching AI tools:', error);
      toast({
        title: 'Error',
        description:
          error?.message || 'Failed to fetch AI tools. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <section id="list">
      <h2 className="text-xl font-semibold mb-2">AI Tool List:</h2>
      <div className="grid gap-4">
        {aiTools.map(tool => (
          <AiToolCard
            key={tool.id}
            aiTool={tool.summary}
            title={tool.name}
            subtitle={tool.category}
          />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [key, setKey] = useState(0);

  const handleSave = () => {
    setKey(key + 1);
  }

  return (
    <div className="container mx-auto p-4">
      <nav className="bg-background border-b p-4 mb-8">
        <h1 className="text-2xl font-bold">AI Tool Deck</h1>
      </nav>

      <AiToolForm onSave={handleSave} />

      <Separator className="my-4" />

      <AiToolList key={key} />
    </div>
  );
}
