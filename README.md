# UN PIF Dashboard

A comprehensive system for generating, editing, and managing UN Project Information Forms (PIFs) using AI-powered agents. This system converts Word documents to JSON, fills them with AI-generated content, and converts them back to Word format.

## Overview

The PIF Dashboard uses a multi-agent AI system to:
- **Generate** complete PIF documents from templates
- **Edit** specific sections of existing PIF documents
- **Process** and store reference documents for enhanced AI context
- **Download** completed PIFs as Word documents

The system works with ProseMirror JSON format internally, which allows for precise formatting control while maintaining compatibility with Word documents.

---

## Core APIs

### 1. `/api/process-files` - Upload Files for Agent Context

**Purpose**: Upload PDF/Word documents to the database to provide additional context for AI agents when generating PIF sections.

**How it works**:
- Accepts multiple files (PDF or DOCX) along with a country name
- Extracts text from each file using `unpdf`
- Uses AI subagents to extract section-specific content from each document
- Stores extracted content in Supabase, organized by country and section
- When generating PIFs, agents automatically use this stored context

**Request Format**:
```typescript
POST /api/process-files
FormData:
  - country: string (e.g., "Kenya")
  - files: File[] (PDF or DOCX files)
  - fileTypes: string[] (e.g., ["BUR", "BTR", "NC"])
```

**Response**:
```json
{
  "success": true,
  "processedFiles": [
    {
      "fileName": "kenya_bur_2023.pdf",
      "fileType": "BUR",
      "success": true
    }
  ]
}
```

**Key Features**:
- **Parallel Processing**: All 10 section subagents run simultaneously for speed
- **Section-Specific Extraction**: Each document is analyzed for content relevant to each PIF section
- **Database Storage**: Extracted content is stored in Supabase for future use
- **Automatic Context**: When generating PIFs, the system automatically includes relevant database content

**Usage Tips**:
- Upload multiple documents per country for richer context
- Use descriptive file types (BUR, BTR, NC, NDC, etc.) for better organization
- The more documents you upload, the more accurate and comprehensive the generated PIFs will be

---

### 2. `/api/generate-pif` - Generate Complete PIF Documents

**Purpose**: Generate a complete PIF document from a template JSON, filling all sections with AI-generated content.

**How it works**:
1. Loads the template JSON (`public/pif-template.json`)
2. For each of the 10 sections:
   - Extracts the section's JSON structure from the template
   - Checks the database for relevant context (from uploaded files)
   - Uses AI to fill the section JSON with country-specific content
   - Preserves all formatting, tables, and structure
3. Combines all filled sections into a complete document
4. Returns the complete ProseMirror JSON

**Request Format**:
```typescript
POST /api/generate-pif
Body: {
  country: string,
  templatePath?: string (optional, defaults to "public/pif-template.json")
}
```

**Response**:
```json
{
  "success": true,
  "document": {
    "type": "doc",
    "content": [ /* ProseMirror JSON */ ]
  },
  "sections": [
    {
      "sectionName": "GHG Inventory",
      "source": "database" | "ai",
      "sources": ["url1", "url2"]
    }
  ]
}
```

**Key Features**:
- **Template-Based**: Uses pre-defined JSON template structure
- **Section Subagents**: Each section is processed by a dedicated AI subagent
- **Database Integration**: Automatically uses uploaded document context
- **Format Preservation**: Maintains tables, headings, and all formatting
- **Source Tracking**: Tracks which sources were used for each section

**Section Processing**:
- Each section is extracted using pre-computed boundaries
- AI fills placeholders like `[Country]`, `[...]`, `PROMPT:`, etc.
- Tables are preserved with all structure (colspan, rowspan, etc.)
- Standard text sections remain unchanged unless explicitly filled

---

### 3. `/api/edit-pif` - Edit Specific PIF Sections

**Purpose**: Edit specific sections of an existing PIF document based on user instructions.

**How it works**:
1. Receives the current PIF document (as ProseMirror JSON) and edit instructions
2. Identifies which section(s) need to be edited
3. Extracts the relevant section JSON from the document
4. Uses AI to modify only the specified section according to instructions
5. Merges the edited section back into the document
6. Returns the updated complete document

**Request Format**:
```typescript
POST /api/edit-pif
Body: {
  document: ProseMirrorJSON, // Current document
  sectionName: string, // e.g., "GHG Inventory"
  editInstructions: string // Natural language instructions
}
```

