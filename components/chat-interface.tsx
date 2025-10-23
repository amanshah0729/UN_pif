"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2 } from "lucide-react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

interface ChatInterfaceProps {
  document: any
  setDocument: (doc: any) => void
}

export function ChatInterface({ document, setDocument }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState("")

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    body: {
      document: JSON.stringify(document),
    },
    onFinish: (message) => {
      // Parse AI response for document updates
      try {
        const content = message.parts.find((p) => p.type === "text")?.text || ""
        if (content.includes("DOCUMENT_UPDATE:")) {
          const jsonMatch = content.match(/DOCUMENT_UPDATE:\s*({[\s\S]*})/)
          if (jsonMatch) {
            const updatedDoc = JSON.parse(jsonMatch[1])
            setDocument(updatedDoc)
          }
        }
      } catch (e) {
        console.error("Failed to parse document update:", e)
      }
    },
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || status === "in_progress") return

    sendMessage({ text: inputValue })
    setInputValue("")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <h2 className="text-lg font-semibold text-card-foreground">PIF Assistant</h2>
        <p className="text-sm text-muted-foreground">Ask me to edit or improve your document</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">Start a conversation to draft and refine your PIF</p>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Try asking:</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInputValue("Make the executive summary more concise")
                    }}
                  >
                    Make the executive summary more concise
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInputValue("Add a risk assessment section")
                    }}
                  >
                    Add a risk assessment section
                  </Button>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    // Filter out DOCUMENT_UPDATE JSON from display
                    const displayText = part.text.replace(/DOCUMENT_UPDATE:\s*{[\s\S]*}/, "").trim()
                    return displayText ? (
                      <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap">
                        {displayText}
                      </p>
                    ) : null
                  }
                  return null
                })}
              </div>
            </div>
          ))}

          {status === "in_progress" && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-card px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={status === "in_progress"}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim() || status === "in_progress"}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
