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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const updateDocumentFromResponse = async (response: string, userInput: string) => {
    // Check if user mentioned a country
    const countries = ['Kenya', 'Pakistan', 'India', 'Bangladesh', 'Nigeria', 'Ethiopia', 'Tanzania', 'Uganda', 'Ghana', 'Rwanda']
    const mentionedCountry = countries.find(country => 
      userInput.toLowerCase().includes(country.toLowerCase()) || 
      userInput.toLowerCase().includes(`pif for ${country.toLowerCase()}`) ||
      userInput.toLowerCase().includes(`create a pif for ${country.toLowerCase()}`)
    )

    if (mentionedCountry) {
      // Add a small delay to make the update feel more natural
      setTimeout(() => {
        const countrySpecificContent = generateCountrySpecificContent(mentionedCountry, response)
        setDocument((prev: any) => ({
          ...prev,
          title: `Project Information Form - ${mentionedCountry}`,
          sections: countrySpecificContent
        }))
      }, 1000) // 1 second delay
    }
  }

  const generateCountrySpecificContent = (country: string, aiResponse: string) => {
    // This is a simplified version - in a real app, you'd call an API to generate content
    const baseContent = {
      'Kenya': [
        {
          id: "executive-summary",
          title: "Executive Summary",
          content: `This project aims to address critical development challenges in Kenya, focusing on sustainable agriculture, water access, and economic empowerment in rural communities. The initiative will leverage Kenya's growing tech sector and strong community networks to create lasting impact.`
        },
        {
          id: "project-objectives",
          title: "Project Objectives",
          content: `1. Improve agricultural productivity through climate-smart farming techniques\n2. Enhance access to clean water and sanitation in rural areas\n3. Strengthen women's economic participation and leadership\n4. Build digital literacy and connectivity in underserved communities\n5. Support youth entrepreneurship and job creation`
        },
        {
          id: "implementation-strategy",
          title: "Implementation Strategy",
          content: `The project will be implemented across Kenya's 47 counties, with a focus on arid and semi-arid lands (ASALs). Phase 1 (Months 1-8): Community engagement and baseline assessments. Phase 2 (Months 9-18): Infrastructure development and capacity building. Phase 3 (Months 19-24): Monitoring, evaluation, and knowledge transfer to local institutions.`
        },
        {
          id: "budget",
          title: "Budget and Resources",
          content: `Total estimated budget: $3,200,000 USD\n\nBreakdown:\n- Agricultural interventions: $1,200,000\n- Water and sanitation: $800,000\n- Digital infrastructure: $600,000\n- Capacity building: $400,000\n- Monitoring & Evaluation: $200,000`
        },
        {
          id: "expected-outcomes",
          title: "Expected Outcomes",
          content: `By project completion, we expect to reach 75,000 direct beneficiaries across Kenya, with 40% being women and youth. The initiative will create 500 sustainable jobs, establish 25 community-led organizations, and improve agricultural yields by 30% in target areas.`
        }
      ],
      'Pakistan': [
        {
          id: "executive-summary",
          title: "Executive Summary",
          content: `This project addresses Pakistan's critical development needs, focusing on education, healthcare access, and economic opportunities in underserved regions. The initiative will build on Pakistan's strong community networks and emerging digital infrastructure to create sustainable impact.`
        },
        {
          id: "project-objectives",
          title: "Project Objectives",
          content: `1. Improve access to quality education, especially for girls\n2. Enhance healthcare services in rural and urban slums\n3. Promote economic opportunities for women and youth\n4. Strengthen disaster resilience and climate adaptation\n5. Build digital skills and connectivity in remote areas`
        },
        {
          id: "implementation-strategy",
          title: "Implementation Strategy",
          content: `The project will be implemented across Pakistan's four provinces, with special focus on Balochistan and Khyber Pakhtunkhwa. Phase 1: Stakeholder engagement and needs assessment. Phase 2: Infrastructure development and service delivery. Phase 3: Capacity building and sustainability planning.`
        },
        {
          id: "budget",
          title: "Budget and Resources",
          content: `Total estimated budget: $2,800,000 USD\n\nBreakdown:\n- Education infrastructure: $900,000\n- Healthcare services: $700,000\n- Economic development: $600,000\n- Disaster resilience: $400,000\n- Monitoring & Evaluation: $200,000`
        },
        {
          id: "expected-outcomes",
          title: "Expected Outcomes",
          content: `The project will directly benefit 60,000 people across Pakistan, with 50% being women and children. We expect to establish 30 community centers, train 200 local facilitators, and improve school enrollment rates by 25% in target areas.`
        }
      ]
    }

    return baseContent[country as keyof typeof baseContent] || baseContent['Kenya']
  }

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

      // Check if the response contains country-specific information and update document
      await updateDocumentFromResponse(assistantContent, userMessage.content)
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
    }
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
              </div>
            </div>
          ))}

        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-card px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
            {isLoading ? (
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
