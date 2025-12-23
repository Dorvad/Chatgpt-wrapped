/* ChatGPT Wrapped — single-file app (no frameworks) */

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const state = {
  mode: "memory",          // memory | data
  dataset: null,           // normalized dataset used by renderer
  importStats: { conv: 0, msg: 0 }
};

function toast(msg){
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>el.classList.remove("show"), 1600);
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function formatDateRange(){
  // Best effort: last 12 months relative label. We avoid claiming exact dates here.
  return "Dor · 12 החודשים האחרונים · Wrapped";
}

function safeText(x){
  if (x == null) return "";
  return String(x);
}

/* ---------------------------
   Panel reveal animations
---------------------------- */
function setupReveal(){
  $$("[data-panel]").forEach(panel=>{
    panel.querySelectorAll(".card, .theme, .tnode, .moment").forEach(el=>{
      el.setAttribute("data-reveal","1");
    });
  });

  const obs = new IntersectionObserver((entries)=>{
    for (const e of entries){
      if (e.isIntersecting){
        e.target.classList.add("on");
        // Trigger bars once themes are visible
        if (e.target.id === "themesGrid") animateThemeBars();
      }
    }
  }, { threshold: 0.18 });

  $$("[data-reveal]").forEach(el=>obs.observe(el));
}

