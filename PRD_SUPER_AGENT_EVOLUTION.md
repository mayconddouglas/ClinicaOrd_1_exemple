# Product Requirements Document (PRD): O Super Agente IA 🚀🏥

## 1. Visão Geral do Produto
O objetivo deste PRD é guiar a evolução do atual assistente virtual da clínica para o status de **"Super Agente IA"**. O foco principal é tornar o agente **mais rápido, extremamente comunicativo, didático para pacientes leigos e profundamente integrado a todos os módulos do Dashboard** (Agendamentos, Schedule, Pacientes, Médicos, Serviços e Financeiro). A meta é criar uma experiência onde o paciente sinta que está conversando com a recepcionista mais eficiente e acolhedora do mundo.

---

## 2. Diagnóstico Atual e Gargalos Identificados

Hoje, o Agente IA já executa tarefas complexas usando as ferramentas do `lib/db-tools.ts`, mas apresenta os seguintes pontos de atrito:

1.  **Linguagem Robótica e Fria:** O agente responde de forma muito mecânica. Para pacientes idosos ou leigos, a linguagem médica ou os fluxos rígidos podem gerar confusão.
2.  **Cadastro Demorado (Fricção):** O processo de pedir Nome, CPF e Telefone (um de cada vez) desanima o paciente.
3.  **Silos de Informação:** Embora o agente acesse vários dashboards, ele não cruza as informações de forma proativa (ex: avisar que o médico escolhido não atende o serviço solicitado antes do paciente pedir).
4.  **Lentidão nas Respostas:** A dependência de múltiplas chamadas sequenciais ao banco de dados atrasa o fluxo da conversa.

---

## 3. Jornada do Paciente Melhorada (De Ponta a Ponta)

### 3.1. Onboarding e Cadastro "Mágico" (Dashboard: Patients)
**Como é hoje:** A IA pede Nome, depois Telefone, depois CPF.
**A Melhoria (Skill Proposta - `SmartOnboarding`):**
*   **Comunicação:** *"Olá! Que bom ter você aqui. Para agilizar, pode me mandar uma foto da sua CNH/RG ou apenas digitar seu Nome Completo e CPF na mesma mensagem?"*
*   **Ação da IA:** O Agente usa a nova skill de extração avançada (NLP Fast Scheduling) para ler a mensagem inteira ou usar OCR na foto do documento, preenchendo a tabela `pacientes` em **1 segundo**, sem fazer perguntas repetitivas.
*   **Integração:** Validação instantânea de duplicidade usando a rota otimizada de `checkPatientRegistration`.

### 3.2. Triagem Empática e Sugestão de Serviço (Dashboards: Triages & Services)
**Como é hoje:** A IA pergunta onde dói e lista serviços.
**A Melhoria (Skill Proposta - `EmpathyTriage & ServiceMatcher`):**
*   **Comunicação:** *"Sinto muito que seu joelho esteja doendo, Maria. Nós vamos cuidar disso! Pelo que me contou, o ideal seria uma Avaliação Ortopédica ou um Raio-X. O que acha melhor?"*
*   **Ação da IA:** A IA cruza a queixa do paciente (`saveTriage`) com a tabela de `services` (usando `getClinicServices`) e já sugere o serviço correto, evitando que o paciente leigo precise adivinhar termos técnicos.

### 3.3. Escolha do Médico e Agenda "The Flash" (Dashboards: Medicos & Schedule)
**Como é hoje:** A IA pergunta o médico, depois o turno, depois cruza com a agenda.
**A Melhoria (Skill Proposta - `SuperSlotDiscovery`):**
*   **Comunicação:** *"Maria, a Dra. Ana e o Dr. Carlos são excelentes especialistas em Joelho. A Dra. Ana tem vaga amanhã às 09h, e o Dr. Carlos hoje às 16h. Qual prefere?"*
*   **Ação da IA:** A IA consolida as funções `getDoctorsBySpecialty` e `smartSlotDiscovery`. Em **uma única chamada ao banco**, ela varre o `schedule_blocks` (feriados), `business_hours` e a tabela de `medicos`, trazendo as vagas mais próximas *já formatadas e traduzidas* para o paciente.

