"use client"

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered,
  Table as TableIcon,
  Plus,
  Minus
} from 'lucide-react'

interface RichTextEditorProps {
  content: any // ProseMirror JSON
  onChange?: (json: any) => void
  editable?: boolean
}

export function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content,
    editable: editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON())
      }
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor || !content) return
    const current = editor.getJSON()
    const incoming = JSON.stringify(content)
    const existing = JSON.stringify(current)
    if (incoming !== existing) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  if (!editor) {
    return null
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const addRowBefore = () => {
    editor.chain().focus().addRowBefore().run()
  }

  const addRowAfter = () => {
    editor.chain().focus().addRowAfter().run()
  }

  const addColumnBefore = () => {
    editor.chain().focus().addColumnBefore().run()
  }

  const addColumnAfter = () => {
    editor.chain().focus().addColumnAfter().run()
  }

  const deleteRow = () => {
    editor.chain().focus().deleteRow().run()
  }

  const deleteColumn = () => {
    editor.chain().focus().deleteColumn().run()
  }

  const deleteTable = () => {
    editor.chain().focus().deleteTable().run()
  }

  return (
    <div className="flex flex-col h-full">
      {editable && (
        <div className="border-b border-border bg-card px-4 py-2 flex items-center gap-2 flex-wrap">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'bg-accent' : ''}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'bg-accent' : ''}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'bg-accent' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'bg-accent' : ''}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>

          {/* Table Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={addTable}
            >
              <TableIcon className="h-4 w-4 mr-1" />
              Insert Table
            </Button>
            {editor.isActive('table') && (
              <>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="ghost" size="sm" onClick={addRowBefore}>
                  <Plus className="h-4 w-4 mr-1" />
                  Row Before
                </Button>
                <Button variant="ghost" size="sm" onClick={addRowAfter}>
                  <Plus className="h-4 w-4 mr-1" />
                  Row After
                </Button>
                <Button variant="ghost" size="sm" onClick={deleteRow}>
                  <Minus className="h-4 w-4 mr-1" />
                  Delete Row
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="ghost" size="sm" onClick={addColumnBefore}>
                  <Plus className="h-4 w-4 mr-1" />
                  Col Before
                </Button>
                <Button variant="ghost" size="sm" onClick={addColumnAfter}>
                  <Plus className="h-4 w-4 mr-1" />
                  Col After
                </Button>
                <Button variant="ghost" size="sm" onClick={deleteColumn}>
                  <Minus className="h-4 w-4 mr-1" />
                  Delete Col
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="ghost" size="sm" onClick={deleteTable}>
                  Delete Table
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-auto p-8">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none focus:outline-none"
        />
      </div>
    </div>
  )
}
