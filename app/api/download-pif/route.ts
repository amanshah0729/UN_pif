import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType } from 'docx';

// Convert ProseMirror JSON to DOCX
function convertProseMirrorToDocx(proseMirrorJson: any): Document {
  const children: any[] = [];

  if (!proseMirrorJson.content || !Array.isArray(proseMirrorJson.content)) {
    return new Document({
      sections: [{
        children: [new Paragraph({ text: 'Empty document' })]
      }]
    });
  }

  proseMirrorJson.content.forEach((node: any) => {
    const converted = convertNodeToDocx(node);
    if (converted) {
      if (Array.isArray(converted)) {
        children.push(...converted);
      } else {
        children.push(converted);
      }
    }
  });

  return new Document({
    sections: [{
      children
    }]
  });
}

function convertNodeToDocx(node: any): any {
  if (!node || !node.type) return null;

  switch (node.type) {
    case 'heading':
      const level = node.attrs?.level || 1;
      const headingText = extractTextFromNode(node);
      const headingLevels: any = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };
      return new Paragraph({
        text: headingText,
        heading: headingLevels[level] || HeadingLevel.HEADING_1,
      });

    case 'paragraph':
      const paragraphText = extractTextFromNode(node);
      if (!paragraphText.trim()) {
        return new Paragraph({ text: '' }); // Empty paragraph for spacing
      }
      return new Paragraph({
        children: convertInlineContent(node.content || []),
      });

    case 'table':
      return convertTableToDocx(node);

    case 'bulletList':
    case 'orderedList':
      return convertListToDocx(node);

    case 'listItem':
      return convertListItemToDocx(node);

    default:
      // For unknown node types, try to extract text
      const text = extractTextFromNode(node);
      if (text) {
        return new Paragraph({ text });
      }
      return null;
  }
}

function convertTableToDocx(tableNode: any): DocxTable {
  const rows: DocxTableRow[] = [];

  if (tableNode.content && Array.isArray(tableNode.content)) {
    // First pass: find the maximum number of columns (accounting for colspan)
    let maxCols = 0;
    tableNode.content.forEach((rowNode: any) => {
      if (rowNode.type === 'tableRow' && rowNode.content) {
        let colCount = 0;
        rowNode.content.forEach((cellNode: any) => {
          if (cellNode.type === 'tableHeader' || cellNode.type === 'tableCell') {
            const colspan = cellNode.attrs?.colspan || 1;
            colCount += colspan;
          }
        });
        maxCols = Math.max(maxCols, colCount);
      }
    });

    // Use fixed width per column (in 20ths of a point, ~1 inch = 1440)
    // Default to ~1.5 inches per column for better readability
    const columnWidth = 2160; // 1.5 inches = 2160 twentieths of a point
    const totalTableWidth = maxCols * columnWidth;

    tableNode.content.forEach((rowNode: any) => {
      if (rowNode.type === 'tableRow') {
        const cells: DocxTableCell[] = [];
        
        if (rowNode.content && Array.isArray(rowNode.content)) {
          rowNode.content.forEach((cellNode: any) => {
            if (cellNode.type === 'tableHeader' || cellNode.type === 'tableCell') {
              const cellContent: any[] = [];
              
              if (cellNode.content && Array.isArray(cellNode.content)) {
                cellNode.content.forEach((paraNode: any) => {
                  if (paraNode.type === 'paragraph') {
                    const text = extractTextFromNode(paraNode);
                    if (text.trim()) {
                      cellContent.push(new Paragraph({ text }));
                    } else {
                      cellContent.push(new Paragraph({ text: '' }));
                    }
                  }
                });
              }
              
              if (cellContent.length === 0) {
                cellContent.push(new Paragraph({ text: '' }));
              }

              const cellAttrs = cellNode.attrs || {};
              const colspan = cellAttrs.colspan || 1;
              const rowspan = cellAttrs.rowspan || 1;

              cells.push(
                new DocxTableCell({
                  children: cellContent,
                  columnSpan: colspan > 1 ? colspan : undefined,
                  rowSpan: rowspan > 1 ? rowspan : undefined,
                  width: {
                    size: columnWidth * colspan,
                    type: WidthType.DXA, // DXA = twentieths of a point (more precise)
                  },
                })
              );
            }
          });
        }

        if (cells.length > 0) {
          rows.push(new DocxTableRow({ children: cells }));
        }
      }
    });

    return new DocxTable({
      rows,
      width: {
        size: totalTableWidth,
        type: WidthType.DXA,
      },
      columnWidths: Array(maxCols).fill(columnWidth),
    });
  }

  // Fallback for empty tables
  return new DocxTable({
    rows: [],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });
}

function convertListToDocx(listNode: any): any[] {
  const items: any[] = [];
  
  if (listNode.content && Array.isArray(listNode.content)) {
    listNode.content.forEach((itemNode: any) => {
      if (itemNode.type === 'listItem') {
        const converted = convertListItemToDocx(itemNode);
        if (converted) {
          items.push(converted);
        }
      }
    });
  }
  
  return items;
}

function convertListItemToDocx(listItemNode: any): Paragraph {
  const text = extractTextFromNode(listItemNode);
  return new Paragraph({
    text: text || '',
    bullet: { level: 0 },
  });
}

function convertInlineContent(content: any[]): TextRun[] {
  if (!content || !Array.isArray(content)) {
    return [new TextRun('')];
  }

  const runs: TextRun[] = [];
  
  content.forEach((node: any) => {
    if (node.type === 'text') {
      const text = node.text || '';
      const marks = node.marks || [];
      
      const runOptions: any = { text };
      
      marks.forEach((mark: any) => {
        if (mark.type === 'bold') {
          runOptions.bold = true;
        } else if (mark.type === 'italic') {
          runOptions.italics = true;
        } else if (mark.type === 'underline') {
          runOptions.underline = {};
        }
      });
      
      runs.push(new TextRun(runOptions));
    } else if (node.type === 'hardBreak') {
      runs.push(new TextRun({ text: '\n', break: 1 }));
    }
  });

  return runs.length > 0 ? runs : [new TextRun('')];
}

function extractTextFromNode(node: any): string {
  if (!node) return '';
  
  if (node.text) {
    return node.text;
  }
  
  if (node.content && Array.isArray(node.content)) {
    return node.content
      .map((child: any) => extractTextFromNode(child))
      .join('');
  }
  
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const { proseMirrorJson, filename } = await req.json();

    if (!proseMirrorJson) {
      return NextResponse.json(
        { error: 'ProseMirror JSON is required' },
        { status: 400 }
      );
    }

    // Convert ProseMirror JSON to DOCX
    const doc = convertProseMirrorToDocx(proseMirrorJson);
    
    // Generate DOCX buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Generate filename
    const titleHeading = proseMirrorJson.content?.find(
      (node: any) => node.type === 'heading' && node.attrs?.level === 1
    );
    const title = titleHeading?.content?.map((n: any) => n.text || '').join('') || 'PIF';
    const safeFilename = filename || title.replace(/[^a-zA-Z0-9]/g, '_') + '.docx';

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(buffer);

    // Return DOCX file
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (error) {
    console.error('Error converting to DOCX:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to convert document' },
      { status: 500 }
    );
  }
}

