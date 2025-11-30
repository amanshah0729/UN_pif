const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
// Also try .env if .env.local doesn't exist
if (!process.env.OPENAI_API_KEY) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

// This script tests generateFilledSectionJSON
// Note: This requires Node.js with ES modules support or we need to use dynamic imports
// Since route.ts uses ES modules, we'll need to use a different approach

console.log('='.repeat(80));
console.log('Testing generateFilledSectionJSON');
console.log('='.repeat(80));

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.log('\n⚠️  ERROR: OPENAI_API_KEY environment variable is not set.');
  console.log('   Please set it before running this script:');
  console.log('   export OPENAI_API_KEY="your-api-key-here"');
  console.log('   or');
  console.log('   OPENAI_API_KEY="your-api-key-here" node scripts/test-generate-filled-section.cjs\n');
  process.exit(1);
}

console.log('\n✅ OpenAI API key found in environment.\n');

// We'll use dynamic import for ES modules
async function runTest() {
  try {
    // Import the necessary modules
    const { openai } = await import('@ai-sdk/openai');
    const { generateText } = await import('ai');
    const { jsonrepair } = await import('jsonrepair');

    // Load a test section JSON (using the smallest one for faster testing)
    const testSection = 'institutional_framework_for_climate_action';
    const sectionJsonPath = path.join(__dirname, '../test-output', `${testSection}.json`);
    
    if (!fs.existsSync(sectionJsonPath)) {
      console.error(`❌ Section JSON not found: ${sectionJsonPath}`);
      console.log('   Run test-extract-section-json.cjs first to generate test files.');
      process.exit(1);
    }

    const sectionJSON = JSON.parse(fs.readFileSync(sectionJsonPath, 'utf-8'));
    const sectionName = 'Institutional Framework for Climate Action';
    const country = 'Kenya';
    
    // Optional: Add some mock database content
    const databaseContent = `Kenya has established a robust institutional framework for climate action. The Climate Change Act of 2016 established the Climate Change Directorate within the Ministry of Environment and Forestry. The country has also set up the National Climate Change Council to coordinate climate action across government ministries.`;

    console.log(`📋 Test Configuration:`);
    console.log(`   Section: ${sectionName}`);
    console.log(`   Country: ${country}`);
    console.log(`   Section JSON nodes: ${sectionJSON.length}`);
    console.log(`   Database content: ${databaseContent ? 'Yes' : 'No'}`);
    console.log(`\n🚀 Starting AI generation...\n`);

    // Replicate the generateFilledSectionJSON function logic
    const sectionJSONStr = JSON.stringify(sectionJSON, null, 2);
    const jsonSize = sectionJSONStr.length;
    console.log(`[${sectionName}] Section JSON size: ${jsonSize} characters (${Math.round(jsonSize / 1024)}KB)`);

    // Build prompt
    let prompt = `Here's the JSON you need to fill out:

${sectionJSONStr}

${databaseContent ? `Here's data from the database on ${country} for the "${sectionName}" section:

${databaseContent.substring(0, 10000)}${databaseContent.length > 10000 ? '\n\n[... database content truncated for length ...]' : ''}` : ''}

Your job is to fill out the "${sectionName}" section accurately for ${country}.

${databaseContent ? `- Use the database data provided above as your PRIMARY source
- Fill in any gaps or missing information using your knowledge of ${country} and climate transparency frameworks` : `- Generate comprehensive content based on your knowledge of ${country} and climate transparency frameworks`}
- Fill in all placeholders (like "[…]", "[XXX words]", "PROMPT:", "[….]", etc.) with actual content
- Fill out ALL tables completely - add rows with actual data, fill in all table cells
- Replace "{Country}" or "[Country]" with "${country}"
- Maintain ALL formatting, structure, tables, headings, and JSON structure exactly as provided
- Keep all "STANDARD TEXT TO BE INCLUDED" and "STANDARD TEXT TO BE INCLUDED END" sections exactly as-is
- Preserve all table structure (tableRow, tableHeader, colspan, rowspan, etc.)
- Do NOT remove any nodes - only replace placeholder text content

IMPORTANT: Accumulate sources (URLs, document names, etc.) as you generate content. Append a new paragraph at the bottom of the section with the sources in this format:
"Sources: [source1, source2, source3]"

CRITICAL: Return ONLY the filled ProseMirror JSON array. The response must be VALID JSON that can be parsed directly. 

IMPORTANT JSON VALIDITY REQUIREMENTS:
- All strings must use double quotes (")
- Escape all double quotes inside strings with backslash (\\")
- Escape all backslashes with double backslash (\\\\)
- Escape newlines in strings as \\n
- No trailing commas
- All property names must be in double quotes
- Ensure proper closing brackets and braces

Do not wrap in markdown code blocks. Do not add explanations. Return the complete JSON array starting with "[" and ending with "]".`;

    const promptSize = prompt.length;
    console.log(`[${sectionName}] Prompt size: ${promptSize} characters (${Math.round(promptSize / 1024)}KB)`);

    const startTime = Date.now();
    console.log(`[${sectionName}] Calling OpenAI API...`);

    // Call OpenAI API
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    });

    const apiCallDuration = Date.now() - startTime;
    console.log(`[${sectionName}] ✓ API call completed in ${apiCallDuration}ms`);
    console.log(`[${sectionName}] Response length: ${result.text.length} characters`);

    console.log(`[${sectionName}] Parsing JSON from response...`);
    const parseStart = Date.now();

    // Extract JSON from response
    let jsonStr = result.text.trim();
    jsonStr = jsonStr.replace(/^```json\n?/gm, '').replace(/^```\n?/gm, '').replace(/```$/gm, '');
    jsonStr = jsonStr.trim();

    // Try to parse the JSON
    let filledJSON;
    try {
      console.log(`[${sectionName}] Attempting direct JSON parse...`);
      filledJSON = JSON.parse(jsonStr);
      console.log(`[${sectionName}] ✓ JSON parsed successfully (${filledJSON.length} nodes)`);
    } catch (parseError) {
      console.log(`[${sectionName}] Direct parse failed: ${parseError.message}, trying to extract JSON array...`);
      
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      let jsonToRepair = jsonMatch ? jsonMatch[0] : jsonStr;
      
      try {
        filledJSON = JSON.parse(jsonToRepair);
        console.log(`[${sectionName}] ✓ JSON extracted and parsed successfully (${filledJSON.length} nodes)`);
      } catch (extractError) {
        console.log(`[${sectionName}] Extracted JSON also failed: ${extractError.message}, attempting JSON repair...`);
        
        try {
          const repairedJson = jsonrepair(jsonToRepair);
          console.log(`[${sectionName}] ✓ JSON repaired successfully, attempting parse...`);
          filledJSON = JSON.parse(repairedJson);
          console.log(`[${sectionName}] ✓ Repaired JSON parsed successfully (${filledJSON.length} nodes)`);
        } catch (repairError) {
          console.error(`[${sectionName}] ✗ JSON repair failed: ${repairError.message}`);
          throw new Error(`Could not parse or repair JSON from AI response: ${repairError.message}`);
        }
      }
    }

    const parseDuration = Date.now() - parseStart;
    console.log(`[${sectionName}] JSON parsing completed in ${parseDuration}ms`);

    // Extract sources
    const sources = [];
    const sourcesMatch = result.text.match(/Sources?:?\s*\[([^\]]+)\]/i);
    if (sourcesMatch) {
      try {
        const sourcesStr = '[' + sourcesMatch[1] + ']';
        sources.push(...JSON.parse(sourcesStr));
      } catch (e) {
        // Ignore source parsing errors
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Success! Total time: ${totalDuration}ms`);
    console.log(`   Filled JSON nodes: ${filledJSON.length}`);
    console.log(`   Sources found: ${sources.length}`);
    if (sources.length > 0) {
      console.log(`   Sources: ${sources.join(', ')}`);
    }
    console.log('='.repeat(80));

    // Save the result
    const outputDir = path.join(__dirname, '../test-output');
    const outputPath = path.join(outputDir, `${testSection}_filled.json`);
    fs.writeFileSync(outputPath, JSON.stringify(filledJSON, null, 2), 'utf-8');
    console.log(`\n💾 Filled JSON saved to: ${outputPath}`);

    // Save a comparison file showing before/after
    const comparisonPath = path.join(outputDir, `${testSection}_comparison.txt`);
    let comparison = `BEFORE (Original Template):\n${'='.repeat(80)}\n`;
    comparison += JSON.stringify(sectionJSON, null, 2).substring(0, 2000);
    comparison += '\n\n...\n\n';
    comparison += `AFTER (AI Filled):\n${'='.repeat(80)}\n`;
    comparison += JSON.stringify(filledJSON, null, 2).substring(0, 2000);
    comparison += '\n\n...\n\n';
    fs.writeFileSync(comparisonPath, comparison, 'utf-8');
    console.log(`📄 Comparison saved to: ${comparisonPath}`);

    console.log(`\n✨ Test completed successfully!`);

  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runTest();