/* ---------------------------
   Donut chart (canvas)
---------------------------- */
function drawDonut(items){
  const canvas = $("#donutCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2;
  ctx.clearRect(0,0,W,H);

  const total = items.reduce((a,x)=>a + x.value, 0) || 1;

  // Soft background ring
  ctx.beginPath();
  ctx.arc(cx, cy, 200, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(255,255,255,.10)";
  ctx.lineWidth = 46;
  ctx.stroke();

  // Segments: we don’t set fixed colors; we vary by HSL dynamically.
  let start = -Math.PI/2;
  items.forEach((it, i)=>{
    const frac = it.value / total;
    const end = start + frac * Math.PI*2;

    const hue = (i*70 + 260) % 360;
    ctx.beginPath();
    ctx.arc(cx, cy, 200, start, end);
    ctx.strokeStyle = `hsla(${hue}, 92%, 70%, .92)`;
    ctx.lineWidth = 46;
    ctx.lineCap = "round";
    ctx.stroke();

    start = end;
  });

  // Inner hole
  ctx.beginPath();
  ctx.arc(cx, cy, 160, 0, Math.PI*2);
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.fill();
}

function animateThemeBars(){
  const bars = $$("#themesGrid .theme-bar > span");
  bars.forEach(span=>{
    const target = Number(span.dataset.w || 0);
    span.style.width = `${clamp(target, 0, 100)}%`;
  });
}

/* ---------------------------
   Rendering
---------------------------- */
function render(ds){
  state.dataset = ds;

  $("#brandSub").textContent = formatDateRange();
  $("#badgeRange").textContent = ds.meta.rangeLabel || "12 חודשים אחרונים";
  $("#heroLine").textContent = ds.hero.heroLine;

  $("#statStyle").textContent = ds.hero.topStats.style.value;
  $("#statStyleSub").textContent = ds.hero.topStats.style.sub;

  $("#statLang").textContent = ds.hero.topStats.languages.value;
  $("#statLangSub").textContent = ds.hero.topStats.languages.sub;

  $("#statSig").textContent = ds.hero.topStats.signature.value;
  $("#statSigSub").textContent = ds.hero.topStats.signature.sub;

  $("#themesSubtitle").textContent = ds.themes.subtitle;

  // Themes grid
  const themesGrid = $("#themesGrid");
  themesGrid.innerHTML = "";
  ds.themes.top5.forEach((t, idx)=>{
    const el = document.createElement("div");
    el.className = "theme";
    el.innerHTML = `
      <div class="theme-title">${safeText(t.title)}</div>
      <div class="theme-sub">${safeText(t.sub)}</div>
      <div class="theme-bar" aria-hidden="true"><span data-w="${t.weight}"></span></div>
      <div class="theme-sub" style="margin-top:10px; opacity:.9">
        <b>היילייט:</b> ${safeText(t.highlight)}
      </div>
    `;
    themesGrid.appendChild(el);
  });

  // Donut
  drawDonut(ds.themes.donut);
  $("#donutBig").textContent = "100%";

  // Vibe
  const vibeBox = $("#vibeBox");
  vibeBox.innerHTML = "";
  ds.themes.vibe.forEach(v=>{
    const line = document.createElement("div");
    line.className = "vibe-line";
    line.innerHTML = `
      <div class="vibe-title">${safeText(v.title)}</div>
      <div class="vibe-desc">${safeText(v.desc)}</div>
    `;
    vibeBox.appendChild(line);
  });

  // Microstats
  const micro = $("#microStats");
  micro.innerHTML = "";
  ds.themes.microStats.forEach(m=>{
    const el = document.createElement("div");
    el.className = "micro";
    el.innerHTML = `<div class="k">${safeText(m.k)}</div><div class="v">${safeText(m.v)}</div>`;
    micro.appendChild(el);
  });

  // Timeline
  const tl = $("#timeline");
  tl.innerHTML = "";
  ds.projects.timeline.forEach(n=>{
    const el = document.createElement("div");
    el.className = "tnode";
    el.innerHTML = `
      <div class="tdate">${safeText(n.date)}</div>
      <div class="tbody">
        <div class="ttitle">${safeText(n.title)}</div>
        <div class="tdesc">${safeText(n.desc)}</div>
      </div>
    `;
    tl.appendChild(el);
  });

  // Projects list
  const pl = $("#projectsList");
  pl.innerHTML = "";
  ds.projects.list.forEach(it=>{
    const el = document.createElement("div");
    el.className = "li";
    el.innerHTML = `<div class="t">${safeText(it.t)}</div><div class="s">${safeText(it.s)}</div>`;
    pl.appendChild(el);
  });

  // Tools chips
  const tools = $("#chipsTools");
  tools.innerHTML = "";
  ds.projects.tools.forEach(t=>{
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = t;
    tools.appendChild(chip);
  });

  // Voice cards
  const vc = $("#voiceCards");
  vc.innerHTML = "";
  ds.voice.cards.forEach(c=>{
    const el = document.createElement("div");
    el.className = "vcard";
    el.innerHTML = `<div class="t">${safeText(c.t)}</div><div class="s">${safeText(c.s)}</div>`;
    vc.appendChild(el);
  });

  // Word cloud
  const wc = $("#wordCloud");
  wc.innerHTML = "";
  ds.voice.words
    .slice()
    .sort((a,b)=>b.s - a.s)
    .forEach((w, i)=>{
      const el = document.createElement("div");
      el.className = "word";
      const size = clamp(12 + w.s * 2, 12, 26);
      el.innerHTML = `<b style="font-size:${size}px">${safeText(w.w)}</b>`;
      wc.appendChild(el);
      setTimeout(()=>el.classList.add("show"), 40 + i*35);
    });

  // Moments
  const mm = $("#moments");
  mm.innerHTML = "";
  ds.voice.moments.forEach(m=>{
    const el = document.createElement("div");
    el.className = "moment";
    el.innerHTML = `<div class="t">${safeText(m.t)}</div><div class="s">${safeText(m.s)}</div>`;
    mm.appendChild(el);
  });

  // Import help
  $("#importHelp").textContent = ds.importHelp?.text || "";

  // Mode label + counts
  $("#modeLabel").textContent = state.mode === "memory" ? "Memory Mode" : "Data Mode";
  $("#convCount").textContent = state.importStats.conv ? String(state.importStats.conv) : "—";
  $("#msgCount").textContent = state.importStats.msg ? String(state.importStats.msg) : "—";

  // Mark reveal ready
  setupReveal();
  animateThemeBars();
}

/* ---------------------------
   Import / normalize JSON (best-effort)
---------------------------- */
function extractTexts(anyJson){
  const texts = [];

  const seen = new Set();

  function pushText(x){
    const t = (typeof x === "string") ? x : null;
    if (!t) return;
    const key = t.slice(0, 220);
    if (seen.has(key)) return;
    seen.add(key);
    if (t.trim().length >= 2) texts.push(t);
  }

  function walk(node, depth=0){
    if (node == null || depth > 18) return;

    if (typeof node === "string"){
      pushText(node);
      return;
    }
    if (typeof node !== "object") return;

    // Common fields
    for (const k of ["text","content","message","messages","parts","body","prompt","completion","title"]){
      if (k in node){
        const v = node[k];
        if (typeof v === "string") pushText(v);
      }
    }

    // Arrays
    if (Array.isArray(node)){
      node.forEach(x=>walk(x, depth+1));
      return;
    }

    // Objects: walk values
    Object.values(node).forEach(v=>walk(v, depth+1));
  }

  walk(anyJson);
  return texts;
}

function categorizeText(text){
  const t = text.toLowerCase();

  const rules = [
    { key:"מוצר/UX", test: () => /ux|dashboard|דשבורד|mermaid|github|wireframe|prototype|react|tailwind|app/.test(t) },
    { key:"הדרכה/תוכן", test: () => /שליח|סדנה|הדרכה|training|workshop|e-?learning|aliyah|סוכנות/.test(t) },
    { key:"AI יצירתי", test: () => /suno|elevenlabs|lyrics|פרומפט|prompt|טקסט להלחנה|music|שיר/.test(t) },
    { key:"כתיבה", test: () => /cover letter|מכתב|וואטסאפ|message|ניסוח|rewrite|humanize|תסריט/.test(t) },
    { key:"לייף", test: () => /soap|סבון|usb|מתאם|טכנאי|מזגן|roller coaster|dumpling|כינקלי/.test(t) },
  ];

  for (const r of rules){
    if (r.test()) return r.key;
  }
  return "אחר";
}

function buildDatasetFromTexts(texts){
  const counts = new Map();
  const wordCounts = new Map();

  const topics = ["מוצר/UX","הדרכה/תוכן","AI יצירתי","כתיבה","לייף","אחר"];
  topics.forEach(k=>counts.set(k,0));

  let msgCount = 0;

  const topWordsStop = new Set([
    "the","and","with","that","this","you","your","for","are","was","have","from",
    "אני","אתה","את","זה","של","עם","על","מה","איך","כן","לא","יותר","כל","כמו",
    "to","in","of","a","an","it","is","be","as","at","or"
  ]);

  for (const tx of texts){
    msgCount++;
    const cat = categorizeText(tx);
    counts.set(cat, (counts.get(cat)||0) + 1);

    // crude words
    const words = tx
      .replace(/[^\p{L}\p{N}\s]/gu," ")
      .split(/\s+/)
      .map(w=>w.trim())
      .filter(Boolean)
      .filter(w=>w.length >= 3)
      .filter(w=>!topWordsStop.has(w.toLowerCase()));

    for (const w of words){
      const key = w;
      wordCounts.set(key, (wordCounts.get(key)||0) + 1);
    }
  }

  // Build top5 themes by frequency (map to percent)
  const pairs = Array.from(counts.entries())
    .filter(([k])=>k!=="אחר")
    .sort((a,b)=>b[1]-a[1]);

  const total = pairs.reduce((a,[,v])=>a+v,0) || 1;
  const top5 = pairs.slice(0,5).map(([k,v])=>{
    const pct = Math.round((v/total)*100);
    const expl = ({
      "מוצר/UX": "דשבורדים, GitHub Pages, זרימות, אפליקציות",
      "הדרכה/תוכן": "הכשרות, סדנאות, תוכן לשליחים",
      "AI יצירתי": "Suno/ElevenLabs, פרומפטים, מוזיקה",
      "כתיבה": "ניסוחים, מכתבים, תסריטים",
      "לייף": "גאדג׳טים, ניקיון, שאלות יומיומיות"
    })[k] || "";
    return { title:k, sub: expl, weight: pct, highlight: "מחושב מתוך הקובץ שהעלית" };
  });

  // Normalize to 100% (adjust last)
  const sum = top5.reduce((a,x)=>a + x.weight,0);
  if (top5.length && sum !== 100){
    top5[top5.length-1].weight += (100 - sum);
  }

  const donut = top5.map(x=>({label:x.title, value:x.weight}));

  // Top words
  const topWords = Array.from(wordCounts.entries())
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 18)
    .map(([w,s])=>({w, s: clamp(s, 1, 8)}));

  // Build a dataset with “data-derived” hero stats
  const ds = structuredClone(window.WRAPPED_MEMORY);
  ds.meta.mode = "data";
  ds.meta.rangeLabel = "הקובץ שהעלית (טווח לפי הדאטה)";
  ds.meta.disclaimer = "המסך הזה מחושב מתוך ה-JSON שהעלית (best-effort).";

  ds.hero.heroLine =
    "ה־Wrapped הזה מחושב מתוך הקובץ שהעלית: חלוקה לנושאים, מילים חוזרות, ותבניות שיחה. (הכל עובר מקומית בדפדפן.)";

  ds.hero.topStats.style.value = "Data-driven";
  ds.hero.topStats.style.sub = "סטטיסטיקות מתוך JSON שהעלית";

  ds.hero.topStats.languages.value = "משתנה";
  ds.hero.topStats.languages.sub = "אפשר לשפר זיהוי שפה לפי הצורך";

  ds.hero.topStats.signature.value = "Patterns";
  ds.hero.topStats.signature.sub = "חלוקה לנושאים + מילים חוזרות";

  ds.themes.subtitle = "מחושב מתוך הקובץ שהעלית (best-effort classification).";
  ds.themes.top5 = top5;
  ds.themes.donut = donut;

  ds.voice.words = topWords;

  // Update counts for status (rough)
  state.importStats.msg = msgCount;

  return ds;
}

/* ---------------------------
   Snapshot download (PNG)
   Minimal: uses built-in API (no external libs)
---------------------------- */
async function downloadSnapshot(){
  // We avoid heavy libs; simplest approach: "print" fallback.
  toast("טיפ: שמירה מלאה כ-תמונה דורשת ספרייה. כרגע: השתמש ב-Print → Save as PDF 🙂");
  window.print();
}

/* ---------------------------
   Wire UI events
---------------------------- */
function scrollToNext(){
  const panels = $$("[data-panel]");
  const y = window.scrollY;
  const next = panels.find(p => p.offsetTop > y + 20);
  if (next) next.scrollIntoView({behavior:"smooth", block:"start"});
}

function setMode(mode){
  state.mode = mode;
  if (mode === "memory"){
    state.importStats = { conv: 0, msg: 0 };
    render(structuredClone(window.WRAPPED_MEMORY));
    toast("Memory Mode פעיל");
  } else {
    toast("Data Mode: העלה JSON כדי לחשב");
    // Keep current until upload
    $("#modeLabel").textContent = "Data Mode";
  }
}

function copyShare(){
  const url = location.href;
  navigator.clipboard?.writeText(url).then(()=>{
    toast("לינק הועתק ✅");
  }).catch(()=>{
    toast("לא הצלחתי להעתיק. אפשר להעתיק ידנית משורת הכתובת.");
  });
}

function loadDemoData(){
  // Small demo similar to import:
  const demo = {
    conversations: [
      { title:"demo", messages:[
        { role:"user", content:"תיצור לי דשבורד בgithub pages עם אנימציות" },
        { role:"user", content:"תן לי פרומפט לSuno בלי תופים רק קלידים" },
        { role:"user", content:"כתוב לי הודעת וואטסאפ יותר טובה" },
        { role:"user", content:"Mermaid diagram ל-KAMALA" },
        { role:"user", content:"איך מגבים ל-USB מהטאבלט" },
      ]}
    ]
  };
  const texts = extractTexts(demo);
  state.importStats.conv = 1;
  const ds = buildDatasetFromTexts(texts);
  state.mode = "data";
  render(ds);
  toast("דמו נטען ✅");
}

function resetAll(){
  setMode("memory");
  $("#fileInput").value = "";
  toast("אופס — חזרנו לזיכרון 🙂");
}

/* ---------------------------
   Init
---------------------------- */
function init(){
  render(structuredClone(window.WRAPPED_MEMORY));

  $("#btnStart").addEventListener("click", scrollToNext);
  $("#btnDownload").addEventListener("click", downloadSnapshot);
  $("#btnShare").addEventListener("click", copyShare);

  $("#btnMemoryMode").addEventListener("click", ()=>setMode("memory"));
  $("#btnDataMode").addEventListener("click", ()=>{ state.mode="data"; toast("העלה JSON כדי לחשב"); $("#modeLabel").textContent="Data Mode"; });

  $("#btnTryDemo").addEventListener("click", loadDemoData);
  $("#btnReset").addEventListener("click", resetAll);

  $("#fileInput").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if (!file) return;
    try{
      const txt = await file.text();
      const json = JSON.parse(txt);

      const texts = extractTexts(json);
      state.importStats.conv = Array.isArray(json) ? json.length : (json?.conversations?.length || 1);
      const ds = buildDatasetFromTexts(texts);

      state.mode = "data";
      render(ds);

      toast(`Processed ✅ (${texts.length} טקסטים)`);
    }catch(err){
      console.error(err);
      toast("לא הצלחתי לקרוא את ה-JSON. נסה קובץ אחר או בדוק שהוא תקין.");
    }
  });

  // Improve print look a bit:
  window.addEventListener("beforeprint", ()=>{
    toast("Print → Save as PDF כדי לשמור snapshot");
  });
}

init();
