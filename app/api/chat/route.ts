import { openai } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';
import { getCountryByName } from '@/lib/countries';
import { supabase } from '@/lib/supabaseClient';
import { extractText } from 'unpdf';
import fs from 'fs';
import path from 'path';

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

const SECTION_KEYWORDS: Record<string, string> = {
  ghg: 'GHG',
  'ghg inventory': 'GHG',
  climate: 'Climate',
  'climate transparency': 'Climate',
  adaptation: 'Adaptation',
  vulnerability: 'Adaptation',
  'ndc tracking': 'NDC',
  ndc: 'NDC',
  'institutional framework': 'Institutional Framework',
  'national policy': 'National Policy',
  'support needed': 'Support Needed',
  'support received': 'Support Needed',
  'key barriers': 'Key Barriers',
  barriers: 'Key Barriers',
  'baseline initiatives': 'Other Baseline Initiatives',
};

function extractSectionFromMessage(userMessage: string): string | null {
  const lowerMessage = userMessage.toLowerCase();
  for (const [keyword, sectionKey] of Object.entries(SECTION_KEYWORDS)) {
    if (lowerMessage.includes(keyword)) {
      return sectionKey;
    }
  }
  return null;
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

// Helper function to map PROMPT text to section keys
function mapPromptToSection(promptText: string): string | null {
  const lowerPrompt = promptText.toLowerCase();
  
  // Map keywords in prompts to section keys
  if (lowerPrompt.includes('ghg') || lowerPrompt.includes('inventory') || lowerPrompt.includes('emissions')) {
    return 'GHG';
  }
  if (lowerPrompt.includes('climate transparency') || lowerPrompt.includes('transparency framework')) {
    return 'Climate';
  }
  if (lowerPrompt.includes('adaptation') || lowerPrompt.includes('vulnerability')) {
    return 'Adaptation';
  }
  if (lowerPrompt.includes('ndc') || lowerPrompt.includes('nationally determined contribution')) {
    return 'NDC';
  }
  if (lowerPrompt.includes('institutional') || lowerPrompt.includes('ministries') || lowerPrompt.includes('agencies')) {
    return 'Institutional Framework';
  }
  if (lowerPrompt.includes('national policy') || lowerPrompt.includes('policy framework') || lowerPrompt.includes('climate change strategy')) {
    return 'National Policy';
  }
  if (lowerPrompt.includes('support needed') || lowerPrompt.includes('support received') || lowerPrompt.includes('capacity-building support')) {
    return 'Support Needed and Received';
  }
  if (lowerPrompt.includes('barrier') || lowerPrompt.includes('challenge')) {
    return 'Key Barriers';
  }
  if (lowerPrompt.includes('baseline') || lowerPrompt.includes('initiative')) {
    return 'Other Baseline Initiatives';
  }
  
  return null;
}

// Helper function to recursively replace placeholders in ProseMirror JSON
function replacePlaceholdersInNode(node: any, country: string, countryData: any): any {
  if (!node) return node;

  // Create a deep copy
  const newNode = JSON.parse(JSON.stringify(node));

  // Replace text content if it exists
  if (newNode.type === 'text' && newNode.text) {
    let text = newNode.text;

    // Replace [Country] with actual country name
    text = text.replace(/\[Country\]/g, country);

    // Replace section-specific placeholders with database content
    if (countryData?.sections) {
      const sections = countryData.sections as Record<string, unknown>;
      
      // Map section keys to their content
      const sectionMap: Record<string, string> = {
        'GHG': formatSectionContent(sections['GHG']),
        'Climate': formatSectionContent(sections['Climate']),
        'Adaptation': formatSectionContent(sections['Adaptation']),
        'NDC': formatSectionContent(sections['NDC']),
        'Institutional Framework': formatSectionContent(sections['Institutional Framework']),
        'National Policy': formatSectionContent(sections['National Policy']),
        'Support Needed and Received': formatSectionContent(sections['Support Needed and Received']),
        'Key Barriers': formatSectionContent(sections['Key Barriers']),
        'Other Baseline Initiatives': formatSectionContent(sections['Other Baseline Initiatives']),
      };

      // Handle PROMPT: placeholders - try to map to sections
      if (text.includes('PROMPT:')) {
        const sectionKey = mapPromptToSection(text);
        if (sectionKey && sectionMap[sectionKey] && sectionMap[sectionKey] !== 'No content available.') {
          // Replace the entire PROMPT line with the section content
          text = text.replace(/PROMPT:.*$/gm, sectionMap[sectionKey]);
        }
      }

      // Replace word count placeholders like [350 words] or [XXX words] with section content if available
      // This is more aggressive - you might want to refine this
      const wordCountPattern = /\[(\d+|XXX)\s+words?\]/gi;
      const wordCountMatch = text.match(wordCountPattern);
      if (wordCountMatch) {
        // Try to find a nearby section context
        const sectionKey = mapPromptToSection(text);
        if (sectionKey && sectionMap[sectionKey] && sectionMap[sectionKey] !== 'No content available.') {
          text = text.replace(wordCountPattern, sectionMap[sectionKey]);
        }
      }

      // Replace generic placeholders like "[...]" or "[…]" only if we have nearby context
      // Don't replace all of them blindly
      if (text.match(/\[…\]|\[\.\.\.\]|\[\.\.\.\.\]/)) {
        const sectionKey = mapPromptToSection(text);
        if (sectionKey && sectionMap[sectionKey] && sectionMap[sectionKey] !== 'No content available.') {
          text = text.replace(/\[…\]|\[\.\.\.\]|\[\.\.\.\.\]/g, sectionMap[sectionKey]);
        } else {
          // If no context, just remove the placeholder
          text = text.replace(/\[…\]|\[\.\.\.\]|\[\.\.\.\.\]/g, '');
        }
      }
    } else {
      // Even without country data, clean up some placeholders
      text = text.replace(/\[Country\]/g, country);
      // Remove word count placeholders but keep structure
      text = text.replace(/\[(\d+|XXX)\s+words?\]/gi, '');
    }

    newNode.text = text;
  }

  // Recursively process children
  if (newNode.content && Array.isArray(newNode.content)) {
    newNode.content = newNode.content.map((child: any) => 
      replacePlaceholdersInNode(child, country, countryData)
    );
  }

  return newNode;
}

// Section names mapping (matching the 10 PIF sections)
const SECTION_NAMES = [
  'GHG Inventory',
  'Climate Transparency',
  'Adaptation and Vulnerability',
  'NDC Tracking',
  'Institutional Framework for Climate Action',
  'National Policy Framework',
  'Support Needed and Received',
  'Key Barriers',
  'Other Baseline Initiatives',
  'Official Reporting to the UNFCCC'
];

// Extract section-specific content using AI subagent
async function extractSectionContent(
  pdfText: string,
  sectionName: string,
  docType: string,
  country: string
): Promise<string> {
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `You are extracting information for the "${sectionName}" section of a PIF document.

Document Type: ${docType}
Country: ${country}

Full document content:
${pdfText.substring(0, 100000)} ${pdfText.length > 100000 ? '[... document truncated for length ...]' : ''}

Extract ALL relevant information from this document that would be useful for drafting the "${sectionName}" section of a Project Information Form (PIF).

Focus on:
- Specific facts, data, metrics, and numbers
- Dates and timeframes
- Institutional names, structures, and arrangements
- Policy references and legal frameworks
- Challenges, gaps, or barriers mentioned
- Programs, initiatives, or partnerships
- Capacity needs or support received
- Any other relevant details

Return ONLY the extracted information as plain text. Be thorough and comprehensive - extract everything relevant, even if it seems minor. Do not summarize or paraphrase - extract the actual information from the document.`,
  });
  
  return result.text.trim();
}

