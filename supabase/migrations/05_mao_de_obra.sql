-- 05_mao_de_obra.sql — habilidades por técnico (fase 7).
--
-- O catálogo é POR EQUIPE (cada operação tem seu vocabulário: uma trabalha
-- com Resolume, outra nem sabe o que é) e nasce com uma lista padrão via
-- trigger — o gestor edita/adiciona depois.
--
-- Quem MARCA a habilidade é o gestor (decisão do dono, 05/08/2026): é o
-- cadastro de mão de obra DELE, na avaliação dele. A equipe enxerga —
-- ajuda o colega a saber quem chamar — mas não escreve.

create table public.habilidades (
  id        uuid primary key default gen_random_uuid(),
  equipe_id uuid not null references public.equipes (id) on delete cascade,
  nome      text not null,
  ordem     int  not null default 0,   -- ordem de exibição (a semente já vem ordenada)
  criado_em timestamptz not null default now(),
  unique (equipe_id, nome)
);

-- vínculo membro ↔ habilidade. A FK composta pra equipe_membros faz o
-- trabalho sujo: tirar alguém da equipe leva junto as habilidades dele.
create table public.membro_habilidades (
  equipe_id     uuid not null,
  user_id       uuid not null,
  habilidade_id uuid not null references public.habilidades (id) on delete cascade,
  criado_em     timestamptz not null default now(),
  primary key (equipe_id, user_id, habilidade_id),
  foreign key (equipe_id, user_id)
    references public.equipe_membros (equipe_id, user_id) on delete cascade
);
create index membro_habilidades_por_equipe on public.membro_habilidades (equipe_id);

-- ── semente do catálogo ────────────────────────────────────────────────────
-- Equipe nova já nasce com o vocabulário do ofício; sem isso o gestor
-- encara uma tela vazia e a feature morre na largada.

create function public.semear_habilidades() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  insert into habilidades (equipe_id, nome, ordem)
  values
    (new.id, 'Montagem',       1),
    (new.id, 'Cabeamento',     2),
    (new.id, 'Endereçamento',  3),
    (new.id, 'Processamento',  4),
    (new.id, 'Resolume',       5),
    (new.id, 'Operação',       6),
    (new.id, 'Elétrica',       7)
  on conflict (equipe_id, nome) do nothing;
  return new;
end;
$$;

create trigger equipes_semear_habilidades
  after insert on public.equipes
  for each row execute function public.semear_habilidades();

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.habilidades        enable row level security;
alter table public.membro_habilidades enable row level security;

-- catálogo: gestor e membros leem; só o gestor mexe
create policy habilidades_select on public.habilidades for select
  using (public.eh_gestor(equipe_id) or public.eh_membro(equipe_id));
create policy habilidades_insert on public.habilidades for insert
  with check (public.eh_gestor(equipe_id));
create policy habilidades_update on public.habilidades for update
  using (public.eh_gestor(equipe_id)) with check (public.eh_gestor(equipe_id));
create policy habilidades_delete on public.habilidades for delete
  using (public.eh_gestor(equipe_id));

-- vínculo: mesma regra — a equipe vê quem faz o quê, o gestor é quem define
create policy membro_hab_select on public.membro_habilidades for select
  using (public.eh_gestor(equipe_id) or public.eh_membro(equipe_id));
create policy membro_hab_insert on public.membro_habilidades for insert
  with check (public.eh_gestor(equipe_id));
create policy membro_hab_delete on public.membro_habilidades for delete
  using (public.eh_gestor(equipe_id));

-- ── RPC: o gestor define a FUNÇÃO do membro ────────────────────────────────
-- Via função, não via policy de UPDATE: RLS é por LINHA, e liberar a linha
-- inteira pro gestor deixaria ele reescrever o `nome_exibicao` — que, por
-- decisão de projeto (01_equipes.sql), é do próprio técnico. Aqui só a
-- coluna `funcao` se move.

create function public.definir_funcao(p_equipe uuid, p_user uuid, p_funcao text)
returns void
language plpgsql security definer set search_path = public as
$$
begin
  if not public.eh_gestor(p_equipe) then
    raise exception 'so_gestor';
  end if;
  update equipe_membros
     set funcao = trim(coalesce(p_funcao, ''))
   where equipe_id = p_equipe and user_id = p_user;
end;
$$;

revoke execute on function public.definir_funcao(uuid, uuid, text) from public, anon;
grant  execute on function public.definir_funcao(uuid, uuid, text) to authenticated;

-- ── semente retroativa ─────────────────────────────────────────────────────
-- O trigger acima só pega equipe NOVA; as que já existiam quando esta
-- migration rodou ficariam com catálogo vazio. Idempotente (on conflict).

insert into public.habilidades (equipe_id, nome, ordem)
select e.id, v.nome, v.ordem
  from public.equipes e
  cross join (values
    ('Montagem',1),('Cabeamento',2),('Endereçamento',3),('Processamento',4),
    ('Resolume',5),('Operação',6),('Elétrica',7)) as v(nome, ordem)
on conflict (equipe_id, nome) do nothing;
