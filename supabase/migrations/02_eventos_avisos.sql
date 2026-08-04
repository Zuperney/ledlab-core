-- 02_eventos_avisos.sql — escala e central de avisos (fase 2).
-- Evento compartilhado = PUBLICAÇÃO de um Project local do gestor: sobe só o
-- mínimo (nome, cliente, local, datas, chamada, obs). O Project em si continua
-- no aparelho/sync KV do gestor — nada financeiro ou técnico chega aqui.
--
-- Avisos nascem NO BANCO (triggers): qualquer caminho de escrita (app, SQL,
-- futuro) gera o aviso, e o dedupe é o unique index — não depende de cliente
-- bem-comportado. O envio de push (fase 3) pega carona nas mesmas linhas.

create table public.eventos_publicados (
  id            uuid primary key default gen_random_uuid(),
  equipe_id     uuid not null references public.equipes (id) on delete cascade,
  project_id    text not null,             -- id LOCAL do Project do gestor ("proj_…")
  nome          text not null,
  cliente       text not null default '',
  local         text not null default '',
  data_inicio   date not null,             -- Project.dataInicio ("YYYY-MM-DD") direto
  data_fim      date,
  hora_chamada  time,                      -- opcional; vira base do lembrete (fase 4)
  obs           text not null default '',
  cancelado     boolean not null default false,
  atualizado_em timestamptz not null default now(),
  unique (equipe_id, project_id)
);

create table public.escalas (
  evento_id uuid not null references public.eventos_publicados (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  funcao    text not null default '',
  criado_em timestamptz not null default now(),
  primary key (evento_id, user_id)
);

create table public.avisos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade, -- destinatário
  evento_id    uuid references public.eventos_publicados (id) on delete set null,
  tipo         text not null check (tipo in ('escalado','alterado','lembrete','convocacao','removido','cancelado')),
  titulo       text not null,
  corpo        text not null default '',
  chave_dedupe text not null,
  criado_em    timestamptz not null default now(),
  lido_em      timestamptz,
  push_em      timestamptz               -- carimbado pela Edge Function (fase 3)
);
create unique index avisos_dedupe on public.avisos (user_id, chave_dedupe);
create index avisos_por_usuario on public.avisos (user_id, criado_em desc);

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.eventos_publicados enable row level security;
alter table public.escalas            enable row level security;
alter table public.avisos             enable row level security;

create function public.escalado_no_evento(ev uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from escalas where evento_id = ev and user_id = auth.uid()) $$;

-- eventos: gestor da equipe OU quem está escalado NAQUELE evento (decisão do
-- dono: técnico não vê evento em que não está — minimização)
create policy eventos_select on public.eventos_publicados for select
  using (public.eh_gestor(equipe_id) or public.escalado_no_evento(id));
create policy eventos_insert on public.eventos_publicados for insert with check (public.eh_gestor(equipe_id));
create policy eventos_update on public.eventos_publicados for update
  using (public.eh_gestor(equipe_id)) with check (public.eh_gestor(equipe_id));
create policy eventos_delete on public.eventos_publicados for delete using (public.eh_gestor(equipe_id));

create function public.eh_gestor_do_evento(ev uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from eventos_publicados e join equipes q on q.id = e.equipe_id
                     where e.id = ev and q.gestor_id = auth.uid()) $$;

-- escalas: gestor vê/mexe; o técnico vê a própria linha
create policy escalas_select on public.escalas for select
  using (public.eh_gestor_do_evento(evento_id) or user_id = auth.uid());
create policy escalas_insert on public.escalas for insert with check (public.eh_gestor_do_evento(evento_id));
create policy escalas_update on public.escalas for update
  using (public.eh_gestor_do_evento(evento_id)) with check (public.eh_gestor_do_evento(evento_id));
create policy escalas_delete on public.escalas for delete using (public.eh_gestor_do_evento(evento_id));

-- avisos: cada um só os seus; escrever é papel dos triggers (security definer).
-- UPDATE liberado só pro dono da linha — o app usa pra marcar lido_em.
create policy avisos_select on public.avisos for select using (user_id = auth.uid());
create policy avisos_update on public.avisos for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── triggers: avisos nascem aqui ───────────────────────────────────────────

