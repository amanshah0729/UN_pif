import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  console.log('Request received');
  const { messages, document } = await req.json();

  try {
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages,
      system: `You are a helpful assistant for the UN PIF (Project Information Form) dashboard. You help users draft, edit, and improve their project proposals.

Current document context:
${document ? JSON.stringify(document, null, 2) : 'No document provided'}

IMPORTANT: Keep your responses SHORT and CONCISE. When a user mentions a country or requests changes:

1. Give a brief acknowledgment (1-2 sentences max)
2. Do NOT write the entire document content in your response
3. The document will be updated automatically in the background
4. Focus on confirming what you're doing, not explaining the full content

Examples of good responses:
- "I'll update the document for Pakistan with country-specific information."
- "I'll modify the executive summary to focus on Kenya's development priorities."
- "I'll add a risk assessment section tailored to your project."

Keep responses under 50 words. Be professional but brief.`,
    });

    console.log('Streaming response...');
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
