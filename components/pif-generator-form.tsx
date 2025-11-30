"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { InlineFileUpload } from "./inline-file-upload"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GenerationLog, type LogEntry } from "./generation-log"

interface PifGeneratorFormProps {
  onDocumentGenerated: (document: any) => void
}

type Status = 'idle' | 'processing-files' | 'checking-database' | 'generating' | 'success' | 'error'

export function PifGeneratorForm({ onDocumentGenerated }: PifGeneratorFormProps) {
  const [country, setCountry] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [fileTypes, setFileTypes] = useState<string[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [statusMessage, setStatusMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])

  const handleFilesChange = (newFiles: File[], newFileTypes: string[]) => {
    setFiles(newFiles)
    setFileTypes(newFileTypes)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!country.trim()) {
      setError("Please enter a country name")
      return
    }

    console.log(`\n[PIF Generator] Generate PIF button clicked for: ${country.trim()}`)

    setError(null)
    setStatus('idle')
    setStatusMessage("")
    setLogEntries([]) // Clear previous log entries

    try {
      // Add initial log entry
      setLogEntries([{
        id: `start-${Date.now()}`,
        timestamp: new Date(),
        type: 'info',
        message: `Starting PIF generation for ${country.trim()}...`,
      }])
      // Step 1: Process files if any
      if (files.length > 0) {
        setStatus('processing-files')
        setStatusMessage("Processing your files... Parsing documents and extracting information. This may take up to a minute.")
        
        const fileFormData = new FormData()
        fileFormData.append('country', country.trim())
        files.forEach((file) => {
          fileFormData.append('files', file)
        })
        fileTypes.forEach((fileType) => {
          fileFormData.append('fileTypes', fileType)
        })
        
        const fileResponse = await fetch('/api/process-files', {
          method: 'POST',
          body: fileFormData,
        })
        
        if (!fileResponse.ok) {
          const errorData = await fileResponse.json().catch(() => ({ error: 'Failed to process files' }))
          throw new Error(errorData.error || 'Failed to process files')
        }
        
        const fileData = await fileResponse.json()
        if (fileData.error) {
          throw new Error(fileData.error)
        }
        
        setLogEntries(prev => [...prev, {
          id: `files-processed-${Date.now()}`,
          timestamp: new Date(),
          type: 'success',
          message: `Successfully processed ${files.length} file(s)`,
        }])
        console.log(`[PIF Generator] File processing complete: ${files.length} file(s) uploaded and extracted`)
      } else {
        console.log(`[PIF Generator] No files to process - skipping file upload step`)
      }

      // Step 2: Generate PIF
      setStatus('generating')
      setStatusMessage("Generating your PIF document... This may take up to 5 minutes.")

      const generateFormData = new FormData()
      generateFormData.append('country', country.trim())

      const response = await fetch('/api/generate-pif', {
        method: 'POST',
        body: generateFormData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate PIF' }))
        throw new Error(errorData.error || 'Failed to generate PIF')
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Add log entries from response
      if (data.logEntries && Array.isArray(data.logEntries)) {
        const formattedEntries: LogEntry[] = data.logEntries.map((entry: any) => ({
          id: entry.id,
          timestamp: new Date(entry.timestamp),
          type: entry.type,
          message: entry.message,
          section: entry.section,
          source: entry.source,
          sources: entry.sources,
          databaseData: entry.databaseData, // Include database data
        }))
        setLogEntries(prev => [...prev, ...formattedEntries])
      }

      // Success!
      setStatus('success')
      setStatusMessage(`Successfully generated PIF for ${country}`)
      onDocumentGenerated(data.document)

      // Reset form after a moment
      setTimeout(() => {
        setCountry("")
        setFiles([])
        setFileTypes([])
        setStatus('idle')
        setStatusMessage("")
      }, 3000)

    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setStatusMessage("")
    }
  }

  const isLoading = status === 'processing-files' || status === 'checking-database' || status === 'generating'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Create New PIF</h2>
            <p className="text-sm text-muted-foreground">Generate a Project Information Form for your country</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6 border-b border-border">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {/* Country Input */}
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Enter country name (e.g., Kenya, Pakistan, Cuba)"
              className="w-full"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the name of the country for which you want to generate a PIF
            </p>
          </div>

          {/* File Upload Section */}
          <div className="space-y-2">
            <Label>Reference Documents (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-4">
              Upload PDF or DOCX documents that the AI can reference when generating your PIF. 
              Documents will be parsed and relevant information will be extracted and stored.
            </p>
            <InlineFileUpload onFilesChange={handleFilesChange} />
          </div>

          {/* Status Messages */}
          {statusMessage && (
            <Alert className={status === 'error' ? 'border-destructive' : ''}>
              {status === 'processing-files' || status === 'checking-database' || status === 'generating' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : status === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
              ) : status === 'error' ? (
                <AlertCircle className="h-4 w-4 text-destructive mr-2" />
              ) : null}
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !country.trim()}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {status === 'processing-files' && 'Processing Files...'}
                  {status === 'checking-database' && 'Checking Database...'}
                  {status === 'generating' && 'Generating PIF...'}
                </>
              ) : (
                'Create PIF'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Generation Log */}
      <GenerationLog entries={logEntries} isProcessing={isLoading} />
    </div>
  )
}

