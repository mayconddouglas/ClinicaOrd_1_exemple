import { NextResponse } from 'next/server';
import { getDynamicAgentInstructions, toolDeclarations, TOOL_ROUTING, executeTool } from '@/lib/ai-agent';
import { getClinicSettings } from '@/lib/db-tools';
import OpenAI from 'openai';

// Configurar o OpenAI para usar o OpenRouter
const getOpenAI = () => new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || "dummy", // Fallback se não configurado
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", // Required for OpenRouter
    "X-Title": "OrthoAdmin Copilot", // Optional
  }
});

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato de mensagens inválido.' }, { status: 400 });
    }

    const settings = await getClinicSettings();
    const clinicName = settings?.clinic_name || 'Nossa Clínica';

    // Load dynamic prompts based on settings
    const systemPrompts = await getDynamicAgentInstructions();
    
    // O Copilot sempre roda como COPILOT_ADMIN
    const adminPrompt = systemPrompts['COPILOT_ADMIN'];
    const adminToolsNames = TOOL_ROUTING['COPILOT_ADMIN'];
    const adminTools = toolDeclarations.filter(tool => tool.function?.name && adminToolsNames.includes(tool.function.name));

    // Convert message history to standard OpenAI format
    const openRouterMessages: any[] = [
      { role: 'system', content: adminPrompt },
      ...messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    // Build the request parameters
    const generateParams: any = {
      model: 'anthropic/claude-3.5-sonnet', // Recomendado para Copilot
      messages: openRouterMessages,
    };

    if (adminTools.length > 0) {
      generateParams.tools = adminTools as any;
      generateParams.tool_choice = "auto";
    }

    // Call the single unified execution
    const openai = getOpenAI();
    const response = await openai.chat.completions.create(generateParams);

    const message = response.choices[0].message;
    let finalResponseText = message.content || '';

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const call = message.tool_calls[0];
      const functionName = (call as any).function?.name || 'unknown';
      const functionArgs = JSON.parse((call as any).function?.arguments || '{}');

      console.log(`[Copilot API] Calling tool via OpenRouter: ${functionName}`);

      const toolResult = await executeTool(functionName, functionArgs);
      const toolResultStr = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);

      // Append the assistant's tool call and the tool's result to the history
      openRouterMessages.push(message); // The assistant's tool call
      openRouterMessages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: functionName,
        content: toolResultStr
      });

      const finalResponse = await openai.chat.completions.create({
        model: 'anthropic/claude-3.5-sonnet',
        messages: openRouterMessages,
        tools: adminTools as any,
        tool_choice: "auto"
      });

      finalResponseText = finalResponse.choices[0].message.content || '';
    }

    return NextResponse.json({
      role: 'assistant',
      content: finalResponseText
    });

  } catch (error: any) {
    console.error('Error in Copilot API:', error);
    return NextResponse.json(
      { error: `Erro ao processar a solicitação: ${error.message}` },
      { status: 500 }
    );
  }
}