### 3.4. Confirmação e Pagamento Transparente (Dashboards: Agendamentos & Finance)
**Como é hoje:** A IA cria o agendamento e manda um link do Mercado Pago.
**A Melhoria (Skill Proposta - `SeamlessCheckout`):**
*   **Comunicação:** *"Tudo certo, Maria! Sua consulta com o Dr. Carlos hoje às 16h está pré-reservada. O valor é R$ 150,00. Aqui está a chave PIX Copia e Cola. Assim que pagar, sua vaga está 100% garantida!"*
*   **Ação da IA:** A IA usa `scheduleAppointment` e `createInvoiceLink` simultaneamente. O dashboard `finance` recebe o status 'pendente'. Um webhook interno avisa a IA quando o PIX for pago, e ela proativamente avisa a paciente: *"Pagamento recebido! Te vejo às 16h."*

---

## 4. O Copilot Administrativo (O Chefe da Clínica)

O "Super Agente" não serve apenas ao paciente. O Dono da Clínica também ganha um salto de produtividade.

**Melhorias Propostas para o Copilot:**
1.  **Relatórios em Linguagem Natural (Skill: `VoiceAnalytics`):** O dono da clínica envia um áudio: *"Como foi o faturamento hoje e quantas consultas a Dra. Ana fez?"*. O Copilot cruza `getFinancialMetrics` e `getAppointmentsMetrics` e responde em áudio/texto com o resumo do dia.
2.  **Gestão de Inadimplência Autônoma (Skill: `AutoCleaner`):** O Copilot avisa o administrador proativamente: *"Chefe, temos 5 consultas presas por falta de pagamento há mais de 2 horas. Quer que eu use a ferramenta `cancelPendingInvoices` para liberar a agenda agora?"*

---

## 5. Requisitos Técnicos para as Novas Skills

Para transformar essas melhorias em realidade, precisaremos desenvolver as seguintes ferramentas (Skills) no arquivo `lib/ai-agent.ts`:

| Nome da Skill Proposta | Módulos Envolvidos | Objetivo Técnico |
| :--- | :--- | :--- |
| **`SmartOnboarding`** | `patients` | Extrair Entidades (Nome, CPF) de textos longos ou usar OCR (Visão) para ler fotos de RG/CNH e cadastrar o paciente em 1 step. |
| **`ServiceMatcher`** | `services`, `triages` | Receber os sintomas da triagem e fazer uma busca vetorial (Semantic Search) para sugerir o serviço/especialidade correta. |
| **`SuperSlotDiscovery`** | `schedule`, `medicos` | Refatorar a busca de agenda para trazer a matriz completa (Médicos + Horários Livres) em < 500ms, usando views materializadas ou cache no Supabase. |
| **`SeamlessCheckout`** | `agendamentos`, `finance` | Gerar código PIX nativo no chat via integração direta, substituindo a dependência de links externos que quebram a fluidez. |
| **`VoiceAnalytics`** | `finance`, `agendamentos` | Permitir que o Copilot ouça áudios do administrador e gere relatórios diários narrados. |

---

## 6. Diretrizes de Comunicação (Tom de Voz do Super Agente)

Para garantir que o agente seja "comunicativo e direto para leigos", o prompt base (`getUniversalPatientPrompt`) deve ser atualizado com as seguintes regras de ouro:

1.  **Fim do "Medicalês":** Traduzir termos complexos. (Ex: Em vez de "Ortopedia Pediátrica", usar "Médico de osso para crianças").
2.  **Frases Curtas:** Nenhuma mensagem do bot pode ter mais de 3 linhas de texto. Textões assustam pacientes.
3.  **Uso de Emojis Estratégicos:** Usar emojis para guiar a visão (Ex: 📅 para datas, 👨‍⚕️ para médicos, 💳 para pagamento).
4.  **Sempre dar a saída:** Nunca deixar o paciente sem opções. Se não tiver vaga, oferecer a lista de espera. Se o serviço não existir, sugerir falar com a recepção humana (`escalateToHuman`).

---
*Fim do Documento.*