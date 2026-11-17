create schema kinolab_ratings_private;
revoke all on schema kinolab_ratings_private from public, anon, authenticated;
grant usage on schema kinolab_ratings_private to anon, authenticated;

create table kinolab_ratings_private.movie_votes (
  movie_key text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  primary key (movie_key, user_id)
);
create index movie_votes_user_id on kinolab_ratings_private.movie_votes (user_id);
alter table kinolab_ratings_private.movie_votes enable row level security;
revoke all on kinolab_ratings_private.movie_votes from public, anon, authenticated;

create function kinolab_ratings_private.movie_is_public(p_movie_key text)
returns boolean
language plpgsql stable set search_path = ''
as $$
declare
  movie_id numeric;
begin
  if p_movie_key is null or p_movie_key !~ '^catalog:(external:)?[1-9][0-9]{0,18}$' then
    return false;
  end if;
  movie_id := regexp_replace(p_movie_key, '^catalog:(external:)?', '')::numeric;
  if movie_id > 9223372036854775807 then
    return false;
  end if;
  if p_movie_key like 'catalog:external:%' then
    return exists (
      select 1 from public.kinolab_external_catalog as m
      where m.id = movie_id::bigint and m.is_published and m.terms_confirmed
        and m.media_type = 'movie'
    );
  end if;
  return exists (
    select 1 from public.movies as m where m.id = movie_id::bigint and m.is_published
  );
end;
$$;

create function kinolab_ratings_private.rating(p_movie_key text)
returns table (average_stars numeric, vote_count bigint, own_stars smallint)
language sql stable security definer set search_path = ''
as $$
  select round(avg(vote.stars), 1), count(*),
    max(vote.stars) filter (where vote.user_id = (select auth.uid()))
  from kinolab_ratings_private.movie_votes as vote
  where vote.movie_key = p_movie_key
  having kinolab_ratings_private.movie_is_public(p_movie_key);
$$;

create function kinolab_ratings_private.rate_movie(p_movie_key text, p_stars integer)
returns table (average_stars numeric, vote_count bigint, own_stars smallint)
language plpgsql security definer set search_path = ''
as $$
declare
  voter uuid := auth.uid();
begin
  if voter is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'A registered account is required.' using errcode = '42501';
  end if;
  if p_stars is null or p_stars not between 1 and 5 then
    raise exception 'Stars must be between 1 and 5.' using errcode = '22023';
  end if;
  if not kinolab_ratings_private.movie_is_public(p_movie_key) then
    raise exception 'This movie is unavailable.' using errcode = '22023';
  end if;
  insert into kinolab_ratings_private.movie_votes (movie_key, user_id, stars)
    values (p_movie_key, voter, p_stars)
    on conflict (movie_key, user_id) do update set stars = excluded.stars;
  return query select * from kinolab_ratings_private.rating(p_movie_key);
end;
$$;

create function public.kinolab_movie_rating(p_movie_key text)
returns table (average_stars numeric, vote_count bigint, own_stars smallint)
language sql stable security invoker set search_path = ''
as $$
  select * from kinolab_ratings_private.rating(p_movie_key);
$$;

create function public.kinolab_rate_movie(p_movie_key text, p_stars integer)
returns table (average_stars numeric, vote_count bigint, own_stars smallint)
language sql volatile security invoker set search_path = ''
as $$
  select * from kinolab_ratings_private.rate_movie(p_movie_key, p_stars);
$$;

revoke all on function kinolab_ratings_private.movie_is_public(text) from public, anon, authenticated;
revoke all on function kinolab_ratings_private.rating(text) from public, anon, authenticated;
revoke all on function kinolab_ratings_private.rate_movie(text, integer) from public, anon, authenticated;
revoke all on function public.kinolab_movie_rating(text) from public, anon, authenticated;
revoke all on function public.kinolab_rate_movie(text, integer) from public, anon, authenticated;
grant execute on function kinolab_ratings_private.rating(text), public.kinolab_movie_rating(text)
  to anon, authenticated;
grant execute on function kinolab_ratings_private.rate_movie(text, integer), public.kinolab_rate_movie(text, integer)
  to authenticated;
