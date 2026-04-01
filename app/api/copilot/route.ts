import { NextResponse } from 'next/server';
import { getDynamicAgentInstructions, toolDeclarations, TOOL_ROUTING, executeTool } from '@/lib/ai-agent';
import { getClinicSettings } from '@/lib/db-tools';
import { GoogleGenAI } from '@google/genai';

// Initialize the new Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    const adminTools = toolDeclarations.filter(tool => tool.name && adminToolsNames.includes(tool.name));

    // Convert OpenAI message format to Gemini format
    const geminiHistory = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Extract the latest message text
    const userMessage = messages[messages.length - 1].content;

    // Build the request parameters for the new SDK
    const generateParams: any = {
      systemInstruction: {
        role: "system",
        parts: [{ text: adminPrompt }]
      },
      contents: [
        ...geminiHistory,
        { role: 'user', parts: [{ text: userMessage }] }
      ]
    };

    if (adminTools.length > 0) {
      generateParams.tools = [{ functionDeclarations: adminTools }];
    }

    // Call the single unified Gemini execution
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      ...generateParams
    });

    let finalResponseText = response.text || '';

    // Handle tool calls
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const functionName = call.name || 'unknown';
      const functionArgs = call.args;

      console.log(`[Copilot API] Calling tool: ${functionName}`);

      const toolResult = await executeTool(functionName, functionArgs);
      const toolResultStr = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);

      const toolResponseParams = {
        ...generateParams,
        contents: [
          ...generateParams.contents,
          {
            role: 'model',
            parts: [{
              functionCall: {
                name: functionName,
                args: functionArgs
              }
            }]
          },
          {
            role: 'user',
            parts: [{
              functionResponse: {
                name: functionName,
                response: { result: toolResultStr }
              }
            }]
          }
        ]
      };

      const finalResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        ...toolResponseParams
      });

      finalResponseText = finalResponse.text || '';
    }

    return NextResponse.json({
      role: 'assistant',
      content: finalResponseText
    });

  } catch (error: any) {
    console.error('Error in Copilot API:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação.' },
      { status: 500 }
    );
  }
}
