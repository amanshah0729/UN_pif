const fs = require('fs');
const path = require('path');

// Load the template
const templatePath = path.join(__dirname, '../public', 'pif-template.json');
const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
const templateContent = template.content;

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

// Pre-computed section boundaries (same as in route.ts)
const SECTION_BOUNDARIES = {
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

// Extract section JSON chunk from template using pre-computed boundaries
function extractSectionJSON(templateContent, sectionName) {
  const boundaries = SECTION_BOUNDARIES[sectionName];
  
  if (!boundaries || !templateContent) {
    console.warn(`No boundaries found for section: ${sectionName}`);
    return null;
  }

  const { start, end } = boundaries;
  
  // Validate indices
  if (start < 0 || end > templateContent.length || start >= end) {
    console.error(`Invalid boundaries for ${sectionName}: start=${start}, end=${end}, contentLength=${templateContent.length}`);
    return null;
  }

  const sectionJSON = templateContent.slice(start, end);
  return { startIndex: start, endIndex: end, sectionJSON };
}

// Helper to get a preview of node content
function getNodePreview(node, maxLength = 100) {
  if (node.type === 'heading' && node.content) {
    const text = node.content.map(c => c.text || '').join('');
    return `Heading (level ${node.attrs?.level || 0}): ${text.substring(0, maxLength)}`;
  }
  if (node.type === 'paragraph' && node.content) {
    const text = node.content.map(c => c.text || '').join('');
    return `Paragraph: ${text.substring(0, maxLength)}${text.length > maxLength ? '...' : ''}`;
  }
  if (node.type === 'table') {
    return `Table: ${node.content?.length || 0} rows`;
  }
  if (node.type === 'tableRow') {
    return `TableRow: ${node.content?.length || 0} cells`;
  }
  return `${node.type}${node.attrs ? ` (attrs: ${Object.keys(node.attrs).join(', ')})` : ''}`;
}

// Main test function
console.log('='.repeat(80));
console.log('Testing extractSectionJSON for all sections');
console.log('='.repeat(80));
console.log(`\nTemplate has ${templateContent.length} total nodes\n`);

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../test-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

SECTION_NAMES.forEach((sectionName, index) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${index + 1}. Testing: "${sectionName}"`);
  console.log('='.repeat(80));
  
  const result = extractSectionJSON(templateContent, sectionName);
  
  if (!result) {
    console.log(`❌ Failed to extract section`);
    return;
  }
  
  const { startIndex, endIndex, sectionJSON } = result;
  const nodeCount = sectionJSON.length;
  const jsonSize = JSON.stringify(sectionJSON, null, 2).length;
  
  console.log(`\n✅ Successfully extracted:`);
  console.log(`   Start Index: ${startIndex}`);
  console.log(`   End Index: ${endIndex}`);
  console.log(`   Node Count: ${nodeCount}`);
  console.log(`   JSON Size: ${jsonSize} characters (${Math.round(jsonSize / 1024)}KB)`);
  
  console.log(`\n📋 First 5 nodes preview:`);
  sectionJSON.slice(0, 5).forEach((node, i) => {
    console.log(`   [${i}] ${getNodePreview(node)}`);
  });
  
  if (nodeCount > 5) {
    console.log(`   ... and ${nodeCount - 5} more nodes`);
  }
  
  // Save full JSON to file
  const safeFileName = sectionName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const outputPath = path.join(outputDir, `${safeFileName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(sectionJSON, null, 2), 'utf-8');
  console.log(`\n💾 Full JSON saved to: ${outputPath}`);
  
  // Also save a human-readable preview
  const previewPath = path.join(outputDir, `${safeFileName}_preview.txt`);
  let preview = `Section: ${sectionName}\n`;
  preview += `Indices: ${startIndex} to ${endIndex} (${nodeCount} nodes)\n`;
  preview += `${'='.repeat(80)}\n\n`;
  
  sectionJSON.forEach((node, i) => {
    preview += `[${i}] ${getNodePreview(node, 200)}\n`;
    if (node.type === 'heading' || node.type === 'paragraph') {
      const text = node.content?.map(c => c.text || '').join('') || '';
      if (text.length > 0) {
        preview += `    Text: ${text.substring(0, 300)}${text.length > 300 ? '...' : ''}\n`;
      }
    }
    preview += '\n';
  });
  
  fs.writeFileSync(previewPath, preview, 'utf-8');
  console.log(`📄 Preview saved to: ${previewPath}`);
});

console.log(`\n${'='.repeat(80)}`);
console.log('✅ All sections tested!');
console.log(`📁 Output files saved to: ${outputDir}`);
console.log('='.repeat(80));

