alter table public.artistrysynk_link_intents
  add column if not exists kind text not null default 'LINK',
  add column if not exists claim_url text;

alter table public.artistrysynk_link_intents
  drop constraint if exists artistrysynk_link_intents_kind_check;

alter table public.artistrysynk_link_intents
  add constraint artistrysynk_link_intents_kind_check check (kind in ('LINK', 'CLAIM'));

create index if not exists artistrysynk_link_intents_user_kind_idx
  on public.artistrysynk_link_intents (user_id, kind, expires_at desc);