import { useEffect, useState } from "react";
import { client, config } from "../services/backend";

const words = {
  hy: {
    title: "Այցելությունների վիճակագրություն", period:"Ժամանակահատված",
    days7:"Վերջին 7 օրը",days30:"Վերջին 30 օրը",refresh:"Թարմացնել",
    views:"Էջի բացումներ", opens:"Ֆիլմերի էջերի բացումներ",
    clicks:"«Դիտել» սեղմումներ",top:"Ամենաշատ բացված ֆիլմերը",
    languages:"Ըստ լեզվի",devices:"Ըստ սարքի",daily:"Օրական վիճակագրություն",
    movie:"Ֆիլմ",count:"Բացումներ",date:"Օր",mobile:"Հեռախոս",desktop:"Համակարգիչ",
    loading:"Բեռնում ենք հաշվարկները…",empty:"Դեռ գրանցված տվյալներ չկան",
    missing:"Հաշվիչը դեռ ակտիվ չէ․ նախ կիրառեք թեստային SQL փոփոխությունը և միացրեք հաշվարկը",
    info:"Միայն ընդհանուր քանակներ՝ առանց այցելուների ինքնության, IP-ի կամ որոնման բառերի։ Մեկ մարդը կարող է մի քանի բացում կատարել։ Սրանք եզակի այցելուներ չեն։ Ժամերը՝ UTC։",
    limits:"Արդյունքները մոտավոր են․ ավտոմատացված այցերը կարող են ազդել հաշվիչի վրա։",
  },
  ru: {
    title:"Статистика посещений",period:"Период",days7:"За 7 дней",days30:"За 30 дней",refresh:"Обновить",
    views:"Открытия сайта",opens:"Открытия фильмов",clicks:"Нажатия «Смотреть»",
    top:"Самые открываемые фильмы",languages:"По языкам",devices:"По устройствам",daily:"По дням",
    movie:"Фильм",count:"Открытия",date:"Дата",mobile:"Телефон",desktop:"Компьютер",
    loading:"Загрузка статистики…",empty:"Данных пока нет",
    missing:"Счётчик пока не включён: сначала примените SQL в тестовой базе и включите сбор данных",
    info:"Только суммарные счётчики, без персональных данных, IP или текста поиска. Повторные открытия учитываются. Это не уникальные посетители. Время UTC.",
    limits:"Данные приблизительные: автоматические запросы могут повлиять на счётчики.",
  },
  en: {
    title:"Traffic analytics",period:"Period",days7:"Last 7 days",days30:"Last 30 days",refresh:"Refresh",
    views:"Page loads",opens:"Film details opened",clicks:"Watch clicks",
    top:"Most opened films",languages:"By language",devices:"By device",daily:"Daily activity",
    movie:"Film",count:"Opens",date:"Date",mobile:"Mobile",desktop:"Desktop",
    loading:"Loading aggregates…",empty:"No events recorded yet",
    missing:"Metrics are not active yet: apply the staging SQL migration, then enable collection",
    info:"Aggregate counts only; no visitor identities, IPs or search text. One person may contribute several events. These are not unique visitors. Dates use UTC.",
    limits:"Approximate: automated traffic may affect totals.",
  }
};

export default function AnalyticsDashboard({ language }) {
  const t = words[language] || words.hy;
  const [days, setDays] = useState(30);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState("loading");
  const [records, setRecords] = useState([]);
  const [titles, setTitles] = useState({});

  useEffect(() => {
    if (config.analyticsEnabled !== true) {
      setStatus("disabled");
      return;
    }
    let active = true;
    setStatus("loading");
    async function load() {
      const { data, error } = await client.rpc("kinolab_get_metrics", { p_days: days });
      if (!active) return;
      if (error) {
        setStatus(error.code === "PGRST202" || error.code === "42883" ? "missing" : "error");
        return;
      }
      setRecords(Array.isArray(data) ? data : []);
      setStatus("ready");
      try {
        const { data: films } = await client.from("kinolab_external_catalog")
          .select("id,title_en,title_ru,title_hy").eq("is_published", true).limit(1000);
        if (active && Array.isArray(films)) {
          setTitles(Object.fromEntries(films.map(movie => [
            "catalog:external:" + movie.id,
            movie["title_" + language] || movie.title_en || movie.title_ru || movie.title_hy || "Film " + movie.id,
          ])));
        }
      } catch {
        // Counts remain useful if public display names cannot be loaded.
      }
    }
    load().catch(() => { if(active) setStatus("error"); });
    return () => { active = false; };
  }, [days, version, language]);

  const total = (kind) => records.filter(row => row.event_type === kind)
    .reduce((sum, row) => sum + Number(row.total || 0), 0);
  const countBy = (kind, key) => {
    const result = new Map();
    records.filter(row => row.event_type === kind).forEach(row => {
      const label = String(row[key] || "");
      result.set(label,(result.get(label) || 0) + Number(row.total || 0));
    });
    return [...result.entries()].sort((a,b) => b[1]-a[1]);
  };
  const number = value => Number(value).toLocaleString(language === "hy" ? "hy-AM" : language === "ru" ? "ru-RU" : "en-US");
  const list = (items, name, labels = {}) => <div className="panel">
    <div className="panel-head"><h2>{name}</h2></div>
    <div className="table-wrap"><table><tbody>
      {items.map(([key, value]) => <tr key={key}>
        <td>{labels[key] || key}</td><td style={{textAlign:"right"}}>{number(value)}</td>
      </tr>)}
    </tbody></table></div>
  </div>;
  const movies = countBy("film_open","movie_key")
    .filter(([id]) => id);
  const daily = countBy("page_view","event_day").sort((a,b)=>b[0].localeCompare(a[0]));

  return <section className="analytics-dashboard">
    <div className="panel">
      <div className="panel-head"><h2>{t.title}</h2><p>{t.info}</p></div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
        <label>{t.period}{" "}
          <select value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>{t.days7}</option>
            <option value={30}>{t.days30}</option>
          </select>
        </label>
        <button className="secondary" onClick={() => setVersion(x => x+1)}>{t.refresh}</button>
      </div>
    </div>
    {status !== "ready" ? <p role="status">{status === "loading" ? t.loading : ["missing", "disabled"].includes(status) ? t.missing : status === "error" ? "Metrics unavailable / Վիճակագրությունն անհասանելի է" : ""}</p> : <>
      <div className="stats">
        {[[t.views,total("page_view")],[t.opens,total("film_open")],[t.clicks,total("watch_click")]].map(([label,count]) =>
          <article key={label}><span>{label}</span><strong>{number(count)}</strong></article>)}
      </div>
      {records.length === 0 && <p>{t.empty}</p>}
      {list(movies.map(([id,count]) => [id,count]),t.top,
        Object.fromEntries(movies.map(([id]) => [id,titles[id] || id])))}
      {list(countBy("page_view","language"),t.languages,{hy:"Հայերեն",ru:"Русский",en:"English"})}
      {list(countBy("page_view","device_type"),t.devices,{mobile:t.mobile,desktop:t.desktop})}
      {list(daily,t.daily)}
      <p className="section-subtitle">{t.limits}</p>
    </>}
  </section>;
}
