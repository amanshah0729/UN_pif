const fs = require('fs')
const path = require('path')
const mammoth = require('mammoth')

const TEMPLATE_SOURCE = path.resolve('public/PIF_template.docx')
const TEMPLATE_OUTPUT = path.resolve('public/pif-template.json')

async function convertTemplate() {
  if (!fs.existsSync(TEMPLATE_SOURCE)) {
    console.error(`Template not found at ${TEMPLATE_SOURCE}`)
    process.exit(1)
  }

  console.log(`Reading template from ${TEMPLATE_SOURCE}`)
  console.log('Converting DOCX to HTML...')
  const { value: html } = await mammoth.convertToHtml({ path: TEMPLATE_SOURCE })

  console.log('Loading TipTap extensions...')
  const { generateJSON } = await import('@tiptap/html')
  const StarterKit = (await import('@tiptap/starter-kit')).default
  const { Table } = await import('@tiptap/extension-table')
  const { TableRow } = await import('@tiptap/extension-table-row')
  const { TableHeader } = await import('@tiptap/extension-table-header')
  const { TableCell } = await import('@tiptap/extension-table-cell')

  console.log('Generating ProseMirror JSON...')
  const json = generateJSON(html, [
    StarterKit,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
  ])

  fs.writeFileSync(TEMPLATE_OUTPUT, JSON.stringify(json, null, 2), 'utf-8')
  console.log(`Template JSON written to ${TEMPLATE_OUTPUT}`)
}

convertTemplate().catch((error) => {
  console.error('Failed to convert template', error)
  process.exit(1)
})

