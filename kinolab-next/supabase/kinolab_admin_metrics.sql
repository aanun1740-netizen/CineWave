-- KinoLab admin-only registered viewer counts and first-party aggregate traffic.
-- Safe to rerun. No email, account ID, IP, full URL, referrer or user agent is stored.
-- A page_view is a load, not a unique visitor. No historical events are backfilled.
CREATE TABLE IF NOT EXISTS cinewave_private.kinolab_traffic_daily (
  event_day date NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('page_view','film_open','watch_click')),
  movie_key text NOT NULL DEFAULT '' CHECK (length(movie_key) <= 40),
  language text NOT NULL CHECK (language IN ('hy','ru','en')),
  device_type text NOT NULL CHECK (device_type IN ('mobile','desktop')),
  total bigint NOT NULL DEFAULT 0 CHECK (total >= 0),
  PRIMARY KEY (event_day,event_type,movie_key,language,device_type)
);
ALTER TABLE cinewave_private.kinolab_traffic_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE cinewave_private.kinolab_traffic_daily FROM PUBLIC, anon, authenticated;

-- This RPC deliberately accepts anonymous, non-identifying aggregate events.
-- The API function validates all dimensions before writing to an unexposed table.
CREATE OR REPLACE FUNCTION public.kinolab_record_event(
  p_event text, p_movie_key text, p_language text, p_device text
) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF p_event NOT IN ('page_view','film_open','watch_click')
     OR p_language NOT IN ('hy','ru','en')
     OR p_device NOT IN ('mobile','desktop')
     OR p_movie_key IS NULL
     OR (
       (p_event='page_view' AND p_movie_key <> '')
       OR (p_event <> 'page_view' AND p_movie_key !~ '^catalog:(external:)?[1-9][0-9]{0,17}$')
     ) THEN
    RAISE EXCEPTION 'Invalid aggregate event' USING ERRCODE='22023';
  END IF;

  INSERT INTO cinewave_private.kinolab_traffic_daily(
    event_day,event_type,movie_key,language,device_type,total
  )
  VALUES ((now() AT TIME ZONE 'UTC')::date,p_event,p_movie_key,p_language,p_device,1)
  ON CONFLICT (event_day,event_type,movie_key,language,device_type)
  DO UPDATE SET total=LEAST(cinewave_private.kinolab_traffic_daily.total + 1, 100000000);
END;
$function$;

-- Never expose the table. Only authenticated administrators may read aggregates.
CREATE OR REPLACE FUNCTION public.kinolab_get_metrics(p_days integer DEFAULT 30)
RETURNS TABLE(
  event_day date,event_type text,movie_key text,language text,device_type text,total bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(
    SELECT 1 FROM cinewave_private.admin_users a WHERE a.user_id=auth.uid()
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';
  END IF;
  IF p_days NOT IN (7,30) THEN
    RAISE EXCEPTION 'Invalid range' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
    SELECT m.event_day,m.event_type,m.movie_key,m.language,m.device_type,m.total
    FROM cinewave_private.kinolab_traffic_daily m
    WHERE m.event_day >= ((now() AT TIME ZONE 'UTC')::date - (p_days-1))
    ORDER BY m.event_day DESC,m.total DESC
    LIMIT 10000;
END;
$function$;

-- Auth users, rather than profiles, is the source of truth for account totals.
-- Only numerical aggregates are returned. Admin accounts are not counted as viewers.
CREATE OR REPLACE FUNCTION public.kinolab_admin_user_counts()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=''
AS $function$
DECLARE v jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(
    SELECT 1 FROM cinewave_private.admin_users a WHERE a.user_id=auth.uid()
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';
  END IF;
  SELECT pg_catalog.jsonb_build_object(
    'registered_viewers',count(*) FILTER (WHERE a.user_id IS NULL),
    'confirmed_viewers',count(*) FILTER (WHERE a.user_id IS NULL AND u.email_confirmed_at IS NOT NULL),
    'new_viewers_7d',count(*) FILTER (WHERE a.user_id IS NULL AND u.created_at >= now()-interval '7 days'),
    'all_accounts',count(*)
  ) INTO v
  FROM auth.users AS u
  LEFT JOIN cinewave_private.admin_users AS a ON a.user_id=u.id;
  RETURN v;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.kinolab_record_event(text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.kinolab_get_metrics(integer) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.kinolab_admin_user_counts() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kinolab_record_event(text,text,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kinolab_get_metrics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kinolab_admin_user_counts() TO authenticated;
