"use client"

import { useEffect, useState, useCallback } from "react"
import { PifGeneratorForm } from "./pif-generator-form"
import { DocumentViewer } from "./document-viewer"
import { convertProseMirrorToDocument, convertDocumentToProseMirror } from "@/lib/document-converter"

interface Document {
  title: string
  sections: Array<{ id: string; title: string; content: string }>
}

export function PifDashboard() {
  const [editorContent, setEditorContent] = useState<any | null>(null)
  const [document, setDocument] = useState<Document>({
    title: "Project Information Form",
    sections: []
  })
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true)

  // Load default template on mount
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const response = await fetch("/pif-template.json")
        if (!response.ok) {
          throw new Error(`Failed to load template: ${response.statusText}`)
        }
        const json = await response.json()
        setEditorContent(json)
        setDocument(convertProseMirrorToDocument(json))
      } catch (error) {
        console.error("Error loading template:", error)
      } finally {
        setIsLoadingTemplate(false)
      }
    }

    loadTemplate()
  }, [])

  const handleDocumentChange = useCallback((json: any) => {
    if (!json) return
    setEditorContent(json)
    setDocument(convertProseMirrorToDocument(json))
  }, [])

  const handleDocumentGenerated = useCallback((updatedDoc: any) => {
    setDocument(updatedDoc)
    const updatedContent = convertDocumentToProseMirror(updatedDoc)
    setEditorContent(updatedContent)
  }, [])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* PIF Generator Form - Left Side */}
      <div className="w-2/5 border-r border-border h-screen overflow-hidden">
        <PifGeneratorForm onDocumentGenerated={handleDocumentGenerated} />
      </div>

      {/* Document Viewer - Right Side */}
      <div className="w-3/5 h-screen overflow-hidden">
        <DocumentViewer
          title={document.title}
          content={isLoadingTemplate ? null : editorContent}
          onDocumentChange={handleDocumentChange}
        />
      </div>
    </div>
  )
}
