create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger links_set_updated_at before update on public.links
for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, username)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create function public.save_link(
  p_url text, p_title text, p_source text default null,
  p_description text default null, p_tag_names text[] default '{}', p_id uuid default null
) returns setof public.links
language plpgsql security invoker set search_path = '' as $$
declare saved public.links; tag_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.links(url, title, source, description)
    values (p_url, btrim(p_title), nullif(btrim(p_source), ''), nullif(btrim(p_description), ''))
    returning * into saved;
  else
    update public.links set url = p_url, title = btrim(p_title),
      source = nullif(btrim(p_source), ''), description = nullif(btrim(p_description), '')
    where id = p_id returning * into saved;
    if not found then raise exception 'Link not found' using errcode = 'P0002'; end if;
  end if;
  -- A concurrent edit of this link waits on the update above before replacing tags.
  delete from public.link_tags where link_id = saved.id;
  for tag_name in select distinct lower(btrim(n)) from unnest(coalesce(p_tag_names, '{}')) n
    where btrim(n) <> '' order by 1 loop
    insert into public.tags(name) values (tag_name) on conflict (user_id, name) do nothing;
    insert into public.link_tags(link_id, tag_id)
    select saved.id, id from public.tags where name = tag_name and user_id = auth.uid();
  end loop;
  return next saved;
end $$;

create function public.search_links(
  p_query text default '', p_tag_ids uuid[] default '{}', p_source text default null,
  p_sort text default 'newest', p_limit integer default 50, p_offset integer default 0
) returns setof public.links
language plpgsql stable security invoker set search_path = '' as $$
declare pattern text; selected_tags uuid[];
begin
  if p_sort not in ('newest', 'oldest', 'title') then raise exception 'Invalid sort'; end if;
  select coalesce(array_agg(distinct id), '{}') into selected_tags
    from unnest(coalesce(p_tag_ids, '{}')) id where id is not null;
  pattern := '%' || replace(replace(replace(coalesce(p_query, ''), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  return query select l.* from public.links l
  where (p_source is null or l.source = p_source)
    and (l.title ilike pattern or l.url ilike pattern or l.description ilike pattern or l.source ilike pattern)
    and (cardinality(selected_tags) = 0 or
      (select count(*) from public.link_tags lt where lt.link_id = l.id and lt.tag_id = any(selected_tags)) = cardinality(selected_tags))
  order by
    case when p_sort = 'newest' then l.created_at end desc,
    case when p_sort = 'oldest' then l.created_at end asc,
    case when p_sort = 'title' then lower(l.title) end asc,
    l.id asc
  limit least(greatest(coalesce(p_limit, 50), 1), 50) offset greatest(coalesce(p_offset, 0), 0);
end $$;

create function public.link_sources() returns table(source text)
language sql stable security invoker set search_path = '' as $$
  select distinct source from public.links where source is not null order by source;
$$;

revoke all on function public.set_updated_at(), public.handle_new_user() from public, anon, authenticated;
revoke all on function public.save_link(text, text, text, text, text[], uuid), public.search_links(text, uuid[], text, text, integer, integer), public.link_sources() from public, anon;
grant execute on function public.save_link(text, text, text, text, text[], uuid), public.search_links(text, uuid[], text, text, integer, integer), public.link_sources() to authenticated;
