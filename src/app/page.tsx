
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
import {Edit, Trash, Loader2, RefreshCw} from 'lucide-react'; // Added RefreshCw icon
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
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {toast} from '@/hooks/use-toast';
import {Navbar} from '@/components/navbar';
import {useRouter} from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Combobox} from '@/components/ui/combobox'; // Import Combobox
import { Search } from 'lucide-react'; // Keep Search icon for filter bar

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
  const [isSubmitting, setIsSubmitting] = useState(false); // State for submit loading
  const [isRegenerating, setIsRegenerating] = useState(false); // State for regenerate loading

  const router = useRouter();

  const fetchAiTools = useCallback(async () => {
    try {
      // Fetch all records without pagination for filtering/dropdowns
      const allRecords = await pb.collection('tools_ai').getFullList({
         filter: 'deleted = false',
         fields: 'id,category,brand,name,link,source,summary,deleted', // Specify fields to fetch
         sort: '-created', // Sort by creation date descending
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

      // Extract unique categories and brands for filters and dropdowns
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

    // Subscribe to changes in the 'tools_ai' collection
    const unsubscribe = pb.collection('tools_ai').subscribe('*', function (e) {
      console.log('PocketBase subscription event:', e.action, e.record.id);
       // More efficient updates based on action
       if (e.action === 'create') {
         setAiTools((prevTools) => [{ ...e.record, summary: e.record.summary as SummarizeAiToolOutput } as AiTool, ...prevTools]); // Add to beginning
       } else if (e.action === 'update') {
         setAiTools((prevTools) =>
           prevTools.map((tool) =>
             tool.id === e.record.id ? { ...e.record, summary: e.record.summary as SummarizeAiToolOutput } as AiTool : tool
           )
         );
       } else if (e.action === 'delete') {
         setAiTools((prevTools) => prevTools.filter((tool) => tool.id !== e.record.id));
       }
        // Optionally, refetch all if complex filtering/sorting is needed after any change
       fetchAiTools(); // Refetch to update categories/brands lists potentially
    });

     return () => {
       console.log('Unsubscribing from PocketBase');
       unsubscribe();
     };
  }, [fetchAiTools]);

  const filteredTools = aiTools.filter(tool => {
    const searchTermLower = search.toLowerCase();
    const categoryFilterMatch = selectedCategoryFilter
      ? tool.category?.toLowerCase() === selectedCategoryFilter.toLowerCase()
      : true;
    const brandFilterMatch =
      selectedBrandsFilter.length > 0 ? selectedBrandsFilter.some(b => tool.brand?.toLowerCase() === b.toLowerCase()) : true;

    // Check against all relevant fields
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
      // Soft delete by setting deleted = true
      await pb.collection('tools_ai').update(deleteToolId, {
        deleted: true,
      });
      // No need to manually filter, subscription should handle it
      // setAiTools(aiTools.filter(tool => tool.id !== deleteToolId));
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
        name: editedName, // Use edited name
        link: editedLink, // Use edited link
        category: editedCategory, // Use edited category
        source: editedSource, // Use edited source
      });

      // Update edit form fields with regenerated data
      setEditedSummary(summaryOutput.summary);
      setEditedCategory(summaryOutput.category); // Update category in form as well
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
    setIsSubmitting(true); // Start loading

    try {
      const updatedSummary: SummarizeAiToolOutput = {
        ...(editTool.summary || {}), // Handle case where summary might be initially null/undefined
        summary: editedSummary,
        tags: editedTags.split(',').map(tag => tag.trim()).filter(tag => tag), // Ensure no empty tags
        apiAvailable: editedApiAvailable,
        // Use the category from the form (which might have been updated by regeneration or manually)
        category: editedCategory,
        // Use the name from the form
        name: editedName,
      };

      const dataToUpdate: Partial<AiTool> & { summary: SummarizeAiToolOutput } = {
        name: editedName,
        link: editedLink,
        category: editedCategory,
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
      // No need to manually fetch, subscription should handle it
      // fetchAiTools();
    } catch (error: any) {
      console.error('Errore durante l\'aggiornamento del tool AI:', error);
      toast({
        title: 'Errore',
        description:
           error?.data?.message || error?.message || 'Impossibile aggiornare il tool AI. Riprova.',
        variant: 'destructive',
      });
    } finally {
       setIsSubmitting(false); // Stop loading
    }
  };

  const handleOpenFormModal = () => {
    // Reset form fields when opening
    setName('');
    setLink('');
    setCategory('');
    setSource('');
    setBrand('');
    setOpenFormModal(true);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); // Start loading

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
      // 1. Summarize the tool using the Genkit flow
      const summaryOutput = await summarizeAiTool({
        name: name,
        link: link, // Pass the link entered by user
        category: category, // Pass the category selected/created
        source: source,
      });

      // Prepare data for PocketBase, ensuring summary is nested correctly
       const dataToSave: Partial<AiTool> & { summary: SummarizeAiToolOutput } = {
         name: name,
         link: link, // Save the link entered by user
         // Use AI's category if available, otherwise fallback to user input
         category: summaryOutput.category || category,
         source: source,
         summary: summaryOutput, // Save the entire summary object
         deleted: false,
         brand: brand, // Save the brand selected/created
       };


      // 2. Save the data to PocketBase
      await pb.collection('tools_ai').create(dataToSave);

      toast({
        title: 'Tool AI Aggiunto!',
        description: 'Il tool AI è stato aggiunto con successo.',
      });
      setOpenFormModal(false); // Close modal on success
      // No need to manually fetch, subscription should handle it
      // fetchAiTools(); // Subscription handles updates
       // Reset form fields after successful submission
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
        setIsSubmitting(false); // Stop loading
    }
  };

  // Handler for the brand multi-select filter
   const toggleBrandFilter = (brandToToggle: string) => {
     setSelectedBrandsFilter(prev => {
       const lowerCaseBrand = brandToToggle.toLowerCase();
       if (prev.some(b => b.toLowerCase() === lowerCaseBrand)) {
         return prev.filter(b => b.toLowerCase() !== lowerCaseBrand);
       } else {
         return [...prev, brandToToggle]; // Keep original casing for display if needed
       }
     });
   };

  return (
    <div>
      <Navbar onAddToolClick={handleOpenFormModal} />
      <div className="container mx-auto p-4">
        <section id="list">
          {/* Filters Section */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cerca tool AI..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 w-full" // Add padding for the icon
              />
            </div>

            {/* Category Filter Dropdown */}
             <Select
                 value={selectedCategoryFilter ?? 'all'} // Control the selected value
                 onValueChange={(value) => setSelectedCategoryFilter(value === "all" ? null : value)}
             >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filtra per Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le Categorie</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

             {/* Brand Filter Dropdown - Assuming single select for now */}
             <Select
                  value={selectedBrandsFilter.length === 1 ? selectedBrandsFilter[0] : 'all'}
                  onValueChange={(value) => {
                    setSelectedBrandsFilter(value === "all" ? [] : [value]);
                  }}
             >
               <SelectTrigger className="w-full md:w-[180px]">
                 <SelectValue placeholder="Filtra per Brand" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Tutti i Brand</SelectItem>
                 {brands.map(br => (
                   <SelectItem key={br} value={br}>
                     {br}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>


          {/* Tool List Grid */}
          <div className="masonry-grid">
            {filteredTools.length > 0 ? (
                 filteredTools.map(tool => (
                   <div key={tool.id} className="masonry-grid-item">
                     <Card className="break-inside-avoid"> {/* Ensure card doesn't break across columns */}
                       <CardHeader>
                         <CardTitle className="hover:text-primary transition-colors">
                           {tool.link ? (
                             <a href={tool.link} target="_blank" rel="noopener noreferrer" title={`Visita ${tool.name}`}>
                               {tool.name}
                             </a>
                           ) : (
                             tool.name
                           )}
                         </CardTitle>
                         <CardDescription>{tool.category}</CardDescription>
                       </CardHeader>
                       <CardContent>
                         <p className="text-sm text-muted-foreground mb-3">
                           {tool.summary?.summary || 'Nessun riassunto disponibile.'}
                         </p>
                         <div className="mb-3 space-x-1">
                             {tool.summary?.tags?.map(tag => (
                               <Badge key={tag} variant="secondary" className="whitespace-nowrap">
                                 {tag}
                               </Badge>
                             ))}
                         </div>
                         <div className="text-xs text-muted-foreground mb-1">
                           <span className="font-semibold">Brand:</span> {tool.brand || 'N/D'}
                         </div>
                          <div className="text-xs text-muted-foreground mb-3">
                           <span className="font-semibold">API:</span>{' '}
                           {tool.summary?.apiAvailable ? 'Sì' : 'No'}
                         </div>
                         <div className="flex justify-end space-x-1 mt-2">
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
                         </div>
                       </CardContent>
                     </Card>
                   </div>
                 ))
             ) : (
                 <p className="col-span-full text-center text-muted-foreground mt-8">Nessun tool trovato.</p>
             )}
          </div>
        </section>

        {/* Edit Dialog */}
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica Tool AI</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Edit Form Fields */}
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={editedName}
                  onChange={e => setEditedName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-link">Link</Label>
                <Input
                  id="edit-link"
                  value={editedLink}
                  onChange={e => setEditedLink(e.target.value)}
                />
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
                <Input
                  id="edit-source"
                  value={editedSource}
                  onChange={e => setEditedSource(e.target.value)}
                />
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
                      rows={4} // Increased rows for better view
                      className="pr-12" // Add padding for the button
                    />
                    <Button
                       type="button" // Important: Prevent form submission
                       variant="ghost"
                       size="icon"
                       className="absolute top-1 right-1 h-8 w-8 text-muted-foreground hover:text-primary"
                       onClick={handleRegenerateSummary}
                       disabled={isRegenerating || isSubmitting}
                       title="Rigenera Riassunto"
                     >
                       {isRegenerating ? (
                         <Loader2 className="h-4 w-4 animate-spin" />
                       ) : (
                         <RefreshCw className="h-4 w-4" />
                       )}
                     </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-tags">Tag (separati da virgola)</Label>
                <Input
                  id="edit-tags"
                  value={editedTags}
                  onChange={e => setEditedTags(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-apiAvailable"
                  checked={editedApiAvailable}
                  // Need to handle potential undefined/null check state if using Radix directly
                  onCheckedChange={(checked) => setEditedApiAvailable(Boolean(checked))}
                />
                 <Label htmlFor="edit-apiAvailable">API Disponibile</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Annulla</Button>
              </DialogClose>
               <Button onClick={handleSave} disabled={isSubmitting || isRegenerating}>
                 {isSubmitting ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     Salvataggio...
                   </>
                 ) : (
                   'Salva Modifiche'
                 )}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Nuovo Tool AI</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              {/* Add Form Fields */}
               <div className="grid gap-2">
                 <Label htmlFor="name">Nome del tool</Label>
                 <Input
                    id="name"
                    type="text"
                    placeholder="Inserisci il nome..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="link">Link al sito web/GitHub</Label>
                 <Input
                   id="link"
                   type="url"
                   placeholder="Inserisci l'URL..."
                   value={link}
                   onChange={e => setLink(e.target.value)}
                 />
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
                 <Input
                   id="source"
                   type="text"
                   placeholder="Inserisci la fonte..."
                   value={source}
                   onChange={e => setSource(e.target.value)}
                   required
                 />
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
                       {isSubmitting ? (
                         <>
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           Salvataggio...
                         </>
                       ) : (
                         'Riassumi e Salva Tool'
                       )}
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

