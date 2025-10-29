"use client"

import { useState } from "react"
import { ChatInterface } from "./chat-interface"
import { DocumentViewer } from "./document-viewer"

export function PifDashboard() {
  const [document, setDocument] = useState({
    title: "",
    sections: []
  })

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Chat Interface - Left Side */}
      <div className="w-2/5 border-r border-border h-screen overflow-hidden">
        <ChatInterface document={document} setDocument={setDocument} />
      </div>

      {/* Document Viewer - Right Side */}
      <div className="w-3/5 h-screen overflow-hidden">
        <DocumentViewer document={document} />
      </div>
    </div>
  )
}
