"use client"

import { useState } from "react"
import { FileText, Download, Loader2 } from "lucide-react"
import { RichTextEditor } from "./rich-text-editor"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { EditPifModal } from "./edit-pif-modal"

interface DocumentViewerProps {
  title?: string
  content: any | null
  onDocumentChange?: (json: any) => void
  onAddLogEntry?: (entry: { id: string; timestamp: Date; type: 'info' | 'success' | 'warning' | 'error' | 'section'; message: string; section?: string }) => void
}

export function DocumentViewer({ title = "Project Information Form", content, onDocumentChange, onAddLogEntry }: DocumentViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  const handleEditSubmit = async (sections: string[], editInstructions: string) => {
    if (!content) {
      if (onAddLogEntry) {
        onAddLogEntry({
          id: `edit-error-${Date.now()}`,
          timestamp: new Date(),
          type: 'error',
          message: 'No document to edit. Please generate a PIF first.',
        })
      }
      return
    }

    // Add log entry for edit submission
    if (onAddLogEntry) {
      onAddLogEntry({
        id: `edit-submit-${Date.now()}`,
        timestamp: new Date(),
        type: 'info',
        message: `Submitting edits for sections: ${sections.join(', ')}`,
      })
    }

    setIsSubmittingEdit(true)
    try {
      console.log(`[Edit] Submitting edits for sections: ${sections.join(', ')}`)
      
      const response = await fetch('/api/edit-pif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proseMirrorJson: content,
          sections,
          editInstructions,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to edit PIF' }))
        throw new Error(errorData.error || 'Failed to edit PIF')
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Update the document with edited content
      if (data.document && onDocumentChange) {
        onDocumentChange(data.document)
      }

      // Add log entry for successful edit completion
      if (onAddLogEntry) {
        if (data.failedEdits && data.failedEdits.length > 0) {
          onAddLogEntry({
            id: `edit-partial-${Date.now()}`,
            timestamp: new Date(),
            type: 'warning',
            message: `Edits completed with some issues. Successful: ${data.successfulEdits.join(', ')}. Failed: ${data.failedEdits.join(', ')}`,
          })
        } else {
          onAddLogEntry({
            id: `edit-success-${Date.now()}`,
            timestamp: new Date(),
            type: 'success',
            message: `Successfully edited sections: ${data.successfulEdits.join(', ')}`,
          })
        }
      }
    } catch (error) {
      console.error('Error submitting edits:', error)
      if (onAddLogEntry) {
        onAddLogEntry({
          id: `edit-error-${Date.now()}`,
          timestamp: new Date(),
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to submit edits. Please try again.',
        })
      }
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  const handleDownload = async () => {
    if (!content) return

    setIsDownloading(true)
    try {
      // Extract filename from title
      const filename = title.replace(/[^a-zA-Z0-9]/g, '_') + '.docx'

      const response = await fetch('/api/download-pif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proseMirrorJson: content,
          filename,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to download document')
      }

      // Get the blob and create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Failed to download document. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!content) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-card px-8 py-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-card-foreground">{title}</h1>
        </div>

        {/* Placeholder Content */}
        <div className="flex-1 bg-gray-100 overflow-hidden">
          <div className="h-full flex justify-center items-center p-4">
            {/* Empty Document Page */}
            <div className="bg-white shadow-2xl border border-gray-300 w-full max-w-4xl h-full max-h-[calc(100vh-8rem)] relative overflow-hidden" style={{ 
              boxShadow: '0 0 20px rgba(0,0,0,0.1), 0 0 40px rgba(0,0,0,0.05)',
              borderRadius: '2px',
              aspectRatio: '210/297'
            }}>
              {/* Document Header */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">PIF Document</span>
                </div>
              </div>

              {/* Empty Content Area */}
              <div className="h-full pt-16 flex items-center justify-center">
                <div className="text-center max-w-md px-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-10 w-10 text-gray-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-700 mb-4">Loading Template</h2>
                  <p className="text-gray-600 leading-relaxed mb-6 text-sm">
                    Please wait while we load your Project Information Form template.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
                    <p className="text-sm text-gray-600 mb-2 font-medium">Try these examples:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• "Create a PIF for Kenya focusing on agriculture"</li>
                      <li>• "Generate a PIF for Pakistan with climate adaptation"</li>
                      <li>• "Make a PIF for Cuba with biodiversity focus"</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Page Shadow Effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-b from-gray-200/50 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-linear-to-t from-gray-200/50 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-card-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <EditPifModal 
            onEditSubmit={handleEditSubmit}
            isSubmitting={isSubmittingEdit}
          />
          <Button
            onClick={handleDownload}
            disabled={isDownloading || !content}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download DOCX
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/30 overflow-hidden">
        <div className="h-full flex justify-center items-center p-4">
          <div className="bg-white shadow-2xl border border-gray-300 w-full max-w-4xl h-full max-h-[calc(100vh-8rem)] relative overflow-hidden" style={{ 
            boxShadow: '0 0 20px rgba(0,0,0,0.1), 0 0 40px rgba(0,0,0,0.05)',
            borderRadius: '2px',
            aspectRatio: '210/297'
          }}>
            <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">PIF Document</span>
              </div>
            </div>

            <ScrollArea className="h-full pt-16">
              <div className="px-8 py-6 min-h-full">
                <RichTextEditor 
                  content={content}
                  onChange={onDocumentChange}
                  editable={true}
                />
              </div>
            </ScrollArea>

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-b from-gray-200/50 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-linear-to-t from-gray-200/50 to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
