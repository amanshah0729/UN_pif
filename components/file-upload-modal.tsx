"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Plus, X, Upload } from "lucide-react"

interface FileRow {
  id: string
  fileType: string
  file: File | null
}

interface FileUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: (files: File[], fileTypes: string[], country: string) => void
  onSkip: () => void
}

const FILE_TYPES = [
  "BNR",
  "CBIT",
  "NDC",
  "BUR",
  "NC",
  "Other"
]

export function FileUploadModal({ open, onOpenChange, onContinue, onSkip }: FileUploadModalProps) {
  const [country, setCountry] = useState<string>("")
  const [fileRows, setFileRows] = useState<FileRow[]>([
    { id: "1", fileType: "", file: null }
  ])

  const handleAddRow = () => {
    setFileRows([...fileRows, { id: Date.now().toString(), fileType: "", file: null }])
  }

  const handleRemoveRow = (id: string) => {
    if (fileRows.length > 1) {
      setFileRows(fileRows.filter(row => row.id !== id))
    }
  }

  const handleFileTypeChange = (id: string, fileType: string) => {
    setFileRows(fileRows.map(row => 
      row.id === id ? { ...row, fileType } : row
    ))
  }

  const handleFileChange = (id: string, file: File | null) => {
    setFileRows(fileRows.map(row => 
      row.id === id ? { ...row, file } : row
    ))
  }

  const handleContinue = () => {
    if (!country) return
    
    // Filter out rows without files
    const validRows = fileRows.filter(row => row.file && row.fileType)
    const files = validRows.map(row => row.file!).filter(Boolean)
    const fileTypes = validRows.map(row => row.fileType).filter(Boolean)
    
    onContinue(files, fileTypes, country)
    // Reset form
    setCountry("")
    setFileRows([{ id: "1", fileType: "", file: null }])
  }

  const handleSkip = () => {
    onSkip()
    // Reset form
    setCountry("")
    setFileRows([{ id: "1", fileType: "", file: null }])
  }

  const canContinue = country && fileRows.some(row => row.file && row.fileType)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Reference Documents</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload PDF documents that the AI can reference when generating or editing your PIF.
          </p>
          
          {/* Country Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Country</label>
            <Input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Enter country name"
              className="w-full"
            />
          </div>
          
          <div className="border rounded-lg">
            <div className="grid grid-cols-2 gap-4 p-4 border-b bg-muted/50">
              <div className="font-medium text-sm">File Type</div>
              <div className="font-medium text-sm">File</div>
            </div>
            
            <div className="divide-y">
              {fileRows.map((row, index) => (
                <div key={row.id} className="grid grid-cols-2 gap-4 p-4 items-center">
                  <div>
                    <Select
                      value={row.fileType}
                      onValueChange={(value) => handleFileTypeChange(row.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select file type" />
                      </SelectTrigger>
                      <SelectContent>
                        {FILE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept=".pdf,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          handleFileChange(row.id, file)
                        }}
                        className="cursor-pointer"
                      />
                    </div>
                    {fileRows.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRow(row.id)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {row.file && (
                    <div className="col-span-2 text-xs text-muted-foreground flex items-center gap-2">
                      <Upload className="h-3 w-3" />
                      {row.file.name} ({(row.file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another File
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleContinue} disabled={!canContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

