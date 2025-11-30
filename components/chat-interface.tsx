"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2, Upload } from "lucide-react"
import { FileUploadModal } from "./file-upload-modal"

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
  const [showFileUploadModal, setShowFileUploadModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    action: 'generate' | 'edit'
    originalMessage: string
  } | null>(null)

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
        } else if (data.type === 'database_lookup_status') {
          // Show database lookup status and proceed with generation
          const dbLookupMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Pulling information from database..."
          }
          setMessages(prev => [...prev, dbLookupMessage])
          
          // Update with result after a moment
          setTimeout(() => {
            const dbResultMessage = data.hasData
              ? "✓ Information found in database."
              : "Information not found in database. Using web sources instead."
            
            setMessages(prev => 
              prev.map(msg => 
                msg.id === dbLookupMessage.id 
                  ? { ...msg, content: dbResultMessage }
                  : msg
              )
            )
            
            // Automatically proceed with generation
            setTimeout(async () => {
              setIsGeneratingDocument(true)
              const generatingMessage: Message = {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "Now generating your PIF document... This may take a moment."
              }
              setMessages(prev => [...prev, generatingMessage])
              
              try {
                // Make request to actually generate the document
                const genResponse = await fetch('/api/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messages: [...messages, {
                      role: 'user',
                      content: data.originalMessage
                    }, {
                      role: 'assistant',
                      content: 'Pulling information from database'
                    }].map(msg => ({
                      role: msg.role,
                      content: msg.content
                    })),
                    document: document
                  }),
                })
                
                if (!genResponse.ok) throw new Error('Failed to generate')
                
                const genData = await genResponse.json()
                if (genData.type === 'document_update') {
                  setDocument(genData.document)
                  
                  const successMessage: Message = {
                    id: (Date.now() + 3).toString(),
                    role: "assistant",
                    content: `✓ Successfully generated a comprehensive PIF for ${genData.decision?.country || data.country || 'your project'}. The document is now ready for review.`
                  }
                  setMessages(prev => [...prev, successMessage])
                  
                  // Remove generating message
                  setMessages(prev => prev.filter(msg => msg.id !== generatingMessage.id))
                  
                  if (data.action && data.originalMessage) {
                    setPendingAction(null)
                  }
                }
              } catch (error) {
                console.error('Error generating:', error)
                const errorMessage: Message = {
                  id: (Date.now() + 4).toString(),
                  role: "assistant",
                  content: "Sorry, I encountered an error generating the document. Please try again."
                }
                setMessages(prev => [...prev, errorMessage])
              } finally {
                setIsGeneratingDocument(false)
              }
            }, 1500)
          }, 1000)
        } else if (data.type === 'file_upload_question') {
          // Show message asking if they want to upload files or use existing data
          const uploadMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Would you like to upload files for me to reference, or should I proceed using the existing information in the database and web sources?"
          }
          setMessages(prev => [...prev, uploadMessage])
          
          // Store pending action for later
          setPendingAction({
            action: data.action,
            originalMessage: data.originalMessage
          })
        } else if (data.type === 'needs_file_upload') {
          // Show message asking for file upload
          const uploadMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Do you have any files you'd like to upload in PDF format for the AI to reference?"
          }
          setMessages(prev => [...prev, uploadMessage])
          
          // Store pending action and show modal
          setPendingAction({
            action: data.action,
            originalMessage: data.originalMessage
          })
          setShowFileUploadModal(true)
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
            ? `Perfect! I've generated a comprehensive PIF for ${data.decision?.country || 'your project'}. The document is now ready for review.`
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

  const [isProcessingFiles, setIsProcessingFiles] = useState(false)

  const handleFileUploadContinue = async (files: File[], fileTypes: string[], country: string) => {
    // Don't close modal yet - show loading state
    setIsProcessingFiles(true)
    setIsLoading(true)
    
    try {
      // Create FormData
      const formData = new FormData()
      
      // If there's a pending action (from agent), include it
      if (pendingAction) {
        formData.append('originalMessage', pendingAction.originalMessage)
        formData.append('messages', JSON.stringify([...messages, {
          role: 'user',
          content: pendingAction.originalMessage
        }]))
        formData.append('document', JSON.stringify(document))
      } else {
        // Manual upload - just send empty messages and document
        formData.append('messages', JSON.stringify([]))
        formData.append('document', JSON.stringify(document))
      }
      
      formData.append('country', country)
      
      // Add files and file types
      files.forEach(file => {
        formData.append('files', file)
      })
      fileTypes.forEach(fileType => {
        formData.append('fileTypes', fileType)
      })
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Failed to process files')
      }
      
      // Handle response
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        
        // Handle document update with step-by-step messages
        if (pendingAction && data.type === 'document_update') {
          // Close modal first
          setShowFileUploadModal(false)
          setIsProcessingFiles(false)
          
          // Show step-by-step messages
          if (data.filesUploaded) {
            // Step 1: Upload complete
            const uploadCompleteMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: "✓ Files uploaded and processed successfully."
            }
            setMessages(prev => [...prev, uploadCompleteMessage])
            
            // Step 2: Database lookup
            const dbLookupMessage: Message = {
              id: (Date.now() + 2).toString(),
              role: "assistant",
              content: "Pulling information from database..."
            }
            setMessages(prev => [...prev, dbLookupMessage])
            
            // Automatically proceed with generation after showing database lookup
            setTimeout(async () => {
              try {
                const genResponse = await fetch('/api/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messages: [...messages, {
                      role: 'user',
                      content: data.originalMessage
                    }, {
                      role: 'assistant',
                      content: 'Files uploaded, pulling information from database'
                    }].map(msg => ({
                      role: msg.role,
                      content: msg.content
                    })),
                    document: document
                  }),
                })
                
                if (!genResponse.ok) throw new Error('Failed to generate')
                
                const genContentType = genResponse.headers.get('content-type')
                if (genContentType?.includes('application/json')) {
                  const genData = await genResponse.json()
                  
                  if (genData.type === 'database_lookup_status') {
                    // Update database lookup message with result
                    const dbResultMessage = genData.hasData
                      ? "✓ Information found in database."
                      : "Information not found in database. Using web sources instead."
                    
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === dbLookupMessage.id 
                          ? { ...msg, content: dbResultMessage }
                          : msg
                      )
                    )
                    
                    // Step 3: Now generating
                    setIsGeneratingDocument(true)
                    const generatingMessage: Message = {
                      id: (Date.now() + 3).toString(),
                      role: "assistant",
                      content: "Now generating your PIF document... This may take a moment."
                    }
                    setMessages(prev => [...prev, generatingMessage])
                    
                    // Wait a bit then get the actual document
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    
                    // Make final request to get document
                    const finalResponse = await fetch('/api/chat', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        messages: [...messages, {
                          role: 'user',
                          content: data.originalMessage
                        }, {
                          role: 'assistant',
                          content: 'Pulling information from database'
                        }].map(msg => ({
                          role: msg.role,
                          content: msg.content
                        })),
                        document: document
                      }),
                    })
                    
                    const finalData = await finalResponse.json()
                    if (finalData.type === 'document_update') {
                      // Step 4: Update document
                      setDocument(finalData.document)
                      
                      // Step 5: Success message
                      const successMessage: Message = {
                        id: (Date.now() + 4).toString(),
                        role: "assistant",
                        content: `✓ Successfully generated a comprehensive PIF for ${finalData.decision?.country || 'your project'}. The document is now ready for review.`
                      }
                      setMessages(prev => [...prev, successMessage])
                      
                      // Remove generating message
                      setMessages(prev => prev.filter(msg => msg.id !== generatingMessage.id))
                      setPendingAction(null)
                    }
                  }
                }
              } catch (error) {
                console.error('Error generating:', error)
              } finally {
                setIsGeneratingDocument(false)
              }
            }, 1000)
          } else {
            // No files uploaded, check database first
            const dbLookupMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: "Pulling information from database..."
            }
            setMessages(prev => [...prev, dbLookupMessage])
            
            // Check database status
            setTimeout(async () => {
              try {
                const statusResponse = await fetch('/api/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messages: [...messages, {
                      role: 'user',
                      content: data.originalMessage || pendingAction?.originalMessage
                    }].map(msg => ({
                      role: msg.role,
                      content: msg.content
                    })),
                    document: document
                  }),
                })
                
                const statusData = await statusResponse.json()
                
                if (statusData.type === 'database_lookup_status') {
                  // Update database lookup message with result
                  const dbResultMessage = statusData.hasData
                    ? "✓ Information found in database."
                    : "Information not found in database. Using web sources instead."
                  
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === dbLookupMessage.id 
                        ? { ...msg, content: dbResultMessage }
                        : msg
                    )
                  )
                  
                  // Now generate
                  setIsGeneratingDocument(true)
                  const generatingMessage: Message = {
                    id: (Date.now() + 2).toString(),
                    role: "assistant",
                    content: "Now generating your PIF document... This may take a moment."
                  }
                  setMessages(prev => [...prev, generatingMessage])
                  
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  
                  // Get the actual document
                  const finalResponse = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      messages: [...messages, {
                        role: 'user',
                        content: data.originalMessage || pendingAction?.originalMessage
                      }, {
                        role: 'assistant',
                        content: 'Pulling information from database'
                      }].map(msg => ({
                        role: msg.role,
                        content: msg.content
                      })),
                      document: document
                    }),
                  })
                  
                  const finalData = await finalResponse.json()
                  if (finalData.type === 'document_update') {
                    setDocument(finalData.document)
                    
                    const successMessage = finalData.agent === 'generating'
                      ? `✓ Successfully generated a comprehensive PIF for ${finalData.decision?.country || 'your project'}. The document is now ready for review.`
                      : `✓ Successfully updated your PIF document based on your request.`
                    
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === generatingMessage.id 
                          ? { ...msg, content: successMessage }
                          : msg
                      )
                    )
                    setPendingAction(null)
                  }
                }
              } catch (error) {
                console.error('Error:', error)
              } finally {
                setIsGeneratingDocument(false)
              }
            }, 1000)
          }
          
          setPendingAction(null)
          setIsGeneratingDocument(false)
        } else if (data.type === 'file_upload_success') {
          // Manual upload - show success message
          const successCount = data.uploadedFiles?.filter((f: any) => f.success).length || files.length
          const successMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `Successfully processed ${successCount} file(s) for ${country}. The extracted information has been added to the database and will be available when generating PIFs.`
          }
          setMessages(prev => [...prev, successMessage])
        } else if (data.type === 'file_upload_error') {
          // Manual upload error
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `Error processing files: ${data.error || 'Unknown error'}. Please try again.`
          }
          setMessages(prev => [...prev, errorMessage])
        }
      }
      
      setPendingAction(null)
      // Close modal after successful processing
      setShowFileUploadModal(false)
    } catch (error) {
      console.error('Error uploading files:', error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your files. Please try again."
      }
      setMessages(prev => [...prev, errorMessage])
      // Close modal on error too
      setShowFileUploadModal(false)
    } finally {
      setIsLoading(false)
      setIsGeneratingDocument(false)
      setIsProcessingFiles(false)
    }
  }

  const handleFileUploadSkip = async () => {
    // If no pending action, just close the modal
    if (!pendingAction) {
      setShowFileUploadModal(false)
      return
    }
    
    setShowFileUploadModal(false)
    setIsLoading(true)
    
    try {
      // Submit without files - send FormData with empty files array to indicate skip
      const formData = new FormData()
      formData.append('originalMessage', pendingAction.originalMessage)
      formData.append('messages', JSON.stringify([...messages, {
        role: 'user',
        content: pendingAction.originalMessage
      }]))
      formData.append('document', JSON.stringify(document))
      formData.append('skipFiles', 'true')
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Failed to get response')
      }
      
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        
        if (data.type === 'document_update') {
          setIsGeneratingDocument(true)
          const loadingMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.agent === 'generating' 
              ? "Generating your comprehensive PIF document... This may take a moment."
              : "Updating your PIF document... Making targeted improvements."
          }
          setMessages(prev => [...prev, loadingMessage])
          
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          setDocument(data.document)
          
          const successMessage = data.agent === 'generating'
            ? `Perfect! I've generated a comprehensive PIF for ${data.decision?.country || 'your project'}. The document is now ready for review.`
            : `Great! I've updated your PIF document based on your request. The changes have been applied successfully.`
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === loadingMessage.id 
                ? { ...msg, content: successMessage }
                : msg
            )
          )
        }
      }
      
      setPendingAction(null)
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
        <div className="flex items-center justify-between">
          <div>
        <h2 className="text-lg font-semibold text-card-foreground">PIF Assistant</h2>
        <p className="text-sm text-muted-foreground">Ask me to edit or improve your document</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPendingAction(null)
              setShowFileUploadModal(true)
            }}
            disabled={isLoading || isGeneratingDocument}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
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
                  {message.content.includes("Would you like to upload files") && pendingAction && (
                    <div className="flex flex-col gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const responseMessage: Message = {
                            id: Date.now().toString(),
                            role: "user",
                            content: "Yes, I'd like to upload files"
                          }
                          setMessages(prev => [...prev, responseMessage])
                          setIsLoading(true)
                          
                          try {
                            const response = await fetch('/api/chat', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                messages: [...messages, responseMessage].map(msg => ({
                                  role: msg.role,
                                  content: msg.content
                                })),
                                document: document
                              }),
                            })
                            
                            if (!response.ok) throw new Error('Failed to get response')
                            
                            const contentType = response.headers.get('content-type')
                            if (contentType?.includes('application/json')) {
                              const data = await response.json()
                              if (data.type === 'needs_file_upload') {
                                setShowFileUploadModal(true)
                              }
                            }
                          } catch (error) {
                            console.error('Error:', error)
                          } finally {
                            setIsLoading(false)
                          }
                        }}
                        className="w-full text-left justify-start"
                        disabled={isLoading || isGeneratingDocument}
                      >
                        Upload Files
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const responseMessage: Message = {
                            id: Date.now().toString(),
                            role: "user",
                            content: "No, use existing data"
                          }
                          setMessages(prev => [...prev, responseMessage])
                          setIsLoading(true)
                          
                          // Immediately show "Pulling information from database..." message
                          const dbLookupMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            role: "assistant",
                            content: "Pulling information from database..."
                          }
                          setMessages(prev => [...prev, dbLookupMessage])
                          
                          try {
                            const response = await fetch('/api/chat', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                messages: [...messages, responseMessage].map(msg => ({
                                  role: msg.role,
                                  content: msg.content
                                })),
                                document: document
                              }),
                            })
                            
                            if (!response.ok) throw new Error('Failed to get response')
                            
                            const contentType = response.headers.get('content-type')
                            if (contentType?.includes('application/json')) {
                              const data = await response.json()
                              
                              if (data.type === 'database_lookup_status') {
                                // Update database lookup message with result
                                const dbResultMessage = data.hasData
                                  ? "✓ Information found in database."
                                  : "Information not found in database. Using web sources instead."
                                
                                setMessages(prev => 
                                  prev.map(msg => 
                                    msg.id === dbLookupMessage.id 
                                      ? { ...msg, content: dbResultMessage }
                                      : msg
                                  )
                                )
                                
                                // Now proceed with generation
                                setIsGeneratingDocument(true)
                                const generatingMessage: Message = {
                                  id: (Date.now() + 2).toString(),
                                  role: "assistant",
                                  content: "Now generating your PIF document... This may take a moment."
                                }
                                setMessages(prev => [...prev, generatingMessage])
                                
                                // Wait a moment then get the actual document
                                await new Promise(resolve => setTimeout(resolve, 1000))
                                
                                // Make final request to get document
                                const finalResponse = await fetch('/api/chat', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    messages: [...messages, responseMessage, {
                                      role: 'assistant',
                                      content: 'Pulling information from database'
                                    }].map(msg => ({
                                      role: msg.role,
                                      content: msg.content
                                    })),
                                    document: document
                                  }),
                                })
                                
                                if (!finalResponse.ok) throw new Error('Failed to generate')
                                
                                const finalData = await finalResponse.json()
                                if (finalData.type === 'document_update') {
                                  setDocument(finalData.document)
                                  
                                  const successMessage: Message = {
                                    id: (Date.now() + 3).toString(),
                                    role: "assistant",
                                    content: `✓ Successfully generated a comprehensive PIF for ${finalData.decision?.country || 'your project'}. The document is now ready for review.`
                                  }
                                  setMessages(prev => [...prev, successMessage])
                                  
                                  // Remove generating message
                                  setMessages(prev => prev.filter(msg => msg.id !== generatingMessage.id))
                                  setPendingAction(null)
                                }
                              } else if (data.type === 'document_update') {
                                // Fallback: if backend returns document directly
                                setIsGeneratingDocument(true)
                                const loadingMessage: Message = {
                                  id: (Date.now() + 1).toString(),
                                  role: "assistant",
                                  content: data.agent === 'generating' 
                                    ? "Generating your comprehensive PIF document... This may take a moment."
                                    : "Updating your PIF document... Making targeted improvements."
                                }
                                setMessages(prev => [...prev, loadingMessage])
                                
                                await new Promise(resolve => setTimeout(resolve, 2000))
                                
                                setDocument(data.document)
                                
                                const successMessage = data.agent === 'generating'
                                  ? `Perfect! I've generated a comprehensive PIF for ${data.decision?.country || 'your project'}. The document is now ready for review.`
                                  : `Great! I've updated your PIF document based on your request. The changes have been applied successfully.`
                                
                                setMessages(prev => 
                                  prev.map(msg => 
                                    msg.id === loadingMessage.id 
                                      ? { ...msg, content: successMessage }
                                      : msg
                                  )
                                )
                                setPendingAction(null)
                              }
                            }
                          } catch (error) {
                            console.error('Error:', error)
                            const errorMessage: Message = {
                              id: (Date.now() + 10).toString(),
                              role: "assistant",
                              content: "Sorry, I encountered an error. Please try again."
                            }
                            setMessages(prev => [...prev, errorMessage])
                          } finally {
                            setIsLoading(false)
                            setIsGeneratingDocument(false)
                          }
                        }}
                        className="w-full text-left justify-start"
                        disabled={isLoading || isGeneratingDocument}
                      >
                        Use Existing Data
                      </Button>
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
      
      {/* File Upload Modal */}
      <FileUploadModal
        open={showFileUploadModal}
        onOpenChange={setShowFileUploadModal}
        onContinue={handleFileUploadContinue}
        onSkip={handleFileUploadSkip}
        isProcessing={isProcessingFiles}
      />
    </div>
  )
}
