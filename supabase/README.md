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
