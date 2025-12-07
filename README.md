# UN Project Information Form (PIF) Generator

A Next.js application for generating, editing, and managing GEF-8 Project Identification Forms (PIFs) using AI-powered document generation and Supabase database integration.

## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [API Routes](#api-routes)
- [Components](#components)
- [Library Functions](#library-functions)
- [Scripts](#scripts)
- [Database Schema](#database-schema)
- [Workflow](#workflow)

## Overview

This application automates the creation of UN Project Information Forms by:
- Generating PIF documents from templates using AI
- Extracting and storing country-specific data from uploaded documents
- Enabling real-time editing of PIF sections
- Converting documents between ProseMirror JSON and DOCX formats
- Managing country data in a Supabase database

## Project Structure

```
UN_pif/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── chat/                 # Chat interface endpoint
│   │   ├── download-pif/         # DOCX download endpoint
│   │   ├── edit-pif/             # PIF editing endpoint
│   │   ├── generate-pif/         # PIF generation endpoint
│   │   └── process-files/        # File processing endpoint
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   └── globals.css                # Global styles
├── components/                    # React Components
│   ├── ui/                       # Reusable UI components (shadcn/ui)
│   ├── chat-interface.tsx        # Chat UI component
│   ├── document-viewer.tsx       # Document display and editing
│   ├── edit-pif-modal.tsx        # Edit PIF modal dialog
│   ├── file-upload-modal.tsx     # File upload modal
│   ├── generation-log.tsx       # Generation progress log
│   ├── inline-file-upload.tsx   # Inline file upload component
│   ├── pif-dashboard.tsx         # Main dashboard component
│   ├── pif-generator-form.tsx   # PIF generation form
│   ├── rich-text-editor.tsx      # TipTap rich text editor
│   └── theme-provider.tsx        # Theme context provider
├── lib/                          # Utility Libraries
│   ├── countries.ts              # Country database operations
│   ├── document-converter.ts     # Document format conversion
│   ├── supabaseClient.ts         # Supabase client configuration
│   └── utils.ts                  # General utilities
├── scripts/                      # Utility Scripts
│   ├── convert-template.cjs      # Convert DOCX template to JSON
│   ├── find-section-boundaries.cjs
│   ├── test-extract-section-json.cjs
│   ├── test-generate-filled-section.cjs
│   ├── test-process-file-to-db.cjs
│   ├── test-supabase.cjs
│   └── test-table-preservation.cjs
├── public/                       # Static Assets
│   ├── PIF_template.docx         # Source DOCX template
│   ├── pif-template.json         # Converted ProseMirror JSON template
│   └── [other assets]
├── test-output/                  # Test output files
├── hooks/                        # React Hooks
├── styles/                       # Additional styles
└── [config files]               # TypeScript, Next.js, Tailwind configs
```

## Key Features

### 1. **AI-Powered PIF Generation**
- Generates complete PIF documents for any country
- Uses 10 specialized AI subagents (one per PIF section)
- Integrates database data with AI-generated content
- Handles rate limiting and retries automatically

### 2. **Document Processing**
- Upload PDF/DOCX files for country-specific data extraction
- AI extracts relevant information for each of 10 PIF sections
- Stores extracted data in Supabase database
- Reuses stored data for future PIF generations

### 3. **Real-Time Editing**
- Edit specific PIF sections using natural language instructions
- AI-powered section editing with structure preservation
- Batch editing of multiple sections
- Maintains document formatting and tables

### 4. **Document Management**
- Rich text editor with TipTap/ProseMirror
- Export to DOCX format
- Preserves tables, formatting, and structure
- Real-time document preview

## Technology Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **TipTap/ProseMirror** - Rich text editing
- **shadcn/ui** - UI component library
- **Radix UI** - Accessible component primitives

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **OpenAI GPT-4o-mini** - AI text generation
- **Vercel AI SDK** - AI integration
- **Supabase** - PostgreSQL database
- **Mammoth** - DOCX parsing
- **unpdf** - PDF text extraction
- **docx** - DOCX generation

### Database
- **Supabase (PostgreSQL)** - Country data storage
- Tables: `countries` (id, name, sections)

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account and project
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd UN_pif
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Convert template (if needed)**
   ```bash
   npm run convert-template
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:3000`

## 🏗 Architecture

### System Flow

```
User Input (Country Name)
    ↓
[PIF Generator Form]
    ↓
[File Upload (Optional)] → [Process Files API] → [Extract Sections] → [Store in DB]
    ↓
[Generate PIF API] → [10 AI Subagents] → [Fill Template Sections]
    ↓
[ProseMirror JSON] → [Document Viewer] → [Rich Text Editor]
    ↓
[Edit PIF API] (Optional) → [AI Edit Subagents] → [Updated Document]
    ↓
[Download PIF API] → [Convert to DOCX] → [Download File]
```

### AI Agent Architecture

The system uses a **multi-agent architecture**:

1. **Main Generation Agent** (`/api/generate-pif`)
   - Orchestrates 10 section subagents
   - Manages database lookups
   - Combines section outputs

2. **Section Subagents** (10 parallel agents)
   - Each handles one PIF section
   - Checks database first
   - Generates content with AI if needed
   - Sections: GHG Inventory, Climate Transparency, Adaptation and Vulnerability, NDC Tracking, Institutional Framework, National Policy Framework, Support Needed and Received, Key Barriers, Other Baseline Initiatives, Official Reporting to the UNFCCC

3. **File Processing Agents** (`/api/process-files`)
   - 10 extraction subagents (one per section)
   - Extract relevant content from uploaded documents
   - Store in database for future use

4. **Edit Agents** (`/api/edit-pif`)
   - Section-specific edit subagents
   - Preserve document structure
   - Apply user instructions

5. **Chat Agent** (`/api/chat`)
   - Conversational interface
   - Decision agent for routing requests
   - Database lookup agent

## API Routes

### `/api/generate-pif` (POST)
Generates a complete PIF document for a country.

**Request:**
```typescript
FormData {
  country: string
}
```

**Response:**
```typescript
{
  document: ProseMirrorJSON,  // Filled template
  title: string,
  country: string,
  hasDatabaseData: boolean,
  logEntries: LogEntry[]
}
```

**Key Functions:**
- `generateNewPIF()` - Main generation orchestrator
- `processSectionSubagent()` - Processes one section
- `generateFilledSectionJSON()` - AI generation for section
- `extractSectionJSON()` - Extracts section from template
- `replaceCountryPlaceholders()` - Replaces [Country] placeholders

---

### `/api/edit-pif` (POST)
Edits specific sections of an existing PIF document.

**Request:**
```typescript
{
  proseMirrorJson: ProseMirrorJSON,
  sections: string[],  // Section names to edit
  editInstructions: string
}
```

**Response:**
```typescript
{
  document: ProseMirrorJSON,  // Updated document
  title: string,
  successfulEdits: string[],
  failedEdits: string[]
}
```

**Key Functions:**
- `editPIFDocument()` - Main edit orchestrator
- `processSectionEdit()` - Processes one section edit
- `editSectionJSON()` - AI editing for section
- `extractSectionJSON()` - Finds section in document

---

### `/api/download-pif` (POST)
Converts ProseMirror JSON to DOCX and returns as download.

**Request:**
```typescript
{
  proseMirrorJson: ProseMirrorJSON,
  filename?: string
}
```

**Response:**
- DOCX file (binary)

**Key Functions:**
- `convertProseMirrorToDocx()` - Main conversion
- `convertNodeToDocx()` - Converts ProseMirror nodes
- `convertTableToDocx()` - Handles table conversion
- `convertListToDocx()` - Handles list conversion

---

### `/api/process-files` (POST)
Processes uploaded files and extracts section-specific content.

**Request:**
```typescript
FormData {
  country: string,
  files: File[],
  fileTypes: string[]
}
```

**Response:**
```typescript
{
  success: boolean,
  country: string,
  processedFiles: ProcessedFile[],
  countryData: CountryRecord
}
```

**Key Functions:**
- `processUploadedFiles()` - Main file processor
- `parseDocumentAndExtractSections()` - Extracts all sections
- `extractSectionContent()` - AI extraction for one section
- `updateCountrySections()` - Stores in database

---

### `/api/chat` (POST)
Handles conversational chat interface with document generation routing.

**Request:**
```typescript
FormData | JSON {
  messages: Message[],
  document?: ProseMirrorJSON,
  files?: File[],
  fileTypes?: string[],
  originalMessage?: string,
  skipFiles?: boolean,
  country?: string
}
```

**Response:**
- Various response types based on action:
  - `database_lookup` - Database query results
  - `file_upload_question` - Asks for file upload
  - `database_lookup_status` - Database status
  - `document_update` - Generated/edited document
  - `file_upload_success` - File processing complete
  - Streaming text response for chat

**Key Functions:**
- `getChatResponse()` - Chat agent response
- `shouldProcessDocument()` - Decision agent
- `generateNewPIF()` - PIF generation
- `editExistingPIF()` - PIF editing
- `processUploadedFiles()` - File processing

## Components

### `PifDashboard`
**Location:** `components/pif-dashboard.tsx`

Main dashboard component that orchestrates the entire application.

**Props:**
- None (root component)

**State:**
- `editorContent` - Current ProseMirror JSON
- `document` - Document metadata
- `isLoadingTemplate` - Template loading state
- `logEntries` - Generation/edit log entries

**Key Functions:**
- `handleDocumentChange()` - Updates document state
- `handleDocumentGenerated()` - Handles new PIF generation
- `handleAddLogEntry()` - Adds log entries

**Child Components:**
- `PifGeneratorForm` (left panel)
- `DocumentViewer` (right panel)

---

### `PifGeneratorForm`
**Location:** `components/pif-generator-form.tsx`

Form for generating new PIF documents.

**Props:**
- `onDocumentGenerated: (document) => void`
- `onAddLogEntry?: (entry) => void`
- `externalLogEntries?: LogEntry[]`

**State:**
- `country` - Country name input
- `files` - Uploaded files
- `fileTypes` - File type labels
- `status` - Current operation status
- `logEntries` - Generation log

**Key Functions:**
- `handleSubmit()` - Submits generation request
- `handleFilesChange()` - Updates file list

**Workflow:**
1. User enters country name
2. Optional: Upload reference files
3. Files processed → Database updated
4. PIF generation → AI fills template
5. Document displayed in viewer

---

### `DocumentViewer`
**Location:** `components/document-viewer.tsx`

Displays and manages PIF document viewing/editing.

**Props:**
- `title?: string`
- `content: ProseMirrorJSON | null`
- `onDocumentChange?: (json) => void`
- `onAddLogEntry?: (entry) => void`

**State:**
- `isDownloading` - Download state
- `isSubmittingEdit` - Edit submission state

**Key Functions:**
- `handleEditSubmit()` - Submits section edits
- `handleDownload()` - Downloads DOCX file

**Child Components:**
- `RichTextEditor` - Document editor
- `EditPifModal` - Edit dialog

---

### `RichTextEditor`
**Location:** `components/rich-text-editor.tsx`

TipTap-based rich text editor for ProseMirror JSON.

**Features:**
- Full rich text editing
- Table support
- Formatting options
- Real-time updates

---

### `EditPifModal`
**Location:** `components/edit-pif-modal.tsx`

Modal dialog for editing PIF sections.

**Features:**
- Section selection
- Edit instructions input
- Progress tracking

---

### `InlineFileUpload`
**Location:** `components/inline-file-upload.tsx`

File upload component with type selection.

**Features:**
- Multiple file upload
- File type categorization
- Drag and drop support

---

### `GenerationLog`
**Location:** `components/generation-log.tsx`

Displays generation and edit progress logs.

**Features:**
- Real-time log updates
- Section-by-section progress
- Source tracking
- Database hit indicators

---

### `ChatInterface`
**Location:** `components/chat-interface.tsx`

Conversational interface for PIF generation.

**Features:**
- Natural language input
- Document generation routing
- Database queries
- File upload integration

## 📚 Library Functions

### `lib/countries.ts`
Country database operations.

**Functions:**
- `getCountryByName(name: string)` - Fetches country by name (case-insensitive)
- `getCountrySection(name: string, sectionKey: string)` - Gets specific section
- `normalizeCountryName(name: string)` - Normalizes country name

**Types:**
```typescript
interface CountryRecord {
  id: number
  name: string
  sections: Record<string, unknown> | null
}
```

---

### `lib/document-converter.ts`
Document format conversion utilities.

**Functions:**
- `convertDocumentToProseMirror(doc)` - Converts legacy format to ProseMirror JSON
- `convertProseMirrorToDocument(json)` - Converts ProseMirror JSON to legacy format (backwards compatibility)

**Note:** The application primarily uses ProseMirror JSON format. Legacy conversion functions are for compatibility.

---

### `lib/supabaseClient.ts`
Supabase client configuration.

**Exports:**
- `supabase` - Configured Supabase client instance

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### `lib/utils.ts`
General utility functions (likely includes Tailwind class merging, etc.)

## 🔧 Scripts

### `scripts/convert-template.cjs`
Converts the DOCX template to ProseMirror JSON format.

**Usage:**
```bash
npm run convert-template
```

**Process:**
1. Reads `public/PIF_template.docx`
2. Converts to HTML using Mammoth
3. Converts HTML to ProseMirror JSON using TipTap
4. Writes to `public/pif-template.json`

**Dependencies:**
- `mammoth` - DOCX to HTML
- `@tiptap/html` - HTML to ProseMirror JSON
- TipTap extensions (StarterKit, Table, etc.)

---

### `scripts/find-section-boundaries.cjs`
Analyzes template to find section boundaries (start/end indices).

**Purpose:** Pre-computes section boundaries for efficient extraction.

---

### `scripts/test-*.cjs`
Various test scripts for:
- Section extraction
- Filled section generation
- File processing to database
- Supabase connectivity
- Table preservation

## 🗄 Database Schema

### `countries` Table

```sql
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  sections JSONB
);
```

**Structure:**
- `id` - Primary key
- `name` - Country name (unique)
- `sections` - JSONB structure:

```typescript
{
  sections: [
    {
      name: string,  // Section name (e.g., "GHG Inventory")
      documents: [
        {
          doc_type: string,  // Document type (e.g., "BUR", "NC")
          extracted_text: string  // AI-extracted content
        }
      ]
    }
  ]
}
```
## Workflow

### PIF Generation Workflow

1. **User Input**
   - User enters country name in `PifGeneratorForm`
   - Optionally uploads reference documents

2. **File Processing** (if files uploaded)
   - Files sent to `/api/process-files`
   - PDF/DOCX parsed to extract text
   - 10 AI subagents extract section-specific content
   - Content stored in Supabase `countries` table

3. **PIF Generation**
   - Request sent to `/api/generate-pif`
   - Template loaded from `public/pif-template.json`
   - Database checked for country data
   - 10 AI subagents process sections in batches:
     - Extract section JSON from template
     - Check database for section data
     - Generate filled section with AI (using database data if available)
     - Replace country placeholders
   - Sections combined into complete document
   - ProseMirror JSON returned

4. **Document Display**
   - Document displayed in `DocumentViewer`
   - `RichTextEditor` renders ProseMirror JSON
   - User can view and edit

5. **Editing** (optional)
   - User selects sections to edit
   - Provides edit instructions
   - Request sent to `/api/edit-pif`
   - AI subagents edit specified sections
   - Updated document returned

6. **Download** (optional)
   - User clicks download button
   - Request sent to `/api/download-pif`
   - ProseMirror JSON converted to DOCX
   - File downloaded

### File Processing Workflow

1. **File Upload**
   - User uploads PDF/DOCX files
   - Files sent to `/api/process-files`

2. **Text Extraction**
   - PDF: `unpdf` extracts text
   - DOCX: `mammoth` converts to HTML, then to text

3. **Section Extraction**
   - 10 AI subagents run in parallel
   - Each extracts content relevant to its section
   - Uses prompt: "Extract ALL relevant information for [Section Name]"

4. **Database Storage**
   - Extracted content stored in `countries.sections`
   - Structure: `sections[].documents[]`
   - Each document includes `doc_type` and `extracted_text`

5. **Future Use**
   - Stored data used in PIF generation
   - AI uses database content as primary source
   - Fills gaps with web knowledge

## Key Concepts

### ProseMirror JSON Format
The application uses ProseMirror JSON as the primary document format:
- Preserves structure (headings, paragraphs, tables, lists)
- Maintains formatting (bold, italic, etc.)
- Supports complex structures (tables with colspan/rowspan)
- Compatible with TipTap editor

### Section Boundaries
Pre-computed section boundaries in template:
- Each section has `start` and `end` indices
- Allows efficient section extraction
- Defined in `SECTION_BOUNDARIES` constant

### AI Subagent Pattern
- Each section processed by dedicated subagent
- Subagents run in batches (2 at a time) to avoid rate limits
- Each subagent:
  1. Extracts section from template
  2. Checks database
  3. Generates/edits with AI
  4. Returns filled section

### Rate Limiting Handling
- Exponential backoff for rate limit errors
- Retry logic (max 5 attempts)
- Batch processing to reduce API calls
- Uses `gpt-4o-mini` for better rate limits

## Testing

Test scripts available in `scripts/`:
- `test-supabase.cjs` - Database connectivity
- `test-extract-section-json.cjs` - Section extraction
- `test-generate-filled-section.cjs` - AI generation
- `test-process-file-to-db.cjs` - File processing
- `test-table-preservation.cjs` - Table formatting

## Notes

- Template conversion required before first use: `npm run convert-template`
- OpenAI API key required for AI features
- Supabase database must be set up with `countries` table
- Rate limits handled automatically with retries
- Document format: ProseMirror JSON (preserves tables and formatting)
- Export format: DOCX (via `docx` library)

