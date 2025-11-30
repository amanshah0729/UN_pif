import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import fs from 'fs';
import path from 'path';
import { jsonrepair } from 'jsonrepair';

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

// Pre-computed section boundaries (same as in generate-pif route)
const SECTION_BOUNDARIES: Record<string, { start: number; end: number }> = {
  'Climate Transparency': { start: 15, end: 24 },
  'Institutional Framework for Climate Action': { start: 31, end: 36 },
  'National Policy Framework': { start: 36, end: 47 },
  'Official Reporting to the UNFCCC': { start: 47, end: 58 },
  'GHG Inventory': { start: 58, end: 70 },
  'Adaptation and Vulnerability': { start: 70, end: 83 },
  'NDC Tracking': { start: 83, end: 95 },
  'Support Needed and Received': { start: 95, end: 106 },
  'Other Baseline Initiatives': { start: 106, end: 111 },
  'Key Barriers': { start: 111, end: 131 },
};

// Extract section JSON chunk from document by finding section heading
function extractSectionJSON(documentContent: any[], sectionName: string): { startIndex: number; endIndex: number; sectionJSON: any[] } | null {
  if (!documentContent || !Array.isArray(documentContent)) {
    return null;
  }

  // Section heading patterns (same as in generate-pif route)
  const SECTION_HEADING_PATTERNS: Record<string, string[]> = {
    'GHG Inventory': ['GHG Inventory Module'],
    'Climate Transparency': ['Climate Transparency in'],
    'Adaptation and Vulnerability': ['Adaptation and Vulnerability Module'],
    'NDC Tracking': ['NDC Tracking Module'],
    'Institutional Framework for Climate Action': ['Institutional Framework for Climate Action'],
    'National Policy Framework': ['National Policy Framework'],
    'Support Needed and Received': ['Support Needed and Received Module'],
    'Key Barriers': ['Key barriers'],
    'Other Baseline Initiatives': ['Other baseline initiatives'],
    'Official Reporting to the UNFCCC': ['Official reporting to the UNFCCC'],
  };

  const patterns = SECTION_HEADING_PATTERNS[sectionName];
  if (!patterns) {
    console.warn(`[Edit] No patterns found for section: ${sectionName}`);
    return null;
  }

  // Find the section start by searching for the heading
  let startIndex = -1;
  let sectionLevel = 6; // Default level

  for (let i = 0; i < documentContent.length; i++) {
    const node = documentContent[i];
    if (node.type === 'heading' && node.content) {
      const headingText = node.content.map((c: any) => c.text || '').join('').toLowerCase();
      const matchesPattern = patterns.some(pattern => headingText.includes(pattern.toLowerCase()));
      
      if (matchesPattern) {
        startIndex = i;
        sectionLevel = node.attrs?.level || 6;
        break;
      }
    }
  }

  if (startIndex === -1) {
    console.warn(`[Edit] Could not find section heading for: ${sectionName}`);
    return null;
  }

  // Find the section end by looking for the next heading of equal or higher level
  let endIndex = documentContent.length;
  
  for (let i = startIndex + 1; i < documentContent.length; i++) {
    const node = documentContent[i];
    if (node.type === 'heading') {
      const level = node.attrs?.level || 0;
      // If it's a heading of the same level or higher, it marks the end of the current section
      if (level <= sectionLevel) {
        endIndex = i;
        break;
      }
    }
  }

  const sectionJSON = documentContent.slice(startIndex, endIndex);
  return { startIndex, endIndex, sectionJSON };
}

// Replace [Country] placeholders in JSON recursively
function replaceCountryPlaceholders(node: any, country: string): any {
  if (!node) return node;
  
  const newNode = JSON.parse(JSON.stringify(node));
  
  if (newNode.type === 'text' && newNode.text) {
    newNode.text = newNode.text.replace(/\[Country\]|\{Country\}/g, country);
  }
  
  if (newNode.content && Array.isArray(newNode.content)) {
    newNode.content = newNode.content.map((child: any) => replaceCountryPlaceholders(child, country));
  }
  
  return newNode;
}

