import { openai } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';

// Chat Agent - Handles conversational responses
async function getChatResponse(messages: any[], document: any) {
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages,
    system: `You are a helpful PIF (Project Information Form) assistant for the UN. You help users with their project proposals in a conversational, friendly manner.

Current document context:
${document ? JSON.stringify(document, null, 2) : 'No document provided'}

Your role:
1. Respond naturally and conversationally to user requests
2. Ask clarifying questions when needed
3. Acknowledge requests but don't generate full documents in chat
4. Be helpful and professional but keep responses concise
5. Be aware that I have specialized agents for PIF generation and editing

Examples of good responses:
- "Sure thing! I'll pull from previous PIF databases and online resources to draft a comprehensive PIF for Kenya."
- "I'd be happy to help with that. What specific focus areas would you like me to emphasize for Pakistan?"
- "Great idea! Let me create a detailed PIF for Cuba. Are there any particular sectors you'd like me to prioritize?"
- "I can help you modify the executive summary. What specific changes would you like me to make?"
- "That's a good point. Let me update the budget section to reflect your requirements."
- "I'll make those targeted improvements to your existing PIF document."

Keep responses conversational, helpful, and under 2-3 sentences. Don't generate full document content in your chat responses.`,
  });

  return result.toTextStreamResponse();
}

// PIF Generating Agent - Creates new comprehensive PIF documents
async function generateNewPIF(userMessage: string, currentDocument: any) {
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `You are a PIF Generating Agent. Create a comprehensive UN PIF (Project Information Form) document from scratch based on this user request: "${userMessage}"

Current document context:
${currentDocument && currentDocument.title ? JSON.stringify(currentDocument, null, 2) : 'No existing document - creating new PIF'}

Your task: Generate a complete, detailed PIF document with all standard sections. Make it country-specific and contextually relevant.

Return ONLY a JSON object with this exact structure (no markdown, no code blocks, just pure JSON):
{
  "title": "GEF8 Project Information Form - [Country Name]",
  "sections": [
    {
      "id": "executive-summary",
      "title": "Executive Summary",
      "content": "Comprehensive executive summary with project overview, objectives, and expected impact..."
    },
    {
      "id": "project-objectives", 
      "title": "Project Objectives",
      "content": "Detailed primary and specific objectives with measurable targets..."
    },
    {
      "id": "implementation-strategy",
      "title": "Implementation Strategy", 
      "content": "Detailed implementation phases, activities, timeline, and approach..."
    },
    {
      "id": "budget",
      "title": "Budget and Resources",
      "content": "Comprehensive budget breakdown with detailed cost categories and financing sources..."
    },
    {
      "id": "expected-outcomes",
      "title": "Expected Outcomes",
      "content": "Quantitative and qualitative outcomes with specific indicators and targets..."
    },
    {
      "id": "risk-assessment",
      "title": "Risk Assessment",
      "content": "Detailed risk matrix with identified risks, mitigation strategies, and monitoring..."
    },
    {
      "id": "monitoring-evaluation",
      "title": "Monitoring and Evaluation",
      "content": "Comprehensive M&E framework with indicators, evaluation schedule, and methodology..."
    },
    {
      "id": "stakeholder-analysis",
      "title": "Stakeholder Analysis",
      "content": "Detailed stakeholder mapping with engagement strategies and roles..."
    },
    {
      "id": "sustainability-plan",
      "title": "Sustainability Plan",
      "content": "Comprehensive sustainability strategy covering institutional, financial, technical, and social aspects..."
    },
    {
      "id": "environmental-safeguards",
      "title": "Environmental and Social Safeguards",
      "content": "Detailed environmental and social safeguards with compliance framework..."
    }
  ]
}

Make the content comprehensive, professional, and similar to real GEF PIFs. Each section should be detailed and substantive.

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, no additional text.`,
  });

  try {
    // Clean the response to remove any markdown formatting
    let cleanedText = result.text.trim();
    
    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove any leading/trailing whitespace
    cleanedText = cleanedText.trim();
    
    console.log('PIF Generating Agent - Cleaned text:', cleanedText.substring(0, 200) + '...');
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Error parsing PIF generation JSON:', error);
    console.error('Raw text:', result.text.substring(0, 500));
    return null;
  }
}

// PIF Editing Agent - Modifies existing PIF documents
async function editExistingPIF(userMessage: string, currentDocument: any) {
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `You are a PIF Editing Agent. Modify the existing PIF document based on this user request: "${userMessage}"

Current document context:
${currentDocument ? JSON.stringify(currentDocument, null, 2) : 'No existing document'}

Your task: Update ONLY the sections that need to be modified based on the user's request. Keep all other sections unchanged.

Return ONLY a JSON object with this exact structure (no markdown, no code blocks, just pure JSON):
{
  "title": "Updated title if needed, otherwise keep existing",
  "sections": [
    {
      "id": "section-id",
      "title": "Section Title",
      "content": "Updated content for this section"
    }
  ]
}

IMPORTANT RULES:
1. Only include sections that need to be updated/modified
2. Keep the same structure and IDs as the original document
3. If updating title, include it in the response
4. If no changes needed, return empty sections array
5. Make targeted, specific updates based on user request

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, no additional text.`,
  });

  try {
    // Clean the response to remove any markdown formatting
    let cleanedText = result.text.trim();
    
    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove any leading/trailing whitespace
    cleanedText = cleanedText.trim();
    
    console.log('PIF Editing Agent - Cleaned text:', cleanedText.substring(0, 200) + '...');
    const editResult = JSON.parse(cleanedText);
    
    // Merge the edits with the existing document
    return mergeDocumentEdits(currentDocument, editResult);
  } catch (error) {
    console.error('Error parsing PIF edit JSON:', error);
    console.error('Raw text:', result.text.substring(0, 500));
    return null;
  }
}

