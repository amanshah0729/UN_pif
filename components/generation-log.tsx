"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle2, Database, Globe, Loader2, FileText, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LogEntry {
  id: string
  timestamp: Date
  type: 'info' | 'success' | 'warning' | 'error' | 'section'
  message: string
  section?: string
  source?: 'database' | 'ai'
  sources?: string[]
  databaseData?: any
}

interface GenerationLogProps {
  entries: LogEntry[]
  isProcessing: boolean
}

export function GenerationLog({ entries, isProcessing }: GenerationLogProps) {
  return (
    <div className="flex flex-col h-[300px] border-t border-border bg-muted/30 shrink-0">
      <div className="px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Generation Log</h3>
          {isProcessing && (
            <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4 min-h-0">
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No activity yet. Start generating a PIF to see progress.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "text-sm space-y-1 p-3 rounded-lg border",
                  entry.type === 'success' && "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900",
                  entry.type === 'warning' && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-900",
                  entry.type === 'error' && "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900",
                  entry.type === 'section' && entry.source === 'database' && "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900",
                  entry.type === 'section' && entry.source === 'ai' && "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-900",
                  entry.type === 'info' && "bg-card border-border"
                )}
              >
                <div className="flex items-start gap-2">
                  {entry.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />}
                  {entry.type === 'section' && entry.source === 'database' && <Database className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />}
                  {entry.type === 'section' && entry.source === 'ai' && <Globe className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />}
                  {entry.type === 'info' && <Loader2 className="h-4 w-4 animate-spin text-primary mt-0.5 shrink-0" />}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-foreground">{entry.message}</div>
                      {entry.databaseData && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs shrink-0"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View JSON
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                            <DialogHeader className="shrink-0">
                              <DialogTitle>Database Data</DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 min-h-0 overflow-hidden">
                              <ScrollArea className="h-full w-full">
                                <pre className="text-xs bg-muted p-4 rounded-lg whitespace-pre-wrap break-words">
                                  {JSON.stringify(entry.databaseData, null, 2)}
                                </pre>
                              </ScrollArea>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    {entry.section && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Section: <span className="font-medium">{entry.section}</span>
                      </div>
                    )}
                    {entry.sources && entry.sources.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Sources:</div>
                        <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                          {entry.sources.map((source, idx) => (
                            <li key={idx} className="break-words">{source}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {entry.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

