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
import {useRouter} from 'next/navigation';

const pb = new PocketBase('https://pocketbase.eulab.cloud');

interface AiTool {
  id: string;
  name: string;
  link: string;
  category: string;
  source: string;
  summary: SummarizeAiToolOutput;
  deleted: boolean;
  brand: string;
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
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editTool, setEditTool] = useState<AiTool | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedLink, setEditedLink] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedSource, setEditedSource] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedTags, setEditedTags] = useState('');
  const [editedApiAvailable, setEditedApiAvailable] = useState(false);
  const [editedBrand, setEditedBrand] = useState(''); // Added brand state
  const [deleteToolId, setDeleteToolId] = useState<string | null>(null);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [brand, setBrand] = useState(''); // Added brand state
  const [aiToolSummary, setAiToolSummary] = useState<SummarizeAiToolOutput | null>(null);
  const router = useRouter();

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
        deleted: record.deleted as boolean,
        brand: record.brand as string,
      }));

      setAiTools(typedRecords as AiTool[]);

      // Extract unique categories
      const uniqueCategories = [
        ...new Set(typedRecords.map(tool => tool.category)),
      ];
      setCategories(uniqueCategories);

      // Extract unique brands
      const uniqueBrands = [...new Set(typedRecords.map(tool => tool.brand))];
      setBrands(uniqueBrands);
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
    const brandFilter = selectedBrand ? tool.brand === selectedBrand : true;

    const matchesSearchTerm =
      tool.name.toLowerCase().includes(searchTerm) ||
      tool.category.toLowerCase().includes(searchTerm) ||
      tool.source.toLowerCase().includes(searchTerm) ||
      tool.brand.toLowerCase().includes(searchTerm) ||
      tool.summary.summary.toLowerCase().includes(searchTerm) ||
      tool.summary.category.toLowerCase().includes(searchTerm) ||
      tool.summary.tags.some(tag => tag.toLowerCase().includes(searchTerm));

    return categoryFilter && brandFilter && matchesSearchTerm;
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
        title: 'Tool AI Eliminato!',
        description: 'Il tool AI è stato eliminato con successo.',
      });
    } catch (error: any) {
      console.error('Errore durante l\'eliminazione del tool AI:', error);
      toast({
        title: 'Errore',
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
    setEditedBrand(tool.brand); // Set edited brand
    setOpen(true);
  };

  const handleSave = async () => {
    if (!editTool) return;

    try {
      const updatedSummary = {
        ...editTool.summary,
        summary: editedSummary,
        tags: editedTags.split(',').map(tag => tag.trim()),
        apiAvailable: editedApiAvailable,
      };

      await pb.collection('tools_ai').update(editTool.id, {
        name: editedName,
        link: editedLink,
        category: editedCategory,
        source: editedSource,
        summary: updatedSummary,
        brand: editedBrand, // Save edited brand
      });

      setOpen(false);
      toast({
        title: 'Tool AI Aggiornato!',
        description: 'Il tool AI è stato aggiornato con successo.',
      });
      fetchAiTools();
    } catch (error: any) {
      console.error('Errore durante l\'aggiornamento del tool AI:', error);
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
    setBrand(''); // Reset brand
    setAiToolSummary(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const summary = await summarizeAiTool({
        name: name,
        link: link,
        category: category,
        source: source,
      });

      // Save the data here
      await pb.collection('tools_ai').create({
        name: name,
        link: link,
        category: category,
        source: source,
        summary: summary,
        deleted: false,
        brand: brand, // Save brand
      });

      toast({
        title: 'Tool AI Aggiunto!',
        description: 'Il tool AI è stato aggiunto con successo.',
      });
      setOpenFormModal(false);
      router.push('/');
    } catch (error: any) {
      console.error('Errore durante il riassunto del tool AI:', error);
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
            <h2 className="text-xl font-semibold">Lista Tool AI:</h2>
            <Button onClick={handleOpenFormModal}>Aggiungi Tool</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between mb-4">
            <Input
              type="text"
              placeholder="Cerca tool AI..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="mb-4"
            />
            <div className="flex flex-wrap items-center space-x-2 mt-4 md:mt-0">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedCategory === null && selectedBrand === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedBrand(null);
                }}
              >
                Tutti
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedBrand(null);
                  }}
                >
                  {category}
                </button>
              ))}
              {brands.map(brand => (
                <button
                  key={brand}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedBrand === brand
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => {
                    setSelectedBrand(brand);
                    setSelectedCategory(null);
                  }}
                >
                  {brand}
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
                      <span className="font-semibold">Brand:</span> {tool.brand}
                    </div>
                    <div>
                      <span className="font-semibold">API Disponibile:</span>{' '}
                      {tool.summary.apiAvailable ? 'Si' : 'No'}
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
              <DialogTitle>Modifica Tool AI</DialogTitle>
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
                <Label htmlFor="link">Link al sito</Label>
                <Input
                  id="link"
                  value={editedLink}
                  onChange={e => setEditedLink(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={editedCategory}
                  onChange={e => setEditedCategory(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="source">Fonte</Label>
                <Input
                  id="source"
                  value={editedSource}
                  onChange={e => setEditedSource(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={editedBrand}
                  onChange={e => setEditedBrand(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="summary">Riassunto</Label>
                <Textarea
                  id="summary"
                  value={editedSummary}
                  onChange={e => setEditedSummary(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags">Tag (separati da virgola)</Label>
                <Input
                  id="tags"
                  value={editedTags}
                  onChange={e => setEditedTags(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="apiAvailable">API Disponibile</Label>
                <Checkbox
                  id="apiAvailable"
                  checked={editedApiAvailable}
                  onCheckedChange={e => setEditedApiAvailable(!!e)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Annulla</Button>
              </DialogClose>
              <Button onClick={handleSave}>Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. Sei sicuro di voler eliminare
                questo tool?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOpenDeleteAlert(false)}>
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={openFormModal} onOpenChange={setOpenFormModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Nuovo Tool AI</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div>
                <Label htmlFor="name">Nome del tool</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Inserisci il nome del tool"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="link">Link al sito web/GitHub</Label>
                <Input
                  id="link"
                  type="url"
                  placeholder="Inserisci l'URL"
                  value={link}
                  onChange={e => setLink(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria (opzionale)</Label>
                <Input
                  id="category"
                  type="text"
                  placeholder="Inserisci la categoria"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="source">Fonte (es. Product Hunt, X)</Label>
                <Input
                  id="source"
                  type="text"
                  placeholder="Inserisci la fonte"
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  type="text"
                  placeholder="Inserisci il brand"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                />
              </div>
              <Button type="submit">Riassumi Tool AI</Button>
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