// Parse document and extract content for all 10 sections using subagents
async function parseDocumentAndExtractSections(
  pdfText: string,
  docType: string,
  country: string
): Promise<Record<string, string>> {
  const extractedSections: Record<string, string> = {};
  
  // Run all 10 subagents in parallel for speed
  const extractionPromises = SECTION_NAMES.map(async (sectionName) => {
    try {
      const content = await extractSectionContent(pdfText, sectionName, docType, country);
      return { sectionName, content };
    } catch (error) {
      console.error(`Error extracting ${sectionName}:`, error);
      return { sectionName, content: '' };
    }
  });
  
  const results = await Promise.all(extractionPromises);
  
  // Build the extracted sections object
  results.forEach(({ sectionName, content }) => {
    if (content && content.trim().length > 0) {
      extractedSections[sectionName] = content;
    }
  });
  
  return extractedSections;
}

// Update country database with extracted section documents
async function updateCountrySections(
  countryName: string,
  docType: string,
  extractedSections: Record<string, string>
): Promise<void> {
  // Get or create country record
  let { country, error } = await getCountryByName(countryName);
  
  if (error || !country) {
    // Create new country record
    const { data: newCountry, error: createError } = await supabase
      .from('countries')
      .insert({
        name: countryName,
        sections: { sections: [] }
      })
      .select()
      .single();
    
    if (createError || !newCountry) {
      console.error('Error creating country:', createError);
      throw new Error(`Failed to create country: ${createError?.message || 'Unknown error'}`);
    }
    
    country = newCountry;
  }
  
  if (!country) {
    throw new Error('Failed to get or create country record');
  }
  
  // Get existing sections structure
  const existingData = country.sections as { sections?: Array<{ name: string; documents: Array<{ doc_type: string; extracted_text: string }> }> } | null;
  const sectionsArray = existingData?.sections || [];
  
  // Update each section with new document
  SECTION_NAMES.forEach((sectionName) => {
    const extractedText = extractedSections[sectionName];
    
    if (!extractedText || extractedText.trim().length === 0) {
      return; // Skip sections with no extracted content
    }
    
    // Find existing section or create new one
    let section = sectionsArray.find(s => s.name === sectionName);
    
    if (!section) {
      // Create new section
      section = {
        name: sectionName,
        documents: []
      };
      sectionsArray.push(section);
    }
    
    // Append new document to section
    section.documents.push({
      doc_type: docType,
      extracted_text: extractedText
    });
  });
  
  // Update country record with new sections structure
  const { error: updateError } = await supabase
    .from('countries')
    .update({
      sections: { sections: sectionsArray }
    })
    .eq('id', country.id);
  
  if (updateError) {
    console.error('Error updating country sections:', updateError);
    throw new Error(`Failed to update country sections: ${updateError.message}`);
  }
}

