'use client';

import {AiToolCard} from '@/components/ai-tool-card';
import {toast} from '@/hooks/use-toast';
import {useEffect, useState} from 'react';
import PocketBase from 'pocketbase';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Edit, Trash} from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editTool, setEditTool] = useState<AiTool | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedLink, setEditedLink] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedSource, setEditedSource] = useState('');
  const [editedSummary, setEditedSummary] = useState('');

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

        // Extract unique categories
        const uniqueCategories = [
          ...new Set(typedRecords.map(tool => tool.category)),
        ];
        setCategories(uniqueCategories);
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

  const filteredTools = aiTools.filter(tool => {
    const searchTerm = search.toLowerCase();
    const categoryFilter = selectedCategory
      ? tool.category === selectedCategory
      : true;

    const matchesSearchTerm =
      tool.name.toLowerCase().includes(searchTerm) ||
      tool.category.toLowerCase().includes(searchTerm) ||
      tool.source.toLowerCase().includes(searchTerm) ||
      tool.summary.summary.toLowerCase().includes(searchTerm) ||
      tool.summary.category.toLowerCase().includes(searchTerm) ||
      tool.summary.tags.some(tag => tag.toLowerCase().includes(searchTerm));

    return categoryFilter && matchesSearchTerm;
  });

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('tools_ai').delete(id);
      toast({
        title: 'AI Tool Deleted!',
        description: 'The AI tool has been successfully deleted.',
      });
    } catch (error: any) {
      console.error('Error deleting AI tool:', error);
      toast({
        title: 'Error',
        description:
          error?.message || 'Failed to delete AI tool. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (tool: AiTool) => {
    setEditTool(tool);
    setEditedName(tool.name);
    setEditedLink(tool.link);
    setEditedCategory(tool.category);
    setEditedSource(tool.source);
    setEditedSummary(tool.summary.summary);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!editTool) return;

    try {
      await pb.collection('tools_ai').update(editTool.id, {
        name: editedName,
        link: editedLink,
        category: editedCategory,
        source: editedSource,
        'summary.summary': editedSummary,
      });

      setOpen(false);
      toast({
        title: 'AI Tool Updated!',
        description: 'The AI tool has been successfully updated.',
      });
    } catch (error: any) {
      console.error('Error updating AI tool:', error);
      toast({
        title: 'Error',
        description:
          error?.message || 'Failed to update AI tool. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <section id="list">
      <h2 className="text-xl font-semibold mb-2">AI Tool List:</h2>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <Input
          type="text"
          placeholder="Search AI tools..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4 md:mb-0"
        />
        <div className="flex flex-wrap items-center space-x-2 mt-4 md:mt-0">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedCategory === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => setSelectedCategory(category)}
              style={{marginLeft: '0.5rem', marginBottom: '0.5rem'}}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="masonry-grid">
        {filteredTools.map(tool => (
          <div key={tool.id} className="masonry-grid-item">
            <AiToolCard
              aiTool={tool.summary}
              title={tool.name}
              subtitle={tool.category}
            >
              <div className="flex justify-end mt-2">
                <Button size="icon" variant="ghost" onClick={() => handleEdit(tool)} className="text-primary hover:bg-accent">
                  <Edit className="h-4 w-4"/>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(tool.id)}
                  className="text-destructive hover:bg-accent"
                >
                  <Trash className="h-4 w-4"/>
                </Button>
              </div>
            </AiToolCard>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit AI Tool</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editedName}
                onChange={e => setEditedName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="link">Link</Label>
              <Input
                id="link"
                value={editedLink}
                onChange={e => setEditedLink(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={editedCategory}
                onChange={e => setEditedCategory(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={editedSource}
                onChange={e => setEditedSource(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={editedSummary}
                onChange={e => setEditedSummary(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

