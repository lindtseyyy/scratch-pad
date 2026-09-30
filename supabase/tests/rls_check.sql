-- Run as postgres on a disposable/local database. Everything rolls back.
begin;
insert into auth.users(id, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111', '{"username":"rls_alice"}'),
 ('22222222-2222-2222-2222-222222222222', '{"username":"rls_bob"}');
insert into public.links(id, user_id, url, title) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'https://example.com/a', 'Alice private'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'https://example.com/b', 'Bob private');
insert into public.tags(id, user_id, name) values
 ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'alice-tag');

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$
declare affected integer; original_created timestamptz; saved public.links;
begin
 if (select count(*) from public.links) <> 1 then raise exception 'SELECT isolation failed'; end if;
 if (select count(*) from public.profiles) <> 1 then raise exception 'Profile isolation failed'; end if;
 if exists(select 1 from public.tags) then raise exception 'Tag isolation failed'; end if;
 if exists(select 1 from public.search_links('Alice')) then raise exception 'RPC isolation failed'; end if;
 update public.links set title = 'stolen' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'UPDATE isolation failed'; end if;
 delete from public.links where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'DELETE isolation failed'; end if;
 begin
   insert into public.link_tags(link_id, tag_id) values
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
   raise exception 'Cross-user FK was accepted';
 exception when foreign_key_violation then null; end;
 begin
   insert into public.links(user_id, url, title) values
    ('11111111-1111-1111-1111-111111111111', 'https://example.com/forged', 'forged');
   raise exception 'Forged user_id was accepted';
 exception when insufficient_privilege then null; end;
 begin
   update public.links set created_at = '2000-01-01' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
   raise exception 'Save timestamp was editable';
 exception when insufficient_privilege then null; end;
 begin
   perform public.save_link('https://example.com', 'stolen', p_id => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
   raise exception 'Foreign link was editable over RPC';
 exception when no_data_found then null; end;
 select created_at into original_created from public.links where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
 select * into saved from public.save_link('https://example.com/b', 'Bob changed', p_tag_names => array[' React ', 'react', 'video'], p_id => 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
 if saved.created_at <> original_created then raise exception 'Edit changed save timestamp'; end if;
 if (select count(*) from public.link_tags) <> 2 then raise exception 'Tag normalization failed'; end if;
 begin
   perform public.save_link('https://example.com/b', 'Must roll back', p_tag_names => array[repeat('x', 33)], p_id => saved.id);
   raise exception 'Oversized tag was accepted';
 exception when check_violation then null; end;
 if (select title from public.links where id = saved.id) <> 'Bob changed' then raise exception 'Save was not atomic'; end if;
 if (select count(*) from public.link_tags) <> 2 then raise exception 'Tag replacement did not roll back'; end if;
 if (select count(*) from public.search_links('', (select array_agg(id) from public.tags))) <> 1 then raise exception 'AND filter failed'; end if;
 if exists(select 1 from public.search_links('', array['cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid])) then raise exception 'Foreign tag filter exposed rows'; end if;
 if exists(select 1 from public.search_links('%')) then raise exception 'Search wildcard was not escaped'; end if;
 begin
   insert into public.links(url, title) values ('javascript:alert(1)', 'bad');
   raise exception 'Unsafe URL was accepted';
 exception when check_violation then null; end;
end $$;
reset role;
set local role anon;
do $$
begin
 begin perform * from public.links; raise exception 'Anonymous table access allowed';
 exception when insufficient_privilege then null; end;
 begin perform public.search_links(); raise exception 'Anonymous RPC allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
\echo 'PASS: RLS, cross-user FKs, anonymous denial, immutable timestamps, atomic saves, tag AND filtering, literal search, URL constraints'
