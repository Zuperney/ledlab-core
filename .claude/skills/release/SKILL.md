---
name: release
description: O ritual de soltar uma versão do LedLab Core — bump de versão, WHATS_NEW, CHANGELOG, portões de qualidade, merge na main e acompanhamento do deploy no GitHub Pages. Use SEMPRE que o usuário disser "pode soltar", "solta essa versão", "sobe pra main", "faz o release", "bump de versão" ou pedir pra publicar/deployar o app — e também quando terminar uma feature e for perguntar se pode soltar, pra já saber o que vai acontecer. Push na main É o deploy, então esta skill vale mesmo pra mudanças pequenas.
---

# Release do LedLab Core

Push na `main` dispara o GitHub Pages. **Não existe "commitar na main e ver no que dá"** — todo merge é uma publicação pra quem usa o app em campo.

## A regra que não se negocia

Trabalho novo vive em **branch**. O merge na main só acontece com o **"pode soltar"** explícito do dono — a frase dele, não a sua inferência de que está pronto. Se ele aprovou a *feature* mas não falou de soltar, pergunte; ele costuma querer testar no aparelho dele antes.

## Sequência

### 1. Versão — um lugar só
Bump **apenas** no `package.json`. O `VERSION` do `src/nav.js` é `__APP_VERSION__`, injetado pelo vite (`define` no `vite.config.js`) — hardcodar ali cria duas fontes de verdade que divergem na primeira distração.

Semântica na prática deste projeto: feature nova = minor (1.20 → 1.21); correção isolada ou ajuste de documentação = patch.

### 2. WHATS_NEW — o que o usuário vê
`src/nav.js` → `WHATS_NEW` é o texto do modal que aparece **uma vez** depois de atualizar. Escreva pro técnico, não pro programador: o que ele ganha, onde fica, o que fazer com isso. Emoji de abertura por bloco é o padrão da casa (`👥`, `🔔`, `📖`). Sem changelog cru, sem nome de arquivo, sem "refatoramos".

### 3. CHANGELOG.md — o histórico longo
Entrada nova no topo, no formato que já está lá: `## [1.21.0] — AAAA-MM-DD`, uma linha-título em negrito com o espírito da versão, depois os bullets. É o registro que sobrevive à conversa — inclusive decisões de escopo e correções honestas (o arquivo já tem precedente disso).

*Este passo é o que mais escapa.* As v1.19.0 e v1.20.0 foram soltas sem ele e o arquivo ficou defasado; se notar buraco, ofereça preencher retroativamente.

### 4. Portões — todos verdes, sem exceção
```bash
npm test && npm run lint && npm run build
```
São bloqueantes no CI de qualquer jeito; rodar antes evita descobrir com o deploy no meio. O `build` também é o único jeito de flagrar quebra no `public/sw.js` (veja abaixo).

### 5. Commit, merge, push
```bash
git add -A && git commit -F <arquivo-de-mensagem>
git checkout main && git merge <branch> --no-edit && git push origin main
```
Mensagem do release: `release: vX.Y.Z — resumo curto em minúsculas`. Rodapé `Co-Authored-By:` como nos demais commits.

Prefira `git commit -F arquivo` a `-m` com texto longo: no PowerShell, `&` e acentos dentro de `-m` viram erro de parsing (`pathspec ... did not match`).

### 6. Acompanhar o deploy
```bash
gh run watch $(gh run list --workflow deploy.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status
```
Rode em background e avise o usuário quando terminar. Produção: `https://zuperney.github.io/ledlab-core/`.

## Armadilhas conhecidas

**Service worker.** `public/sw.js` é artesanal. O plugin `stampServiceWorker` (vite.config.js) troca por `String.replace` **literal** as strings `__BUILD_ID__` e `const BUILD_ASSETS = [];`. Mexeu no sw.js? Confira depois do build:
```bash
node -e "const s=require('fs').readFileSync('dist/sw.js','utf8');console.log(!s.includes('__BUILD_ID__'), /BUILD_ASSETS = \[.+\]/.test(s))"
```
Dois `true` = carimbo ok. Se quebrar, quebra **em silêncio** e o app passa a servir chunk velho.

**Deploy de documentação.** Push só de `.md` também republica o app e gera `__BUILD_ID__` novo — quem estiver com o app aberto vê o banner "nova versão" sem novidade real. Não é bug; avise o usuário pra ele não estranhar.

**Backend não vai junto.** Migration em `supabase/` e Edge Function não sobem com o deploy do Pages — são aplicadas à parte (veja a skill `migration`). Se a versão depende de banco novo, o banco vai **primeiro**, senão o app novo bate numa tabela que não existe.

## Depois de soltar
Ofereça o roteiro de verificação em produção: abrir o app, banner "nova versão" → Atualizar, conferir o modal de novidades e o caminho da feature que acabou de subir. Se a feature envolve push, lembre que só funciona no app publicado (HTTPS), nunca no `localhost` nem no IP da rede local.
