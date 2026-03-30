import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const email = 'admin@orthoai.com.br';
    const password = 'OrthoAdmin2026!';

    // Verifica se o usuário já existe
    const { data: existingUsers, error: listError } = await supabaseServer.auth.admin.listUsers();
    
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const userExists = existingUsers.users.find(u => u.email === email);

    if (userExists) {
      return NextResponse.json({ message: 'Usuário admin já existe.', email, password });
    }

    // Cria o usuário
    const { data, error } = await supabaseServer.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Usuário admin criado com sucesso!', 
      email, 
      password 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
