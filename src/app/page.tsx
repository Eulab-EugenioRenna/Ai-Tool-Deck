
"use client";

import { summarizeAiTool } from "@/ai/flows/ai-tool-summarization";
import type { SummarizeAiToolOutput as GenkitSummarizeAiToolOutput } from "@/ai/flows/ai-tool-summarization";
import { useEffect, useState, useCallback } from "react";
import PocketBase from "pocketbase";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit,
  Trash,
  Loader2,
  RefreshCw,
  Search as SearchIcon,
  RefreshCcwDot,
  FileCheck,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";
import { Combobox } from "@/components/ui/combobox";
import { ImportDialog } from "@/components/import-dialog";
import { DuplicatesDialog } from "@/components/duplicates-dialog";
import { NormalizeDialog } from "@/components/normalize-dialog";

const pb = new PocketBase("https://pocketbase.eulab.cloud");
pb.autoCancellation(false)

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

type DuplicateGroup = {
  key: string;
  tools: AiTool[];
};


function AiToolList() {
  const [aiTools, setAiTools] = useState<AiTool[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string | null>(
    null
  );
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editTool, setEditTool] = useState<AiTool | null>(null);
  // Edit form states
  const [editedName, setEditedName] = useState("");
  const [editedLink, setEditedLink] = useState("");
  const [editedCategory, setEditedCategory] = useState("");
  const [editedSource, setEditedSource] = useState("");
  const [editedSummary, setEditedSummary] = useState("");
  const [editedTags, setEditedTags] = useState("");
  const [editedConcepts, setEditedConcepts] = useState("");
  const [editedUseCases, setEditedUseCases] = useState("");
  const [editedApiAvailable, setEditedApiAvailable] = useState(false);
  const [editedBrand, setEditedBrand] = useState("");

  const [deleteToolId, setDeleteToolId] = useState<string | null>(null);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);
  // Add form states
  const [formName, setFormName] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formBrand, setFormBrand] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isUpdatingAllTools, setIsUpdatingAllTools] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  
  const [openDuplicatesDialog, setOpenDuplicatesDialog] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isFindingDuplicates, setIsFindingDuplicates] = useState(false);

  const [openNormalizeDialog, setOpenNormalizeDialog] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);

  const fetchAiTools = useCallback(async () => {
    try {
      const allRecords = await pb.collection("tools_ai").getFullList({
        filter: "deleted = false",
        fields: "id,name,link,category,source,summary,deleted,brand", // Ensure all needed fields are fetched
        sort: "-created",
      });

      const typedRecords = allRecords.map((record) => ({
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
      typedRecords.forEach((tool) => {
        const categoryToAdd = tool.summary?.category || tool.category;
        if (categoryToAdd) uniqueCategoriesSet.add(categoryToAdd);
        if (tool.brand) uniqueBrandsSet.add(tool.brand);
      });
      setCategories(Array.from(uniqueCategoriesSet).sort());
      setBrands(Array.from(uniqueBrandsSet).sort());
    } catch (error: any) {
      console.error("Error fetching AI tools:", error);
      toast({
        title: "Errore",
        description:
          error?.data?.message ||
          error?.message ||
          "Impossibile recuperare i tool AI. Riprova.",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    fetchAiTools();
    const unsubscribe = pb.collection("tools_ai").subscribe("*", function (e) {
      console.log("PocketBase subscription event:", e.action, e.record.id);
      fetchAiTools(); // Refetch on any change
    });
    // Cleanup subscription on component unmount
    return () => {
      console.log("Unsubscribing from PocketBase");
      pb.collection("tools_ai").unsubscribe();
    };
  }, [fetchAiTools]);

  const filteredTools = aiTools.filter((tool) => {
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
      (tool.summary?.derivedLink || tool.link)
        ?.toLowerCase()
        .includes(searchTermLower) || // Check derivedLink first
      toolCategory?.toLowerCase().includes(searchTermLower) ||
      tool.source?.toLowerCase().includes(searchTermLower) ||
      tool.brand?.toLowerCase().includes(searchTermLower) ||
      tool.summary?.summary?.toLowerCase().includes(searchTermLower) ||
      (tool.summary?.tags &&
        tool.summary.tags.some((tag) =>
          tag.toLowerCase().includes(searchTermLower)
        )) ||
      (tool.summary?.concepts &&
        tool.summary.concepts.some((concept) =>
          concept.toLowerCase().includes(searchTermLower)
        )) ||
      (tool.summary?.useCases &&
        tool.summary.useCases.some((useCase) =>
          useCase.toLowerCase().includes(searchTermLower)
        ));

    return categoryFilterMatch && brandFilterMatch && matchesSearchTerm;
  });

  const confirmDelete = (id: string) => {
    setDeleteToolId(id);
    setOpenDeleteAlert(true);
  };

  const handleDelete = async (idToDelete?: string) => {
    const finalId = idToDelete || deleteToolId;
    if (!finalId) return;

    try {
      await pb.collection("tools_ai").update(finalId, {
        deleted: true,
      });
      
      toast({
        title: "Tool AI Eliminato!",
        description: "Il tool AI è stato contrassegnato come eliminato.",
      });
    } catch (error: any) {
      console.error("Errore durante l'eliminazione del tool AI:", error);
      toast({
        title: "Errore",
        description:
          error?.data?.message ||
          error?.message ||
          "Impossibile eliminare il tool AI. Riprova.",
        variant: "destructive",
      });
    } finally {
        if (!idToDelete) { // Only close alert if it's the single delete flow
            setOpenDeleteAlert(false);
            setDeleteToolId(null);
        }
    }
  };


  const handleEdit = (tool: AiTool) => {
    setEditTool(tool);
    setEditedName(tool.name || "");
    setEditedLink(tool.summary?.derivedLink || tool.link || ""); // Prefer derivedLink
    setEditedCategory(tool.summary?.category || tool.category || ""); // Prefer summary category
    setEditedSource(tool.source || "");
    setEditedSummary(tool.summary?.summary || "");
    setEditedTags(tool.summary?.tags?.join(", ") || "");
    setEditedConcepts(tool.summary?.concepts?.join(", ") || "");
    setEditedUseCases(tool.summary?.useCases?.join(", ") || "");
    setEditedApiAvailable(tool.summary?.apiAvailable || false);
    setEditedBrand(tool.brand || "");
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
      setEditedName(summaryOutput.normalizedName); // Update name to normalized version
      setEditedSummary(summaryOutput.summary);
      setEditedCategory(summaryOutput.category); // AI's category
      setEditedTags(summaryOutput.tags.join(", "));
      setEditedConcepts(summaryOutput.concepts.join(", "));
      setEditedUseCases(summaryOutput.useCases.join(", "));
      setEditedApiAvailable(summaryOutput.apiAvailable);
      setEditedLink(summaryOutput.derivedLink || editedLink); // Update link if AI derived a better one

      toast({
        title: "Riassunto Rigenerato!",
        description:
          "Tutti i dettagli del tool (nome, riassunto, categoria, tag, etc.) sono stati aggiornati.",
      });
    } catch (error: any) {
      console.error("Errore durante la rigenerazione del riassunto:", error);
      toast({
        title: "Errore di Rigenerazione",
        description:
          error?.data?.message ||
          error?.message ||
          "Impossibile rigenerare i dettagli del tool. Riprova.",
        variant: "destructive",
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
        // This is tricky, the original name is in summary.name, but the main record name is the one we edit.
        // Let's assume the editedName is the one we want to save as the primary name.
        // The AI flow is better used for generation, not manual updates.
        summary: editedSummary,
        category: editedCategory, // This is the category from the edit form
        tags: editedTags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        concepts: editedConcepts
          .split(",")
          .map((concept) => concept.trim())
          .filter((concept) => concept),
        useCases: editedUseCases
          .split(",")
          .map((useCase) => useCase.trim())
          .filter((useCase) => useCase),
        apiAvailable: editedApiAvailable,
        name: editTool.summary?.name || editTool.name, // Keep original name in summary block
        normalizedName: editedName, // The user-edited name is the new "normalized" name
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

      await pb.collection("tools_ai").update(editTool.id, dataToUpdate);
      setOpenEditDialog(false);
      toast({
        title: "Tool AI Aggiornato!",
        description: "Il tool AI è stato aggiornato con successo.",
      });
    } catch (error: any) {
      console.error("Errore durante l'aggiornamento del tool AI:", error);
      toast({
        title: "Errore",
        description:
          error?.data?.message ||
          error?.message ||
          "Impossibile aggiornare il tool AI. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenFormModal = () => {
    // Reset form fields
    setFormName("");
    setFormLink("");
    setFormCategory(""); // Reset category
    setFormSource("");
    setFormBrand(""); // Reset brand
    setOpenFormModal(true);
  };

  const handleSubmitNewTool = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!formName) {
      // Basic validation
      toast({
        title: "Campo Mancante",
        description: "Il Nome è obbligatorio.",
        variant: "destructive",
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
        name: summaryOutput.normalizedName, // Use AI-normalized name
        link: summaryOutput.derivedLink || formLink, // Prefer AI-derived link
        category: summaryOutput.category, // Use AI-determined category as the primary one
        source: formSource,
        summary: summaryOutput, // Save the whole summary object
        deleted: false,
        brand: formBrand,
      };
      await pb.collection("tools_ai").create(dataToSave);
      toast({
        title: "Tool AI Aggiunto!",
        description:
          "Il tool AI è stato aggiunto con successo e arricchito dall'AI.",
      });
      setOpenFormModal(false);
      // Optionally clear form fields after successful submission
      setFormName("");
      setFormLink("");
      setFormCategory("");
      setFormSource("");
      setFormBrand("");
    } catch (error: any) {
      console.error("Errore durante il salvataggio del tool AI:", error);
      toast({
        title: "Errore",
        description:
          error?.data?.message ||
          error?.message ||
          "Impossibile salvare il tool AI. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAllToolsSummaries = async () => {
    setIsUpdatingAllTools(true);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    try {
        const toolsToUpdate = aiTools.filter(tool => 
            !tool.summary || !tool.summary.tags || tool.summary.tags.length === 0 || !tool.summary.concepts || tool.summary.concepts.length === 0
        );

        if (toolsToUpdate.length === 0) {
            toast({ title: "Nessun Tool da Aggiornare", description: "Tutti i tool sono già completi." });
            setIsUpdatingAllTools(false);
            return;
        }

        toast({
          title: "Avvio aggiornamento...",
          description: `Trovati ${toolsToUpdate.length} tool da analizzare e normalizzare.`,
        });

        for (const tool of toolsToUpdate) {
            try {
                console.log(`Updating tool: ${tool.name} (ID: ${tool.id})`);
                const summaryOutput = await summarizeAiTool({
                    name: tool.name, // Pass the current name
                    link: tool.summary?.derivedLink || tool.link,
                    category: tool.summary?.category || tool.category,
                    source: tool.source,
                });

                const dataToUpdate = {
                    name: summaryOutput.normalizedName, // Update the name with the normalized one
                    link: summaryOutput.derivedLink || tool.link,
                    category: summaryOutput.category,
                    summary: summaryOutput, // Save the whole new summary object
                    // Preserve other fields
                    source: tool.source,
                    brand: tool.brand,
                    deleted: tool.deleted,
                };

                await pb.collection("tools_ai").update(tool.id, dataToUpdate);
                updatedCount++;
            } catch (e: any) {
                console.error(`Errore durante l'aggiornamento del tool ${tool.name} (ID: ${tool.id}):`, e);
                errorCount++;
            }
        }

        toast({
            title: "Processo di Aggiornamento Terminato",
            description: `${updatedCount} tool aggiornati e normalizzati. ${errorCount > 0 ? `${errorCount} con errori.` : "Nessun errore."}`
        });

    } catch (error: any) {
        console.error("Errore durante il processo di aggiornamento massivo:", error);
        toast({
            title: "Errore Aggiornamento Massivo",
            description: "Si è verificato un errore durante il processo generale.",
            variant: "destructive",
        });
    } finally {
        setIsUpdatingAllTools(false);
    }
};

const handleBatchNormalize = async (toolIds: string[]) => {
    setIsNormalizing(true);
    let successCount = 0;
    let errorCount = 0;

    const toolsToNormalize = aiTools.filter(tool => toolIds.includes(tool.id));

    for (const tool of toolsToNormalize) {
        try {
            const summaryOutput = await summarizeAiTool({
                name: tool.name,
                link: tool.summary?.derivedLink || tool.link,
                category: tool.summary?.category || tool.category,
                source: tool.source,
            });

            const dataToUpdate = {
                name: summaryOutput.normalizedName,
                link: summaryOutput.derivedLink || tool.link,
                category: summaryOutput.category,
                summary: summaryOutput,
            };

            await pb.collection("tools_ai").update(tool.id, dataToUpdate);
            successCount++;
        } catch (e) {
            errorCount++;
            console.error(`Failed to normalize tool ${tool.id}:`, e);
        }
    }
    
    toast({
        title: 'Normalizzazione completata',
        description: `${successCount} tool normalizzati. ${errorCount > 0 ? `${errorCount} errori.` : ''}`,
    });

    setOpenNormalizeDialog(false);
    setIsNormalizing(false);
};


  const handleFindDuplicates = async () => {
    setIsFindingDuplicates(true);
    toast({ title: 'Ricerca duplicati in corso...' });

    const normalizeName = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizeLink = (str: string) => (str || '').toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');

    const foundDuplicatesMap = new Map<string, DuplicateGroup>();

    // Strategy 1: Group by normalized name AND normalized link
    const toolsByCanonicalKey = new Map<string, AiTool[]>();
    aiTools.forEach(tool => {
        const key = `${normalizeName(tool.name)}|${normalizeLink(tool.summary?.derivedLink || tool.link || '')}`;
        if (!toolsByCanonicalKey.has(key)) {
            toolsByCanonicalKey.set(key, []);
        }
        toolsByCanonicalKey.get(key)!.push(tool);
    });

    toolsByCanonicalKey.forEach((tools, key) => {
        if (tools.length > 1) {
            const groupKey = `Duplicato Esatto: "${tools[0].name}"`;
            if (!foundDuplicatesMap.has(groupKey)) {
                foundDuplicatesMap.set(groupKey, { key: groupKey, tools: [] });
            }
            foundDuplicatesMap.get(groupKey)!.tools.push(...tools);
        }
    });


    // Strategy 2: Group by normalized link only, to find same link with different names
    const toolsByLink = new Map<string, AiTool[]>();
    aiTools.forEach(tool => {
        const normalizedLink = normalizeLink(tool.summary?.derivedLink || tool.link || '');
        if (normalizedLink) {
            if (!toolsByLink.has(normalizedLink)) {
                toolsByLink.set(normalizedLink, []);
            }
            toolsByLink.get(normalizedLink)!.push(tool);
        }
    });

    toolsByLink.forEach((toolsWithLink, linkKey) => {
        if (toolsWithLink.length > 1) {
            const names = new Set(toolsWithLink.map(t => normalizeName(t.name)));
            // Only add if there are different names for the same link
            if (names.size > 1) {
                const groupKey = `Link Uguale, Nomi Diversi: "${linkKey}"`;
                if (!foundDuplicatesMap.has(groupKey)) {
                    foundDuplicatesMap.set(groupKey, { key: groupKey, tools: [] });
                }
                
                toolsWithLink.forEach(tool => {
                    let alreadyAdded = false;
                    for (const group of foundDuplicatesMap.values()) {
                        if (group.tools.some(t => t.id === tool.id)) {
                            alreadyAdded = true;
                            break;
                        }
                    }
                    if (!alreadyAdded) {
                        foundDuplicatesMap.get(groupKey)!.tools.push(tool);
                    }
                });

                if(foundDuplicatesMap.get(groupKey)?.tools.length < 2){
                    foundDuplicatesMap.delete(groupKey);
                }
            }
        }
    });
    
    // Final check for groups with more than one tool
    const finalDuplicateGroups: DuplicateGroup[] = [];
    foundDuplicatesMap.forEach((group, key) => {
        if (group.tools.length > 1) {
             const uniqueTools = Array.from(new Map(group.tools.map(t => [t.id, t])).values());
             if (uniqueTools.length > 1) {
                finalDuplicateGroups.push({ key: group.key, tools: uniqueTools });
             }
        }
    });


    if (finalDuplicateGroups.length === 0) {
      toast({
        title: 'Ricerca Completata',
        description: 'Nessun duplicato trovato.',
      });
    } else {
      setDuplicateGroups(finalDuplicateGroups);
      setOpenDuplicatesDialog(true);
    }

    setIsFindingDuplicates(false);
  };
  
  const handleBatchDelete = async (toolIds: string[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const id of toolIds) {
        try {
            await handleDelete(id);
            successCount++;
        } catch {
            errorCount++;
        }
    }
    
    toast({
        title: 'Eliminazione completata',
        description: `${successCount} tool eliminati. ${errorCount > 0 ? `${errorCount} errori.` : ''}`,
    });

    setOpenDuplicatesDialog(false);
  };

  const categoryItems = [
    { value: "all", label: "Tutte le Categorie" },
    ...categories.map((cat) => ({ value: cat, label: cat })),
  ];
  const brandItems = [
    { value: "all", label: "Tutti i Brand" },
    ...brands.map((br) => ({ value: br, label: br })),
  ];

  return (
    <div>
      <Navbar
        onAddToolClick={handleOpenFormModal}
        onUpdateAllToolsClick={handleUpdateAllToolsSummaries}
        isUpdatingAllTools={isUpdatingAllTools}
        onImportClick={() => setOpenImportDialog(true)}
        onFindDuplicatesClick={handleFindDuplicates}
        isFindingDuplicates={isFindingDuplicates}
        onNormalizeClick={() => setOpenNormalizeDialog(true)}
      />
      <div className='container mx-auto p-4 md:p-6'>
        <section id='list'>
          <Card className='mb-8 p-4 md:p-6 shadow-md'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-center'>
              <div className='relative md:col-span-1'>
                <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground' />
                <Input
                  type='text'
                  placeholder='Cerca tool (nome, tag, concetti...)'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='pl-10 w-full text-base'
                />
              </div>

              <Combobox
                items={categoryItems}
                value={selectedCategoryFilter ?? "all"}
                onChange={(value) =>
                  setSelectedCategoryFilter(value === "all" ? null : value)
                }
                placeholder='Filtra per Categoria'
                inputPlaceholder='Cerca categoria...'
                emptyMessage='Nessuna categoria trovata.'
                className='text-base'
                allowNew={false}
              />

              <Combobox
                items={brandItems}
                value={selectedBrandFilter ?? "all"}
                onChange={(value) =>
                  setSelectedBrandFilter(value === "all" ? null : value)
                }
                placeholder='Filtra per Brand'
                inputPlaceholder='Cerca brand...'
                emptyMessage='Nessun brand trovato.'
                className='text-base'
                allowNew={false}
              />
            </div>
          </Card>

          <div className='masonry-grid'>
            {filteredTools.length > 0 ? (
              filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className='masonry-grid-item'
                >
                  <Card className='break-inside-avoid shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg'>
                    <CardHeader className='pb-3'>
                      <CardTitle className='text-xl font-semibold hover:text-primary transition-colors'>
                        {tool.summary?.derivedLink || tool.link ? (
                          <a
                            href={tool.summary?.derivedLink || tool.link!}
                            target='_blank'
                            rel='noopener noreferrer'
                            title={`Visita ${tool.name}`}
                          >
                            {tool.name}
                          </a>
                        ) : (
                          tool.name
                        )}
                      </CardTitle>
                      <CardDescription className='text-sm'>
                        {tool.summary?.category || tool.category}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='pt-0 pb-4'>
                      <p className='text-sm text-muted-foreground mb-3'>
                        {tool.summary?.summary ||
                          "Nessun riassunto disponibile."}
                      </p>
                      
                      <div className='mb-3 space-x-1 space-y-1'>
                        {tool.summary?.tags?.map((tag) => (
                          <Badge
                            key={tag}
                            variant='secondary'
                            className='whitespace-nowrap text-xs'
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className='text-xs text-muted-foreground mb-1'>
                        <span className='font-semibold'>Brand:</span>{" "}
                        {tool.brand || "N/D"}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        <span className='font-semibold'>API:</span>{" "}
                        {tool.summary?.apiAvailable ? "Sì" : "No"}
                      </div>
                    </CardContent>
                    <CardFooter className='flex justify-end space-x-2 pt-0 pb-3 px-4'>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => handleEdit(tool)}
                        className='text-muted-foreground hover:text-primary'
                        title='Modifica Tool'
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => confirmDelete(tool.id)}
                        className='text-muted-foreground hover:text-destructive'
                        title='Elimina Tool'
                      >
                        <Trash className='h-4 w-4' />
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              ))
            ) : (
              <div className='col-span-full text-center py-10'>
                <p className='text-muted-foreground text-lg'>
                  Nessun tool trovato che corrisponda ai tuoi filtri.
                </p>
                <p className='text-sm text-muted-foreground mt-2'>
                  Prova a modificare i termini di ricerca o i filtri.
                </p>
              </div>
            )}
          </div>
        </section>

        <Dialog
          open={openEditDialog}
          onOpenChange={setOpenEditDialog}
        >
          <DialogContent className='sm:max-w-lg'>
            <DialogHeader>
              <DialogTitle className='text-xl'>Modifica Tool AI</DialogTitle>
            </DialogHeader>
            <div className='grid gap-4 py-4 px-4 max-h-[70vh] overflow-y-auto pr-2'>
              <div className='grid gap-2'>
                <Label htmlFor='edit-name'>Nome</Label>
                <Input
                  id='edit-name'
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='edit-link'>Link</Label>
                <Input
                  id='edit-link'
                  value={editedLink}
                  onChange={(e) => setEditedLink(e.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='edit-category'>Categoria</Label>
                <Combobox
                  id='edit-category'
                  items={categories.map((c) => ({ value: c, label: c }))}
                  value={editedCategory}
                  onChange={setEditedCategory}
                  placeholder='Seleziona o crea categoria...'
                  inputPlaceholder='Cerca o crea categoria...'
                  allowNew
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='edit-source'>Fonte</Label>
                <Input
                  id='edit-source'
                  value={editedSource}
                  onChange={(e) => setEditedSource(e.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='edit-brand'>Brand</Label>
                <Combobox
                  id='edit-brand'
                  items={brands.map((b) => ({ value: b, label: b }))}
                  value={editedBrand}
                  onChange={setEditedBrand}
                  placeholder='Seleziona o crea brand...'
                  inputPlaceholder='Cerca o crea brand...'
                  allowNew
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='edit-summary'>Riassunto</Label>
                <div className='relative'>
                  <Textarea
                    id='edit-summary'
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    rows={4}
                    className='pr-12'
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-primary'
                    onClick={handleRegenerateSummary}
                    disabled={isRegenerating || isSubmitting}
                    title="Rigenera tutti i dettagli (incluso nome, riassunto, tags...)"
                  >
                    {isRegenerating ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <RefreshCw className='h-4 w-4' />
                    )}
                  </Button>
                </div>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='edit-tags'>Tag (separati da virgola)</Label>
                <Input
                  id='edit-tags'
                  value={editedTags}
                  onChange={(e) => setEditedTags(e.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='edit-concepts'>
                  Concetti Chiave (separati da virgola)
                </Label>
                <Input
                  id='edit-concepts'
                  value={editedConcepts}
                  onChange={(e) => setEditedConcepts(e.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='edit-useCases'>
                  Casi d'Uso (separati da virgola)
                </Label>
                <Input
                  id='edit-useCases'
                  value={editedUseCases}
                  onChange={(e) => setEditedUseCases(e.target.value)}
                />
              </div>
              <div className='flex items-center space-x-2 pt-2'>
                <Checkbox
                  id='edit-apiAvailable'
                  checked={editedApiAvailable}
                  onCheckedChange={(checked) =>
                    setEditedApiAvailable(Boolean(checked))
                  }
                />
                <Label
                  htmlFor='edit-apiAvailable'
                  className='font-normal'
                >
                  API Disponibile
                </Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant='outline'>Annulla</Button>
              </DialogClose>
              <Button
                onClick={handleSave}
                disabled={isSubmitting || isRegenerating}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Salvataggio...
                  </>
                ) : (
                  "Salva Modifiche"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={openDeleteAlert}
          onOpenChange={setOpenDeleteAlert}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione contrassegnerà il tool come eliminato, ma non lo
                rimuoverà permanentemente dal database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete()}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={openFormModal}
          onOpenChange={setOpenFormModal}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-xl'>
                Aggiungi Nuovo Tool AI
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleSubmitNewTool}
              className='grid gap-5 py-4 px-4'
            >
              <div className='grid gap-2'>
                <Label htmlFor='form-name'>Nome del tool</Label>
                <Input
                  id='form-name'
                  type='text'
                  placeholder='Inserisci il nome...'
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='form-link'>
                  Link al sito web/GitHub (opzionale)
                </Label>
                <Input
                  id='form-link'
                  type='url'
                  placeholder="Inserisci l'URL..."
                  value={
                    formLink.startsWith("https://")
                      ? formLink
                      : formLink
                      ? `https://${formLink}`
                      : ""
                  }
                  onChange={(e) => setFormLink(e.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='form-category'>
                  Categoria (opzionale, l'AI la inferirà)
                </Label>
                <Combobox
                  id='form-category'
                  items={categories.map((c) => ({ value: c, label: c }))}
                  value={formCategory}
                  onChange={setFormCategory}
                  placeholder='Seleziona o crea categoria...'
                  inputPlaceholder='Cerca o crea categoria...'
                  allowNew
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='form-source'>Fonte (es. Product Hunt, X)</Label>
                <Input
                  id='form-source'
                  type='text'
                  placeholder='Inserisci la fonte...'
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='form-brand'>Brand (opzionale)</Label>
                <Combobox
                  id='form-brand'
                  items={brands.map((b) => ({ value: b, label: b }))}
                  value={formBrand}
                  onChange={setFormBrand}
                  placeholder='Seleziona o crea brand...'
                  inputPlaceholder='Cerca o crea brand...'
                  allowNew
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type='button'
                    variant='outline'
                  >
                    Annulla
                  </Button>
                </DialogClose>
                <Button
                  type='submit'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Salvataggio...
                    </>
                  ) : (
                    "Analizza e Salva Tool"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ImportDialog
          open={openImportDialog}
          onOpenChange={setOpenImportDialog}
        />
        
        <DuplicatesDialog
          open={openDuplicatesDialog}
          onOpenChange={setOpenDuplicatesDialog}
          duplicateGroups={duplicateGroups}
          onDelete={handleBatchDelete}
        />

        <NormalizeDialog
            open={openNormalizeDialog}
            onOpenChange={setOpenNormalizeDialog}
            tools={aiTools}
            onNormalize={handleBatchNormalize}
            isNormalizing={isNormalizing}
        />

      </div>
    </div>
  );
}

export default function Home() {
  return <AiToolList />;
}

    