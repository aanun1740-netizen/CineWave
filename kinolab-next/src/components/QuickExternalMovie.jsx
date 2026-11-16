import { useEffect, useRef, useState } from "react";
import { client } from "../services/backend";
import { allowedExternalMovie, allowedExternalWatch } from "../services/external-links";
import { normalizeAdminWatchInput } from "../services/watch-input";
import { parseCleanSeriesEpisodes } from "../services/clean-series";
import { cleanSeriesErrorMessage } from "../services/clean-series-errors";

const labels = {
  hy: {heading:"Ավելացնել ֆիլմ կամ սերիալ՝ արտաքին հղումով",type:"Տեսակ",movie:"Ֆիլմ",series:"Սերիալ",episodes:"Լրացուցիչ սերիաների հղումներ (յուրաքանչյուր տողում՝ մեկ հղում)",seriesHint:"Առաջին սերիայի հղումը գրիր դիտման դաշտում, իսկ մյուսները՝ այստեղ։ Օգտագործիր նույն սերիալի համար NextEmbed-ի /tv/ID/սեզոն/սերիա հասցեները։",badEpisodes:"Սերիաների հղումները պետք է լինեն նույն սերիալի ճիշտ HTTPS հասցեներ՝ առանց կրկնության (առավելագույնը 200)։", title:"Ֆիլմի անուն", titleRu:"Ռուսերեն անուն (ըստ ցանկության)",titleHy:"Հայերեն անուն (ըստ ցանկության)",genre:"Ժանրեր (ստորակետերով)",year:"Թողարկման տարեթիվ",trailer:"Թրեյլերի հղում (YouTube կամ Vimeo, ըստ ցանկության)",poster:"Նկարի HTTPS հղում",choose:"Ընտրել նկար համակարգչից",uploading:"Նկարը վերբեռնվում է…",uploaded:"Նկարը վերբեռնվեց։ Այժմ կարող ես պահպանել ֆիլմը։",preview:"Ընտրված պաստառ",descriptionEn:"Նկարագրություն՝ անգլերեն (EN)",descriptionRu:"Նկարագրություն՝ ռուսերեն (RU)",descriptionHy:"Նկարագրություն՝ հայերեն (HY)",url:"Դիտման արտաքին հղում",terms:"Հաստատում եմ, որ ստուգել եմ արտաքին կայքի հղումների տարածման պայմանները և այս հղումը թույլատրված է հրապարակել",submit:"Պահպանել և հրապարակել",saving:"Պահպանվում է…",success:"Ֆիլմը պահպանվեց և հրապարակվեց արտաքին հղումով։ Թարմացրու գլխավոր էջը՝ ստուգելու համար։",duplicate:"Այս արտաքին հղումով ֆիլմն արդեն գոյություն ունի։",intro:"Մուտքագրիր ֆիլմի տվյալներն ու արտաքին էջի հասցեն։ «Դիտել» կոճակը նոր ներդիրում կբացի արտաքին կայքը․ KinoLab-ը ֆիլմը չի վերահեռարձակում։", list:"Արտաքին հղումով ավելացված ֆիլմեր", refresh:"Թարմացնել ցանկը", remove:"Ջնջել", hide:"Հեռացնել կայքից", show:"Հրապարակել", confirmDelete:"Վերջնական ջնջե՞լ այս ֆիլմը։", empty:"Արտաքին հղումով ավելացված ֆիլմեր չկան։", deleted:"Ֆիլմը ջնջվեց արտաքին կատալոգից։", hidden:"Ֆիլմը հեռացվեց հանրային կայքից։", shown:"Ֆիլմը կրկին հրապարակվեց։",edit:"Խմբագրել",cancel:"Չեղարկել",saveEdit:"Պահպանել փոփոխությունները",updated:"Ֆիլմի փոփոխությունները պահպանվեցին։",editing:"Խմբագրվում է՝ "},
  ru: {heading:"Добавить фильм или сериал с внешней ссылкой",type:"Тип",movie:"Фильм",series:"Сериал",episodes:"Ссылки на другие серии (по одной на строку)",seriesHint:"Укажите первую серию в поле просмотра, а остальные — здесь. Используйте NextEmbed /tv/ID/сезон/серия для одного сериала.",badEpisodes:"Укажите корректные HTTPS-ссылки серий одного сериала без повторений (максимум 200).",title:"Название",titleRu:"Название по-русски (необязательно)",titleHy:"Название по-армянски (необязательно)",genre:"Жанры (через запятую)",year:"Год выпуска",trailer:"Ссылка на трейлер (YouTube или Vimeo, необязательно)",poster:"HTTPS-ссылка на постер",choose:"Загрузить постер с компьютера",uploading:"Загрузка изображения…",uploaded:"Изображение загружено. Теперь можно сохранить фильм.",preview:"Предпросмотр постера",descriptionEn:"Описание на английском (EN)",descriptionRu:"Описание на русском (RU)",descriptionHy:"Описание на армянском (HY)",url:"Ссылка на внешний просмотр",terms:"Подтверждаю, что проверил условия стороннего сайта и публикация этой ссылки разрешена",submit:"Сохранить и опубликовать",saving:"Сохранение…",success:"Фильм сохранён и опубликован. Обновите главную страницу.",duplicate:"Фильм с этой ссылкой уже есть.",intro:"Сохраните данные и ссылку. «Смотреть» откроет сторонний сайт в новой вкладке; KinoLab не транслирует фильм.", list:"Фильмы с внешними ссылками", refresh:"Обновить список", remove:"Удалить", hide:"Снять с публикации", show:"Опубликовать", confirmDelete:"Удалить этот фильм без возможности восстановления?", empty:"Нет фильмов с внешними ссылками.", deleted:"Фильм удалён из внешнего каталога.", hidden:"Фильм снят с публикации.", shown:"Фильм опубликован.",edit:"Редактировать",cancel:"Отмена",saveEdit:"Сохранить изменения",updated:"Изменения фильма сохранены.",editing:"Редактирование: "},
  en: {heading:"Add a movie or TV series with an external link",type:"Content type",movie:"Movie",series:"TV Show",episodes:"Other episode links (one URL per line)",seriesHint:"Put episode one in the watch URL field and additional episodes below. Use NextEmbed /tv/ID/season/episode for the same series.",badEpisodes:"Use valid HTTPS episode links from the same series, without duplicates (maximum 200).",title:"Title",titleRu:"Russian title (optional)",titleHy:"Armenian title (optional)",genre:"Genres (comma-separated)",year:"Release year",trailer:"Trailer link (YouTube or Vimeo, optional)",poster:"HTTPS poster URL",choose:"Upload poster from computer",uploading:"Uploading image…",uploaded:"Image uploaded. You can now save the movie.",preview:"Poster preview",descriptionEn:"English description (EN)",descriptionRu:"Russian description (RU)",descriptionHy:"Armenian description (HY)",url:"External watch URL",terms:"I checked the external site's linking terms and have permission to publish this link",submit:"Save and publish",saving:"Saving…",success:"Movie saved and published. Refresh the storefront to check.",duplicate:"A movie using this link already exists.",intro:"Enter movie information and the external watch URL. Watch opens the provider in a new tab; KinoLab does not host the movie.", list:"External-link movies", refresh:"Refresh list", remove:"Delete", hide:"Unpublish", show:"Publish", confirmDelete:"Permanently delete this film?", empty:"No external-link movies found.", deleted:"Movie deleted from the external catalog.", hidden:"Movie removed from the public site.", shown:"Movie published.",edit:"Edit",cancel:"Cancel",saveEdit:"Save changes",updated:"Movie changes saved.",editing:"Editing: "}
};
const allowed = allowedExternalWatch;
// Trailers only link to recognized video platforms; they open in a new tab.
function allowedTrailer(raw) {
  try {
    const u=new URL(raw);
    if(u.protocol!=="https:" || u.username || u.password || u.port) return false;
    if(["youtube.com","www.youtube.com","m.youtube.com"].includes(u.hostname)) {
      if(u.pathname==="/watch") return /^[A-Za-z0-9_-]{11}$/.test(u.searchParams.get("v")||"");
      return /^\/(?:embed|shorts|live)\/[A-Za-z0-9_-]{11}\/?$/.test(u.pathname);
    }
    if(u.hostname==="youtu.be") return /^\/[A-Za-z0-9_-]{11}\/?$/.test(u.pathname);
    if(["vimeo.com","www.vimeo.com","player.vimeo.com"].includes(u.hostname))
      return /^\/(?:video\/)?[0-9]+\/?$/.test(u.pathname);
  } catch {}
  return false;
}