-- corpo padrão do aviso (datas + local), usado pelos dois triggers
create function public.corpo_do_aviso(ev public.eventos_publicados) returns text
  language sql immutable as
  $$ select trim(both ' · ' from
       coalesce(to_char(ev.data_inicio, 'DD/MM'), '') ||
       coalesce('–' || to_char(ev.data_fim, 'DD/MM'), '') ||
       case when ev.local <> '' then ' · ' || ev.local else '' end) $$;

-- entrar/sair da escala → aviso pro técnico (gestor não avisa a si mesmo)
create function public.avisar_mudanca_escala() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_ev     eventos_publicados%rowtype;
  v_gestor uuid;
  v_user   uuid := coalesce(new.user_id, old.user_id);
begin
  select e.* into v_ev from eventos_publicados e where e.id = coalesce(new.evento_id, old.evento_id);
  if not found then return coalesce(new, old); end if; -- cascade de delete do evento
  select gestor_id into v_gestor from equipes where id = v_ev.equipe_id;
  if v_user = v_gestor then return coalesce(new, old); end if;

  if tg_op = 'INSERT' then
    insert into avisos (user_id, evento_id, tipo, titulo, corpo, chave_dedupe)
    values (v_user, v_ev.id, 'escalado',
            'Você foi escalado: ' || v_ev.nome, corpo_do_aviso(v_ev),
            'escalado:' || v_ev.id)
    on conflict (user_id, chave_dedupe) do nothing;
  elsif tg_op = 'DELETE' then
    insert into avisos (user_id, evento_id, tipo, titulo, corpo, chave_dedupe)
    values (v_user, v_ev.id, 'removido',
            'Você saiu da escala: ' || v_ev.nome, corpo_do_aviso(v_ev),
            -- minuto na chave: sair→voltar→sair de novo ainda avisa, mas
            -- duplo-clique no mesmo minuto não duplica
            'removido:' || v_ev.id || ':' || to_char(now(), 'YYYYMMDDHH24MI'))
    on conflict (user_id, chave_dedupe) do nothing;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger escalas_avisar
  after insert or delete on public.escalas
  for each row execute function public.avisar_mudanca_escala();

-- edição/cancelamento do evento → aviso pra todo escalado.
-- Dedupe por HASH do conteúdo: salvar 3× o mesmo resultado gera UM aviso.
create function public.avisar_mudanca_evento() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_gestor uuid;
  v_hash   text;
  r        record;
begin
  select gestor_id into v_gestor from equipes where id = new.equipe_id;

  if new.cancelado and not old.cancelado then
    for r in select user_id from escalas where evento_id = new.id and user_id <> v_gestor loop
      insert into avisos (user_id, evento_id, tipo, titulo, corpo, chave_dedupe)
      values (r.user_id, new.id, 'cancelado',
              'Evento cancelado: ' || new.nome, corpo_do_aviso(new),
              'cancelado:' || new.id)
      on conflict (user_id, chave_dedupe) do nothing;
    end loop;
    return new;
  end if;

  if (new.nome, new.cliente, new.local, new.data_inicio, new.data_fim, new.hora_chamada, new.obs)
     is distinct from
     (old.nome, old.cliente, old.local, old.data_inicio, old.data_fim, old.hora_chamada, old.obs) then
    v_hash := md5(concat_ws('|', new.nome, new.cliente, new.local,
                            new.data_inicio, new.data_fim, new.hora_chamada, new.obs));
    for r in select user_id from escalas where evento_id = new.id and user_id <> v_gestor loop
      insert into avisos (user_id, evento_id, tipo, titulo, corpo, chave_dedupe)
      values (r.user_id, new.id, 'alterado',
              'Evento alterado: ' || new.nome, corpo_do_aviso(new),
              'alterado:' || new.id || ':' || v_hash)
      on conflict (user_id, chave_dedupe) do nothing;
    end loop;
  end if;
  return new;
end;
$$;

create trigger eventos_avisar
  after update on public.eventos_publicados
  for each row execute function public.avisar_mudanca_evento();
