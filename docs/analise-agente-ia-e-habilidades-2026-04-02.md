# Análise do agente IA e roadmap de habilidades (02/04/2026)

## 1) Diagnóstico do agente atual

### Arquitetura e operação
- O projeto já usa uma arquitetura de **agente com ferramentas (tool-calling)**, com dois perfis principais:
  - **Paciente** (atendimento, triagem, agendamento, pós-consulta).
  - **Admin/Copilot** (operações, métricas e gestão).
- A definição de comportamento está centralizada em prompts robustos (`getUniversalPatientPrompt` e `getAdminPrompt`) e em uma lista explícita de ferramentas permitidas por perfil.
- A camada de execução usa OpenRouter com modelos distintos por canal, incluindo **loop de múltiplas iterações de ferramentas no chat paciente** e execução com tool-call no copilot.

### Pontos fortes observados
1. **Separação de responsabilidades por persona** (paciente vs administrador).
2. **Prompt operacional detalhado** com fluxos de negócio bem definidos (FAQ, urgência, agendamento, reagendamento, fidelização e documentos).
3. **Conjunto de ferramentas amplo e orientado a negócio real** (financeiro, agenda, faturamento, certificados, escalonamento humano).
4. **Integração com Supabase** e regras de confirmação transacional (ex.: só confirmar agendamento após sucesso da ferramenta).

### Principais lacunas atuais
1. **Confiabilidade de contexto no chat web**: telefone é simulado fixo, o que limita personalização e recuperação real de histórico do paciente.
2. **Ausência de políticas explícitas de segurança/guardrails para LLM**: não há uma camada formal de validação semântica das chamadas de ferramenta (além da tipagem/parâmetros).
3. **Observabilidade ainda limitada**: faltam trilhas completas de qualidade do agente (taxa de acerto de intenção, taxa de handoff, latência por etapa, falhas por ferramenta).
4. **Sem suíte de avaliação automatizada de prompts e tool-calls**: risco de regressão quando prompts/ferramentas mudarem.
5. **Documentação de SOPs de subagentes ainda superficial** (diretório `directives` sem playbooks detalhados).

---

## 2) Análise das habilidades já existentes

Atualmente, o ambiente expõe uma habilidade customizada do projeto:

### `supabase-postgres-best-practices`
**Status:** útil e bem alinhada ao stack.

**O que cobre bem:**
- Performance de queries.
- Conexão/pooling.
- Segurança e RLS.
- Índices, schema e padrões de acesso.

**Onde ajuda diretamente neste projeto:**
- Tabelas de agenda, pacientes, invoices e métricas podem se beneficiar de tuning contínuo.
- Fluxos de busca por disponibilidade, histórico e faturamento são sensíveis a índices e planos de execução.

**Limitações dessa habilidade no contexto atual:**
- Foco em banco de dados; não cobre profundamente:
  - Engenharia de prompt e avaliação de agente.
  - Segurança de LLM/tool abuse.
  - Operação de canais conversacionais (WhatsApp/Telegram) com robustez.

---

## 3) Novas habilidades recomendadas (prioridade prática)

## Prioridade Alta (recomendado iniciar agora)

### 3.1 `llm-guardrails-and-safety`
**Objetivo:** padronizar defesa contra prompt injection, tool misuse, over-permission e vazamento de dados sensíveis.

**Conteúdo sugerido da skill:**
- Checklist de entrada/saída por canal.
- Política de negação para ações destrutivas sem confirmação forte.
- Camada de validação de argumentos antes de executar ferramentas críticas.
- Padrões de redação segura para dados pessoais (LGPD).

### 3.2 `agent-evals-and-regression-suite`
**Objetivo:** criar rotina de avaliação automática de qualidade do agente a cada alteração.

**Conteúdo sugerido da skill:**
- Dataset de cenários reais (agendar, cancelar, urgência, cobrança, erro de pagamento, reagendamento).
- Métricas mínimas (sucesso de tarefa, precisão de tool-call, taxa de fallback humano, tempo médio até resolução).
- Harness para rodar testes de regressão de prompt e tools.

### 3.3 `healthcare-conversation-compliance-br`
**Objetivo:** padronizar comunicação clínica não diagnóstica com segurança, empatia e conformidade local.

**Conteúdo sugerido da skill:**
- Frases seguras para urgência e limites clínicos.
- Regras de linguagem para não prescrição indevida.
- Protocolos de encaminhamento para emergência e humanos.

## Prioridade Média

### 3.4 `omnichannel-reliability-whatsapp-telegram`
**Objetivo:** melhorar robustez operacional dos canais de mensageria.

**Conteúdo sugerido da skill:**
- Idempotência de webhooks.
- Deduplicação de mensagens.
- Tratamento de atrasos/reentregas.
- Retentativas com backoff e circuit-breaker.

### 3.5 `agent-observability-and-incident-response`
**Objetivo:** habilitar operação com telemetria e resposta rápida.

**Conteúdo sugerido da skill:**
- Painel de métricas-chave (latência, tool errors, handoff, satisfação).
- Alertas de anomalia (picos de erro por ferramenta/modelo).
- Runbooks de incidentes por severidade.

### 3.6 `retrieval-faq-governance`
**Objetivo:** elevar qualidade de FAQ aprendido (`searchLearnedAnswers` / `saveLearnedAnswer`).

**Conteúdo sugerido da skill:**
- Curadoria editorial e versionamento de respostas.
- Política de validade e revisão periódica.
- Estratégia de embeddings e threshold de confiança.

---

## 4) Melhorias de arquitetura recomendadas

1. **Contexto real do paciente no chat web**
   - Remover telefone simulado e conectar identidade real/logada.
   - Ganho: personalização e continuidade real de atendimento.

2. **Policy Engine para execução de tools**
   - Interceptar toda chamada com validações de negócio (ex.: data válida, permissão por papel, confirmação explícita para operações sensíveis).

3. **Normalização de modelos por tarefa**
   - Definir estratégia por custo/qualidade: triagem inicial mais barata, operações críticas com modelo mais robusto.

4. **Padrão de confirmação para ações irreversíveis**
   - Cancelamentos em massa e bloqueios de agenda com confirmação de dois passos.

5. **Camada de auditoria conversacional**
   - Log estruturado: `intent_detected`, `tool_selected`, `tool_result`, `final_outcome`, `handoff_reason`.

---

## 5) Plano de evolução em 30 dias

### Semana 1
- Implementar skill `llm-guardrails-and-safety`.
- Criar validação central de argumentos para ferramentas críticas.

### Semana 2
- Implementar skill `agent-evals-and-regression-suite` com 20 cenários prioritários.
- Definir baseline e metas mínimas de qualidade.

### Semana 3
- Implementar skill `agent-observability-and-incident-response`.
- Publicar dashboard de saúde do agente.

### Semana 4
- Iniciar skill `healthcare-conversation-compliance-br` e revisão dos prompts com jurídico/coordenação clínica.
- Planejar rollout gradual e monitorado.

---

## 6) Priorização final (resumo executivo)

Se for para escolher **apenas 3 novas habilidades agora**, escolha nesta ordem:
1. `llm-guardrails-and-safety`
2. `agent-evals-and-regression-suite`
3. `agent-observability-and-incident-response`

Essas três entregam o melhor equilíbrio entre **risco reduzido**, **qualidade percebida** e **escala operacional** no curto prazo.
