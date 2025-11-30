import { getCountryByName } from '@/lib/countries';
import { supabase } from '@/lib/supabaseClient';
import { extractText } from 'unpdf';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

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

// Process uploaded files: parse and extract sections
async function processUploadedFiles(files: File[], fileTypes: string[], countryData: any): Promise<any[]> {
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
        // Parse PDF using unpdf
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
        // Convert HTML to plain text for extraction
        pdfText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      } else {
        // Try to read as text
        const buffer = Buffer.from(arrayBuffer);
        pdfText = buffer.toString('utf-8');
      }
      
      // Extract sections using AI subagents and update database
      if (pdfText && countryData) {
        try {
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

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const country = formData.get('country') as string;

    if (!country || !country.trim()) {
      return Response.json({ error: 'Country name is required' }, { status: 400 });
    }

    const normalizedCountry = country.trim().charAt(0).toUpperCase() + country.trim().slice(1);

    // Extract files from form data
    const filesData = formData.getAll('files') as File[];
    const fileTypesData = formData.getAll('fileTypes') as string[];
    const files = filesData.filter(f => f instanceof File);
    const fileTypes = fileTypesData;

    if (files.length === 0) {
      return Response.json({ error: 'No files provided' }, { status: 400 });
    }

    // Get or create country record
    let { country: existingCountry, error: countryError } = await getCountryByName(normalizedCountry);
    
    if (countryError || !existingCountry) {
      // Create new country record
      const { data: newCountry, error: createError } = await supabase
        .from('countries')
        .insert({
          name: normalizedCountry,
          sections: { sections: [] }
        })
        .select()
        .single();
      
      if (!createError && newCountry) {
        existingCountry = newCountry;
      } else {
        return Response.json(
          { error: `Failed to create country: ${createError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    if (!existingCountry) {
      return Response.json({ error: 'Failed to get or create country record' }, { status: 500 });
    }

    // Process files
    console.log(`[File Processing] Starting extraction and upload for ${normalizedCountry}`);
    console.log(`[File Processing] Files: ${files.map(f => f.name).join(', ')}`);
    console.log(`[File Processing] File types: ${fileTypes.join(', ')}`);
    
    const processedFiles = await processUploadedFiles(files, fileTypes, existingCountry);
    
    // Refresh country data after processing files to get newly extracted sections
    const { country: updatedCountry } = await getCountryByName(normalizedCountry);
    
    console.log(`[File Processing] ✓ Finished extracting info and uploading files for ${normalizedCountry}`);
    
    return Response.json({
      success: true,
      country: normalizedCountry,
      processedFiles,
      countryData: updatedCountry || existingCountry,
    });

  } catch (error) {
    console.error('Error processing files:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to process files' },
      { status: 500 }
    );
  }
}