// Edit section JSON using AI subagent
async function editSectionJSON(
  sectionJSON: any[],
  sectionName: string,
  editInstructions: string
): Promise<{ editedJSON: any[] }> {
  const startTime = Date.now();
  
  const sectionJSONStr = JSON.stringify(sectionJSON, null, 2);
  
  // Build prompt for AI - focused on editing existing content
  const prompt = `Here's the current "${sectionName}" section JSON that needs to be edited:

${sectionJSONStr}

Edit Instructions:
${editInstructions}

Your job is to edit the "${sectionName}" section according to the instructions above.

CRITICAL REQUIREMENTS:
- Keep ALL content that isn't mentioned in the edit instructions - do NOT remove or change anything unless explicitly requested
- Only modify what's specifically mentioned in the edit instructions
- Preserve ALL formatting, structure, tables, headings, and JSON structure exactly as provided
- Maintain all table structures (tableRow, tableHeader, tableCell, colspan, rowspan, etc.) unless specifically asked to change them
- Keep all "STANDARD TEXT TO BE INCLUDED" sections exactly as-is unless mentioned in edits
- Do NOT remove any nodes unless explicitly requested
- If adding content, maintain the same formatting style as existing content
- If editing tables, preserve the table structure and only modify cell content

CRITICAL: Return ONLY the edited ProseMirror JSON array. The response must be VALID JSON that can be parsed directly. 

IMPORTANT JSON VALIDITY REQUIREMENTS:
- All strings must use double quotes (")
- Escape all double quotes inside strings with backslash (\\")
- Escape all backslashes with double backslash (\\\\)
- Escape newlines in strings as \\n
- No trailing commas
- All property names must be in double quotes
- Ensure proper closing brackets and braces

Do not wrap in markdown code blocks. Do not add explanations. Return the complete JSON array starting with "[" and ending with "]".`;

  // Retry logic with exponential backoff for rate limits
  const maxRetries = 5;
  let lastError: any = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Use gpt-4o-mini for better rate limits and lower cost
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.3,
      });
      
      // Extract JSON from response
      let jsonStr = result.text.trim();
      jsonStr = jsonStr.replace(/^```json\n?/gm, '').replace(/^```\n?/gm, '').replace(/```$/gm, '');
      jsonStr = jsonStr.trim();

      // Try to parse the JSON
      let editedJSON: any[];
      try {
        editedJSON = JSON.parse(jsonStr);
      } catch (parseError: any) {
        // Try to extract JSON array from the response
        const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
        let jsonToRepair = jsonMatch ? jsonMatch[0] : jsonStr;
        
        try {
          // Try parsing the extracted JSON
          editedJSON = JSON.parse(jsonToRepair);
        } catch (extractError: any) {
          try {
            // Use jsonrepair to fix common JSON syntax errors
            const repairedJson = jsonrepair(jsonToRepair);
            editedJSON = JSON.parse(repairedJson);
          } catch (repairError: any) {
            console.error(`[Edit: ${sectionName}] ✗ JSON repair failed: ${repairError.message}`);
            throw new Error(`Could not parse or repair JSON from AI response: ${repairError.message}`);
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      console.log(`[Edit: ${sectionName}] ✓ Section edited successfully in ${totalDuration}ms`);
      return { editedJSON };
    } catch (error: any) {
      lastError = error;
      const errorType = error?.constructor?.name || 'Unknown';
      const errorMessage = error?.message || String(error);
      
      console.error(`[Edit: ${sectionName}] ✗ Error on attempt ${attempt + 1}/${maxRetries}:`, {
        errorType,
        errorMessage: errorMessage.substring(0, 200),
      });
      
      // Check if it's a rate limit error
      const isRateLimit = errorMessage?.includes('rate limit') || 
                         errorMessage?.includes('Rate limit') ||
                         error?.cause?.message?.includes('rate limit') ||
                         errorMessage?.includes('TPM') ||
                         errorMessage?.includes('RPM');
      
      if (isRateLimit && attempt < maxRetries - 1) {
        const waitTime = Math.min(Math.pow(2, attempt) * 1000, 30000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Check if it's a timeout error
      const isTimeout = errorMessage?.includes('timeout') || 
                       errorMessage?.includes('Timeout') ||
                       errorMessage?.includes('ETIMEDOUT');
      
      if (isTimeout && attempt < maxRetries - 1) {
        const waitTime = Math.min(Math.pow(2, attempt) * 1000, 30000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // If not rate limit/timeout or max retries reached, fallback
      if (attempt === maxRetries - 1) {
        console.error(`[Edit: ${sectionName}] ✗ Max retries reached: ${errorMessage.substring(0, 200)}`);
        // Fallback: return original JSON (no changes)
        return { editedJSON: sectionJSON };
      }
      
      // For other errors, retry with backoff
      const waitTime = Math.min(Math.pow(2, attempt) * 1000, 10000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }
  }
  
  // Should never reach here, but TypeScript needs it
  console.error(`[Edit] ✗ editSectionJSON failed after all retries:`, lastError?.message || 'Unknown error');
  return { editedJSON: sectionJSON };
}

// Section edit subagent: Extracts section, edits it with AI, returns edited JSON
async function processSectionEdit(
  sectionName: string,
  documentContent: any[],
  editInstructions: string
): Promise<{ sectionName: string; editedJSON: any[] | null; success: boolean }> {
  // Step 1: Extract section JSON from document
  const sectionExtraction = extractSectionJSON(documentContent, sectionName);
  if (!sectionExtraction) {
    console.warn(`[Edit: ${sectionName}] Could not find section in document`);
    return { sectionName, editedJSON: null, success: false };
  }

  const { sectionJSON } = sectionExtraction;
  
  // Step 2: Edit section JSON using AI
  try {
    const { editedJSON } = await editSectionJSON(
      sectionJSON,
      sectionName,
      editInstructions
    );
    
    // Replace country placeholders (if any)
    const finalJSON = editedJSON.map((node: any) => replaceCountryPlaceholders(node, ''));
    
    return { 
      sectionName, 
      editedJSON: finalJSON,
      success: true
    };
  } catch (error) {
    console.error(`[Edit: ${sectionName}] Error editing section:`, error);
    // Fallback: return original JSON
    return { sectionName, editedJSON: sectionJSON, success: false };
  }
}

// Edit PIF document
async function editPIFDocument(
  proseMirrorJson: any,
  sectionsToEdit: string[],
  editInstructions: string
) {
  console.log(`\n=== Starting PIF Edit ===`);
  console.log(`Sections to edit: ${sectionsToEdit.join(', ')}`);
  
  // Get the content array from document
  const documentContent = proseMirrorJson.content || [];
  if (!Array.isArray(documentContent)) {
    throw new Error('Document content is not an array');
  }

  // Validate sections exist
  const invalidSections = sectionsToEdit.filter(s => !SECTION_BOUNDARIES[s]);
  if (invalidSections.length > 0) {
    throw new Error(`Invalid sections: ${invalidSections.join(', ')}`);
  }

  // Step 1: Process section edits in parallel (batched)
  console.log(`[Edit] Sending call to ${sectionsToEdit.length} edit subagents...`);
  const BATCH_SIZE = 2;
  const editResults: Array<{ sectionName: string; editedJSON: any[] | null; success: boolean }> = [];
  
  for (let i = 0; i < sectionsToEdit.length; i += BATCH_SIZE) {
    const batch = sectionsToEdit.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(sectionName => 
      processSectionEdit(sectionName, documentContent, editInstructions)
    );
    
    const batchResults = await Promise.all(batchPromises);
    editResults.push(...batchResults);
    
    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < sectionsToEdit.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`[Edit] ✓ All edit subagents have returned`);
  
  // Step 2: Build section replacement map
  const sectionReplacements: Map<string, { editedJSON: any[]; startIndex: number; endIndex: number }> = new Map();
  const successfulEdits: string[] = [];
  const failedEdits: string[] = [];
  
  editResults.forEach(({ sectionName, editedJSON, success }) => {
    if (editedJSON && editedJSON.length > 0) {
      const extraction = extractSectionJSON(documentContent, sectionName);
      if (extraction) {
        sectionReplacements.set(sectionName, {
          editedJSON,
          startIndex: extraction.startIndex,
          endIndex: extraction.endIndex,
        });
        
        if (success) {
          successfulEdits.push(sectionName);
        } else {
          failedEdits.push(sectionName);
        }
      }
    } else {
      failedEdits.push(sectionName);
    }
  });

  // Step 3: Replace sections in document with edited JSON
  // Sort replacements by startIndex in reverse order to avoid index shifting issues
  const sortedReplacements = Array.from(sectionReplacements.entries())
    .map(([sectionName, data]) => ({
      sectionName,
      ...data,
    }))
    .sort((a, b) => b.startIndex - a.startIndex); // Reverse order
  
  // Create new content array with replacements
  let editedContent = [...documentContent];
  
  for (const replacement of sortedReplacements) {
    const { editedJSON, startIndex, endIndex } = replacement;
    
    // Replace the section
    editedContent = [
      ...editedContent.slice(0, startIndex),
      ...editedJSON,
      ...editedContent.slice(endIndex),
    ];
  }
  
  // Create edited document
  const editedDocument = {
    ...proseMirrorJson,
    content: editedContent,
  };

  console.log(`[Edit] ✓ Document edit complete`);
  console.log(`  Successful edits: ${successfulEdits.length} (${successfulEdits.join(', ')})`);
  if (failedEdits.length > 0) {
    console.log(`  Failed edits: ${failedEdits.length} (${failedEdits.join(', ')})`);
  }

  return { 
    document: editedDocument, 
    successfulEdits,
    failedEdits
  };
}

export async function POST(req: Request) {
  try {
    const { proseMirrorJson, sections, editInstructions } = await req.json();

    if (!proseMirrorJson) {
      return Response.json({ error: 'ProseMirror JSON is required' }, { status: 400 });
    }

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return Response.json({ error: 'At least one section must be specified for editing' }, { status: 400 });
    }

    if (!editInstructions || !editInstructions.trim()) {
      return Response.json({ error: 'Edit instructions are required' }, { status: 400 });
    }

    console.log(`[Edit] Starting edit request for ${sections.length} section(s)`);

    // Edit PIF document
    const { document, successfulEdits, failedEdits } = await editPIFDocument(
      proseMirrorJson,
      sections,
      editInstructions.trim()
    );

    // Extract title from ProseMirror JSON for response metadata
    const titleHeading = document.content?.find(
      (node: any) => node.type === 'heading' && node.attrs?.level === 1
    );
    const title = titleHeading?.content?.map((n: any) => n.text || '').join('') || 'Project Information Form';

    console.log(`[Edit] ✓ Edit request complete`);

    return Response.json({
      document, // Updated ProseMirror JSON
      title,
      successfulEdits,
      failedEdits,
    });

  } catch (error) {
    console.error('[Edit] ✗ Error editing PIF:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to edit PIF' },
      { status: 500 }
    );
  }
}

