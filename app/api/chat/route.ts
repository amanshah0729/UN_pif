import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  console.log('Request received');
  const { messages } = await req.json();

  try {
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages,
      system: `You are a helpful assistant for the UN PIF (Project Information Form) dashboard. You help users draft, edit, and improve their project proposals. You can:

1. Help write and refine executive summaries
2. Suggest improvements to project descriptions
3. Help structure project information
4. Provide guidance on best practices for UN project proposals
5. Answer questions about project development

Be concise, professional, and helpful. Focus on practical advice for creating effective project proposals.`,
    });

    console.log('Streaming response...');
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
