"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText } from "lucide-react"

interface DocumentSection {
  id: string
  title: string
  content: string
}

interface Document {
  title: string
  sections: DocumentSection[]
}

interface DocumentViewerProps {
  document: Document
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-4 flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold text-card-foreground">{document.title}</h1>
      </div>

      {/* Document Content */}
      <ScrollArea className="flex-1 bg-muted/30">
        <div className="max-w-4xl mx-auto py-12 px-8">
          {/* Document Page */}
          <div className="bg-card shadow-lg rounded-lg border border-border min-h-[297mm] p-16">
            {/* Document Header */}
            <div className="text-center mb-12 pb-8 border-b-2 border-primary/20">
              <div className="inline-block mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2 text-balance">{document.title}</h1>
              <p className="text-sm text-muted-foreground">United Nations Development Programme</p>
            </div>

            {/* Document Sections */}
            <div className="space-y-8">
              {document.sections.map((section) => (
                <section key={section.id} className="scroll-mt-8">
                  <h2 className="text-xl font-semibold text-foreground mb-4 text-balance">{section.title}</h2>
                  <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-pretty">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>

            {/* Document Footer */}
            <div className="mt-16 pt-8 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Document generated on{" "}
                {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
