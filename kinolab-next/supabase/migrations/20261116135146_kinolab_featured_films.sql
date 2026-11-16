-- A single public configuration row. The array order is the slide order.
create table public.kinolab_featured_films (
  id integer primary key default 1 check (id = 1),
  movie_ids text[] not null default '{}' check (
    cardinality(movie_ids) <= 5
    and coalesce(array_ndims(movie_ids), 1) = 1
    and array_position(movie_ids, null) is null
  ),
  revision uuid not null default gen_random_uuid()
);

alter table public.kinolab_featured_films enable row level security;

insert into public.kinolab_featured_films (id) values (1);

revoke all on public.kinolab_featured_films from public, anon, authenticated;
grant select on public.kinolab_featured_films to anon, authenticated;
grant update (movie_ids, revision) on public.kinolab_featured_films to authenticated;

create policy kinolab_featured_films_read
  on public.kinolab_featured_films for select to anon, authenticated
  using (true);

create policy kinolab_featured_films_admin_update
  on public.kinolab_featured_films for update to authenticated
  using ((select public.cinewave_is_admin()))
  with check (
    (select public.cinewave_is_admin())
    and cardinality(movie_ids) = (select count(distinct movie_id) from unnest(movie_ids) as selected(movie_id))
    and not exists (
      select 1
      from unnest(movie_ids) as selected(movie_id)
      where not exists (
        select 1 from public.movies as movie
        where movie.is_published and 'catalog:' || movie.id = selected.movie_id
      ) and not exists (
        select 1 from public.kinolab_external_catalog as movie
        where movie.is_published and movie.terms_confirmed and movie.media_type = 'movie'
          and 'catalog:external:' || movie.id = selected.movie_id
      )
    )
  );