**Response**:
```json
{
  "success": true,
  "document": {
    "type": "doc",
    "content": [ /* Updated ProseMirror JSON */ ]
  }
}
```

**Key Features**:
- **Targeted Editing**: Only modifies the specified section
- **Instruction-Based**: Uses natural language instructions (e.g., "Add more detail about agriculture sector")
- **Format Preservation**: Maintains all formatting, tables, and structure
- **Minimal Changes**: Only changes what's explicitly requested
- **Section Detection**: Automatically finds section boundaries using heading patterns

**Edit Instructions Examples**:
- "Add a paragraph about renewable energy initiatives"
- "Update the budget table with new figures"
- "Make the executive summary more concise"
- "Add information about recent policy changes"

**Section Detection**:
The system uses heading patterns to identify sections:
- Searches for section headings (e.g., "GHG Inventory Module")
- Finds section boundaries by looking for next heading of equal/higher level
- Extracts the complete section JSON for editing

---

### 4. `/api/download-pif` - Convert JSON to Word Document

**Purpose**: Convert a ProseMirror JSON document back to a Word (.docx) file for download.

**How it works**:
1. Receives ProseMirror JSON document
2. Converts each node type to Word format:
   - Headings → Word headings (levels 1-6)
   - Paragraphs → Word paragraphs
   - Tables → Word tables (with colspan/rowspan support)
   - Lists → Word bullet/numbered lists
   - Text formatting → Word formatting (bold, italic, etc.)
3. Uses `docx` library to generate the Word document
4. Returns the document as a downloadable file

**Request Format**:
```typescript
POST /api/download-pif
Body: {
  document: ProseMirrorJSON,
  fileName?: string (optional, defaults to "PIF_Document.docx")
}
```

**Response**: 
- Binary Word document file (.docx)
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**Key Features**:
- **Complete Conversion**: Handles all ProseMirror node types
- **Table Support**: Preserves table structure, colspan, rowspan
- **Formatting**: Maintains text formatting (bold, italic, etc.)
- **List Support**: Converts bullet and ordered lists
- **Heading Levels**: Preserves heading hierarchy (H1-H6)

**Node Type Mappings**:
- `heading` → Word Heading (level 1-6)
- `paragraph` → Word Paragraph
- `table` → Word Table
- `tableRow` → Word Table Row
- `tableCell` / `tableHeader` → Word Table Cell
- `bulletList` → Word Bullet List
- `orderedList` → Word Numbered List
- `text` → Word Text Run (with formatting)

---

## Section-Specific Instructions

### Customizing Section Prompts

You can provide additional context and formatting instructions for specific sections by editing `lib/section-prompts.ts`.

**How it works**:
- The system checks if additional context exists for a section
- If found, it appends the context to the base prompt
- If not found, it uses only the base instructions

**Current Implementations**:
- `getInstitutionalFrameworkPrompt()` - Detailed formatting for Institutional Framework section
- `getNationalPolicyFrameworkPrompt()` - Detailed formatting for National Policy Framework section

**Adding New Section Prompts**:

1. Create a function in `lib/section-prompts.ts`:
```typescript
export function getYourSectionPrompt(
  country: string,
  cbitInfo: string | null = null,
  scrapedData?: ScrapedData
): string {
  return `
    Your detailed formatting instructions here...
    Include structure, tone, formatting requirements, etc.
  `;
}
```

2. Update `getSectionAdditionalContext()` to map your section:
```typescript
export function getSectionAdditionalContext(
  sectionTitle: string,
  country: string,
  cbitInfo: string | null = null,
  scrapedData?: ScrapedData
): string | null {
  const normalizedTitle = sectionTitle.toLowerCase().trim();
  
  if (normalizedTitle.includes('your section name')) {
    return getYourSectionPrompt(country, cbitInfo, scrapedData);
  }
  
  // ... existing mappings
}
```

**Benefits**:
- Provides detailed formatting instructions for specific sections
- Ensures consistency across generated documents
- Allows for section-specific requirements (e.g., bullet lists, table formats)
- Can include scraped data and CBIT project information

---

## Template Customization

### Changing the PIF Template

If you need to use a different PIF template, you'll need to:

1. **Create a new Word template** (`.docx` file)
   - Place it in `public/` directory
   - Follow the same structure as the existing template

