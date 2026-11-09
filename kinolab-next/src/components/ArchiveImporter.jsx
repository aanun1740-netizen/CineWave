import { useRef, useState } from "react";
import { client } from "../services/backend";
export default function ArchiveImporter({language}) {
  const [status,setStatus]=useState("");
  const [progress,setProgress]=useState({done:0,total:0});
  const running=useRef(false);
  const L={
    hy:{heading:"Վերնագրերի արխիվ · db.json",help:"Ներմուծիր միայն ID-ներն ու ռուսերեն վերնագրերը։ Այս արխիվը չի ավելացնում պաստառ, թարգմանություն կամ դիտման հղում։",pick:"Ընտրել db.json ֆայլը",start:"Ներմուծել արխիվ",error:"Սխալ",done:"Ներմուծումն ավարտված է",working:"Ներմուծվում է"},
    ru:{heading:"Архив названий · db.json",help:"Импортируются только ID и русские названия. Без постеров, переводов и ссылок на просмотр.",pick:"Выберите db.json",start:"Импортировать архив",error:"Ошибка",done:"Импорт завершён",working:"Импортируется"},
    en:{heading:"Title archive · db.json",help:"Imports source IDs and Russian titles only. No artwork, translations or watch links.",pick:"Choose db.json",start:"Import title archive",error:"Error",done:"Import complete",working:"Importing"}
  }[language] || {};
  async function submit(e) {
    e.preventDefault();
    if(running.current) return;
    const file=e.currentTarget.elements.archive.files[0];
    if(!file) return;
    running.current=true;
    setStatus(L.working);
    try {
      if(file.size>30_000_000) throw Error("Maximum file size: 30 MB");
      const json=JSON.parse(await file.text());
      if(!Array.isArray(json?.films)) throw Error("Expected { films: [{id,title}, ...] }");
      const records=json.films.map((r)=>{
        const id=Number(r?.id), title=String(r?.title||"").trim();
        if(!Number.isSafeInteger(id)||id<=0||!title||title.length>300) throw Error("Invalid ID or title");
        return {id,title};
      });
      setProgress({done:0,total:records.length});
      for(let i=0;i<records.length;i+=250){
        const chunk=records.slice(i,i+250);
        const {error}=await client.rpc("kinolab_import_title_batch",{records:chunk});
        if(error) throw error;
        setProgress({done:Math.min(i+250,records.length),total:records.length});
      }
      setStatus(L.done+" · "+records.length);
    } catch(err) {setStatus(L.error+": "+(err?.message||String(err)));}
    finally {running.current=false;}
  }
  return <section className="panel">
    <h2>{L.heading}</h2><p className="hint">{L.help}</p>
    <form onSubmit={submit} className="archive-import-form">
      <label>{L.pick}<input type="file" name="archive" accept=".json,application/json" required /></label>
      <button type="submit" className="primary">{L.start}</button>
    </form>
    <progress max={progress.total||1} value={progress.done} style={{width:"100%",marginTop:18}} />
    <p role="status">{status} {progress.total ? `${progress.done.toLocaleString()} / ${progress.total.toLocaleString()}` : ""}</p>
  </section>;
}
