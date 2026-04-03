# Product Requirements Document (PRD): Evolução do Agente IA Clínico 🤖🏥

## 1. Visão Geral do Produto
O Agente IA da Clínica Ortopédica é o primeiro ponto de contato (recepção digital) para pacientes via WhatsApp, Telegram e Web Chat. O objetivo deste PRD é mapear a evolução do Agente IA, transformando-o de um simples "marcador de consultas" em um **Concierge de Saúde Inteligente**, capaz de reduzir o tempo de atendimento para menos de 1 minuto, aumentar a conversão de agendamentos e fidelizar pacientes através de um atendimento hiper-personalizado.

---

## 2. A Jornada do Paciente (De Ponta a Ponta) e Oportunidades de Melhoria

### Fase 1: Reconhecimento e Boas-Vindas (O Primeiro Contato)
**Como é hoje:** O paciente diz "Oi", o bot responde com a mensagem padrão e pergunta o nome.
**A Visão do Futuro:**
*   **Reconhecimento Biométrico/Voz:** O paciente manda um áudio de "Oi", a IA transcreve, reconhece o número e responde com áudio clonado com a voz oficial da clínica.
*   **Contexto de Saúde Preditivo:** Se o paciente teve uma cirurgia há 7 dias, a IA não diz "Como posso ajudar?", ela diz: *"Olá, Carlos! Vi que você fez a cirurgia de joelho na semana passada. Como está a recuperação hoje?"*.

### Fase 2: Triagem e Coleta de Dados (O Entendimento da Dor)
**Como é hoje:** O paciente relata dor, a IA pergunta de 0 a 10, e depois vai para o fluxo de agendamento se for < 8.
**A Visão do Futuro:**
*   **Análise de Imagem Integrada:** O paciente tira uma foto do joelho inchado ou do raio-x. A IA usa Visão Computacional (Vision API) para pré-analisar a imagem, extrair o laudo e anexar automaticamente no prontuário antes mesmo do médico ver.
*   **Encaminhamento Inteligente:** Baseado nos sintomas, a IA não apenas agenda, mas envia um PDF automático: *"Carlos, marquei sua consulta. Enquanto espera, veja este guia de compressas de gelo que o Dr. João recomenda para esse tipo de inchaço."*

### Fase 3: Agendamento e Serviços (A Conversão)
**Como é hoje:** A IA busca serviços pelo médico e mostra os horários disponíveis em texto.
**A Visão do Futuro:**
*   **Negociação de Encaixes (Smart Waitlist):** Se não houver vaga, a IA diz: *"O Dr. João está lotado hoje, mas posso te colocar na Lista de Espera Inteligente. Se alguém cancelar, eu te mando uma mensagem no mesmo segundo!"*.
*   **Pagamento com 1 Clique (Fricção Zero):** Em vez de mandar um link do Mercado Pago e esperar o paciente voltar, a IA gera um código PIX copia-e-cola diretamente no chat. Quando o PIX é pago, o webhook do banco avisa a IA, que manda o comprovante em PDF na hora.

### Fase 4: Pós-Consulta e Retenção (O Encantamento)
**Como é hoje:** A IA agenda o alerta de retorno e manda a mensagem de pesquisa de satisfação.
**A Visão do Futuro:**
*   **Follow-up Clínico Automatizado:** A IA chama o paciente 48h após a consulta: *"Oi Maria, o Dr. Silva pediu para eu perguntar se o remédio que ele receitou já aliviou a dor nas costas."*
*   **Gamificação de Fisioterapia:** A IA cobra o paciente amigavelmente: *"Carlos, já fez seus exercícios de alongamento hoje? Mande um 'Pronto' para eu registrar na sua ficha!"*

---

## 3. Novas Skills Propostas (O "Cinto de Utilidades" da IA)

Para tornar essa jornada realidade, proponho o desenvolvimento das seguintes ferramentas (Skills) para o Agente IA:

### 🌟 Skill 1: `analyzeMedicalImage` (Visão Computacional)
*   **Descrição:** Permite que a IA receba fotos de exames, laudos ou lesões visíveis enviadas no chat.
*   **Ação:** A IA extrai o texto do laudo, resume o problema e já direciona para a especialidade correta sem fazer perguntas redundantes.

### 🌟 Skill 2: `manageWaitlist` (Lista de Espera Dinâmica)
*   **Descrição:** Quando não há agenda, a IA adiciona o paciente a uma fila virtual.
*   **Ação:** Se um paciente cancelar a consulta das 14h, um gatilho de banco de dados acorda a IA, que dispara mensagens para os 3 primeiros da lista: *"Abriu uma vaga agora às 14h, quem responder SIM primeiro, fica com ela!"*.

### 🌟 Skill 3: `generatePixCode` (Pagamento Nativo)
*   **Descrição:** Integração direta com a API PIX do banco (ex: Gerencianet, StarkBank, ou o próprio Mercado Pago via PIX).
*   **Ação:** A IA gera o "Copia e Cola" e o QR Code no próprio chat, reduzindo a quebra de conversão que acontece quando o paciente precisa abrir o navegador para pagar no cartão.

### 🌟 Skill 4: `fetchPatientMedicalHistory` (Memória Longa)
*   **Descrição:** A IA ganha acesso a um resumo do prontuário do paciente (doenças pré-existentes, alergias).
*   **Ação:** Se o paciente tentar agendar um exame com contraste, a IA verifica: *"Carlos, vi no seu histórico que você tem alergia a iodo. Vou avisar o laboratório e marcar o exame sem contraste, tudo bem?"*.

### 🌟 Skill 5: `multiLingualAudio` (Voz e Idiomas)
*   **Descrição:** Integração com Whisper (OpenAI) e ElevenLabs.
*   **Ação:** O paciente manda áudio. A IA entende e responde com áudio natural (sem parecer robô), podendo até traduzir se o paciente for estrangeiro.

---

## 4. Requisitos Técnicos e Próximos Passos

Para iniciar a construção deste "Super Agente", a fundação técnica precisará de:

1.  **Vector Database (Pinecone/Supabase pgvector):** Para a IA armazenar o histórico longo de conversas e criar uma "memória de longo prazo" do paciente.
2.  **Cron Jobs/Background Workers:** Para rodar a rotina de *Follow-up Clínico* e *Waitlist* de forma autônoma, sem depender de uma mensagem inicial do usuário.
3.  **Atualização de Webhooks:** Os canais (WhatsApp/Telegram) precisam ser configurados para aceitar e trafegar arquivos de mídia (imagens/pdfs) para dentro da infraestrutura do Next.js.

---
*Fim do Documento.*