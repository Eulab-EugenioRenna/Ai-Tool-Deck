
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "./badge" // If you want to display the selected value as a badge

interface ComboboxProps {
  id?: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputPlaceholder?: string;
  emptyMessage?: string;
  allowNew?: boolean; // Prop to enable creating new items
  className?: string;
}

export function Combobox({
  id,
  items,
  value,
  onChange,
  placeholder = "Select item...",
  inputPlaceholder = "Search item...",
  emptyMessage = "No item found.",
  allowNew = false, // Default to not allowing new items
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("") // State to track input field value for new items

  const handleSelect = (currentValue: string) => {
    onChange(currentValue === value ? "" : currentValue)
    setOpen(false)
    setInputValue("") // Clear input on selection
  }

   const handleCreateNew = () => {
    if (allowNew && inputValue && !items.some(item => item.label.toLowerCase() === inputValue.toLowerCase())) {
      onChange(inputValue); // Set the new value
      setOpen(false);
      setInputValue("") // Clear input after creation
    }
  }

   // Filter items based on input, case-insensitive
   const filteredItems = items.filter(item =>
     item.label.toLowerCase().includes(inputValue.toLowerCase())
   );


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)} // Ensure button takes full width and looks like an input
        >
          {value
            ? items.find((item) => item.value === value)?.label || value // Display label or value if label not found (for new items)
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}> {/* Disable default filtering as we handle it */}
          <CommandInput
             placeholder={inputPlaceholder}
             value={inputValue}
             onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
                {allowNew && inputValue ? (
                    <div className="text-center py-2 text-sm text-muted-foreground">Nessun risultato.</div>
                ) : (
                     emptyMessage
                 )}
            </CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label} // Use label for searching in CommandInput
                  onSelect={() => handleSelect(item.value)} // Use value for the actual state change
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
              {allowNew && inputValue && !items.some(item => item.label.toLowerCase() === inputValue.toLowerCase()) && (
                 <>
                   <CommandSeparator />
                   <CommandGroup>
                     <CommandItem
                       onSelect={handleCreateNew}
                       className="text-primary cursor-pointer"
                      >
                       <PlusCircle className="mr-2 h-4 w-4" />
                       Crea "{inputValue}"
                     </CommandItem>
                   </CommandGroup>
                 </>
               )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
