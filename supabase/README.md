# supabase/ — o banco versionado

O backend do LedLab (projeto Supabase `hjcbwyhxmczmehdqfnkc`) nasceu no
dashboard, antes deste diretório existir. A partir do módulo Equipe, **toda
mudança de banco entra aqui como migration numerada** — o dashboard vira só o
lugar de APLICAR, nunca de editar à mão.

## O que já existia antes das migrations (criado via dashboard)

- `user_data(user_id uuid, key text, value jsonb, updated_at timestamptz)` —
  o KV do sync por usuário (`src/services/sync.js`), PK `(user_id, key)`,
  RLS "cada um só o seu". As migrations não recriam essa tabela.
- Auth por e-mail com OTP de 6 dígitos (template de e-mail padrão).

## Como aplicar uma migration

Sem CLI configurada, o caminho é o SQL Editor do dashboard:

1. Abrir o projeto → SQL Editor → New query.
2. Colar o conteúdo do arquivo de `migrations/` (em ordem numérica).
3. Run. Erro de "already exists" = migration já aplicada, pular.

Com a CLI (`supabase link` + `supabase db push`) o diretório já está no
formato esperado.

## Checklist de deploy do módulo Equipe & avisos (uma vez)

1. **Migrations** no SQL Editor, em ordem: `01_equipes.sql` →
   `02_eventos_avisos.sql` → `03_push.sql` → `04_lembretes.sql`.
   (03 exige a extensão `pg_net`; 04 exige `pg_cron` — os `create extension`
   estão nos arquivos, mas o projeto precisa tê-las habilitadas em
   Database → Extensions se o create falhar.)
2. **Secrets das Edge Functions** (Dashboard → Edge Functions → Secrets, ou
   `supabase secrets set`): `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` — valores
   em `supabase/.env.local` (arquivo local, fora do git). `SUPABASE_URL`,
   `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já vêm injetados.
3. **Deploy das functions** (CLI): 

   ```
   supabase functions deploy enviar-avisos
   supabase functions deploy convocar
   supabase functions deploy processar-lembretes
   ```

   (Todas com verify_jwt padrão — o anon key do trigger/cron passa.)
4. **Conferir o cron**: `select * from cron.job;` deve listar
   `ledlab-lembretes` (a cada 5 min). Log de disparos: `cron.job_run_details`.
5. **Teste de fumaça**: criar equipe no app → entrar com um 2º usuário →
   publicar evento com escala → aviso aparece no sino do técnico; ligar
   "Avisos no celular" num aparelho e convocar → push chega.

## LGPD — o que o modelo garante

- O e-mail de um usuário nunca é exposto a gestor/colegas: circula só o
  `nome_exibicao` escolhido pelo próprio técnico ao entrar (RPC).
- O técnico vê SÓ os eventos em que está escalado (policy de
  `eventos_publicados`), e a publicação sobe o mínimo do evento — nada
  financeiro/técnico.
- Sair da equipe / revogar aparelho é sempre possível pelo próprio usuário.
- Exclusão da conta (dashboard → Auth) apaga tudo em cascata: vínculos,
  escalas, avisos e assinaturas de push referenciam `auth.users` com
  `on delete cascade`.

## Roteiro de teste das policies (RLS)

Com dois usuários de teste (A = gestor, B = técnico), logados em dois
navegadores/perfis:

| Passo | Esperado |
|---|---|
| A cria equipe + convite | A vê a equipe e o código |
| B `select` em `equipe_convites` | 0 linhas (código não listável) |
| B chama `entrar_na_equipe(codigo, 'B')` | entra; vê a equipe, SEM o código |
| A e B `select` em `equipe_membros` | ambos veem a lista da equipe |
| B tenta `update` no membro de A | 0 linhas afetadas |
| B `delete` do próprio vínculo | sai da equipe |
| A `delete` de um membro | remove |
| A apaga a equipe | cascade limpa convite + membros |
