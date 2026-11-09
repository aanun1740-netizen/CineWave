import {useEffect,useState} from "react";
import {backendFetch,config} from "../services/backend";
export default function ArchiveSearch({query,language}) {
 const [items,setItems]=useState([]),[state,setState]=useState("idle");
 const labels={
  hy:{heading:"Արխիվի վերնագրեր",tip:"Ներմուծված ռուսերեն վերնագրեր՝ առանց դիտման հղման",more:"Ցուցադրվում են առաջին 40 համընկնումները",loading:"Որոնվում է",empty:"Արխիվում համընկնում չկա"},
  ru:{heading:"Архив названий",tip:"Русские названия из db.json — без ссылок на просмотр",more:"Первые 40 результатов",loading:"Поиск",empty:"Совпадений нет"},
  en:{heading:"Title archive",tip:"Russian titles imported from db.json, without playback links",more:"First 40 matches",loading:"Searching",empty:"No matches"}
 }[language]||{};
 useEffect(()=>{
  let active=true;
  const controller=new AbortController();
  const term=query?.trim()||"";
  if(term.length<2){setItems([]);setState("idle");return;}
  setState("loading");
  const timeout=setTimeout(async()=>{
   try {
    const safe=term.replace(/[%*_,()]/g," ").trim().slice(0,100);
    const url=`${config.url}/rest/v1/kinolab_title_archive?select=source_id,title_ru&title_ru=ilike.*${encodeURIComponent(safe)}*&order=title_ru.asc&limit=40`;
    const response=await backendFetch(url,{headers:{apikey:config.key,Authorization:`Bearer ${config.key}`},signal:controller.signal});
    if(!response.ok) throw Error();
    const data=await response.json();
    if(active){setItems(Array.isArray(data)?data:[]);setState("ready");}
   }catch{if(active){setItems([]);setState("error");}}
  },350);
  return()=>{active=false;clearTimeout(timeout);controller.abort();};
 },[query]);
 if(!query?.trim()||query.trim().length<2)return null;
 return <section className="section archive-search-section" aria-label={labels.heading}>
   <div className="section-head"><div><p className="eyebrow">KINOLAB ARCHIVE</p><h2>{labels.heading}</h2><p className="section-subtitle">{labels.tip}</p></div></div>
   {state==="loading"&&<p role="status">{labels.loading}…</p>}
   {state==="ready"&&<><div className="archive-title-grid">{items.map(x=><article className="archive-title" key={x.source_id}><span className="archive-title-symbol">K</span><div><strong>{x.title_ru}</strong><small>ID {x.source_id} · {language==="hy"?"Տեղեկատվական":language==="ru"?"Каталог":"Catalog only"}</small></div></article>)}</div><p className="section-subtitle">{items.length?labels.more:labels.empty}</p></>}
   {state==="error"&&<p role="status">{language==="hy"?"Արխիվն առայժմ հասանելի չէ":language==="ru"?"Архив недоступен":"Archive unavailable"}</p>}
 </section>;
}
