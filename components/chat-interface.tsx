"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2 } from "lucide-react"

interface ChatInterfaceProps {
  document: any
  setDocument: (doc: any) => void
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function ChatInterface({ document, setDocument }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])


  // Old function removed - now using AI agents

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          document: document
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      // Check if response is JSON (document update) or stream (chat response)
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        // Handle document update response
        const data = await response.json()
        
        if (data.type === 'database_lookup') {
          const lookupMessages = Array.isArray(data.messages) ? data.messages : []
          if (lookupMessages.length > 0) {
            const newMessages: Message[] = lookupMessages.map((msg: any, index: number) => ({
              id: (Date.now() + index + 1).toString(),
              role: msg.role === 'assistant' ? 'assistant' : 'assistant',
              content: msg.content ?? ''
            }))
            setMessages(prev => [...prev, ...newMessages])
          } else {
            const fallbackMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: "I checked the database but didn't receive any information."
            }
            setMessages(prev => [...prev, fallbackMessage])
          }
        } else if (data.type === 'document_update') {
          // Show loading message for document processing
          setIsGeneratingDocument(true)
          const loadingMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.agent === 'generating' 
              ? "Generating your comprehensive PIF document... This may take a moment."
              : "Updating your PIF document... Making targeted improvements."
          }
          setMessages(prev => [...prev, loadingMessage])

          // Add a delay to show the loading state
          await new Promise(resolve => setTimeout(resolve, 2000))

          // Update the document
          setDocument(data.document)

          // Replace loading message with success message
          const successMessage = data.agent === 'generating'
            ? `Perfect! I've generated a comprehensive PIF for ${data.decision.country || 'your project'}. The document is now ready for review.`
            : `Great! I've updated your PIF document based on your request. The changes have been applied successfully.`

          setMessages(prev => 
            prev.map(msg => 
              msg.id === loadingMessage.id 
                ? { ...msg, content: successMessage }
                : msg
            )
          )
        }
      } else {
        // Handle streaming chat response
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        let assistantContent = ""
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: ""
        }

        setMessages(prev => [...prev, assistantMessage])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          assistantContent += chunk
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: assistantContent }
                : msg
            )
          )
        }
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsGeneratingDocument(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <h2 className="text-lg font-semibold text-card-foreground">PIF Assistant</h2>
        <p className="text-sm text-muted-foreground">Ask me to edit or improve your document</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-6 py-4" ref={scrollRef} style={{ scrollbarWidth: 'thin' }}>
          <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">Begin by picking a country for your PIF, then use the chat to refine the document</p>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Try these examples:</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInput("Create a PIF for Kenya")
                    }}
                  >
                    Create a PIF for Kenya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInput("Create a PIF for Pakistan")
                    }}
                  >
                    Create a PIF for Pakistan
                  </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput("Create a PIF for Cuba")
                      }}
                    >
                      Create a PIF for Cuba
                  </Button>
                </div>
              </div>
            </div>
          )}

            {messages.map((message: any) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  {(message.content.includes("Generating your comprehensive PIF document") || message.content.includes("Updating your PIF document")) && (
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs opacity-70">
                        {message.content.includes("Generating") ? "Creating comprehensive document..." : "Making targeted updates..."}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </ScrollArea>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-6 py-4 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isLoading || isGeneratingDocument}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading || isGeneratingDocument}>
            {isLoading || isGeneratingDocument ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
