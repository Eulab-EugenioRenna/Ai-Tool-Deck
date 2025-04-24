'use client';

import {summarizeAiTool} from '@/ai/flows/ai-tool-summarization';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {toast} from '@/hooks/use-toast';
import {useState} from 'react';
import {useRouter} from 'next/navigation'; // Import useRouter

function AiToolForm() {
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [savedTools, setSavedTools] = useState<string[]>([]); // Array of tool names
  const router = useRouter(); // Initialize useRouter

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

      router.push('/'); // Redirect to the AI Tool List page
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