export default function QuickExternalMovie({language,onChange,mode="external"}) {
  const t=labels[language] || labels.en;
  const clean = mode === "clean";
  const words = ({
    hy: {
      heading:"Ավելացնել ֆիլմ կամ սերիալ մաքուր փլեյերով",
      intro:"Դիտումը կբացվի KinoLab-ում։ Սերիալն ունի մեկ քարտ և սեզոնի ու սերիայի ընտրություն։",
      list:"Մաքուր փլեյերով ֆիլմեր և սերիալներ", url:"Փլեյերի հղում կամ iframe",
      episodes:"Սերիաների հղումներ",
      episodeHint:"Յուրաքանչյուր սերիա սկսիր նոր տողից՝ սեզոն/սերիա համարով։ Հղումը գրիր նույն տողում կամ համարը գրելուց հետո տեղադրիր iframe կոդը, նույնիսկ եթե այն մի քանի տող է։ Օրինակ՝ 1/1 https://rutube.ru/play/embed/…",
    },
    ru: {
      heading:"Добавить фильм или сериал с чистым плеером",
      intro:"Просмотр откроется в KinoLab. У сериала одна карточка с выбором сезона и серии.",
      list:"Фильмы и сериалы с чистым плеером", url:"Ссылка на плеер или iframe",
      episodes:"Ссылки на серии",
      episodeHint:"Начинайте каждую серию с новой строки: сезон/серия и ссылка на плеер. После номера можно вставить и многострочный iframe. Например: 1/1 https://rutube.ru/play/embed/…",
    },
    en: {
      heading:"Add a movie or series with a clean player",
      intro:"Playback opens in KinoLab. Each series has one card with a season and episode selector.",
      list:"Clean-player movies and series", url:"Player URL or iframe",
      episodes:"Episode links",
      episodeHint:"Start each episode on a new line with season/episode and a player link. You can also paste multiline iframe code after the number. Example: 1/1 https://rutube.ru/play/embed/…",
    }
  })[language] || {};
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  const [posterUrl,setPosterUrl]=useState("");
  const [uploading,setUploading]=useState(false);
  const [externalMovies,setExternalMovies]=useState([]);
  const [listLoading,setListLoading]=useState(false);
  const [editingRow,setEditingRow]=useState(null);
  const [duplicateRow,setDuplicateRow]=useState(null);
  const [mediaType,setMediaType]=useState("movie");
  const cleanSeries = clean && mediaType === "tv";
  const [episodeError, setEpisodeError] = useState(null);
  const formRef=useRef(null);
  async function refreshList() {
    setListLoading(true);
    try {
      const {data,error}=await client.from("kinolab_external_catalog")
        .select("*")
        .order("created_at",{ascending:false}).limit(500);
      if(error)throw error;
      setExternalMovies((data||[]).filter(row => (row.playback_mode === "clean") === clean));
      onChange?.();
    }catch(error){setNotice(error?.message||String(error));}
    finally{setListLoading(false);}
  }
  useEffect(()=>{refreshList();},[]);
  function resetEditor() {
    setEpisodeError(null);
    formRef.current?.reset();
    setPosterUrl("");
    setEditingRow(null);
    setDuplicateRow(null);
    setMediaType("movie");
  }
  function beginEdit(row) {
    if(busy||uploading)return;
    setEpisodeError(null);
    const form=formRef.current;
    if(!form)return;
    for(const name of ["title_en","title_ru","title_hy","overview_en","overview_ru","overview_hy","external_watch_url","trailer_url"]) {
      form.elements.namedItem(name).value = row[name] || "";
    }
    form.elements.namedItem("genres").value=Array.isArray(row.genre_names)?row.genre_names.join(", "):"";
    const year=String(row.release_date||"").slice(0,4);
    form.elements.namedItem("year").value=year?Number(year):"";
    form.elements.namedItem("terms_confirmed").checked=Boolean(row.terms_confirmed);
    const type=row.media_type==="tv" ? "tv" : "movie";
    form.elements.namedItem("media_type").value=type;
    setMediaType(type);
    const episodes = Array.isArray(row.episode_links) ? row.episode_links : [];
    form.elements.namedItem("episode_urls").value = clean
      ? episodes.map(item => item.season + "/" + item.episode + " " + item.url).join("\n")
      : episodes.map(item => item.url).filter(url => url && url !== row.external_watch_url).join("\n");
    setPosterUrl(row.poster_path||"");
    setDuplicateRow(null);
    setEditingRow({id:row.id,is_published:row.is_published,release_date:row.release_date});
    setNotice("");
    form.scrollIntoView({behavior:"smooth",block:"start"});
    form.elements.namedItem("title_en").focus({preventScroll:true});
  }
  async function changeListing(row,remove) {
    if(busy||uploading)return;
    if(remove && !window.confirm(t.confirmDelete+"\\n"+(row.title_en||"ID "+row.id)))return;
    setBusy(true);
    try {
      if(remove){
        const {data,error}=await client.from("kinolab_external_catalog")
          .delete().eq("id",row.id).select("id");
        if(error)throw error;
        if(!data?.length)throw Error("Nothing was deleted; check administrator access.");
        setNotice(t.deleted);
      } else {
        const {data,error}=await client.from("kinolab_external_catalog")
          .update({is_published:!row.is_published}).eq("id",row.id).select("id");
        if(error)throw error;
        if(!data?.length)throw Error("No record updated; check administrator access.");
        setNotice(row.is_published?t.hidden:t.shown);
      }
      await refreshList();
    } catch(error){setNotice(error?.message||String(error));}
    finally{setBusy(false);}
  }

  async function uploadPoster(event) {
    const input=event.currentTarget;
    const file=input.files?.[0];
    if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size===0 || file.size>8*1024*1024) {
      setNotice(({hy:"Ընտրիր JPG, PNG կամ WebP նկար՝ մինչև 8 ՄԲ։",ru:"Выберите JPG, PNG или WebP до 8 МБ.",en:"Choose a JPG, PNG or WebP image, up to 8 MB."}[language]));
      input.value="";return;
    }
    setUploading(true);setNotice(t.uploading);
    try {
      const {data:{user},error:authError}=await client.auth.getUser();
      if(authError || !user)throw Error("Sign in to KinoLab Studio before uploading.");
      const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type];
      const path=user.id+"/"+crypto.randomUUID()+"."+extension;
      const {error}=await client.storage.from("cinewave-assets").upload(path,file,{contentType:file.type,cacheControl:"3600",upsert:false});
      if(error)throw error;
      const {data}=client.storage.from("cinewave-assets").getPublicUrl(path);
      if(!data?.publicUrl)throw Error("Could not obtain image URL.");
      setPosterUrl(data.publicUrl);setNotice(t.uploaded);
    }catch(error){setNotice(error?.message||String(error))}
    finally{setUploading(false);input.value="";}
  }

  function readCleanEpisodes(form) {
    const input = form.elements.namedItem("episode_urls");
    const { episodes, error } = parseCleanSeriesEpisodes(input.value);
    setEpisodeError(error || null);
    if (error) {
      setNotice("");
      input.focus();
      if (error.start !== undefined) input.setSelectionRange(error.start, error.end);
    }
    return episodes;
  }

  function testFirstEpisode() {
    const episodes = readCleanEpisodes(formRef.current);
    if (episodes) window.open(episodes[0].url, "_blank", "noopener,noreferrer");
  }

  async function submit(event) {
    event.preventDefault();
    if(busy || uploading) return;
    const form=event.currentTarget;
    const v=Object.fromEntries(new FormData(form).entries());
    const rawUrl=String(v.external_watch_url||"").trim();
    const type=v.media_type==="tv" ? "tv" : "movie";
    let episodeLinks = cleanSeries ? readCleanEpisodes(form) : [];
    if (!episodeLinks) return;
    const url=cleanSeries ? episodeLinks[0].url : normalizeAdminWatchInput(rawUrl, mode);
    if (!url) {
      setNotice(({hy:"Ներդրվող փլեյերի հասցեն չի ճանաչվել։ Օգտագործիր պաշտոնական embed հղում կամ iframe կոդ։",ru:"Не удалось распознать встроенный плеер. Используйте корректный embed URL или iframe.",en:"Unsupported embed link. Paste an official player URL or iframe."}[language]));
      return;
    }
    const trailer=String(v.trailer_url||"").trim();
    if(type==="tv" && !clean) {
      const extra=String(v.episode_urls||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      const urls=[url,...extra];
      const matches=urls.map(link=>link.match(/^https:\/\/api\.nextembed\.ws\/embed\/tv\/(\d+)\/(\d+)\/(\d+)\/?$/));
      const ids=matches.filter(Boolean).map(m=>m[1]);
      const duplicate=new Set(urls).size!==urls.length;
      if(urls.length>200 || duplicate || matches.some(m=>!m) || new Set(ids).size!==1 ||
        matches.some(m=>Number(m[2])<1||Number(m[3])<1)) {
        setNotice(t.badEpisodes);return;
      }
      episodeLinks=matches.map((m,i)=>({season:Number(m[2]),episode:Number(m[3]),url:urls[i]}))
        .sort((a,b)=>a.season-b.season||a.episode-b.episode);
      if(new Set(episodeLinks.map(x=>x.season+":"+x.episode)).size!==episodeLinks.length){
        setNotice(t.badEpisodes);return;
      }
    } else if(!allowedExternalMovie(url)){
      setNotice(({hy:"Ֆիլմը հրապարակելու համար օգտագործիր ճիշտ https:// հղում։",ru:"Для публикации фильма укажите действительную ссылку https://.",en:"Use a valid https:// movie link to publish."}[language]));return;
    }
    if(trailer && !allowedTrailer(trailer)) {
      setNotice(({hy:"Թրեյլերի համար օգտագործիր YouTube-ի կամ Vimeo-ի ճիշտ HTTPS հղում։",ru:"Для трейлера укажите корректную HTTPS-ссылку YouTube или Vimeo.",en:"Use a valid HTTPS YouTube or Vimeo trailer link."}[language]));return;
    }
    if(!allowed(url)){setNotice(({hy:"Գրիր ճիշտ HTTPS դիտման հղում։",ru:"Укажите правильную HTTPS-ссылку для просмотра.",en:"Enter a valid HTTPS watch link."}[language]));return;}
    if(!form.elements.terms_confirmed.checked){setNotice(t.terms);return;}
    const year=Number(v.year);
    if(!/^\d{4}$/.test(String(v.year||""))||!Number.isInteger(year)||year<1888||year>2100){
      setNotice(({hy:"Գրիր ճիշտ տարեթիվ (1888–2100)։",ru:"Введите правильный год (1888–2100).",en:"Enter a valid year (1888–2100)."}[language]));return;
    }
    // The database column remains DATE. New movies use January 1 as a
    // storage placeholder; editing an unchanged year preserves the old date.
    const original=editingRow?.release_date||"";
    const date=original.startsWith(String(year)+"-") ? original : year+"-01-01";
    setBusy(true);setDuplicateRow(null);setNotice(t.saving);
    try {
      const payload={
        title_en:String(v.title_en||"").trim(),
        title_ru:String(v.title_ru||"").trim()||null,
        title_hy:String(v.title_hy||"").trim()||null,
        overview_en:String(v.overview_en||"").trim()||null,
        overview_ru:String(v.overview_ru||"").trim()||null,
        overview_hy:String(v.overview_hy||"").trim()||null,
        release_date:date,
        media_type:type,
        episode_links:episodeLinks,
        genre_names:String(v.genres||"").split(",").map(x=>x.trim()).filter(Boolean),
        poster_path:posterUrl.trim()||null,
        trailer_url:trailer||null,
        external_watch_url:url,
        playback_mode:clean ? "clean" : "external",
        terms_confirmed:true,
        is_published:editingRow ? editingRow.is_published : true
      };
      const result=editingRow
        ? await client.from("kinolab_external_catalog").update(payload).eq("id",editingRow.id).select("id")
        : await client.from("kinolab_external_catalog").insert(payload).select("id");
      if(result.error) {
        if(result.error.code==="23505" && !editingRow) {
          // The link is unique. Never overwrite another film automatically:
          // a user may have entered a different film with an already-used URL.
          const { data: existing, error: lookupError } = await client
            .from("kinolab_external_catalog").select("*")
            .eq("external_watch_url", url).maybeSingle();
          if(!lookupError && existing && (existing.playback_mode === "clean") === clean) {
            setDuplicateRow(existing);
          }
          throw Error(t.duplicate);
        }
        if(result.error.code==="23505") throw Error(t.duplicate);
        throw result.error;
      }
      if(!result.data?.length)throw Error("No record was saved. Check your administrator access.");
      resetEditor();
      setNotice(editingRow?t.updated:cleanSeries
        ? ({hy:"Սերիալը պահպանվեց և հրապարակվեց։",ru:"Сериал сохранён и опубликован.",en:"Series saved and published."}[language])
        : t.success);
      await refreshList();
    } catch(error) {setNotice(error?.message||String(error));}
    finally {setBusy(false);}
  }
  return <section className="panel quick-external">
    <h2>{clean ? words.heading : t.heading}</h2><p className="hint">{clean ? words.intro : t.intro}</p>
    {editingRow && <p className="hint" role="status">{t.editing} ID {editingRow.id}</p>}
    {notice && <p className="hint" role="alert" aria-live="polite" style={{color:"#f4b77e",padding:"10px 0"}}>{notice}</p>}
    {duplicateRow && !editingRow && <div className="panel" role="status" style={{padding:14,marginBottom:12}}>
      <strong>{({hy:"Այս հղումն արդեն օգտագործվում է՝",ru:"Эта ссылка уже используется:",en:"This link belongs to an existing entry:"}[language])}</strong>
      <p>{duplicateRow.title_en || duplicateRow.title_ru || duplicateRow.title_hy} (ID {duplicateRow.id})</p>
      <p className="hint">{({hy:"Ստուգիր՝ սա նույն ֆիլմն է՞։ Եթե այլ ֆիլմ է, ուղղիր դիտման հղումը։ Եթե նույնն է, խմբագրիր եղած գրառումը՝ կրկնօրինակ չստեղծելով։",ru:"Проверьте, тот ли это фильм. Для другого фильма исправьте ссылку. Для того же фильма отредактируйте существующую запись.",en:"Check whether this is the same film. If not, correct the Watch URL. If yes, edit the existing record instead of creating a duplicate."}[language])}</p>
      <button className="secondary" type="button" disabled={busy||uploading} onClick={()=>beginEdit(duplicateRow)}>
        {({hy:"Բացել գոյություն ունեցող ֆիլմը խմբագրման համար",ru:"Редактировать существующий фильм",en:"Edit existing film"}[language])}
      </button>
    </div>}
    <form ref={formRef} onSubmit={submit} onInvalidCapture={(e)=>{const name=e.target.closest("label")?.innerText?.trim()||e.target.name||"field";setNotice(({hy:"Լրացրու կամ ուղղիր պարտադիր դաշտը՝ ",ru:"Заполните или исправьте поле: ",en:"Complete or correct this field: "}[language])+name.slice(0,85));}}>
      <div className="form-grid">
        <label>{t.type}
          <select name="media_type" value={mediaType} onChange={e=>{setMediaType(e.target.value);setEpisodeError(null);}}>
            <option value="movie">{t.movie}</option>
            <option value="tv">{t.series}</option>
          </select>
        </label>
        <label>{t.title}<input name="title_en" required maxLength="250"/></label>
        <label>{t.titleRu}<input name="title_ru" maxLength="250"/></label>
        <label>{t.titleHy}<input name="title_hy" maxLength="250"/></label>
        <label>{t.genre}<input name="genres" placeholder="Drama, Comedy"/></label>
        <label>{t.year}
          <input name="year" type="number" min="1888" max="2100" step="1" placeholder="2026" aria-label={t.year} required/>
        </label>
        <label>{t.poster}
          <input name="poster_path" type="url" placeholder="https://..." value={posterUrl} onChange={e=>setPosterUrl(e.target.value)}/>
          <span>{t.choose}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPoster} disabled={busy||uploading}/>
          {posterUrl.startsWith("https://") && <img src={posterUrl} alt={t.preview} loading="lazy" style={{width:110,height:165,objectFit:"cover",borderRadius:8}}/>}
        </label>
        <label>{t.descriptionEn}<textarea name="overview_en" rows="4" lang="en" placeholder="English"/></label>
        <label>{t.descriptionRu}<textarea name="overview_ru" rows="4" lang="ru" placeholder="Русский"/></label>
        <label>{t.descriptionHy}<textarea name="overview_hy" rows="4" lang="hy" placeholder="Հայերեն"/></label>
        <label hidden={cleanSeries}>{clean ? words.url : t.url}<input name="external_watch_url" type="text" required={!cleanSeries} disabled={cleanSeries} maxLength={4096} autoComplete="off" spellCheck={false}
            onBlur={event=>{const normalized=normalizeAdminWatchInput(event.currentTarget.value, mode);if(normalized)event.currentTarget.value=normalized;}}
            placeholder={clean ? "https://vkvideo.ru/video-123_456" : mediaType==="tv"?"https://api.nextembed.ws/embed/tv/12345/1/1":"https://example.com/watch/film"}/>
          {!clean && <small className="hint">{({hy:"Կարող ես տեղադրել սովորական HTTPS հղում կամ աջակցվող հարթակի iframe կոդ։ Կոդից ավտոմատ կվերցվի վիդեոյի հասցեն։ KinoLab-ի առանձին փլեյերի համար օգտագործիր «Մաքուր փլեյերով ֆիլմ» բաժինը։",ru:"Вставьте HTTPS-ссылку или iframe-код поддерживаемого плеера: адрес видео извлечётся автоматически. Для просмотра внутри KinoLab используйте раздел «Фильм с чистым плеером».",en:"Paste a normal HTTPS link or supported player iframe code; KinoLab will extract the video URL. For playback inside KinoLab, use the separate Clean player movie section."}[language])}</small>}
          {clean && <small className="hint">{({hy:"Կարող ես տեղադրել VK Video, RUTUBE, OK, YouTube, Vimeo, Dailymotion, Internet Archive կամ NextEmbed-ի հղումը/iframe-ը։ Փլեյերի ներսի ապրանքանշանները մնում են աղբյուրի վերահսկողության տակ։",ru:"Поддерживаются VK Video, RUTUBE, OK, YouTube, Vimeo, Dailymotion, Internet Archive и NextEmbed (ссылка или iframe). Логотип внутри плеера контролируется провайдером.",en:"Supports VK Video, RUTUBE, OK, YouTube, Vimeo, Dailymotion, Internet Archive, NextEmbed URLs or iframe snippets. Provider player branding cannot be hidden."}[language])}</small>}
        </label>
        <label hidden={mediaType!=="tv"} style={cleanSeries ? {gridColumn:"1 / -1"} : undefined}>{clean ? words.episodes : t.episodes}
          <textarea name="episode_urls" rows="5" placeholder={clean ? "1/1 https://…\n1/2 https://…" : "https://api.nextembed.ws/embed/tv/12345/1/2\nhttps://api.nextembed.ws/embed/tv/12345/1/3"} disabled={mediaType!=="tv"} required={cleanSeries}
            aria-invalid={cleanSeries && episodeError ? true : undefined}
            aria-describedby={cleanSeries && episodeError ? "episode-error" : undefined}
            onChange={() => setEpisodeError(null)}/>
          <small className="hint">{clean ? words.episodeHint : t.seriesHint}</small>
          {cleanSeries && episodeError && <small id="episode-error" role="alert" style={{color:"#f4b77e"}}>
            {cleanSeriesErrorMessage(language, episodeError)}
          </small>}
        </label>
        <label>{t.trailer}<input name="trailer_url" type="url" maxLength="2048" placeholder="https://www.youtube.com/watch?v=..."/></label>
      </div>
      <label className="check"><input name="terms_confirmed" type="checkbox" required />{t.terms}</label>
      <div className="form-actions">
        <button type="submit" className="primary" disabled={busy||uploading}>{busy?t.saving:uploading?t.uploading:editingRow?t.saveEdit:t.submit}</button>
        {editingRow && <button type="button" className="secondary" onClick={resetEditor} disabled={busy||uploading}>{t.cancel}</button>}
        {!cleanSeries && <button type="button" className="secondary" onClick={()=>{const input=formRef.current?.elements.namedItem("external_watch_url");const url=normalizeAdminWatchInput(input?.value?.trim(),mode);if(url && allowed(url)){input.value=url;window.open(url,"_blank","noopener,noreferrer");}else setNotice(({hy:"Մուտքագրիր ճիշտ HTTPS հղում կամ աջակցվող iframe կոդ։",ru:"Укажите корректный HTTPS URL или поддерживаемый iframe-код.",en:"Enter a valid HTTPS URL or supported iframe code."}[language]));}}>{({hy:"Փորձարկել հղումը",ru:"Проверить ссылку",en:"Test link"}[language])}</button>}
        {cleanSeries && <button type="button" className="secondary" onClick={testFirstEpisode}>{({hy:"Փորձարկել առաջին սերիան",ru:"Проверить первую серию",en:"Test first episode"}[language])}</button>}
      </div>
    </form>
    <div style={{marginTop:28,borderTop:"1px solid #ffffff22",paddingTop:20}}>
      <div className="panel-head"><h2>{clean ? words.list : t.list} ({externalMovies.length})</h2>
      <button type="button" className="secondary" onClick={refreshList} disabled={listLoading||busy}>{t.refresh}</button></div>
      {externalMovies.length===0 && !listLoading && <p className="hint">{t.empty}</p>}
      <div className="table-wrap"><table style={{minWidth:550}}><thead><tr><th>ID</th><th>{t.title}</th><th>{t.type}</th><th>URL</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {externalMovies.map(row=><tr key={row.id}>
          <td>{row.id}</td><td>{row.title_hy||row.title_ru||row.title_en}</td><td>{row.media_type==="tv"?t.series:t.movie}</td>
          <td><a href={row.external_watch_url} target="_blank" rel="noopener noreferrer">{row.external_watch_url?.split("/").slice(-1)[0]}</a></td>
          <td>{row.is_published?"Published":"Hidden"}</td>
          <td><div className="row-actions">
            <button className="secondary" type="button" disabled={busy||uploading} onClick={()=>beginEdit(row)}>{t.edit}</button>
            <button className="secondary" type="button" disabled={busy} onClick={()=>changeListing(row,false)}>{row.is_published?t.hide:t.show}</button>
            <button className="secondary" type="button" disabled={busy} onClick={()=>changeListing(row,true)}>{t.remove}</button>
          </div></td>
        </tr>)}
      </tbody></table></div>
    </div>
  </section>;
}
