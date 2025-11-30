const fs = require('fs');
const path = require('path');

// Load template
const templatePath = path.join(__dirname, '..', 'public', 'pif-template.json');
const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
const content = template.content || [];

console.log(`Total content nodes: ${content.length}\n`);

// Section heading patterns (exact text to match)
const SECTION_PATTERNS = {
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

// Find all section headings with their exact indices
const sectionIndices = {};
const allHeadings = [];
let baselineStartIndex = -1;

for (let i = 0; i < content.length; i++) {
  const node = content[i];
  
  // Check for "NEW SECTION :Baseline" marker
  if (node.type === 'paragraph' && node.content) {
    const text = node.content.map(c => c.text || '').join('').trim();
    if (text.toLowerCase().includes('new section') && text.toLowerCase().includes('baseline')) {
      baselineStartIndex = i;
    }
  }
  
  if (node.type === 'heading' && node.content) {
    const headingText = node.content.map(c => c.text || '').join('').trim();
    const level = node.attrs?.level || 0;
    
    allHeadings.push({ index: i, text: headingText, level });
    
    // Check if it matches any section pattern (exact match preferred)
    for (const [sectionName, patterns] of Object.entries(SECTION_PATTERNS)) {
      for (const pattern of patterns) {
        const headingLower = headingText.toLowerCase();
        const patternLower = pattern.toLowerCase();
        
        // Try exact match first, then substring
        if (headingLower === patternLower || headingLower.includes(patternLower)) {
          if (!sectionIndices[sectionName] || headingLower === patternLower) {
            sectionIndices[sectionName] = { start: i, headingText, level };
          }
        }
      }
    }
  }
}

if (baselineStartIndex !== -1) {
  console.log(`Found Baseline section marker at index: ${baselineStartIndex}\n`);
}

// Verify all sections found
console.log('Found sections:');
for (const [sectionName, data] of Object.entries(sectionIndices)) {
  console.log(`  ${sectionName}: index ${data.start}, level ${data.level}, text: "${data.headingText}"`);
}
console.log('');

// Find end indices - need to handle nested structure
// Order sections by their start index
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

// Sort sections by their start index
const sortedSections = SECTION_NAMES
  .map(name => ({ name, start: sectionIndices[name]?.start }))
  .filter(s => s.start !== undefined)
  .sort((a, b) => a.start - b.start);

console.log('Sections in order of appearance:');
sortedSections.forEach(({ name, start }) => {
  const data = sectionIndices[name];
  console.log(`  ${start}: ${name} (level ${data.level})`);
});
console.log('');

const boundaries = {};

for (let i = 0; i < sortedSections.length; i++) {
  const { name: sectionName, start } = sortedSections[i];
  const sectionData = sectionIndices[sectionName];
  const sectionLevel = sectionData.level;
  
  // Find the end: next section at same or higher level, or end of content
  let end = content.length;
  
  // Special case: Climate Transparency should end at Baseline start
  if (sectionName === 'Climate Transparency' && baselineStartIndex !== -1 && baselineStartIndex > start) {
    end = baselineStartIndex;
  } else {
    // Look for next section that starts after this one
    for (let j = i + 1; j < sortedSections.length; j++) {
      const { name: nextSectionName, start: nextStart } = sortedSections[j];
      const nextSectionData = sectionIndices[nextSectionName];
      const nextLevel = nextSectionData.level;
      
      // If next section is at same or higher level, it marks the end
      if (nextStart > start && nextLevel <= sectionLevel) {
        end = nextStart;
        break;
      }
    }
  }
  
  boundaries[sectionName] = { start, end };
  
  console.log(`${sectionName}:`);
  console.log(`  Start: ${start} (level ${sectionLevel})`);
  console.log(`  End: ${end}`);
  console.log(`  Length: ${end - start} nodes`);
  
  // Verify by showing first and last node types
  if (end - start > 0) {
    const firstNode = content[start];
    const lastNode = content[end - 1];
    console.log(`  First: ${firstNode.type} - "${firstNode.content?.[0]?.text?.substring(0, 50) || ''}"`);
    if (end - start > 1) {
      console.log(`  Last: ${lastNode.type}`);
    }
  }
  console.log('');
}

// Output as TypeScript constant
console.log('\n// Copy this into route.ts:\n');
console.log('const SECTION_BOUNDARIES: Record<string, { start: number; end: number }> = {');
for (const [sectionName, { start, end }] of Object.entries(boundaries)) {
  console.log(`  '${sectionName}': { start: ${start}, end: ${end} },`);
}
console.log('};');

