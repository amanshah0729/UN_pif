const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
if (!process.env.OPENAI_API_KEY) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

console.log('='.repeat(80));
console.log('Testing Table Preservation in AI-Generated JSON');
console.log('='.repeat(80));

async function testTablePreservation() {
  try {
    const { openai } = await import('@ai-sdk/openai');
    const { generateText } = await import('ai');
    const { jsonrepair } = await import('jsonrepair');

    // Load a section that HAS tables (GHG Inventory)
    const sectionJsonPath = path.join(__dirname, '../test-output', 'ghg_inventory.json');
    const sectionJSON = JSON.parse(fs.readFileSync(sectionJsonPath, 'utf-8'));
    
    console.log(`\n📋 Original Section: GHG Inventory`);
    console.log(`   Total nodes: ${sectionJSON.length}`);
    
    // Count tables in original
    const originalTableCount = sectionJSON.filter(node => node.type === 'table').length;
    console.log(`   Tables in original: ${originalTableCount}`);
    
    if (originalTableCount === 0) {
      console.log('   ⚠️  No tables found in this section, trying another...');
      // Try Other Baseline Initiatives
      const altPath = path.join(__dirname, '../test-output', 'other_baseline_initiatives.json');
      const altJSON = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
      const altTableCount = altJSON.filter(node => node.type === 'table').length;
      console.log(`   Other Baseline Initiatives has ${altTableCount} tables`);
      if (altTableCount > 0) {
        sectionJSON = altJSON;
      }
    }

    const sectionJSONStr = JSON.stringify(sectionJSON, null, 2);
    const sectionName = 'GHG Inventory';
    const country = 'Kenya';

    // Build the EXACT prompt used in production
    let prompt = `Here's the JSON you need to fill out:

${sectionJSONStr}

Your job is to fill out the "${sectionName}" section accurately for ${country}.

- Generate comprehensive content based on your knowledge of ${country} and climate transparency frameworks
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

    console.log(`\n🤖 Calling AI to generate filled JSON...`);
    console.log(`   Prompt size: ${prompt.length} characters (${Math.round(prompt.length / 1024)}KB)`);

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    });

    console.log(`✓ AI response received (${result.text.length} characters)`);

    // Parse JSON
    let jsonStr = result.text.trim();
    jsonStr = jsonStr.replace(/^```json\n?/gm, '').replace(/^```\n?/gm, '').replace(/```$/gm, '');
    jsonStr = jsonStr.trim();

    let filledJSON;
    try {
      filledJSON = JSON.parse(jsonStr);
    } catch (parseError) {
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      let jsonToRepair = jsonMatch ? jsonMatch[0] : jsonStr;
      try {
        filledJSON = JSON.parse(jsonToRepair);
      } catch (extractError) {
        const repairedJson = jsonrepair(jsonToRepair);
        filledJSON = JSON.parse(repairedJson);
      }
    }

    console.log(`\n📊 Analysis:`);
    console.log(`   Generated nodes: ${filledJSON.length}`);
    
    // Count tables in generated
    const generatedTableCount = filledJSON.filter(node => node.type === 'table').length;
    console.log(`   Tables in generated: ${generatedTableCount}`);
    
    // Compare node types
    const originalTypes = sectionJSON.map(n => n.type);
    const generatedTypes = filledJSON.map(n => n.type);
    
    console.log(`\n📋 Node Type Comparison:`);
    console.log(`   Original types: ${originalTypes.join(', ')}`);
    console.log(`   Generated types: ${generatedTypes.join(', ')}`);
    
    // Check if tables were replaced
    if (originalTableCount > 0 && generatedTableCount === 0) {
      console.log(`\n❌ PROBLEM FOUND: Tables were removed by AI!`);
      console.log(`   Original had ${originalTableCount} table(s), generated has 0`);
      
      // Find what replaced the table
      const tableIndex = originalTypes.indexOf('table');
      if (tableIndex >= 0 && tableIndex < generatedTypes.length) {
        console.log(`   Table at index ${tableIndex} was replaced with: ${generatedTypes[tableIndex] || 'NOTHING'}`);
      }
    } else if (originalTableCount === generatedTableCount) {
      console.log(`\n✅ Tables preserved!`);
    } else {
      console.log(`\n⚠️  Table count changed: ${originalTableCount} → ${generatedTableCount}`);
    }

    // Save both for comparison
    const outputDir = path.join(__dirname, '../test-output');
    fs.writeFileSync(
      path.join(outputDir, 'table-test-original.json'),
      JSON.stringify(sectionJSON, null, 2)
    );
    fs.writeFileSync(
      path.join(outputDir, 'table-test-generated.json'),
      JSON.stringify(filledJSON, null, 2)
    );
    
    console.log(`\n💾 Saved comparison files:`);
    console.log(`   Original: test-output/table-test-original.json`);
    console.log(`   Generated: test-output/table-test-generated.json`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testTablePreservation();

