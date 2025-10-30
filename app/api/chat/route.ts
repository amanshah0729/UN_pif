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

// --- Subagent helpers for new PIF format ---
function extractCountryFromMessage(userMessage: string): string | null {
  const countries = [
    'kenya','pakistan','cuba','india','bangladesh','nigeria','ethiopia','tanzania','uganda','ghana','rwanda'
    // ... add more as needed
  ];
  const lowerMessage = userMessage.toLowerCase();
  return countries.find((c) => lowerMessage.includes(c)) || null;
}

async function generateSectionParagraph({sectionTitle, instructions, country}: {sectionTitle:string, instructions:string, country:string}) {
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `You are drafting a section for a UN Project Information Form (PIF).\n\nSection: ${sectionTitle}\nCountry: ${country}\n\n${instructions}\n\nReturn a professional, concise, and informative essay with a minimum of 400 words written in the style of international project documents.
    Keep the structure of the document the exact same. Use only these sources: – UNFCCC reports portal (BTR/NC/BUR/NIR for the country) https://www.thegef.org/projects-operations/database?f%5B0%5D=capacity_building_initiative_for_transparency%3A2071&f%5B1%5D=implementing_agencies%3A605 – ICAT (climateactiontransparency.org) country pages/reports https://unfccc.int/reports – PATPA (transparency-partnership.net) knowledge products/Good Practice DB https://climateactiontransparency.org – GEF/CBIT documents on thegef.org https://transparency-partnership.net/ Do not use any other sources. If required info is missing, say so explicitly and point to the specific PDF/URL within these sites where it likely exists. No hallucinations. Follow the PIF template’s wording, length limits, and tone for each section.
    
    `,
  });
  return result.text.trim();
}

async function sectionClimateTransparency(country: string) {
  return generateSectionParagraph({
    sectionTitle: `Climate Transparency in ${country}`,
    instructions: `Summarize the status, context, recent progress, and remaining challenges related to climate transparency and the transparency framework in ${country}. Reference NDC/Enhanced Transparency Framework implementation where possible.`,
    country,
  });
}

async function sectionUNFCCReporting(country: string) {
  return generateSectionParagraph({
    sectionTitle: 'Official Reporting to the UNFCCC',
    instructions: `Describe ${country}'s history and status regarding official reporting to the UNFCCC, such as BURs, NCs, Enhanced Transparency Reports, and related official requirements or achievements. Highlight any notable submission years, gaps, or successes.`,
    country,
  });
}

async function sectionOtherBaselines(country: string) {
  return generateSectionParagraph({
    sectionTitle: 'Other Baseline Initiatives',
    instructions: `Compose a paragraph on ongoing or recent baseline initiatives related to climate or environmental monitoring, MRV (measurement, reporting, verification), development partner support, and other national efforts relevant to transparency in ${country}. Mention programs or partnerships if possible.`,
    country,
  });
}

async function sectionKeyBarriers(country: string) {
  return generateSectionParagraph({
    sectionTitle: 'Key Barriers',
    instructions: `Describe the main barriers and challenges to climate transparency, UNFCCC reporting, GHG inventory improvements, and overall climate policy implementation in ${country}. Be specific and reference technical, institutional, financial, and capacity-related barriers, citing from the suggested sources when possible.`,
    country,
  });
}

async function sectionGHGInventory(country: string) {
  return generateSectionParagraph({
    sectionTitle: 'GHG Inventory',
    instructions: `Summarize the status, structure, recent progress and remaining needs for national GHG inventory and reporting in ${country}. Reference the latest BTR, BUR or NC submissions, inventory methodologies, sectors included, missing coverage, and capacity gaps as described in suggested documents.`,
    country,
  });
}

async function sectionAdaptationVulnerability(country: string) {
  return generateSectionParagraph({
    sectionTitle: 'Adaptation and Vulnerability',
    instructions: `Write a section on how adaptation and vulnerability issues are tracked, reported, and integrated in ${country}'s climate planning. Note institutional arrangements, monitoring tools, capacity, and any difficulties in adaptation reporting.`,
    country,
  });
}

