const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
if (!process.env.OPENAI_API_KEY) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

console.log('='.repeat(80));
console.log('Testing PDF/DOCX Processing and Database Upload');
console.log('='.repeat(80));

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.log('\n⚠️  ERROR: OPENAI_API_KEY environment variable is not set.');
  process.exit(1);
}

// Check for Supabase credentials
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n⚠️  ERROR: Supabase credentials not found in environment.');
  console.log('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.\n');
  process.exit(1);
}

console.log('\n✅ Environment variables loaded.\n');

async function runTest() {
  try {
    // Import required modules
    const { openai } = await import('@ai-sdk/openai');
    const { generateText } = await import('ai');
    const { extractText } = await import('unpdf');
    const { createClient } = await import('@supabase/supabase-js');
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Test configuration
    const testCountry = 'Cuba'; // Using Cuba since we have a Cuba DOCX file
    const testDocType = 'BUR1';
    
    // Find a test file
    const testFilesDir = path.join(__dirname, '..', 'public', 'PIFS');
    const files = fs.readdirSync(testFilesDir);
    const testFile = files.find(f => f.endsWith('.pdf') || f.endsWith('.docx'));
    
    if (!testFile) {
      console.error(`❌ No PDF or DOCX files found in ${testFilesDir}`);
      console.log('   Please add a test PDF or DOCX file to test with.');
      process.exit(1);
    }
    
    const testFilePath = path.join(testFilesDir, testFile);
    console.log(`📄 Test file: ${testFile}`);
    console.log(`   Path: ${testFilePath}`);
    console.log(`   Country: ${testCountry}`);
    console.log(`   Document Type: ${testDocType}\n`);

    // Read file
    const fileBuffer = fs.readFileSync(testFilePath);

    // Parse file content
    console.log('📖 Parsing document...');
    let pdfText = '';
    
    if (testFile.endsWith('.pdf')) {
      const { text } = await extractText(
        new Uint8Array(fileBuffer),
        { mergePages: true }
      );
      pdfText = text;
      console.log(`✅ PDF parsed successfully (${pdfText.length} characters)`);
    } else if (testFile.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      // mammoth expects a Buffer or ArrayBuffer
      const { value: html } = await mammoth.convertToHtml({ buffer: fileBuffer });
      pdfText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`✅ DOCX parsed successfully (${pdfText.length} characters)`);
    } else {
      throw new Error(`Unsupported file type: ${testFile}`);
    }

    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('Failed to extract text from document');
    }

    // Section names
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

    // Extract section content using AI subagent
    async function extractSectionContent(pdfText, sectionName, docType, country) {
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

    // Parse document and extract content for all 10 sections
    console.log('\n🤖 Extracting sections using AI subagents...');
    console.log(`   This will run 10 parallel extractions (one per section)`);
    console.log(`   This may take 1-2 minutes...\n`);
    
    const extractedSections = {};
    const extractionStartTime = Date.now();
    
    // Run all 10 subagents in parallel
    const extractionPromises = SECTION_NAMES.map(async (sectionName) => {
      try {
        console.log(`   [Extracting] ${sectionName}...`);
        const content = await extractSectionContent(pdfText, sectionName, testDocType, testCountry);
        console.log(`   [✓] ${sectionName} (${content.length} chars)`);
        return { sectionName, content };
      } catch (error) {
        console.error(`   [✗] Error extracting ${sectionName}:`, error.message);
        return { sectionName, content: '' };
      }
    });
    
    const results = await Promise.all(extractionPromises);
    
    results.forEach(({ sectionName, content }) => {
      if (content && content.trim().length > 0) {
        extractedSections[sectionName] = content;
      }
    });
    
    const extractionDuration = Date.now() - extractionStartTime;
    console.log(`\n✅ Extraction completed in ${extractionDuration}ms`);
    console.log(`   Sections with content: ${Object.keys(extractedSections).length}/${SECTION_NAMES.length}`);

    // Get or create country record
    console.log(`\n💾 Updating database for ${testCountry}...`);
    
    const normalizedCountry = testCountry.trim().charAt(0).toUpperCase() + testCountry.trim().slice(1);
    
    // Get existing country
    let { data: country, error: countryError } = await supabase
      .from('countries')
      .select('id, name, sections')
      .ilike('name', normalizedCountry)
      .limit(1)
      .maybeSingle();
    
    if (countryError || !country) {
      console.log(`   Country not found, creating new record...`);
      const { data: newCountry, error: createError } = await supabase
        .from('countries')
        .insert({
          name: normalizedCountry,
          sections: { sections: [] }
        })
        .select()
        .single();
      
      if (createError || !newCountry) {
        throw new Error(`Failed to create country: ${createError?.message || 'Unknown error'}`);
      }
      
      country = newCountry;
      console.log(`   ✅ Created new country record`);
    } else {
      console.log(`   ✅ Found existing country record`);
    }

    // Get existing sections structure
    const existingData = country.sections || { sections: [] };
    const sectionsArray = existingData.sections || [];

    // Update each section with new document
    let sectionsUpdated = 0;
    SECTION_NAMES.forEach((sectionName) => {
      const extractedText = extractedSections[sectionName];
      
      if (!extractedText || extractedText.trim().length === 0) {
        return; // Skip sections with no extracted content
      }
      
      // Find existing section or create new one
      let section = sectionsArray.find(s => s.name === sectionName);
      
      if (!section) {
        section = {
          name: sectionName,
          documents: []
        };
        sectionsArray.push(section);
      }
      
      // Append new document to section
      section.documents.push({
        doc_type: testDocType,
        extracted_text: extractedText
      });
      
      sectionsUpdated++;
    });

    // Update country record
    const { error: updateError } = await supabase
      .from('countries')
      .update({
        sections: { sections: sectionsArray }
      })
      .eq('id', country.id);
    
    if (updateError) {
      throw new Error(`Failed to update country sections: ${updateError.message}`);
    }
    
    console.log(`   ✅ Updated ${sectionsUpdated} sections in database`);

    // Verify by reading back from database
    console.log(`\n🔍 Verifying database upload...`);
    
    const { data: verifiedCountry, error: verifyError } = await supabase
      .from('countries')
      .select('id, name, sections')
      .eq('id', country.id)
      .single();
    
    if (verifyError || !verifiedCountry) {
      throw new Error(`Failed to verify upload: ${verifyError?.message || 'Unknown error'}`);
    }
    
    const verifiedSections = verifiedCountry.sections?.sections || [];
    console.log(`   ✅ Verified: Found ${verifiedSections.length} sections in database`);
    
    // Show summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 Summary:');
    console.log('='.repeat(80));
    console.log(`   Country: ${verifiedCountry.name}`);
    console.log(`   Total sections: ${verifiedSections.length}`);
    
    verifiedSections.forEach((section) => {
      const docCount = section.documents?.length || 0;
      const latestDoc = docCount > 0 ? section.documents[docCount - 1] : null;
      const latestDocType = latestDoc?.doc_type || 'N/A';
      const latestDocLength = latestDoc?.extracted_text?.length || 0;
      
      console.log(`\n   📑 ${section.name}:`);
      console.log(`      Documents: ${docCount}`);
      if (latestDoc) {
        console.log(`      Latest: ${latestDocType} (${latestDocLength} chars)`);
      }
    });
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runTest();

