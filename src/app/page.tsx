
'use client';

import {summarizeAiTool} from '@/ai/flows/ai-tool-summarization';
import type {SummarizeAiToolOutput as GenkitSummarizeAiToolOutput} from '@/ai/flows/ai-tool-summarization';
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
import {Edit, Trash, Loader2, RefreshCw, Search as SearchIcon, RefreshCcwDot} from 'lucide-react';
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
import { Combobox } from '@/components/ui/combobox';

const pb = new PocketBase('https://pocketbase.eulab.cloud');

// Ensure local SummarizeAiToolOutput matches Genkit's, including optional derivedLink
interface SummarizeAiToolOutput extends GenkitSummarizeAiToolOutput {
  derivedLink?: string; 
}

interface AiTool {
  id: string;
  name: string;
  link?: string; 
  category: string; // User-provided category, AI can override in summary.category
  source: string;
  summary: SummarizeAiToolOutput; 
  deleted: boolean;
  brand?: string;
}


function AiToolList() {
  const [aiTools, setAiTools] = useState<AiTool[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string | null>(null); 
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editTool, setEditTool] = useState<AiTool | null>(null);
  // Edit form states
  const [editedName, setEditedName] = useState('');
  const [editedLink, setEditedLink] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedSource, setEditedSource] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedTags, setEditedTags] = useState('');
  const [editedConcepts, setEditedConcepts] = useState('');
  const [editedUseCases, setEditedUseCases] = useState('');
  const [editedApiAvailable, setEditedApiAvailable] = useState(false);
  const [editedBrand, setEditedBrand] = useState('');

  const [deleteToolId, setDeleteToolId] = useState<string | null>(null);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);
  // Add form states
  const [formName, setFormName] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formBrand, setFormBrand] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isUpdatingAllTools, setIsUpdatingAllTools] = useState(false);


  const fetchAiTools = useCallback(async () => {
    try {
      const allRecords = await pb.collection('tools_ai').getFullList({
         filter: 'deleted = false',
         fields: 'id,name,link,category,source,summary,deleted,brand', // Ensure all needed fields are fetched
         sort: '-created',
      });

      const typedRecords = allRecords.map(record => ({
        id: record.id,
        name: record.name,
        link: record.link, 
        category: record.category, 
        source: record.source,
        summary: record.summary as SummarizeAiToolOutput, // Cast to local interface
        deleted: record.deleted as boolean,
        brand: record.brand as string,
      }));

      setAiTools(typedRecords as AiTool[]);

      const uniqueCategoriesSet = new Set<string>();
      const uniqueBrandsSet = new Set<string>();
      typedRecords.forEach(tool => {
        const categoryToAdd = tool.summary?.category || tool.category;
        if (categoryToAdd) uniqueCategoriesSet.add(categoryToAdd);
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
       fetchAiTools(); // Refetch on any change
    });
     // Cleanup subscription on component unmount
     return () => {
       console.log('Unsubscribing from PocketBase');
       pb.collection('tools_ai').unsubscribe();
     };
  }, [fetchAiTools]);

  const filteredTools = aiTools.filter(tool => {
    const searchTermLower = search.toLowerCase();
    const toolCategory = tool.summary?.category || tool.category; // Prefer summary category
    
    // Category filter logic
    const categoryFilterMatch = selectedCategoryFilter
      ? toolCategory?.toLowerCase() === selectedCategoryFilter.toLowerCase()
      : true;
    
    // Brand filter logic
    const brandFilterMatch = selectedBrandFilter 
      ? tool.brand?.toLowerCase() === selectedBrandFilter.toLowerCase()
      : true;

    // Search term matching logic
    const matchesSearchTerm =
      tool.name?.toLowerCase().includes(searchTermLower) ||
      (tool.summary?.derivedLink || tool.link)?.toLowerCase().includes(searchTermLower) || // Check derivedLink first
      toolCategory?.toLowerCase().includes(searchTermLower) ||
      tool.source?.toLowerCase().includes(searchTermLower) ||
      tool.brand?.toLowerCase().includes(searchTermLower) ||
      tool.summary?.summary?.toLowerCase().includes(searchTermLower) ||
      (tool.summary?.tags && tool.summary.tags.some(tag => tag.toLowerCase().includes(searchTermLower))) ||
      (tool.summary?.concepts && tool.summary.concepts.some(concept => concept.toLowerCase().includes(searchTermLower))) ||
      (tool.summary?.useCases && tool.summary.useCases.some(useCase => useCase.toLowerCase().includes(searchTermLower)));

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
      // No need to call fetchAiTools here, subscription will handle it
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
    setEditedLink(tool.summary?.derivedLink || tool.link || ''); // Prefer derivedLink
    setEditedCategory(tool.summary?.category || tool.category || ''); // Prefer summary category
    setEditedSource(tool.source || '');
    setEditedSummary(tool.summary?.summary || '');
    setEditedTags(tool.summary?.tags?.join(', ') || '');
    setEditedConcepts(tool.summary?.concepts?.join(', ') || '');
    setEditedUseCases(tool.summary?.useCases?.join(', ') || '');
    setEditedApiAvailable(tool.summary?.apiAvailable || false);
    setEditedBrand(tool.brand || '');
    setOpenEditDialog(true);
  };

  const handleRegenerateSummary = async () => {
    if (!editTool) return;
    setIsRegenerating(true);
    try {
      // Use current form values for regeneration
      const summaryOutput = await summarizeAiTool({
        name: editedName, // Use edited name
        link: editedLink, // Use edited link
        category: editedCategory, // Use edited category as a hint
        source: editedSource, // Use edited source
      });
      // Update all relevant fields from the AI's output
      setEditedSummary(summaryOutput.summary);
      setEditedCategory(summaryOutput.category); // AI's category
      setEditedTags(summaryOutput.tags.join(', '));
      setEditedConcepts(summaryOutput.concepts.join(', '));
      setEditedUseCases(summaryOutput.useCases.join(', '));
      setEditedApiAvailable(summaryOutput.apiAvailable);
      setEditedLink(summaryOutput.derivedLink || editedLink); // Update link if AI derived a better one

      toast({
        title: 'Riassunto Rigenerato!',
        description: 'Tutti i dettagli del tool (riassunto, categoria, tag, concetti, casi d\'uso, API, link) sono stati aggiornati.',
      });
    } catch (error: any) {
        console.error('Errore durante la rigenerazione del riassunto:', error);
        toast({
            title: 'Errore di Rigenerazione',
            description:
                error?.data?.message || error?.message || 'Impossibile rigenerare i dettagli del tool. Riprova.',
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
      const updatedSummaryData: SummarizeAiToolOutput = {
        summary: editedSummary,
        category: editedCategory, // This is the category from the edit form
        tags: editedTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        concepts: editedConcepts.split(',').map(concept => concept.trim()).filter(concept => concept),
        useCases: editedUseCases.split(',').map(useCase => useCase.trim()).filter(useCase => useCase),
        apiAvailable: editedApiAvailable,
        name: editedName, // Ensure name is part of summary for consistency if needed by AI
        derivedLink: editedLink, // The link from the edit form
      };

      const dataToUpdate = {
        name: editedName,
        link: editedLink, // Save the potentially AI-derived or user-edited link
        category: editedCategory, // This is the primary category field for the tool record
        source: editedSource,
        summary: updatedSummaryData, // The complete summary object
        brand: editedBrand,
      };

      await pb.collection('tools_ai').update(editTool.id, dataToUpdate);
      // No need to call fetchAiTools here, subscription will handle it
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
    // Reset form fields
    setFormName('');
    setFormLink('');
    setFormCategory(''); // Reset category
    setFormSource('');
    setFormBrand(''); // Reset brand
    setOpenFormModal(true);
  };

  const handleSubmitNewTool = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!formName || !formSource) { // Basic validation
       toast({
         title: 'Campi Mancanti',
         description: 'Nome e Fonte sono obbligatori.',
         variant: 'destructive',
       });
       setIsSubmitting(false);
       return;
    }
    try {
      // Call Genkit flow to summarize the tool
      const summaryOutput = await summarizeAiTool({
        name: formName,
        link: formLink,
        category: formCategory, // Pass user-provided category as a hint
        source: formSource,
      });

      // Prepare data for PocketBase, ensuring summary is an object
       const dataToSave = {
         name: summaryOutput.name, // Use name from AI output for consistency
         link: summaryOutput.derivedLink || formLink, // Prefer AI-derived link
         category: summaryOutput.category, // Use AI-determined category as the primary one
         source: formSource,
         summary: summaryOutput, // Save the whole summary object
         deleted: false,
         brand: formBrand,
       };
      await pb.collection('tools_ai').create(dataToSave);
      // No need to call fetchAiTools here, subscription will handle it
      toast({
        title: 'Tool AI Aggiunto!',
        description: 'Il tool AI è stato aggiunto con successo e arricchito dall\'AI.',
      });
      setOpenFormModal(false);
      // Optionally clear form fields after successful submission
       setFormName('');
       setFormLink('');
       setFormCategory('');
       setFormSource('');
       setFormBrand('');
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

  const handleUpdateAllToolsSummaries = async () => {
    setIsUpdatingAllTools(true);
    toast({ title: "Avvio aggiornamento massivo...", description: "Sto analizzando i tool." });
    let updatedCount = 0;
    let errorCount = 0;

    try {
      const allToolsToUpdate = await pb.collection('tools_ai').getFullList({
        filter: 'deleted = false',
      });

      for (const toolRecord of allToolsToUpdate) {
        const tool = toolRecord as unknown as AiTool; // Cast to AiTool
        // Check if concepts are missing or summary is incomplete
        if (!tool.summary?.concepts || !Array.isArray(tool.summary.concepts) || tool.summary.concepts.length === 0) {
          try {
            console.log(`Updating tool: ${tool.name} (ID: ${tool.id})`);
            const summaryOutput = await summarizeAiTool({
              name: tool.name,
              link: tool.link || tool.summary?.derivedLink,
              category: tool.category || tool.summary?.category,
              source: tool.source,
            });

            const dataToUpdate = {
              name: summaryOutput.name,
              link: summaryOutput.derivedLink || tool.link,
              category: summaryOutput.category,
              source: tool.source,
              summary: summaryOutput, // Save the whole new summary object
              brand: tool.brand, // Preserve existing brand
              deleted: tool.deleted,
            };

            await pb.collection('tools_ai').update(tool.id, dataToUpdate);
            updatedCount++;
          } catch (e: any) {
            console.error(`Errore durante l'aggiornamento del tool ${tool.name} (ID: ${tool.id}):`, e);
            errorCount++;
          }
        }
      }
      fetchAiTools(); // Refresh the list after all updates
      toast({
        title: "Aggiornamento Completato!",
        description: `${updatedCount} tool aggiornati. ${errorCount > 0 ? `${errorCount} errori.` : ''}`,
      });
    } catch (error: any) {
      console.error("Errore durante il processo di aggiornamento massivo:", error);
      toast({
        title: "Errore Aggiornamento Massivo",
        description: "Si è verificato un errore durante il recupero dei tool o il processo generale.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAllTools(false);
    }
  };
  
  // Prepare items for Combobox components
  const categoryItems = [{ value: "all", label: "Tutte le Categorie" }, ...categories.map(cat => ({ value: cat, label: cat }))];
  const brandItems = [{ value: "all", label: "Tutti i Brand" }, ...brands.map(br => ({ value: br, label: br }))];


  return (
    <div>
      <Navbar 
        onAddToolClick={handleOpenFormModal} 
        onUpdateAllToolsClick={handleUpdateAllToolsSummaries}
        isUpdatingAllTools={isUpdatingAllTools}
      />
      <div className="container mx-auto p-4 md:p-6">
        {/* Filters Section */}
        <section id="list">
          <Card className="mb-8 p-4 md:p-6 shadow-md"> {/* Added shadow for depth */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="relative md:col-span-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cerca tool (nome, tag, concetti...)"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 w-full text-base" // Slightly larger text
                />
              </div>

              {/* Category Filter Combobox */}
              <Combobox
                items={categoryItems}
                value={selectedCategoryFilter ?? "all"} // Handle null for "All"
                onChange={(value) => setSelectedCategoryFilter(value === "all" ? null : value)}
                placeholder="Filtra per Categoria"
                inputPlaceholder="Cerca categoria..."
                emptyMessage="Nessuna categoria trovata."
                className="text-base" // Consistent text size
                allowNew={false} // Assuming we don't want new categories from filter
              />

              {/* Brand Filter Combobox */}
              <Combobox 
                items={brandItems}
                value={selectedBrandFilter ?? "all"} // Handle null for "All"
                onChange={(value) => setSelectedBrandFilter(value === "all" ? null : value)}
                placeholder="Filtra per Brand"
                inputPlaceholder="Cerca brand..."
                emptyMessage="Nessun brand trovato."
                className="text-base" // Consistent text size
                allowNew={false} // Assuming we don't want new brands from filter
              />
             </div>
           </Card>

          {/* AI Tool Cards Masonry Grid */}
          <div className="masonry-grid">
            {filteredTools.length > 0 ? (
                 filteredTools.map(tool => (
                   <div key={tool.id} className="masonry-grid-item">
                     <Card className="break-inside-avoid shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
                       <CardHeader className="pb-3">
                         <CardTitle className="text-xl font-semibold hover:text-primary transition-colors">
                           {/* Link the title if a link exists */}
                           {tool.summary?.derivedLink || tool.link ? (
                             <a href={tool.summary?.derivedLink || tool.link} target="_blank" rel="noopener noreferrer" title={`Visita ${tool.name}`}>
                               {tool.name}
                             </a>
                           ) : (
                             tool.name
                           )}
                         </CardTitle>
                         <CardDescription className="text-sm">{tool.summary?.category || tool.category}</CardDescription>
                       </CardHeader>
                       <CardContent className="pt-0 pb-4">
                         <p className="text-sm text-muted-foreground mb-3">
                           {tool.summary?.summary || 'Nessun riassunto disponibile.'}
                         </p>
                         {/* Concepts and Use Cases removed from direct card display for brevity 
                         {tool.summary?.concepts && tool.summary.concepts.length > 0 && (
                            <div className="mb-2">
                               <h4 className="text-xs font-semibold text-foreground mb-1">Concetti Chiave:</h4>
                               <div className="space-x-1 space-y-1">
                                {tool.summary.concepts.map(concept => (
                                   <Badge key={concept} variant="outline" className="whitespace-nowrap text-xs">{concept}</Badge>
                                ))}
                               </div>
                            </div>
                         )}
                         {tool.summary?.useCases && tool.summary.useCases.length > 0 && (
                            <div className="mb-3">
                               <h4 className="text-xs font-semibold text-foreground mb-1">Casi d'Uso:</h4>
                               <div className="space-x-1 space-y-1">
                                {tool.summary.useCases.map(useCase => (
                                   <Badge key={useCase} variant="outline" className="whitespace-nowrap text-xs">{useCase}</Badge>
                                ))}
                               </div>
                            </div>
                         )}
                         */}
                         {/* Tags */}
                         <div className="mb-3 space-x-1 space-y-1">
                             {tool.summary?.tags?.map(tag => (
                               <Badge key={tag} variant="secondary" className="whitespace-nowrap text-xs">
                                 {tag}
                               </Badge>
                             ))}
                         </div>
                         {/* Brand and API Availability */}
                         <div className="text-xs text-muted-foreground mb-1">
                           <span className="font-semibold">Brand:</span> {tool.brand || 'N/D'}
                         </div>
                          <div className="text-xs text-muted-foreground">
                           <span className="font-semibold">API:</span>{' '}
                           {tool.summary?.apiAvailable ? 'Sì' : 'No'}
                         </div>
                       </CardContent>
                       <CardFooter className="flex justify-end space-x-2 pt-0 pb-3 px-4"> {/* Adjusted padding */}
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

        {/* Edit Tool Dialog */}
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent className="sm:max-w-lg"> {/* Consider sm:max-w-xl for more space */}
            <DialogHeader>
              <DialogTitle className="text-xl">Modifica Tool AI</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 px-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Added px-4 for horizontal padding */}
              {/* Form fields for editing */}
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
                    items={categories.map(c => ({ value: c, label: c }))} // Use dynamic categories
                    value={editedCategory}
                    onChange={setEditedCategory}
                    placeholder="Seleziona o crea categoria..."
                    inputPlaceholder="Cerca o crea categoria..."
                    allowNew // Allow creating new categories
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
                    items={brands.map(b => ({ value: b, label: b }))} // Use dynamic brands
                    value={editedBrand}
                    onChange={setEditedBrand}
                    placeholder="Seleziona o crea brand..."
                    inputPlaceholder="Cerca o crea brand..."
                    allowNew // Allow creating new brands
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
                      className="pr-12" // Make space for the button
                    />
                    {/* Regenerate Button */}
                     <Button
                       type="button" // Important: type="button" to prevent form submission
                       variant="ghost"
                       size="icon"
                       className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-primary"
                       onClick={handleRegenerateSummary}
                       disabled={isRegenerating || isSubmitting}
                       title="Rigenera tutti i dettagli (Riassunto, Tags, Concetti, Casi d'uso, API, Link)"
                     >
                       {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                     </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-tags">Tag (separati da virgola)</Label>
                <Input id="edit-tags" value={editedTags} onChange={e => setEditedTags(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-concepts">Concetti Chiave (separati da virgola)</Label>
                <Input id="edit-concepts" value={editedConcepts} onChange={e => setEditedConcepts(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-useCases">Casi d'Uso (separati da virgola)</Label>
                <Input id="edit-useCases" value={editedUseCases} onChange={e => setEditedUseCases(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="edit-apiAvailable"
                  checked={editedApiAvailable}
                  onCheckedChange={(checked) => setEditedApiAvailable(Boolean(checked))} // Ensure boolean value
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
            <form onSubmit={handleSubmitNewTool} className="grid gap-5 py-4 px-4"> {/* Added px-4 */}
               <div className="grid gap-2">
                 <Label htmlFor="form-name">Nome del tool</Label>
                 <Input id="form-name" type="text" placeholder="Inserisci il nome..." value={formName} onChange={e => setFormName(e.target.value)} required />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="form-link">Link al sito web/GitHub (opzionale)</Label>
                 <Input id="form-link" type="url" placeholder="Inserisci l'URL..." value={formLink} onChange={e => setFormLink(e.target.value)} />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="form-category">Categoria (opzionale, l'AI la inferirà)</Label>
                  <Combobox
                    id="form-category"
                    items={categories.map(c => ({ value: c, label: c }))} // Populate with existing categories
                    value={formCategory}
                    onChange={setFormCategory}
                    placeholder="Seleziona o crea categoria..."
                    inputPlaceholder="Cerca o crea categoria..."
                    allowNew // Allow creating new categories
                  />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="form-source">Fonte (es. Product Hunt, X)</Label>
                 <Input id="form-source" type="text" placeholder="Inserisci la fonte..." value={formSource} onChange={e => setFormSource(e.target.value)} required />
               </div>
                <div className="grid gap-2">
                    <Label htmlFor="form-brand">Brand (opzionale)</Label>
                    <Combobox
                      id="form-brand"
                      items={brands.map(b => ({ value: b, label: b }))} // Populate with existing brands
                      value={formBrand}
                      onChange={setFormBrand}
                      placeholder="Seleziona o crea brand..."
                      inputPlaceholder="Cerca o crea brand..."
                      allowNew // Allow creating new brands
                    />
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Annulla</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                       {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : 'Analizza e Salva Tool'}
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

