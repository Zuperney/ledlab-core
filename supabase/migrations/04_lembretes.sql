-- 04_lembretes.sql — lembrete automático por horário (fase 4).
-- O CLIENTE calcula `disparar_em` (avisosCalc.js, America/Sao_Paulo = UTC−3
-- fixo) ao publicar; o pg_cron varre a cada 5 min e manda a Edge Function
-- `processar-lembretes` transformar lembrete vencido em avisos (+ push).
-- antecedencia_min = 0 é a regra "véspera às 18h" (sem hora de chamada).

create table public.lembretes (
  id               uuid primary key default gen_random_uuid(),
  evento_id        uuid not null references public.eventos_publicados (id) on delete cascade,
  antecedencia_min int  not null default 0,
  disparar_em      timestamptz not null,
  enviado_em       timestamptz,
  unique (evento_id, antecedencia_min)
);
create index lembretes_pendentes on public.lembretes (disparar_em) where enviado_em is null;

alter table public.lembretes enable row level security;

-- só o gestor do evento enxerga/mexe (o técnico recebe o AVISO, não o lembrete)
create policy lembretes_select on public.lembretes for select using (public.eh_gestor_do_evento(evento_id));
create policy lembretes_insert on public.lembretes for insert with check (public.eh_gestor_do_evento(evento_id));
create policy lembretes_update on public.lembretes for update
  using (public.eh_gestor_do_evento(evento_id)) with check (public.eh_gestor_do_evento(evento_id));
create policy lembretes_delete on public.lembretes for delete using (public.eh_gestor_do_evento(evento_id));

-- varredura: a cada 5 min o pg_cron cutuca a Edge Function (mesma anon key
-- pública do app; a função usa service role por dentro e não confia em input)
create extension if not exists pg_cron;

select cron.schedule(
  'ledlab-lembretes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://hjcbwyhxmczmehdqfnkc.supabase.co/functions/v1/processar-lembretes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqY2J3eWh4bWN6bWVoZHFmbmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTYyNDAsImV4cCI6MjA5OTEzMjI0MH0.QEVoClFsgQGbZSV4YQel6Klb4Wp2DZu4KKBDwn-x1cg'
    ),
    body := '{}'::jsonb
  );
  $$
);
