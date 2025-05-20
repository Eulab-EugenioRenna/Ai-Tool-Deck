
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
} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import {Edit, Trash, Loader2, RefreshCw, Search as SearchIcon} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {toast} from '@/hooks/use-toast';
import {Navbar} from '@/components/navbar';
import { Combobox } from '@/components/ui/combobox'; // Changed from Select

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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedBrandsFilter, setSelectedBrandsFilter] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editTool, setEditTool] = useState<AiTool | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedLink, setEditedLink] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedSource, setEditedSource] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedTags, setEditedTags] = useState('');
  const [editedApiAvailable, setEditedApiAvailable] = useState(false);
  const [editedBrand, setEditedBrand] = useState('');
  const [deleteToolId, setDeleteToolId] = useState<string | null>(null);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);
  // Form states
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [brand, setBrand] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const fetchAiTools = useCallback(async () => {
    try {
      const allRecords = await pb.collection('tools_ai').getFullList({
         filter: 'deleted = false',
         fields: 'id,category,brand,name,link,source,summary,deleted',
         sort: '-created',
      });

      const typedRecords = allRecords.map(record => ({
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

      const uniqueCategoriesSet = new Set<string>();
      const uniqueBrandsSet = new Set<string>();
      typedRecords.forEach(tool => {
        if (tool.category) uniqueCategoriesSet.add(tool.category);
        if (tool.brand) uniqueBrandsSet.add(tool.brand);
      });
      setCategories(Array.from(uniqueCategoriesSet).sort());
      setBrands(Array.from(uniqueBrandsSet).sort());

    } catch (error: any) {
      console.error('Error fetching AI tools:', error);
      toast({
        title: 'Errore',
        description:
          error?.data?.message || error?.message || 'Impossibile recuperare i tool AI. Riprova.',
        variant: 'destructive',
      });
    }
  }, []);

  useEffect(() => {
    fetchAiTools();
    const unsubscribe = pb.collection('tools_ai').subscribe('*', function (e) {
      console.log('PocketBase subscription event:', e.action, e.record.id);
       if (e.action === 'create') {
         setAiTools((prevTools) => [{ ...e.record, summary: e.record.summary as SummarizeAiToolOutput } as AiTool, ...prevTools]);
       } else if (e.action === 'update') {
         setAiTools((prevTools) =>
           prevTools.map((tool) =>
             tool.id === e.record.id ? { ...e.record, summary: e.record.summary as SummarizeAiToolOutput } as AiTool : tool
           )
         );
       } else if (e.action === 'delete') {
         setAiTools((prevTools) => prevTools.filter((tool) => tool.id !== e.record.id));
       }
       fetchAiTools(); // Refetch all to update categories/brands lists
    });
     return () => {
       console.log('Unsubscribing from PocketBase');
       pb.collection('tools_ai').unsubscribe(); // Ensure unsubscribe is called without arguments if that's the correct API
     };
  }, [fetchAiTools]);

  const filteredTools = aiTools.filter(tool => {
    const searchTermLower = search.toLowerCase();
    const categoryFilterMatch = selectedCategoryFilter
      ? tool.category?.toLowerCase() === selectedCategoryFilter.toLowerCase()
      : true;
    const brandFilterMatch =
      selectedBrandsFilter.length > 0 ? selectedBrandsFilter.some(b => tool.brand?.toLowerCase() === b.toLowerCase()) : true;

    const matchesSearchTerm =
      tool.name?.toLowerCase().includes(searchTermLower) ||
      tool.link?.toLowerCase().includes(searchTermLower) ||
      tool.category?.toLowerCase().includes(searchTermLower) ||
      tool.source?.toLowerCase().includes(searchTermLower) ||
      tool.brand?.toLowerCase().includes(searchTermLower) ||
      tool.summary?.summary?.toLowerCase().includes(searchTermLower) ||
      tool.summary?.category?.toLowerCase().includes(searchTermLower) ||
      (tool.summary?.tags && tool.summary.tags.some(tag => tag.toLowerCase().includes(searchTermLower)));

    return categoryFilterMatch && brandFilterMatch && matchesSearchTerm;
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
      toast({
        title: 'Tool AI Eliminato!',
        description: 'Il tool AI è stato contrassegnato come eliminato.',
      });
    } catch (error: any) {
      console.error('Errore durante l\'eliminazione del tool AI:', error);
      toast({
        title: 'Errore',
        description:
          error?.data?.message || error?.message || 'Impossibile eliminare il tool AI. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setOpenDeleteAlert(false);
      setDeleteToolId(null);
    }
  };

  const handleEdit = (tool: AiTool) => {
    setEditTool(tool);
    setEditedName(tool.name || '');
    setEditedLink(tool.link || '');
    setEditedCategory(tool.category || '');
    setEditedSource(tool.source || '');
    setEditedSummary(tool.summary?.summary || '');
    setEditedTags(tool.summary?.tags?.join(', ') || '');
    setEditedApiAvailable(tool.summary?.apiAvailable || false);
    setEditedBrand(tool.brand || '');
    setOpenEditDialog(true);
  };

  const handleRegenerateSummary = async () => {
    if (!editTool) return;
    setIsRegenerating(true);
    try {
      const summaryOutput = await summarizeAiTool({
        name: editedName,
        link: editedLink,
        category: editedCategory, // Pass the potentially user-modified category
        source: editedSource,
      });
      setEditedSummary(summaryOutput.summary);
      setEditedCategory(summaryOutput.category); // Update category based on AI's output
      setEditedTags(summaryOutput.tags.join(', '));
      setEditedApiAvailable(summaryOutput.apiAvailable);
      toast({
        title: 'Riassunto Rigenerato!',
        description: 'Il riassunto, la categoria, i tag e la disponibilità API sono stati aggiornati.',
      });
    } catch (error: any) {
        console.error('Errore durante la rigenerazione del riassunto:', error);
        toast({
            title: 'Errore di Rigenerazione',
            description:
                error?.data?.message || error?.message || 'Impossibile rigenerare il riassunto. Riprova.',
            variant: 'destructive',
        });
    } finally {
        setIsRegenerating(false);
    }
  };

  const handleSave = async () => {
    if (!editTool) return;
    setIsSubmitting(true);
    try {
      const updatedSummary: SummarizeAiToolOutput = {
        ...(editTool.summary || {}), // Preserve existing non-updated summary fields if any
        summary: editedSummary,
        tags: editedTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        apiAvailable: editedApiAvailable,
        category: editedCategory, // Use the (potentially AI updated) category
        name: editedName, // Ensure name from input is used
      };
      const dataToUpdate: Partial<AiTool> & { summary: SummarizeAiToolOutput } = {
        name: editedName,
        link: editedLink,
        category: editedCategory, // Persist the final category
        source: editedSource,
        summary: updatedSummary,
        brand: editedBrand,
      };
      await pb.collection('tools_ai').update(editTool.id, dataToUpdate);
      setOpenEditDialog(false);
      toast({
        title: 'Tool AI Aggiornato!',
        description: 'Il tool AI è stato aggiornato con successo.',
      });
    } catch (error: any)      {
      console.error('Errore durante l\'aggiornamento del tool AI:', error);
      toast({
        title: 'Errore',
        description:
           error?.data?.message || error?.message || 'Impossibile aggiornare il tool AI. Riprova.',
        variant: 'destructive',
      });
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleOpenFormModal = () => {
    setName('');
    setLink('');
    setCategory('');
    setSource('');
    setBrand('');
    setOpenFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!name || !source) {
       toast({
         title: 'Campi Mancanti',
         description: 'Nome e Fonte sono obbligatori.',
         variant: 'destructive',
       });
       setIsSubmitting(false);
       return;
    }
    try {
      const summaryOutput = await summarizeAiTool({
        name: name,
        link: link,
        category: category,
        source: source,
      });
       const dataToSave: Partial<AiTool> & { summary: SummarizeAiToolOutput } = {
         name: name,
         link: link,
         category: summaryOutput.category || category, // Prefer AI category, fallback to user input
         source: source,
         summary: summaryOutput,
         deleted: false,
         brand: brand,
       };
      await pb.collection('tools_ai').create(dataToSave);
      toast({
        title: 'Tool AI Aggiunto!',
        description: 'Il tool AI è stato aggiunto con successo.',
      });
      setOpenFormModal(false);
       setName('');
       setLink('');
       setCategory('');
       setSource('');
       setBrand('');
    } catch (error: any) {
      console.error('Errore durante il salvataggio del tool AI:', error);
      toast({
        title: 'Errore',
        description:
          error?.data?.message || error?.message || 'Impossibile salvare il tool AI. Riprova.',
        variant: 'destructive',
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const categoryItems = [{ value: "all", label: "Tutte le Categorie" }, ...categories.map(cat => ({ value: cat, label: cat }))];
  const brandItems = [{ value: "all", label: "Tutti i Brand" }, ...brands.map(br => ({ value: br, label: br }))];


  return (
    <div>
      <Navbar onAddToolClick={handleOpenFormModal} />
      <div className="container mx-auto p-4 md:p-6">
        <section id="list">
          {/* Filters Section */}
          <Card className="mb-8 p-4 md:p-6 shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="relative md:col-span-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cerca tool AI..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 w-full text-base"
                />
              </div>

              <Combobox
                items={categoryItems}
                value={selectedCategoryFilter ?? "all"}
                onChange={(value) => setSelectedCategoryFilter(value === "all" ? null : value)}
                placeholder="Filtra per Categoria"
                inputPlaceholder="Cerca categoria..."
                emptyMessage="Nessuna categoria trovata."
                className="text-base"
                allowNew={false}
              />

              <Combobox
                items={brandItems}
                value={selectedBrandsFilter.length === 1 ? selectedBrandsFilter[0] : "all"}
                onChange={(value) => setSelectedBrandsFilter(value === "all" ? [] : [value])}
                placeholder="Filtra per Brand"
                inputPlaceholder="Cerca brand..."
                emptyMessage="Nessun brand trovato."
                className="text-base"
                allowNew={false}
              />
             </div>
           </Card>

          {/* Tool List Grid */}
          <div className="masonry-grid">
            {filteredTools.length > 0 ? (
                 filteredTools.map(tool => (
                   <div key={tool.id} className="masonry-grid-item">
                     <Card className="break-inside-avoid shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
                       <CardHeader className="pb-3">
                         <CardTitle className="text-xl font-semibold hover:text-primary transition-colors">
                           {tool.link ? (
                             <a href={tool.link} target="_blank" rel="noopener noreferrer" title={`Visita ${tool.name}`}>
                               {tool.name}
                             </a>
                           ) : (
                             tool.name
                           )}
                         </CardTitle>
                         <CardDescription className="text-sm">{tool.summary?.category || tool.category}</CardDescription>
                       </CardHeader>
                       <CardContent className="pt-0 pb-4">
                         <p className="text-sm text-muted-foreground mb-4">
                           {tool.summary?.summary || 'Nessun riassunto disponibile.'}
                         </p>
                         <div className="mb-3 space-x-1 space-y-1">
                             {tool.summary?.tags?.map(tag => (
                               <Badge key={tag} variant="secondary" className="whitespace-nowrap text-xs">
                                 {tag}
                               </Badge>
                             ))}
                         </div>
                         <div className="text-xs text-muted-foreground mb-1">
                           <span className="font-semibold">Brand:</span> {tool.brand || 'N/D'}
                         </div>
                          <div className="text-xs text-muted-foreground">
                           <span className="font-semibold">API:</span>{' '}
                           {tool.summary?.apiAvailable ? 'Sì' : 'No'}
                         </div>
                       </CardContent>
                       <CardFooter className="flex justify-end space-x-2 pt-0 pb-3 px-4">
                           <Button
                             size="icon"
                             variant="ghost"
                             onClick={() => handleEdit(tool)}
                             className="text-muted-foreground hover:text-primary"
                             title="Modifica Tool"
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                           <Button
                             size="icon"
                             variant="ghost"
                             onClick={() => confirmDelete(tool.id)}
                             className="text-muted-foreground hover:text-destructive"
                             title="Elimina Tool"
                           >
                             <Trash className="h-4 w-4" />
                           </Button>
                       </CardFooter>
                     </Card>
                   </div>
                 ))
             ) : (
                 <div className="col-span-full text-center py-10">
                    <p className="text-muted-foreground text-lg">Nessun tool trovato che corrisponda ai tuoi filtri.</p>
                    <p className="text-sm text-muted-foreground mt-2">Prova a modificare i termini di ricerca o i filtri.</p>
                 </div>
             )}
          </div>
        </section>

        {/* Edit Dialog */}
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Modifica Tool AI</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input id="edit-name" value={editedName} onChange={e => setEditedName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-link">Link</Label>
                <Input id="edit-link" value={editedLink} onChange={e => setEditedLink(e.target.value)} />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Combobox
                    id="edit-category"
                    items={categories.map(c => ({ value: c, label: c }))}
                    value={editedCategory}
                    onChange={setEditedCategory}
                    placeholder="Seleziona o crea categoria..."
                    inputPlaceholder="Cerca o crea categoria..."
                    allowNew
                  />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-source">Fonte</Label>
                <Input id="edit-source" value={editedSource} onChange={e => setEditedSource(e.target.value)} />
              </div>
              <div className="grid gap-2">
                 <Label htmlFor="edit-brand">Brand</Label>
                  <Combobox
                    id="edit-brand"
                    items={brands.map(b => ({ value: b, label: b }))}
                    value={editedBrand}
                    onChange={setEditedBrand}
                    placeholder="Seleziona o crea brand..."
                    inputPlaceholder="Cerca o crea brand..."
                    allowNew
                  />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-summary">Riassunto</Label>
                <div className="relative">
                    <Textarea
                      id="edit-summary"
                      value={editedSummary}
                      onChange={e => setEditedSummary(e.target.value)}
                      rows={4}
                      className="pr-12" // Add padding to the right for the button
                    />
                    <Button
                       type="button" // Important to prevent form submission if inside a form
                       variant="ghost"
                       size="icon"
                       className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-primary"
                       onClick={handleRegenerateSummary}
                       disabled={isRegenerating || isSubmitting}
                       title="Rigenera Riassunto"
                     >
                       {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                     </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-tags">Tag (separati da virgola)</Label>
                <Input id="edit-tags" value={editedTags} onChange={e => setEditedTags(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="edit-apiAvailable"
                  checked={editedApiAvailable}
                  onCheckedChange={(checked) => setEditedApiAvailable(Boolean(checked))}
                />
                 <Label htmlFor="edit-apiAvailable" className="font-normal">API Disponibile</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Annulla</Button>
              </DialogClose>
               <Button onClick={handleSave} disabled={isSubmitting || isRegenerating}>
                 {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : 'Salva Modifiche'}
               </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione contrassegnerà il tool come eliminato, ma non lo rimuoverà permanentemente dal database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add New Tool Dialog (Modal) */}
        <Dialog open={openFormModal} onOpenChange={setOpenFormModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Aggiungi Nuovo Tool AI</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-5 py-4">
               <div className="grid gap-2">
                 <Label htmlFor="name">Nome del tool</Label>
                 <Input id="name" type="text" placeholder="Inserisci il nome..." value={name} onChange={e => setName(e.target.value)} required />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="link">Link al sito web/GitHub</Label>
                 <Input id="link" type="url" placeholder="Inserisci l'URL..." value={link} onChange={e => setLink(e.target.value)} />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="category">Categoria</Label>
                  <Combobox
                    id="category"
                    items={categories.map(c => ({ value: c, label: c }))}
                    value={category}
                    onChange={setCategory}
                    placeholder="Seleziona o crea categoria..."
                    inputPlaceholder="Cerca o crea categoria..."
                    allowNew
                  />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="source">Fonte (es. Product Hunt, X)</Label>
                 <Input id="source" type="text" placeholder="Inserisci la fonte..." value={source} onChange={e => setSource(e.target.value)} required />
               </div>
                <div className="grid gap-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Combobox
                      id="brand"
                      items={brands.map(b => ({ value: b, label: b }))}
                      value={brand}
                      onChange={setBrand}
                      placeholder="Seleziona o crea brand..."
                      inputPlaceholder="Cerca o crea brand..."
                      allowNew
                    />
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Annulla</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                       {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : 'Riassumi e Salva Tool'}
                     </Button>
                 </DialogFooter>
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
