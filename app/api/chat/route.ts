import { streamText } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, document } = await req.json()

  const systemPrompt = `You are an AI assistant helping to draft and refine Project Information Forms (PIFs) for the United Nations Development Programme.

Current document structure:
${document}

Your role:
1. Help users edit, improve, and refine their PIF documents
2. Provide professional, clear, and concise suggestions
3. When making document changes, include the updated document in your response with the format: DOCUMENT_UPDATE: {updated document JSON}
4. Focus on clarity, impact, and alignment with UN development goals
5. Be helpful with structure, content, and formatting suggestions

Guidelines:
- Keep responses professional and constructive
- Suggest improvements that enhance clarity and impact
- Maintain the document's formal tone appropriate for UN submissions
- When updating the document, preserve the existing structure unless explicitly asked to change it`

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: systemPrompt,
    messages,
  })

  return result.toUIMessageStreamResponse()
}
