"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Edit, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const SECTION_NAMES = [
  'GHG Inventory',
  'Climate Transparency',
  'Adaptation and Vulnerability',
  'NDC Tracking',
  'Institutional Framework for Climate Action',
  'National Policy Framework',
  'Support Needed and Received',
  'Key Barriers',
  'Other Baseline Initiatives',
  'Official Reporting to the UNFCCC'
]

interface EditPifModalProps {
  onEditSubmit: (sections: string[], editInstructions: string) => void
  isSubmitting?: boolean
}

export function EditPifModal({ onEditSubmit, isSubmitting = false }: EditPifModalProps) {
  const [open, setOpen] = useState(false)
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [editInstructions, setEditInstructions] = useState("")

  const handleSectionToggle = (sectionName: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionName)
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    )
  }

  const handleSelectAll = () => {
    if (selectedSections.length === SECTION_NAMES.length) {
      setSelectedSections([])
    } else {
      setSelectedSections([...SECTION_NAMES])
    }
  }

  const handleSubmit = () => {
    if (selectedSections.length === 0) {
      alert("Please select at least one section to edit")
      return
    }
    if (!editInstructions.trim()) {
      alert("Please provide edit instructions")
      return
    }
    
    onEditSubmit(selectedSections, editInstructions.trim())
    // Reset form
    setSelectedSections([])
    setEditInstructions("")
    setOpen(false)
  }

  const handleCancel = () => {
    setSelectedSections([])
    setEditInstructions("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isSubmitting}
        >
          <Edit className="h-4 w-4" />
          Edit PIF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit PIF</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
          {/* Section Selection */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Select Sections to Edit</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-7 text-xs"
                type="button"
              >
                {selectedSections.length === SECTION_NAMES.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <ScrollArea className="h-[200px] border rounded-md p-3">
              <div className="space-y-2">
                {SECTION_NAMES.map((sectionName) => (
                  <div
                    key={sectionName}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleSectionToggle(sectionName)}
                  >
                    <Checkbox
                      id={`section-${sectionName}`}
                      checked={selectedSections.includes(sectionName)}
                      onCheckedChange={() => handleSectionToggle(sectionName)}
                    />
                    <Label
                      htmlFor={`section-${sectionName}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {sectionName}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {selectedSections.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedSections.length} section{selectedSections.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Edit Instructions */}
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <Label htmlFor="edit-instructions" className="text-sm font-semibold">
              Edit Instructions
            </Label>
            <Textarea
              id="edit-instructions"
              placeholder="Describe what changes you want to make to the selected sections. Be as specific as possible..."
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              className="flex-1 min-h-[120px] resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Example: "Update the GHG Inventory section to include data from 2023. Add a new row to Table 3 with the latest inventory submission."
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 shrink-0 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedSections.length === 0 || !editInstructions.trim()}
            type="button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Edits'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


