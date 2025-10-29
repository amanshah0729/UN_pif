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
  // Show placeholder if no document content
  if (!document.title || document.sections.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-card px-8 py-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-card-foreground">PIF Document</h1>
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
                  <h2 className="text-xl font-semibold text-gray-700 mb-4">Ready to Generate Your PIF</h2>
                  <p className="text-gray-600 leading-relaxed mb-6 text-sm">
                    Start by selecting a country or describing your project in the chat interface. 
                    I'll generate a comprehensive Project Information Form tailored to your needs.
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-4 flex items-center gap-3 shrink-0">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold text-card-foreground">{document.title}</h1>
      </div>

      {/* Document Content */}
      <div className="flex-1 bg-gray-100 overflow-hidden">
        <div className="h-full flex justify-center items-center p-4">
          {/* Document Page Container */}
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

            {/* Scrollable Content Area */}
            <ScrollArea className="h-full pt-16" style={{ scrollbarWidth: 'thin' }}>
              <div className="px-8 py-6 min-h-full">
                {/* Document Title */}
                <div className="text-center mb-8 pb-4 border-b-2 border-gray-300">
                  <h1 className="text-xl font-bold text-gray-900 mb-2 leading-tight tracking-tight">{document.title}</h1>
                  <p className="text-sm text-gray-600 font-medium">United Nations Development Programme</p>
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    Generated on {new Date().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {/* Document Sections */}
                <div className="space-y-8">
                  {document.sections.map((section, index) => (
                    <section key={section.id} className="break-inside-avoid">
                      <h2 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200 tracking-wide">
                        {index + 1}. {section.title.toUpperCase()}
                      </h2>
                      <div className="text-gray-800 leading-7 text-sm whitespace-pre-wrap" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                        {section.content}
                      </div>
                    </section>
                  ))}
                </div>

                {/* Document Footer */}
                <div className="mt-8 pt-4 border-t-2 border-gray-300 text-center">
                  <p className="text-xs text-gray-500 font-mono">
                    Page 1 of 1 | Generated by PIF Assistant | {new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </ScrollArea>

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
