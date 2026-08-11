---
name: migration
description: Como mexer no banco do LedLab Core (Supabase) — escrever a migration numerada em supabase/migrations/, desenhar RLS e RPC do jeito da casa, aplicar no dashboard e atualizar o checklist. Use SEMPRE que a tarefa envolver tabela, coluna, policy, trigger, RLS, RPC, Edge Function, pg_cron ou qualquer alteração de banco — inclusive quando o usuário só descreve a feature ("quero guardar X por equipe") sem falar de SQL. Também vale quando algo falha com erro de permissão, "could not find the table", CORS ou 500 vindo do Supabase.
---

# Banco do LedLab Core

O banco é **versionado no repo**. Toda mudança entra como migration numerada em `supabase/migrations/` e só depois é aplicada. O dashboard é onde se *aplica*, nunca onde se *inventa* — schema que só existe no dashboard some da memória do projeto no dia seguinte.

O checklist de deploy e o roteiro de teste de RLS vivem em `supabase/README.md`; mantenha os dois em dia junto com a migration.

## Escrever a migration

Arquivo `NN_nome_curto.sql`, número seguindo o último. Comentário de cabeçalho explicando **por que** o desenho é esse — quem ler daqui a seis meses precisa entender a decisão, não só o DDL.

### RLS em toda tabela, sem exceção
A anon key é pública por design (está no `src/config/supabase.js`, e isso é intencional). **O RLS é a única proteção real.** Tabela sem `enable row level security` é tabela aberta pra internet.

### Helpers `security definer` contra recursão
`equipes` consulta `equipe_membros`, que consulta `equipes` — policies que se olham entram em recursão infinita. Por isso os predicados moram em funções:

```sql
create function public.eh_gestor(eq uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from equipes where id = eq and gestor_id = auth.uid()) $$;
```

Já existem: `eh_gestor`, `eh_membro`, `eh_gestor_do_evento`, `escalado_no_evento`. Reuse antes de criar outro.

### RLS é por LINHA, não por coluna
Essa limitação decide desenho duas vezes no módulo Equipe — vale internalizar:

- **Dado privado do gestor** (código de convite) foi pra **tabela própria** (`equipe_convites`). Se morasse numa coluna de `equipes`, quem lê a equipe leria o código.
- **Escrita em uma coluna só** (o gestor define `funcao`, mas o `nome_exibicao` é do técnico) virou **RPC** `definir_funcao`. Liberar o UPDATE da linha deixaria o gestor reescrever o nome de outra pessoa.

Quando o requisito for "fulano pode mexer só nisto", pergunte-se qual das duas formas cabe.

### RPC quando o input não pode ser listável
`entrar_na_equipe(codigo, nome)` é `security definer` porque o técnico precisa *usar* o código sem poder *listar* convites. Erros viram exceções com códigos estáveis (`codigo_invalido`, `so_gestor`) e o cliente traduz em `services/avisosCalc.js` → `mensagemErroEquipe` — assim a mensagem de UI é testável e não fica string solta no componente.

Sempre feche o acesso:
```sql
revoke execute on function public.x(...) from public, anon;
grant  execute on function public.x(...) to authenticated;
```

### Dedupe mora no banco
Aviso repetido é problema de dados, não de UI. O padrão é `unique index` numa `chave_dedupe` + `on conflict do nothing` no trigger. Salvar o mesmo conteúdo três vezes gera **um** aviso porque a chave carrega um hash do conteúdo (`md5(concat_ws(...))`). Cliente bem-comportado é bônus, não garantia.

### Semente retroativa
Trigger de seed só pega linha **nova**. Se a migration cria catálogo pra algo que já existe (habilidades por equipe, por exemplo), inclua o `insert ... select ... on conflict do nothing` que preenche o passado. Idempotente por construção.

## Aplicar

Não há CLI linkada. O caminho é o **SQL Editor do dashboard**, e dá pra fazer pelo Chrome do usuário:

1. `https://supabase.com/dashboard/project/hjcbwyhxmczmehdqfnkc/sql/new`
2. Colar via Monaco: `window.monaco.editor.getModels()[0].setValue(sql)` — o editor aceita bem, e é mais confiável que digitar.
3. Run. Conferir "Success. No rows returned".

**Cuidado com `$$` aninhado.** Corpo de função dentro de string JS confunde o parser em alguns contextos; use delimitador nomeado (`$FN$ ... $FN$`) ao colar funções e blocos `cron.schedule`.

Depois, confirme por fora que a tabela existe:
```bash
curl -s -o /dev/null -w "%{http_code}" \
  "https://hjcbwyhxmczmehdqfnkc.supabase.co/rest/v1/<tabela>?select=*&limit=1" \
  -H "apikey: <anon>" -H "Authorization: Bearer <anon>"
```
`200` = no ar. `404` com `PGRST205` = não aplicou.

## Edge Functions

Moram em `supabase/functions/<nome>/index.ts` (Deno/TS). O ESLint ignora `supabase/` — é outro mundo de runtime.

Três coisas que já custaram tempo:

- **CORS**: função chamada do navegador (`functions.invoke`) precisa responder o preflight `OPTIONS` e mandar `Access-Control-Allow-*`. Sem isso o app só vê "falha ao falar com o servidor" e a função nem é executada.
- **`verify_jwt`**: ligado para quem é chamado com sessão (app) ou anon key (trigger). **Desligado** para worker chamado pelo `pg_cron` sem token — e worker não confia em input nenhum, então é seguro.
- **Secrets**: `VAPID_PRIVATE_KEY` e afins ficam em Edge Functions → Secrets, com os valores em `supabase/.env.local` (git-ignorado por `*.local`). Chave privada **nunca** entra no repo. Se a função responde 500 com "No key set", o secret não existe ou o nome está diferente.

Deploy pelo editor do dashboard usa uma versão auto-contida (com o `_shared` embutido); o repo continua sendo a fonte canônica.

## Fechar o ciclo

1. Atualizar a ordem das migrations no checklist do `supabase/README.md`.
2. Acrescentar linhas ao roteiro de teste de RLS — o formato é "passo → esperado", com dois usuários (gestor e técnico). Toda policy nova merece uma linha que **tenta violar** e espera zero.
3. Se a feature de app depende do banco, o banco vai **antes** do release (veja a skill `release`).