// Helper function to merge document edits
function mergeDocumentEdits(originalDocument: any, edits: any) {
  if (!originalDocument || !edits) return originalDocument;
  
  const mergedDocument = { ...originalDocument };
  
  // Update title if provided
  if (edits.title) {
    mergedDocument.title = edits.title;
  }
  
  // Update sections
  if (edits.sections && edits.sections.length > 0) {
    edits.sections.forEach((editSection: any) => {
      const existingIndex = mergedDocument.sections.findIndex((section: any) => section.id === editSection.id);
      if (existingIndex !== -1) {
        // Update existing section
        mergedDocument.sections[existingIndex] = editSection;
      } else {
        // Add new section
        mergedDocument.sections.push(editSection);
      }
    });
  }
  
  return mergedDocument;
}

// Decision Agent - Determines if document generation/editing is needed and which agent to use
async function shouldProcessDocument(userMessage: string, currentDocument: any): Promise<{ 
  shouldProcess: boolean; 
  action: 'generate' | 'edit' | 'none';
  country?: string; 
  reason?: string 
}> {
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Analyze this user message and determine what action to take: "${userMessage}"

Current document state: ${currentDocument && currentDocument.title ? 'Document exists' : 'No document exists'}

Return ONLY a JSON object with this exact structure (no markdown, no code blocks, just pure JSON):
{
  "shouldProcess": boolean,
  "action": "generate" | "edit" | "none",
  "country": "country name if mentioned" | null,
  "reason": "brief explanation of decision"
}

DECISION LOGIC:
- "generate": Use when creating a NEW PIF document (no existing document OR user explicitly wants a new one)
- "edit": Use when MODIFYING an existing PIF document (document exists AND user wants changes)
- "none": Use for general questions, explanations, greetings, or system questions

Examples:
- "Create a PIF for Kenya" + no document = generate
- "Create a PIF for Kenya" + existing document = generate (new document)
- "Update the budget section" + existing document = edit
- "Make the objectives more specific" + existing document = edit
- "What is a PIF?" = none
- "Hello" = none

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, no additional text.`,
  });

  try {
    // Clean the response to remove any markdown formatting
    let cleanedText = result.text.trim();
    
    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove any leading/trailing whitespace
    cleanedText = cleanedText.trim();
    
    console.log('Cleaned decision text:', cleanedText);
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Error parsing decision JSON:', error);
    console.error('Raw text:', result.text);
    
    // Fallback: simple keyword detection
    const lowerMessage = userMessage.toLowerCase();
    const countries = ['kenya', 'pakistan', 'cuba', 'india', 'bangladesh', 'nigeria', 'ethiopia', 'tanzania', 'uganda', 'ghana', 'rwanda'];
    const mentionedCountry = countries.find(country => lowerMessage.includes(country));
    
    const pifKeywords = ['create', 'make', 'generate', 'draft', 'write', 'pif', 'project information form'];
    const editKeywords = ['update', 'modify', 'change', 'edit', 'revise', 'improve', 'add', 'remove'];
    const hasPifRequest = pifKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasEditRequest = editKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Determine action based on document state and keywords
    if (hasPifRequest && mentionedCountry) {
      return { 
        shouldProcess: true, 
        action: 'generate', 
        country: mentionedCountry, 
        reason: 'Fallback detection: PIF request with country' 
      };
    }
    
    if (hasEditRequest && currentDocument && currentDocument.title) {
      return { 
        shouldProcess: true, 
        action: 'edit', 
        country: mentionedCountry, 
        reason: 'Fallback detection: Edit request with existing document' 
      };
    }
    
    // More lenient fallback - if any country is mentioned, assume PIF generation
    if (mentionedCountry) {
      return { 
        shouldProcess: true, 
        action: 'generate', 
        country: mentionedCountry, 
        reason: 'Fallback detection: Country mentioned' 
      };
    }
    
    return { shouldProcess: false, action: 'none', reason: 'Error parsing decision - using fallback' };
  }
}

export async function POST(req: Request) {
  console.log('Request received');
  const { messages, document } = await req.json();
  const lastMessage = messages[messages.length - 1];

  try {
    // First, determine what action to take
    const decision = await shouldProcessDocument(lastMessage.content, document);
    console.log('Decision:', decision);

    if (decision.shouldProcess) {
      if (decision.action === 'generate') {
        console.log('PIF Generation triggered for:', decision);
        // Use PIF Generating Agent
        const newDocument = await generateNewPIF(lastMessage.content, document);
        
        if (newDocument) {
          console.log('PIF generated successfully');
          return Response.json({ 
            type: 'document_update',
            document: newDocument,
            decision: decision,
            agent: 'generating'
          });
        } else {
          console.log('PIF generation failed');
        }
      } else if (decision.action === 'edit') {
        console.log('PIF Editing triggered for:', decision);
        // Use PIF Editing Agent
        const editedDocument = await editExistingPIF(lastMessage.content, document);
        
        if (editedDocument) {
          console.log('PIF edited successfully');
          return Response.json({ 
            type: 'document_update',
            document: editedDocument,
            decision: decision,
            agent: 'editing'
          });
        } else {
          console.log('PIF editing failed');
        }
      }
    }

    // Return just chat response
    return getChatResponse(messages, document);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