// Process uploaded files: parse and extract sections (no storage needed)
async function processUploadedFiles(files: File[], fileTypes: string[], countryData: any = null): Promise<any[]> {
  const processedFiles: any[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileType = fileTypes[i] || 'Other';
    
    if (!file) continue;
    
    try {
      // Convert File to ArrayBuffer for parsing
      const arrayBuffer = await file.arrayBuffer();
      
      // Parse file content based on type
      let pdfText = '';
      
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // Parse PDF using unpdf (same as working project)
        try {
          const { text } = await extractText(
            new Uint8Array(arrayBuffer),
            { mergePages: true }
          );
          pdfText = text;
        } catch (pdfError) {
          console.error(`Error parsing PDF ${file.name}:`, pdfError);
          throw new Error(`Failed to parse PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
        }
      } else if (file.type.includes('wordprocessingml') || file.name.endsWith('.docx')) {
        // Parse DOCX using mammoth
        const mammoth = await import('mammoth');
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        // Convert HTML to plain text for extraction (simple strip tags)
        pdfText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      } else {
        // Try to read as text
        const buffer = Buffer.from(arrayBuffer);
        pdfText = buffer.toString('utf-8');
      }
      
      // Extract sections using AI subagents and update database
      if (pdfText && countryData) {
        try {
          console.log(`Extracting sections from ${file.name} for ${countryData.name}...`);
          const extractedSections = await parseDocumentAndExtractSections(
            pdfText,
            fileType,
            countryData.name
          );
          
          // Update database with extracted sections
          await updateCountrySections(
            countryData.name,
            fileType,
            extractedSections
          );
          
          console.log(`Successfully extracted and stored sections from ${file.name}`);
          
          processedFiles.push({
            fileName: file.name,
            fileType: fileType,
            success: true,
          });
        } catch (error) {
          console.error(`Error extracting sections from ${file.name}:`, error);
          processedFiles.push({
            fileName: file.name,
            fileType: fileType,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } else {
        console.warn(`Skipping ${file.name}: missing text content or country data`);
        processedFiles.push({
          fileName: file.name,
          fileType: fileType,
          success: false,
          error: 'Missing text content or country data',
        });
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      processedFiles.push({
        fileName: file.name,
        fileType: fileType,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return processedFiles;
}

// PIF Generating Agent - Creates new PIF documents from template
async function generateNewPIF(userMessage: string, currentDocument: any, countryData: any = null, uploadedFiles: any[] = []) {
  // Extract country name
  let country = extractCountryFromMessage(userMessage);
  if (!country && currentDocument && currentDocument.title) {
    const match = currentDocument.title.match(/GEF8 Project Information Form - ([\w ]+)/);
    country = match ? match[1] : null;
  }
  country = country ? country.charAt(0).toUpperCase() + country.slice(1) : 'Unknown Country';

  // Load the template JSON
  const templatePath = path.join(process.cwd(), 'public', 'pif-template.json');
  let template: any;
  
  try {
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    template = JSON.parse(templateContent);
  } catch (error) {
    console.error('Error loading template:', error);
    throw new Error('Failed to load PIF template');
  }

  // Replace placeholders in the template
  const filledTemplate = replacePlaceholdersInNode(template, country, countryData);

  // Convert back to document format for compatibility
  const { convertProseMirrorToDocument } = await import('@/lib/document-converter');
  const document = convertProseMirrorToDocument(filledTemplate);
  
  // Update title with country name
  document.title = `GEF-8 PROJECT IDENTIFICATION FORM (PIF) - ${country}`;

  return document;
}

// PIF Editing Agent - Modifies existing PIF documents
async function editExistingPIF(userMessage: string, currentDocument: any, uploadedFiles: any[] = []) {
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

// Decision Agent - Determines if document generation is needed
async function shouldProcessDocument(userMessage: string, currentDocument: any): Promise<{ 
  shouldProcess: boolean; 
  action: 'generate' | 'none';
  country?: string; 
  section?: string | null;
  needsDatabase?: boolean;
  reason?: string 
}> {
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Analyze this user message and determine what action to take: "${userMessage}"

Return ONLY a JSON object with this exact structure (no markdown, no code blocks, just pure JSON):
{
  "shouldProcess": boolean,
  "action": "generate" | "none",
  "country": "country name if mentioned" | null,
  "section": "specific section identifier (e.g., GHG) if the user wants a specific section" | null,
  "needsDatabase": boolean,
  "reason": "brief explanation of decision"
}

DECISION LOGIC:
- "generate": Use when creating a NEW PIF document. Examples: "Create a PIF for Kenya", "Generate PIF for Pakistan", "Draft a PIF for Cuba"
- "none": Use for general chat where no document generation is required. Examples: "What is a PIF?", "Hello", general questions
- Set "needsDatabase" to true when the user is asking about an existing country or section that should be retrieved from the database before continuing. Example triggers: "Show me Rwanda", "What's in the Rwanda GHG section", "Give me the country data for Kenya".
- If "needsDatabase" is true, ensure you fill "country", and provide "section" when the request is targeting a specific section.

Examples:
- "Create a PIF for Kenya" = generate
- "Generate PIF for Pakistan" = generate
- "Draft a PIF for Cuba" = generate
- "What information do we have for Rwanda?" = needsDatabase true
- "Show me the Rwanda GHG section" = needsDatabase true with section "GHG"
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
    const detectedSection = extractSectionFromMessage(userMessage);
    
    const pifKeywords = ['create', 'make', 'generate', 'draft', 'write', 'pif', 'project information form'];
    const hasPifRequest = pifKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Determine action based on keywords
    if (hasPifRequest && mentionedCountry) {
      return { 
        shouldProcess: true, 
        action: 'generate', 
        country: mentionedCountry, 
        section: detectedSection,
        needsDatabase: false,
        reason: 'Fallback detection: PIF request with country' 
      };
    }
    
    // More lenient fallback - if any country is mentioned, assume PIF generation
    if (mentionedCountry) {
      return { 
        shouldProcess: false, 
        action: 'none', 
        country: mentionedCountry, 
        section: detectedSection,
        needsDatabase: true,
        reason: 'Fallback detection: Country mentioned - needs database lookup' 
      };
    }
    
    return { shouldProcess: false, action: 'none', needsDatabase: false, section: detectedSection ?? null, reason: 'Error parsing decision - using fallback' };
  }
}

function formatSectionContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (content === null || content === undefined) {
    return 'No content available.';
  }

  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}

export async function POST(req: Request) {
  console.log('Request received');
  
  // Check content type to handle both JSON and FormData
  const contentType = req.headers.get('content-type') || '';
  let messages: any[];
  let document: any;
  let lastMessage: any;
  let files: File[] = [];
  let fileTypes: string[] = [];
  let originalMessage: string = '';
  let skipFiles: boolean = false;
  let uploadCountry: string | null = null;
  
  if (contentType.includes('multipart/form-data')) {
    // Handle FormData request
    const formData = await req.formData();
    const messagesJson = formData.get('messages') as string;
    const documentJson = formData.get('document') as string;
    originalMessage = (formData.get('originalMessage') as string) || '';
    skipFiles = formData.get('skipFiles') === 'true';
    uploadCountry = (formData.get('country') as string) || null;
    
    messages = messagesJson ? JSON.parse(messagesJson) : [];
    document = documentJson ? JSON.parse(documentJson) : null;
    
    // Extract files and file types (only if not skipping)
    if (!skipFiles) {
      const filesData = formData.getAll('files') as File[];
      const fileTypesData = formData.getAll('fileTypes') as string[];
      files = filesData.filter(f => f instanceof File);
      fileTypes = fileTypesData;
    }
    
    lastMessage = messages[messages.length - 1] || { content: originalMessage };
  } else {
    // Handle JSON request
    const body = await req.json();
    messages = body.messages || [];
    document = body.document || null;
    lastMessage = messages[messages.length - 1];
  }

  try {
    // First, determine what action to take
    const decision = await shouldProcessDocument(lastMessage.content, document);
    console.log('Decision:', decision);

    const messageCountry = extractCountryFromMessage(lastMessage.content);
    const sectionFromDecision = decision.section || null;
    const sectionKey = sectionFromDecision || extractSectionFromMessage(lastMessage.content);
    let countryData = null;
    let sectionContent: unknown = null;
    let countryLookupError: string | null = null;
    const normalizedCountry = decision.country ? decision.country.charAt(0).toUpperCase() + decision.country.slice(1) : null;

    if (decision.country || decision.needsDatabase) {
      const lookupCountry = decision.country || messageCountry;
      if (lookupCountry) {
        const { country, error } = await getCountryByName(lookupCountry);
        if (error) {
          console.error('Country lookup failed:', error);
          countryLookupError = error.message;
        } else {
          countryData = country;
          if (country && sectionKey) {
            const sections = (country.sections ?? {}) as Record<string, unknown>;
            sectionContent = sections[sectionKey] ?? null;
          }
        }
      } else {
        countryLookupError = 'No recognizable country provided for lookup.';
      }
    }

    if (decision.needsDatabase) {
      const messagesToSend: { role: 'assistant'; content: string }[] = [];
      const fallbackCountry = decision.country || messageCountry;
      const displayCountry =
        countryData?.name ||
        normalizedCountry ||
        ( fallbackCountry
          ? fallbackCountry.charAt(0).toUpperCase() + fallbackCountry.slice(1)
          : 'the requested country');

      messagesToSend.push({
        role: 'assistant',
        content: `Let me check the database for ${displayCountry}...`,
      });

      if (countryLookupError) {
        messagesToSend.push({
          role: 'assistant',
          content: `I couldn’t retrieve data due to an error: ${countryLookupError}`,
        });
      } else if (!countryData) {
        messagesToSend.push({
          role: 'assistant',
          content: `I searched the database but couldn’t find any records for ${displayCountry}.`,
        });
      } else if (sectionKey && sectionContent) {
        messagesToSend.push({
          role: 'assistant',
          content: `Here’s the latest information for the ${sectionKey} section in ${countryData.name}:\n\n${formatSectionContent(sectionContent)}`,
        });
      } else if (sectionKey && !sectionContent) {
        messagesToSend.push({
          role: 'assistant',
          content: `I checked ${countryData.name}, but the ${sectionKey} section is currently empty.`,
        });
      } else {
        const sections = (countryData.sections ?? {}) as Record<string, unknown>;
        if (sections && Object.keys(sections).length > 0) {
          const formattedSections = Object.entries(sections)
            .map(([key, value]) => `**${key}**\n${formatSectionContent(value)}`)
            .join('\n\n');
          messagesToSend.push({
            role: 'assistant',
            content: `Here are the sections I found for ${countryData.name}:\n\n${formattedSections}`,
          });
        } else {
          messagesToSend.push({
            role: 'assistant',
            content: `I found ${countryData.name}, but there aren’t any sections stored yet.`,
          });
        }
      }

      return Response.json({
        type: 'database_lookup',
        messages: messagesToSend,
        countryContext: {
          country: countryData,
          sectionKey,
          sectionContent,
          error: countryLookupError,
        },
      });
    }

    // Handle manual file uploads (no pending action, just processing files)
    if (files.length > 0 && uploadCountry && !decision.shouldProcess) {
      // Get country data for the uploaded country
      let targetCountryData = null;
      if (uploadCountry) {
        const { country, error } = await getCountryByName(uploadCountry);
        if (!error && country) {
          targetCountryData = country;
        } else {
          // Create country if it doesn't exist
          const { data: newCountry, error: createError } = await supabase
            .from('countries')
            .insert({
              name: uploadCountry,
              sections: { sections: [] }
            })
            .select()
            .single();
          
          if (!createError && newCountry) {
            targetCountryData = newCountry;
          }
        }
      }
      
      if (targetCountryData) {
        // Process files
        const uploadedFiles = await processUploadedFiles(files, fileTypes, targetCountryData);
        
        return Response.json({
          type: 'file_upload_success',
          uploadedFiles: uploadedFiles,
          country: uploadCountry,
        });
      } else {
        return Response.json({
          type: 'file_upload_error',
          error: 'Failed to get or create country record',
        }, { status: 400 });
      }
    }

    // Handle generation after database lookup status - actually generate the document
    // Check if previous message was about database lookup
    const prevMessage = messages.length > 1 ? messages[messages.length - 2] : null;
    const isAfterDatabaseLookup = prevMessage?.content?.toLowerCase().includes('pulling') ||
                                   lastMessage.content.toLowerCase().includes('pulling') ||
                                   lastMessage.content.toLowerCase().includes('database') ||
                                   lastMessage.content.toLowerCase().includes('information') ||
                                   lastMessage.content.toLowerCase().includes('web sources');
    
    if (decision.shouldProcess && decision.action === 'generate' && isAfterDatabaseLookup) {
      // Actually generate the document now
      console.log('Actually generating PIF document now');
      
      // Get the original message from earlier in conversation
      const originalGenMessage = originalMessage || messages.find(m => 
        m.content.toLowerCase().includes('create') || 
        m.content.toLowerCase().includes('generate') ||
        m.content.toLowerCase().includes('draft') ||
        m.content.toLowerCase().includes('pif')
      )?.content || lastMessage.content;
      
      const newDocument = await generateNewPIF(originalGenMessage, document, countryData, []);
      
      if (newDocument) {
        console.log('PIF generated successfully');
        return Response.json({ 
          type: 'document_update',
          document: newDocument,
          decision: decision,
          agent: 'generating',
          uploadedFiles: [],
          filesUploaded: false,
          countryContext: {
            country: countryData,
            sectionKey,
            sectionContent,
            error: countryLookupError,
          },
        });
      }
    }

    if (decision.shouldProcess) {
      // Check if this is a response to the file upload question
      const lowerMessage = lastMessage.content.toLowerCase();
      const wantsToUpload = lowerMessage.includes('upload') || lowerMessage.includes('yes') || lowerMessage.includes('add files');
      const useExisting = lowerMessage.includes('use existing') || lowerMessage.includes('no') || lowerMessage.includes('proceed') || lowerMessage.includes('continue') || lowerMessage.includes('skip');
      
      // Check if files were uploaded or if user skipped
      const hasFiles = files.length > 0;
      
      // If user explicitly wants to upload files or has uploaded files
      if (hasFiles || (wantsToUpload && !useExisting)) {
        // Get country data from upload if provided, otherwise use existing countryData
        let targetCountryData = countryData;
        if (uploadCountry && !targetCountryData) {
          const { country, error } = await getCountryByName(uploadCountry);
          if (!error && country) {
            targetCountryData = country;
          }
        }
        
        // If user wants to upload but hasn't uploaded yet, ask for file upload
        if (wantsToUpload && !hasFiles) {
          return Response.json({
            type: 'needs_file_upload',
            action: decision.action,
            originalMessage: lastMessage.content,
            decision: decision,
            countryContext: {
              country: countryData,
              sectionKey,
              sectionContent,
              error: countryLookupError,
            },
          });
        }
        
        // Process files if provided, then proceed with generation
        let uploadedFiles: any[] = [];
        if (hasFiles) {
          // Process files first
          uploadedFiles = await processUploadedFiles(files, fileTypes, targetCountryData);
        }
        
        // Now proceed with generation/editing
        if (decision.action === 'generate') {
          console.log('PIF Generation triggered');
          
          // Check database for country data
          const finalCountryData = targetCountryData || countryData;
          const countryName = finalCountryData?.name || extractCountryFromMessage(originalMessage || lastMessage.content) || 'Unknown';
          const normalizedCountryName = countryName.charAt(0).toUpperCase() + countryName.slice(1);
          
          // Check if we have database information
          let hasDatabaseInfo = false;
          if (finalCountryData && finalCountryData.sections) {
            const sections = finalCountryData.sections as { sections?: Array<{ name: string; documents: Array<any> }> } | null;
            if (sections?.sections && sections.sections.length > 0) {
              // Check if any section has documents
              hasDatabaseInfo = sections.sections.some(section => 
                section.documents && section.documents.length > 0
              );
            }
          }
          
          // Send database lookup status
          return Response.json({
            type: 'database_lookup_status',
            hasData: hasDatabaseInfo,
            country: normalizedCountryName,
            action: decision.action,
            originalMessage: originalMessage || lastMessage.content,
            decision: decision,
            uploadedFiles: uploadedFiles,
            filesUploaded: hasFiles,
            countryContext: {
              country: finalCountryData,
              sectionKey,
              sectionContent,
              error: countryLookupError,
            },
          });
        }
      } else if (useExisting || skipFiles) {
        // User wants to proceed with existing data - check database and generate
        if (decision.action === 'generate') {
          console.log('PIF Generation triggered - checking database');
          
          // Check database for country data
          const countryName = countryData?.name || extractCountryFromMessage(originalMessage || lastMessage.content) || 'Unknown';
          const normalizedCountryName = countryName.charAt(0).toUpperCase() + countryName.slice(1);
          
          // Check if we have database information
          let hasDatabaseInfo = false;
          if (countryData && countryData.sections) {
            const sections = countryData.sections as { sections?: Array<{ name: string; documents: Array<any> }> } | null;
            if (sections?.sections && sections.sections.length > 0) {
              // Check if any section has documents
              hasDatabaseInfo = sections.sections.some(section => 
                section.documents && section.documents.length > 0
              );
            }
          }
          
          // Send database lookup status
          return Response.json({
            type: 'database_lookup_status',
            hasData: hasDatabaseInfo,
            country: normalizedCountryName,
            action: decision.action,
            originalMessage: originalMessage || lastMessage.content,
            decision: decision,
            uploadedFiles: [],
            filesUploaded: false,
            countryContext: {
              country: countryData,
              sectionKey,
              sectionContent,
              error: countryLookupError,
            },
          });
        }
      } else {
        // First time - ask if they want to upload files or use existing data
        if (decision.action === 'generate') {
          return Response.json({
            type: 'file_upload_question',
            action: decision.action,
            originalMessage: lastMessage.content,
            decision: decision,
            countryContext: {
              country: countryData,
              sectionKey,
              sectionContent,
              error: countryLookupError,
            },
          });
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
