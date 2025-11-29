// Convert our current document format to ProseMirror JSON
export function convertDocumentToProseMirror(doc: any) {
  if (!doc || !doc.sections) {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Start by selecting a country or describing your project in the chat interface.'
            }
          ]
        }
      ]
    }
  }

  const content: any[] = []

  // Add title
  if (doc.title) {
    content.push({
      type: 'heading',
      attrs: { level: 1 },
      content: [
        {
          type: 'text',
          text: doc.title
        }
      ]
    })
  }

  // Add sections
  doc.sections.forEach((section: any, index: number) => {
    // Section heading
    content.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [
        {
          type: 'text',
          text: `${index + 1}. ${section.title}`
        }
      ]
    })

    // Section content (split by newlines to create paragraphs)
    const paragraphs = section.content.split('\n\n').filter((p: string) => p.trim())
    paragraphs.forEach((paragraph: string) => {
      const lines = paragraph.split('\n').filter((l: string) => l.trim())
      
      lines.forEach((line: string) => {
        // Check if it's a list item
        if (line.match(/^\d+\.\s/) || line.match(/^[-•]\s/)) {
          // This will be handled by list nodes - for now, just add as paragraph
          content.push({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: line.trim()
              }
            ]
          })
        } else {
          content.push({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: line.trim()
              }
            ]
          })
        }
      })
    })

    // Add spacing between sections
    if (index < doc.sections.length - 1) {
      content.push({
        type: 'paragraph',
        content: []
      })
    }
  })

  return {
    type: 'doc',
    content
  }
}

// Convert ProseMirror JSON back to our document format (for backwards compatibility)
export function convertProseMirrorToDocument(json: any) {
  const sections: any[] = []
  let currentSection: any = null

  const traverse = (node: any) => {
    if (node.type === 'heading') {
      if (node.attrs.level === 1) {
        // This is the title
        return
      } else if (node.attrs.level === 2) {
        // This is a section heading
        if (currentSection) {
          sections.push(currentSection)
        }
        const text = node.content?.map((n: any) => n.text || '').join('') || ''
        currentSection = {
          id: `section-${sections.length + 1}`,
          title: text.replace(/^\d+\.\s/, '').trim(),
          content: ''
        }
      }
    } else if (node.type === 'paragraph' && currentSection) {
      const text = node.content?.map((n: any) => n.text || '').join('') || ''
      if (text.trim()) {
        currentSection.content += (currentSection.content ? '\n\n' : '') + text
      }
    }

    if (node.content) {
      node.content.forEach(traverse)
    }
  }

  if (json.content) {
    json.content.forEach(traverse)
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  return {
    title: json.content?.find((n: any) => n.type === 'heading' && n.attrs.level === 1)?.content?.map((n: any) => n.text || '').join('') || 'Project Information Form',
    sections
  }
}