2. **Convert DOCX to JSON**:
   ```bash
   node scripts/convert-template.cjs
   ```
   Or modify `scripts/convert-template.cjs` to point to your new template:
   ```javascript
   const TEMPLATE_SOURCE = path.resolve('public/YOUR_TEMPLATE.docx');
   const TEMPLATE_OUTPUT = path.resolve('public/your-template.json');
   ```

3. **Update section boundaries**:
   - The system uses pre-computed section boundaries to extract sections
   - Run `scripts/find-section-boundaries.cjs` to identify boundaries:
   ```bash
   node scripts/find-section-boundaries.cjs
   ```
   - Update `SECTION_BOUNDARIES` in both `generate-pif/route.ts` and `edit-pif/route.ts`

4. **Update section names**:
   - Modify `SECTION_NAMES` array in the API routes to match your template's sections

### DOCX to JSON Conversion Process

The conversion uses:
- **mammoth**: Converts DOCX to HTML
- **TipTap**: Converts HTML to ProseMirror JSON
- **Extensions**: Table, StarterKit for full formatting support

**Conversion Script** (`scripts/convert-template.cjs`):
```javascript
// 1. Read DOCX file
const { value: html } = await mammoth.convertToHtml({ path: TEMPLATE_SOURCE });

// 2. Convert HTML to ProseMirror JSON
const json = generateJSON(html, [
  StarterKit,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
]);

// 3. Save JSON
fs.writeFileSync(TEMPLATE_OUTPUT, JSON.stringify(json, null, 2));
```

**Important Notes**:
- The JSON preserves document structure (headings, paragraphs, tables, lists)
- Tables are converted with full structure (colspan, rowspan)
- Formatting (bold, italic) is preserved in text nodes
- Section boundaries must be manually identified after conversion

---

## System Architecture

### Multi-Agent System

The system uses three main AI agents:

1. **Decision Agent**: Determines whether to generate a new PIF or edit an existing one
2. **PIF Generating Agent**: Creates comprehensive new PIF documents
3. **PIF Editing Agent**: Makes targeted updates to existing documents

### Data Flow

```
User Request
    ↓
Decision Agent (analyzes intent)
    ↓
┌─────────────────┬─────────────────┐
│ Generate Agent  │  Edit Agent     │
│ (new PIF)       │  (modify PIF)   │
└─────────────────┴─────────────────┘
    ↓
Section Subagents (10 parallel agents)
    ↓
Database Context (from uploaded files)
    ↓
AI Generation/Editing
    ↓
ProseMirror JSON
    ↓
Word Document (via download-pif)
```

### Database Structure

**Countries Table**:
```typescript
{
  id: string,
  name: string,
  sections: {
    sections: [
      {
        name: string, // Section name
        documents: [
          {
            doc_type: string, // BUR, BTR, NC, etc.
            extracted_text: string // AI-extracted content
          }
        ]
      }
    ]
  }
}
```

---

## Development

### Prerequisites
- Node.js 18+
- Supabase account and project
- OpenAI API key

### Setup
```bash
npm install
cp .env.example .env
# Add your Supabase and OpenAI credentials
npm run dev
```

### Key Dependencies
- `@ai-sdk/openai` - AI model integration
- `docx` - Word document generation
- `mammoth` - DOCX to HTML conversion
- `@tiptap/html` - HTML to ProseMirror JSON
- `unpdf` - PDF text extraction
- `supabase` - Database client

### Scripts
- `scripts/convert-template.cjs` - Convert DOCX template to JSON
- `scripts/find-section-boundaries.cjs` - Identify section boundaries in template
- `scripts/test-*.cjs` - Various test scripts for components

---

## Best Practices

1. **Upload Multiple Documents**: More context = better PIFs
2. **Use Descriptive File Types**: Helps organize and reference documents
3. **Test Section Boundaries**: After changing templates, verify section extraction
4. **Monitor AI Responses**: Check generated content for accuracy
5. **Preserve Template Structure**: Don't modify template JSON structure manually
6. **Use Section Prompts**: Add detailed instructions for sections that need specific formatting

---

## Troubleshooting

### Section Not Generating
- Check section boundaries in `SECTION_BOUNDARIES`
- Verify section name matches exactly
- Check database for relevant context

### Formatting Issues
- Ensure template JSON structure is preserved
- Check table structure (colspan/rowspan)
- Verify heading levels

### Database Context Not Used
- Check file upload was successful
- Verify country name matches exactly
- Check section name mapping in database

---

## License

[Your License Here]

