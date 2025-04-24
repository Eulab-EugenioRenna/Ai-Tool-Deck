'use client';

import {summarizeAiTool} from '@/ai/flows/ai-tool-summarization';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {toast} from '@/hooks/use-toast';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pocketbase.eulab.cloud');

function AiToolForm() {
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const summary = await summarizeAiTool({
        name: name,
        link: link,
        category: category,
        source: source,
      });

      // Save the data to PocketBase
      await saveData({
        summary: summary,
        name: name,
        link: link,
        category: category,
        source: source,
      });

      toast({
        title: 'AI Tool Summarized and Saved!',
        description: 'The AI tool has been successfully summarized and saved.',
      });

      router.push('/');
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
      const record = await pb.collection('tools_ai').create({
        name: data.name,
        link: data.link,
        category: data.category,
        source: data.source,
        summary: data.summary,
      });

      console.log('Data saved to PocketBase:', record);
    } catch (error: any) {
      console.error('Error saving to PocketBase:', error);
      toast({
        title: 'Error Saving to Database',
        description:
          error?.message || 'Failed to save data to the database. Please try again.',
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
