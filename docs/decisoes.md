# Decisões de arquitetura

Registro do porquê, não do quê. O código mostra o quê.

---

## 1. Global query filter em vez de repositório por tenant

**Alternativa descartada:** repositório base que recebe `tenantId` em cada método.

Depende de disciplina humana. Um `_context.Properties.Where(...)` esquecido em
qualquer service vira vazamento entre clientes — a falha mais cara possível num SaaS.

Com filtro no modelo, o `WHERE TenantId` é aplicado pelo EF em toda consulta.
Esquecer deixa de ser possível; para escapar é preciso escrever `IgnoreQueryFilters()`,
que é visível em code review. Os dois usos legítimos hoje são o login e a resolução
da instância no webhook — ambos comentados no código.

O `SaveChanges` fecha o outro lado: preenche `TenantId` no insert e lança exceção
se alguém tentar gravar entidade de outro tenant.

---

## 2. Fila em processo (`System.Threading.Channels`)

**Alternativa descartada:** RabbitMQ desde o início.

O webhook precisa responder rápido e não pode segurar a conexão HTTP esperando IA.
Isso resolve com fila. Broker externo resolveria também, mas acrescenta um container,
uma dependência de operação e um modo de falha novo — para um produto que ainda vai
rodar em uma instância.

O contrato `IInboundMessageQueue` tem dois métodos. Trocar por RabbitMQ ou Service Bus
é uma classe nova na Infrastructure. A Application não muda.

**Limite explícito:** com a fila em memória, a API não escala horizontalmente sem
perder mensagens em restart. Quando isso incomodar, é hora de trocar — não antes.

---

## 3. Dois níveis de idempotência

Webhook duplicado é rotina, não exceção: a Evolution reentrega quando não recebe 200 a tempo.

- `InboundWebhookEvents` com índice único em `(Provider, ExternalEventId)` — barra
  na porta de entrada, antes de qualquer processamento.
- `Messages` com índice único em `(TenantId, ExternalMessageId)` — barra na gravação,
  cobrindo corrida entre réplicas.

O banco é o árbitro nos dois casos. Checar com `SELECT` antes do `INSERT` não resolve
corrida; deixar o índice único falhar, sim.

---

## 4. Lock por telefone, não por conversa

O lock é adquirido antes de resolver a conversa, com chave no telefone. Se fosse por
conversa, duas mensagens rápidas do mesmo lead novo criariam duas conversas antes de
qualquer lock existir.

TTL de 60s: se o processo morrer, o lock expira sozinho. A liberação usa script Lua
comparando o token, para que ninguém libere o lock de outro.

---

## 5. Redis indisponível não derruba o atendimento

Todo método do `RedisCacheService` engole `RedisException` e segue. Cache fora do ar
significa mais chamadas de IA e consulta a mais no banco — custo maior, atendimento
funcionando.

A exceção é o lock: sem Redis ele vira no-op. Aceita-se o risco de resposta duplicada
num cenário já degradado; travar o atendimento seria pior.

---

## 6. Dois tiers de modelo escolhidos pela Application

A Application pede `AiModelTier.Fast` ou `Balanced`, não um nome de modelo.
A Infrastructure faz o de-para via `AnthropicOptions`.

Extração e classificação são tarefas mecânicas com saída curta e verificável —
vão no modelo barato. Conversa com o lead vai no modelo balanceado.

Trocar de modelo ou de provedor é configuração, não refatoração.

---

## 7. Preferências do lead como owned type

`LeadPreference` vira colunas na tabela `Leads`, não uma tabela separada.

É 1:1 obrigatório, sempre lido junto com o lead e usado como filtro de busca.
Tabela à parte custaria um join em todo acesso sem trazer nada. Owned type mantém
o objeto rico no domínio e plano no banco.

---

## 8. Cor codifica estado no frontend

Só quatro cores saturadas existem no sistema visual, e todas significam a mesma
categoria de coisa: quem está conduzindo o atendimento.

- verde — IA respondendo
- âmbar — esperando o corretor
- azul — corretor assumiu
- cinza — encerrada

Nada mais no produto usa cor forte. O corretor abre a tela e vê onde precisa agir
sem ler uma palavra. O painel leva isso ao extremo: o número de conversas esperando
por ele aparece grande, sozinho e antes de qualquer outro indicador.

---

## 9. Handoff em duas camadas

Determinística primeiro: "quero falar com o corretor", "tem desconto", "advogado".
Termos inequívocos não precisam de modelo — a checagem custa microssegundos e o
resultado é mais confiável que uma classificação.

Só o que escapa dessa lista chega ao modelo, que pode emitir `[HANDOFF:motivo]` ao
perceber o próprio limite. A marcação é removida antes do envio; o lead nunca a vê.
