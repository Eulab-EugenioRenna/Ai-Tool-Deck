'use client';

import {summarizeAiTool} from '@/ai/flows/ai-tool-summarization';
import {useEffect, useState, useCallback} from 'react';
import PocketBase from 'pocketbase';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import {Edit, Trash, Search} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {toast} from '@/hooks/use-toast';
import {Navbar} from '@/components/navbar';

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
  const [editedTags, setEditedTags] = useState('');
  const [editedApiAvailable, setEditedApiAvailable] = useState(false);
  const [deleteToolId, setDeleteToolId] = useState<string | null>(null);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [webSearchResults, setWebSearchResults] = useState<string[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [summaryFromSearch, setSummaryFromSearch] = useState('');
  const [webSearchLink, setWebSearchLink] = useState('');

  const fetchAiTools = useCallback(async () => {
    try {
      const records = await pb.collection('tools_ai').getList(1, 5000, {
        sort: '-created',
        filter: 'deleted = false',
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
  }, []);

  useEffect(() => {
    fetchAiTools();

    // Subscribe to changes in the 'tools_ai' collection
    pb.collection('tools_ai').subscribe('*', function (e) {
      console.log('PocketBase subscription event:', e);
      fetchAiTools(); // Refresh the AI tools list
    });

    return () => {
      pb.collection('tools_ai').unsubscribe();
    };
  }, [fetchAiTools]);

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

  const confirmDelete = (id: string) => {
    setDeleteToolId(id);
    setOpenDeleteAlert(true);
  };

  const handleDelete = async () => {
    if (!deleteToolId) return;

    try {
      await pb.collection('tools_ai').update(deleteToolId, {
        deleted: true,
      });
      setAiTools(aiTools.filter(tool => tool.id !== deleteToolId));
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
    } finally {
      setOpenDeleteAlert(false);
      setDeleteToolId(null);
    }
  };

  const handleEdit = (tool: AiTool) => {
    setEditTool(tool);
    setEditedName(tool.name);
    setEditedLink(tool.link);
    setEditedCategory(tool.category);
    setEditedSource(tool.source);
    setEditedSummary(tool.summary.summary);
    setEditedTags(tool.summary.tags.join(', '));
    setEditedApiAvailable(tool.summary.apiAvailable);
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
        summary: {
          ...editTool.summary,
          summary: editedSummary,
          tags: editedTags.split(',').map(tag => tag.trim()),
          apiAvailable: editedApiAvailable,
        },
      });

      setOpen(false);
      toast({
        title: 'AI Tool Updated!',
        description: 'The AI tool has been successfully updated.',
      });
      fetchAiTools();
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

  const handleOpenFormModal = () => {
    setOpenFormModal(true);
    setName('');
    setLink('');
    setCategory('');
    setSource('');
    setWebSearchResults([]);
    setSummaryFromSearch('');
    setWebSearchLink('');
  };

  const handleSearchWeb = async () => {
    setLoadingSearch(true);
    setWebSearchResults([]);
    setSummaryFromSearch('');
    setWebSearchLink('');

    try {
      const searchQuery = name || link;
      if (!searchQuery) {
        toast({
          title: 'Error',
          description: 'Please enter a tool name or link to search the web.',
          variant: 'destructive',
        });
        setLoadingSearch(false);
        return;
      }

      // Mock web search results for demonstration purposes
      const mockResults = [
        `https://example.com/ai-tools/${name.toLowerCase().replace(/\s/g, '-')}`,
        `https://blog.example.com/review-${name.toLowerCase().replace(/\s/g, '-')}`,
        `https://github.com/ai-tool-repos/${name.toLowerCase().replace(/\s/g, '-')}`,
      ];

      setWebSearchResults(mockResults);

      // Simulate fetching the first result's content
      const fetchedLink = mockResults[0];
      setWebSearchLink(fetchedLink);
      setSummaryFromSearch(`Summary from ${fetchedLink}: This is a summary of the AI tool.`);
    } catch (error: any) {
      console.error('Error searching the web:', error);
      toast({
        title: 'Error',
        description:
          error?.message || 'Failed to search the web. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const summary = await summarizeAiTool({
        name: name,
        link: link || webSearchLink,
        category: category,
        source: source,
      });

      // Save the data here
      await pb.collection('tools_ai').create({
        name: name,
        link: link || webSearchLink,
        category: category,
        source: source,
        summary: summary,
      });

      toast({
        title: 'AI Tool Summarized and Saved!',
        description: 'The AI tool has been successfully summarized and saved.',
      });
      setOpenFormModal(false);
      fetchAiTools();
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

  return (
    <div>
      <Navbar />
      <div className="container mx-auto p-4">
        <section id="list">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">AI Tool List:</h2>
            <Button onClick={handleOpenFormModal}>Add Tool</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between mb-4">
            <Input
              type="text"
              placeholder="Search AI tools..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="mb-4"
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
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <div className="masonry-grid">
            {filteredTools.map(tool => (
              <div key={tool.id} className="masonry-grid-item">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {tool.link ? (
                        <a href={tool.link} target="_blank" rel="noopener noreferrer">
                          {tool.name}
                        </a>
                      ) : (
                        tool.name
                      )}
                    </CardTitle>
                    <CardDescription>{tool.category}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{tool.summary.summary}</CardDescription>
                    <div className="mb-4">
                      {tool.summary.tags.map(tag => (
                        <Badge key={tag} className="mr-2">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div>
                      <span className="font-semibold">API Available:</span>{' '}
                      {tool.summary.apiAvailable ? 'Yes' : 'No'}
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(tool)}
                        className="text-primary hover:bg-accent"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => confirmDelete(tool.id)}
                        className="text-destructive hover:bg-accent"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>

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
              <div className="grid gap-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={editedTags}
                  onChange={e => setEditedTags(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="apiAvailable">API Available</Label>
                <Checkbox
                  id="apiAvailable"
                  checked={editedApiAvailable}
                  onCheckedChange={e => setEditedApiAvailable(e)}
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

        <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Are you sure you want to delete
                this tool?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOpenDeleteAlert(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={openFormModal} onOpenChange={setOpenFormModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New AI Tool</DialogTitle>
            </DialogHeader>
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
              <Button
                type="button"
                onClick={handleSearchWeb}
                disabled={loadingSearch}
              >
                Search Web
              </Button>
              {loadingSearch && <p>Searching the web...</p>}
              {webSearchResults.length > 0 && (
                <div>
                  <h3>Web Search Results</h3>
                  <ul>
                    {webSearchResults.map((result, index) => (
                      <li key={index}>
                        <a href={result} target="_blank" rel="noopener noreferrer">
                          {result}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summaryFromSearch && (
                <div>
                  <h3>Web Search Results</h3>
                  <p>{summaryFromSearch}</p>
                </div>
              )}
              <Button type="submit">Summarize AI Tool</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function Home() {
  return <AiToolList />;
}
