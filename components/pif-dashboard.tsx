"use client"

import { useEffect, useState, useCallback } from "react"
import { ChatInterface } from "./chat-interface"
import { DocumentViewer } from "./document-viewer"
import { convertProseMirrorToDocument, convertDocumentToProseMirror } from "@/lib/document-converter"

export function PifDashboard() {
  const [editorContent, setEditorContent] = useState<any | null>(null)
  const [document, setDocument] = useState({
    title: "Project Information Form",
    sections: []
  })
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true)

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

  const handleChatDocumentUpdate = useCallback((updatedDoc: any) => {
    setDocument(updatedDoc)
    const updatedContent = convertDocumentToProseMirror(updatedDoc)
    setEditorContent(updatedContent)
  }, [])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Chat Interface - Left Side */}
      <div className="w-2/5 border-r border-border h-screen overflow-hidden">
        <ChatInterface document={document} setDocument={handleChatDocumentUpdate} />
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
