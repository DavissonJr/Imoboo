# ImobooCRM

CRM imobiliário com atendimento por WhatsApp assistido por IA.

A proposta é uma só: **o corretor vende sem passar o dia preso ao WhatsApp.**
A IA responde as perguntas repetitivas sobre o catálogo; o corretor entra quando
o atendimento exige gente.

---

## Como subir

```bash
cp .env.example .env
# preencha JWT_SECRET, ANTHROPIC_API_KEY, EVOLUTION_BASE_URL, EVOLUTION_API_KEY

docker compose up -d --build
```

| Serviço    | Endereço                          |
|------------|-----------------------------------|
| Frontend   | http://localhost:4200             |
| API        | http://localhost:5080             |
| Swagger    | http://localhost:5080/swagger     |
| Health     | http://localhost:5080/health      |
| SQL Server | localhost:1433                    |
| Redis      | localhost:6379                    |

Em `Development` a API aplica as migrations e cria dados de demonstração
(um tenant, quatro imóveis, login `corretor@demo.com` / `Demo@123`).

### Rodando sem Docker

```bash
# infraestrutura
docker compose up -d sqlserver redis

# backend
cd backend
dotnet ef migrations add Initial -p src/ImobooCRM.Infrastructure -s src/ImobooCRM.Api
dotnet run --project src/ImobooCRM.Api

# frontend
cd frontend && npm install && npm start
```

O projeto ainda não tem migrations versionadas: o primeiro `dotnet ef migrations add`
gera a inicial a partir do modelo.

---

## Estrutura

```
backend/src/
  ImobooCRM.Domain          entidades, enums, regras — sem dependência de infra
  ImobooCRM.Application     casos de uso, DTOs, contratos das integrações
  ImobooCRM.Infrastructure  EF Core, Redis, Evolution, Anthropic, JWT
  ImobooCRM.Api             controllers, middlewares, DI, Swagger

frontend/src/app/
  core/       models, services HTTP, interceptor, guard
  layout/     shell com navegação
  features/   auth, dashboard, conversas, leads, imóveis
```

Dependências apontam sempre para dentro: `Api → Infrastructure → Application → Domain`.

---

## O caminho de uma mensagem

```
WhatsApp → Evolution → POST /api/webhooks/whatsapp/evolution
   ↓ valida token, resolve tenant pela instância, registra idempotência
   ↓ enfileira e responde 200                        (< 50 ms)
─────────────────────────────────────────────────────────────
InboundMessageWorker (fora do ciclo HTTP)
   ↓ lock por telefone no Redis
   ↓ identifica/cria lead e conversa, grava a mensagem
   ↓ conversa está com o corretor? → para aqui, sem IA
   ↓ pediu humano / negociação / jurídico? → handoff, sem IA
   ↓ extrai preferências        (modelo rápido, cache 7d)
   ↓ busca no catálogo          (SQL, cache 5 min)
   ↓ gera a resposta            (modelo balanceado, cache 6h)
   ↓ envia pela Evolution, grava, atualiza lead e conversa
```

Cada passo antes da IA existe para não chamar a IA.

---

## Regras que o código sustenta

**A IA não é fonte de verdade.** Preço, endereço, área, quartos e disponibilidade
entram no prompt vindos do banco, dentro de um bloco `<catalogo>`. O system prompt
proíbe estimar e manda encaminhar ao corretor quando o dado não existe. Se o
catálogo volta vazio, a IA responde que vai confirmar — nunca inventa um imóvel.

**Só usa IA quem precisa.** "Imóveis abaixo de 300 mil com 2 quartos" é `WHERE`,
não prompt. O modelo entra depois, para transformar a lista em conversa.
A detecção de handoff tem uma camada determinística antes do modelo.

**Isolamento de tenant é do backend.** Global query filters no `DbContext`
aplicam o `WHERE TenantId` sozinhos, e o `SaveChanges` bloqueia gravação
cruzada. O `TenantId` vem da claim do JWT — nunca de body, query ou header.
No Redis toda chave começa com `tenant:{id}:`.

**Webhook é idempotente.** Índice único em `(Provider, ExternalEventId)` e outro
em `(TenantId, ExternalMessageId)`. Mensagem reentregue é descartada no insert.
O mesmo cliente não recebe duas respostas.

**A automação é reversível.** Assumir conversa, devolver para a IA e encerrar são
ações explícitas na interface. Responder manualmente já assume a conversa.

---

## Onde o custo de IA é contido

| Mecanismo | Efeito |
|---|---|
| Busca em SQL antes do prompt | Só os imóveis relevantes viajam no contexto (máx. 5) |
| Janela de 8 mensagens + resumo | Histórico longo não é reenviado a cada turno |
| Cache de extração (7 dias) | "2 quartos até 300 mil" é extraído uma vez por tenant |
| Cache de resposta (6 horas) | Mesma pergunta + mesmo catálogo = mesma resposta |
| Dois tiers de modelo | Extração e classificação vão no modelo barato |
| Handoff determinístico | "Quero falar com o corretor" não gasta token |
| Teto mensal por tenant | `MonthlyAiMessageLimit` corta antes da fatura |
| Retry limitado a 1 | Falha de IA não vira cobrança em duplicidade |

`AiUsageLogs` guarda operação, modelo, tokens e se veio do cache — sem prompt,
sem conteúdo do lead.

---

## Segurança

- Secrets só por variável de ambiente. `appsettings.json` versionado não tem chave.
- Senha em PBKDF2-HMAC-SHA256, 210k iterações, comparação em tempo constante.
- Webhook valida `x-webhook-token` por tenant.
- Log nunca recebe token, API key ou corpo de erro do provedor de IA.
- Telefone é mascarado em log de diagnóstico.
- Container da API roda como usuário não-root.

---

## O que ainda não existe

Escrito para deixar claro o limite do que está entregue:

- Migrations versionadas (gere a inicial com `dotnet ef migrations add`)
- Upload de fotos de imóvel (só a URL é persistida)
- Tela de cadastro/edição de imóvel — a API está pronta, a UI não
- Agendamentos: entidade e indicador existem, faltam endpoints e tela
- Resumo automático de conversa: prompt pronto, ainda não é acionado
- WebSocket na caixa de entrada (hoje é poll de 20s)
- Testes automatizados
- Fila distribuída: a atual é em memória, então a API roda em réplica única

Nada disso bloqueia o fluxo principal, que está fechado ponta a ponta.
