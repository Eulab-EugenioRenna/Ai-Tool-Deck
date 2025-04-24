'use client';

import {AiToolCard} from '@/components/ai-tool-card';
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

function AiToolList() {
  const [aiTools, setAiTools] = useState<AiTool[]>([]);

  useEffect(() => {
    const fetchAiTools = async () => {
      try {
        const records = await pb.collection('tools_ai').getList(1, 5000, {
          sort: '-created',
        });

        const typedRecords = records.items.map(record => ({
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

    // Subscribe to changes in the 'tools_ai' collection
    pb.collection('tools_ai').subscribe('*', function (e) {
      console.log('PocketBase subscription event:', e);
      fetchAiTools(); // Refresh the AI tools list
    });

    return () => {
      pb.collection('tools_ai').unsubscribe();
    };
  }, []);

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
  return (
    <div className="container mx-auto p-4">
      <AiToolList />
    </div>
  );
}
