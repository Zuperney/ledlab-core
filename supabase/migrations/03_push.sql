-- 03_push.sql — assinaturas de Web Push + gatilho do worker de envio (fase 3).
--
-- Fluxo: triggers da migration 02 criam linhas em `avisos` → um trigger AQUI
-- cutuca a Edge Function `enviar-avisos` (via pg_net), que é um WORKER de
-- fila: lê avisos com push_em nulo, envia o push (VAPID) e carimba push_em.
-- O worker não confia em input nenhum — cutucar de novo é inofensivo.
--
-- A anon key na URL abaixo é pública por design (mesma do app; RLS protege).

create extension if not exists pg_net;

create table public.push_assinaturas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text not null default '',
  criado_em  timestamptz not null default now(),
  ultimo_ok  timestamptz
);

alter table public.push_assinaturas enable row level security;

-- cada um só as próprias assinaturas (a Edge Function usa service role)
create policy push_select on public.push_assinaturas for select using (user_id = auth.uid());
create policy push_insert on public.push_assinaturas for insert with check (user_id = auth.uid());
create policy push_update on public.push_assinaturas for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_delete on public.push_assinaturas for delete using (user_id = auth.uid());

-- aviso novo → cutuca o worker (por STATEMENT: um poke por lote, não por linha)
create function public.cutucar_worker_push() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  perform net.http_post(
    url := 'https://hjcbwyhxmczmehdqfnkc.supabase.co/functions/v1/enviar-avisos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqY2J3eWh4bWN6bWVoZHFmbmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTYyNDAsImV4cCI6MjA5OTEzMjI0MH0.QEVoClFsgQGbZSV4YQel6Klb4Wp2DZu4KKBDwn-x1cg'
    ),
    body := '{}'::jsonb
  );
  return null;
end;
$$;

create trigger avisos_cutucar_push
  after insert on public.avisos
  for each statement execute function public.cutucar_worker_push();
