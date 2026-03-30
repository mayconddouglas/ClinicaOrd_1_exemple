import { NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const patientPhone = formData.get('patientPhone') as string || 'anonymous';

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // 1. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${patientPhone}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exams')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ success: false, error: 'Erro ao fazer upload para o Storage. Verifique se o bucket "exams" existe e é público.' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from('exams').getPublicUrl(filePath);
    const fileUrl = publicUrlData.publicUrl;

    // 2. Analyze with Gemini
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type,
            },
          },
          {
            text: 'Você é um assistente médico ortopédico. Analise esta imagem médica (raio-x, ressonância, laudo, ou foto de lesão). Forneça um resumo claro e objetivo do que é a imagem e quais são os principais achados ou suspeitas. Se for um laudo em texto, extraia as informações mais importantes. Responda em português de forma profissional, mas acessível.',
          },
        ],
      },
    });

    const aiAnalysis = response.text || 'Análise não disponível.';

    // 3. Save to Database
    const { data: dbData, error: dbError } = await supabase
      .from('patient_exams')
      .insert([
        {
          patient_phone: patientPhone,
          file_url: fileUrl,
          file_type: file.type,
          file_name: file.name,
          ai_analysis: aiAnalysis,
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      // We still return success but maybe log the error
    }

    return NextResponse.json({
      success: true,
      data: {
        fileUrl,
        aiAnalysis,
        examRecord: dbData
      }
    });

  } catch (error: any) {
    console.error('Upload exam error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
