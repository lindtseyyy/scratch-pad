alter table public.profiles enable row level security;
alter table public.links enable row level security;
alter table public.tags enable row level security;
alter table public.link_tags enable row level security;

create policy "profiles: read own" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

do $$
declare table_name text;
begin
  foreach table_name in array array['links', 'tags', 'link_tags'] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || ': read own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || ': insert own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || ': update own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || ': delete own', table_name);
  end loop;
end $$;

-- RLS cannot guard TRUNCATE. Grant only the operations/columns the client needs.
revoke all on public.profiles, public.links, public.tags, public.link_tags from anon, authenticated;
grant select on public.profiles, public.links, public.tags, public.link_tags to authenticated;
grant insert (url, title, source, description), update (url, title, source, description), delete on public.links to authenticated;
grant insert (name), update (name), delete on public.tags to authenticated;
grant insert (link_id, tag_id), delete on public.link_tags to authenticated;

create view public.tag_usage with (security_invoker = true) as
select t.id, t.name, t.user_id, count(lt.link_id)::integer as link_count
from public.tags t left join public.link_tags lt on lt.tag_id = t.id and lt.user_id = t.user_id
group by t.id;
revoke all on public.tag_usage from anon, authenticated;
grant select on public.tag_usage to authenticated;
