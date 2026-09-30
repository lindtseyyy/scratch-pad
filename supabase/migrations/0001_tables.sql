create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  created_at timestamptz not null default now()
);

create table public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url text not null check (url ~* '^https?://[^[:space:]]+$' and char_length(url) <= 2048),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  source text check (char_length(source) <= 60),
  description text check (char_length(description) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index links_user_created_idx on public.links(user_id, created_at desc, id);
create index links_user_url_idx on public.links(user_id, url);
create index links_user_source_idx on public.links(user_id, source);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (name = lower(btrim(name)) and char_length(name) between 1 and 32),
  created_at timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id)
);
create table public.link_tags (
  link_id uuid not null,
  tag_id uuid not null,
  user_id uuid not null default auth.uid(),
  -- All composite FK columns must belong to the PK for PostgREST's M:N embedding.
  primary key (link_id, tag_id, user_id),
  foreign key (link_id, user_id) references public.links(id, user_id) on delete cascade,
  foreign key (tag_id, user_id) references public.tags(id, user_id) on delete cascade
);
create index link_tags_tag_idx on public.link_tags(tag_id);
create index link_tags_user_idx on public.link_tags(user_id);
