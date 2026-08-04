-- 01_equipes.sql — fundação do módulo Equipe (fase 1).
-- Tabelas: profiles, equipes, equipe_convites, equipe_membros.
-- Modelo de papel POR VÍNCULO: quem cria uma equipe é gestor DELA; o mesmo
-- usuário pode ser técnico na equipe de outro. Não existe papel global.
--
-- LGPD/minimização: o e-mail de um membro NUNCA é exposto a gestor/colegas —
-- o que circula é o nome_exibicao que o próprio técnico escolheu ao entrar.
-- O código de convite mora em tabela própria (equipe_convites) porque RLS é
-- por linha, não por coluna: assim só o gestor consegue ler o código.
--
-- Contexto: a tabela user_data(user_id, key, value, updated_at) do sync KV
-- já existe no projeto (criada pelo dashboard antes deste repo versionar o
-- banco). Este arquivo não a recria.

create table public.profiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  nome      text not null default '',
  criado_em timestamptz not null default now()
);

create table public.equipes (
  id        uuid primary key default gen_random_uuid(),
  gestor_id uuid not null references auth.users (id) on delete cascade,
  nome      text not null,
  criado_em timestamptz not null default now()
);

-- separado de equipes: só o gestor pode LER o código (ver cabeçalho)
create table public.equipe_convites (
  equipe_id uuid primary key references public.equipes (id) on delete cascade,
  codigo    text not null unique,
  gerado_em timestamptz not null default now()
);

create table public.equipe_membros (
  equipe_id     uuid not null references public.equipes (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  nome_exibicao text not null,
  funcao        text not null default '',
  entrou_em     timestamptz not null default now(),
  primary key (equipe_id, user_id)
);

-- ── helpers de policy ──────────────────────────────────────────────────────
-- security definer: rodam como dono da função (bypassa RLS por dentro), o que
-- evita recursão de policy (equipes consulta equipe_membros e vice-versa).

create function public.eh_gestor(eq uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from equipes where id = eq and gestor_id = auth.uid()) $$;

create function public.eh_membro(eq uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from equipe_membros where equipe_id = eq and user_id = auth.uid()) $$;

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.profiles       enable row level security;
alter table public.equipes        enable row level security;
alter table public.equipe_convites enable row level security;
alter table public.equipe_membros enable row level security;

-- profiles: cada um só o seu
create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- equipes: gestor e membros enxergam; só o gestor mexe
create policy equipes_select on public.equipes for select
  using (gestor_id = auth.uid() or public.eh_membro(id));
create policy equipes_insert on public.equipes for insert with check (gestor_id = auth.uid());
create policy equipes_update on public.equipes for update
  using (gestor_id = auth.uid()) with check (gestor_id = auth.uid());
create policy equipes_delete on public.equipes for delete using (gestor_id = auth.uid());

-- equipe_convites: SÓ o gestor (o técnico usa o código via RPC, nunca por select)
create policy convites_select on public.equipe_convites for select using (public.eh_gestor(equipe_id));
create policy convites_insert on public.equipe_convites for insert with check (public.eh_gestor(equipe_id));
create policy convites_update on public.equipe_convites for update
  using (public.eh_gestor(equipe_id)) with check (public.eh_gestor(equipe_id));
create policy convites_delete on public.equipe_convites for delete using (public.eh_gestor(equipe_id));

-- equipe_membros: gestor e colegas se veem; entrar é só via RPC (security
-- definer, sem policy de insert); sair é do próprio, remover é do gestor
create policy membros_select on public.equipe_membros for select
  using (public.eh_gestor(equipe_id) or public.eh_membro(equipe_id));
create policy membros_update on public.equipe_membros for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy membros_delete on public.equipe_membros for delete
  using (user_id = auth.uid() or public.eh_gestor(equipe_id));

-- ── RPC: entrar na equipe pelo código de convite ───────────────────────────
-- security definer: valida o código sem o técnico poder listar convites.
-- Retorna a equipe em json; erro vira exceção com mensagem estável (o cliente
-- traduz pra toast).

create function public.entrar_na_equipe(p_codigo text, p_nome text)
returns json
language plpgsql security definer set search_path = public as
$$
declare
  v_equipe equipes%rowtype;
  v_codigo text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9-]', '', 'g'));
  v_nome   text := trim(coalesce(p_nome, ''));
begin
  if auth.uid() is null then
    raise exception 'sem_sessao';
  end if;
  if v_nome = '' then
    raise exception 'nome_obrigatorio';
  end if;

  select e.* into v_equipe
    from equipe_convites c join equipes e on e.id = c.equipe_id
   where c.codigo = v_codigo;
  if not found then
    raise exception 'codigo_invalido';
  end if;

  insert into equipe_membros (equipe_id, user_id, nome_exibicao)
  values (v_equipe.id, auth.uid(), v_nome)
  on conflict (equipe_id, user_id) do update set nome_exibicao = excluded.nome_exibicao;

  return json_build_object('id', v_equipe.id, 'nome', v_equipe.nome);
end;
$$;

revoke execute on function public.entrar_na_equipe(text, text) from public, anon;
grant  execute on function public.entrar_na_equipe(text, text) to authenticated;