async function sectionNDCTracking(country: string) {
  return generateSectionParagraph({
    sectionTitle: 'NDC Tracking',
    instructions: `Discuss the frameworks, MRV systems and institutional arrangements for monitoring and tracking ${country}'s Nationally Determined Contribution (NDC) progress. Reference legal mandates, digital tools, and periodic updates or progress gaps.`,
    country,
  });
}

async function sectionSupportNeededReceived(country: string) {
  return generateSectionParagraph({
    sectionTitle: 'Support Needed and Received',
    instructions: `Describe the type and scope of international support received by ${country} related to climate transparency, NDC tracking, UNFCCC reporting, and MRV, as well as remaining needs for technical, financial, or capacity-building support. Cite examples of support from GEF/CBIT, ICAT, PATPA, or UNFCCC processes, noting gaps and recent projects.`,
    country,
  });
}

async function sectionInstitutionalFramework(country: string) {
  return generateSectionParagraph({
    sectionTitle: 'Institutional Framework for Climate Action',
    instructions: `Provide a thorough description of the committees, ministries, agencies and oversight bodies that coordinate climate action in ${country}, especially in transparency, reporting, NDC, and GHG inventory fields. Focus on governance structure, coordination mechanisms, and recent reforms if any.`,
    country,
  });
}

async function sectionNationalPolicyFramework(country: string) {
  return generateSectionParagraph({
    sectionTitle: 'National Policy Framework',
    instructions: `Describe the main national climate policy and legal frameworks in ${country}, referencing national climate change acts, long-term strategies, and any climate mainstreaming efforts in sectoral policies. Highlight gaps noted in UNFCCC or donor reporting.`,
    country,
  });
}

// PIF Generating Agent - Creates new comprehensive PIF documents
async function generateNewPIF(userMessage: string, currentDocument: any) {
  // Prefer country from shouldProcessDocument fallback logic
  let country = extractCountryFromMessage(userMessage);
  if (!country && currentDocument && currentDocument.title) {
    // Try to extract from current document title if possible
    const match = currentDocument.title.match(/GEF8 Project Information Form - ([\w ]+)/);
    country = match ? match[1] : null;
  }
  country = country ? country.charAt(0).toUpperCase() + country.slice(1) : 'Unknown Country';

  // Call each sub-agent for all required sections
  const sections = await Promise.all([
    sectionClimateTransparency(country),
    sectionUNFCCReporting(country),
    sectionOtherBaselines(country),
    sectionKeyBarriers(country),
    sectionGHGInventory(country),
    sectionAdaptationVulnerability(country),
    sectionNDCTracking(country),
    sectionSupportNeededReceived(country),
    sectionInstitutionalFramework(country),
    sectionNationalPolicyFramework(country)
  ]);

  const sectionList = [
    { id: 'climate-transparency', title: `Climate Transparency in ${country}`, content: sections[0] },
    { id: 'official-unfccc-reporting', title: 'Official Reporting to the UNFCCC', content: sections[1] },
    { id: 'other-baseline-initiatives', title: 'Other Baseline Initiatives', content: sections[2] },
    { id: 'key-barriers', title: 'Key Barriers', content: sections[3] },
    { id: 'ghg-inventory', title: 'GHG Inventory', content: sections[4] },
    { id: 'adaptation-vulnerability', title: 'Adaptation and Vulnerability', content: sections[5] },
    { id: 'ndc-tracking', title: 'NDC Tracking', content: sections[6] },
    { id: 'support-needed-received', title: 'Support Needed and Received', content: sections[7] },
    { id: 'institutional-framework', title: 'Institutional Framework for Climate Action', content: sections[8] },
    { id: 'national-policy-framework', title: 'National Policy Framework', content: sections[9] },
  ];

  return {
    title: `GEF8 Project Information Form - ${country}`,
    sections: sectionList,
  };
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
