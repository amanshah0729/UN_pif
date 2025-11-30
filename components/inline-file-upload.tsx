"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Plus, X, Upload } from "lucide-react"

interface FileRow {
  id: string
  fileType: string
  file: File | null
}

interface InlineFileUploadProps {
  onFilesChange: (files: File[], fileTypes: string[]) => void
}

const FILE_TYPES = [
  "BNR",
  "CBIT",
  "NDC",
  "BUR",
  "NC",
  "Other"
]

export function InlineFileUpload({ onFilesChange }: InlineFileUploadProps) {
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
    const updatedRows = fileRows.map(row => 
      row.id === id ? { ...row, fileType } : row
    )
    setFileRows(updatedRows)
    notifyFilesChange(updatedRows)
  }

  const handleFileChange = (id: string, file: File | null) => {
    const updatedRows = fileRows.map(row => 
      row.id === id ? { ...row, file } : row
    )
    setFileRows(updatedRows)
    notifyFilesChange(updatedRows)
  }

  const notifyFilesChange = (rows: FileRow[]) => {
    const validRows = rows.filter(row => row.file && row.fileType)
    const files = validRows.map(row => row.file!).filter(Boolean)
    const fileTypes = validRows.map(row => row.fileType).filter(Boolean)
    onFilesChange(files, fileTypes)
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <div className="grid grid-cols-2 gap-4 p-4 border-b bg-muted/50">
          <div className="font-medium text-sm">File Type</div>
          <div className="font-medium text-sm">File</div>
        </div>
        
        <div className="divide-y">
          {fileRows.map((row) => (
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
                    type="button"
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
            type="button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another File
          </Button>
        </div>
      </div>
    </div>
  )
}

