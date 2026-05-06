import { useState, useEffect, useCallback } from "react";

const LOGO = "/logo.png";
function Logo({ size=80 }) {
  return <img src={LOGO} alt="SMAN2" style={{ width:size, height:size, objectFit:"contain", display:"block" }}/>;
}

// Data dimuat lazy saat login (lebih ringan)
const GURU_LIST = null;   // dimuat dari /data/guru.json
const SISWA_LIST = null;  // dimuat dari /data/siswa.json

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const G="#15803D", T="#0D9488", W="#FFFFFF", TX="#0F2318", MU="#6B7280";

const HABITS = [
  { id:"bangun",     num:1, label:"Bangun Pagi",           icon:"🌅", color:"#F97316", type:"time",
    desc:"Tuliskan jam berapa kamu bangun pagi ini",
    komp:["Kedisiplinan","Mengelola waktu","Mengendalikan diri","Keseimbangan jiwa & raga","Mendukung kesuksesan"] },
  { id:"ibadah",     num:2, label:"Beribadah",             icon:"🤲", color:"#16A34A", type:"sholat",
    desc:"Centang ibadah yang sudah kamu lakukan",
    sholat:["Subuh","Zuhur","Asar","Magrib","Isya"],
    sIcon:["🌄","☀️","🌤","🌇","🌙"],
    sTime:["Sebelum fajar","Tengah hari","Sore hari","Terbenam matahari","Setelah maghrib"],
    komp:["Mendekatkan diri kepada Tuhan","Etika & moral","Tujuan hidup bermakna","Kebersamaan","Peningkatan diri"] },
  { id:"olahraga",   num:3, label:"Berolahraga",           icon:"⚽", color:"#2563EB", type:"text",
    desc:"Tulis jenis olahraga yang kamu lakukan hari ini",
    ph:"Contoh: Lari 30 menit, Badminton, Senam, Bersepeda...",
    komp:["Kesehatan fisik & mental","Kebugaran tubuh","Potensi diri","Sportivitas"] },
  { id:"makan",      num:4, label:"Makan Sehat & Bergizi", icon:"🥗", color:"#DC2626", type:"makan",
    desc:"Catat makanan pagi, siang, dan malam",
    komp:["Investasi kesehatan","Memaksimalkan potensi","Tanggung jawab diri","Kemandirian"] },
  { id:"belajar",    num:5, label:"Gemar Belajar",         icon:"📚", color:"#7C3AED", type:"text",
    desc:"Catat kegiatan belajar hari ini",
    ph:"Contoh: Baca buku, PR Matematika, Hafalan Quran, Belajar kelompok...",
    komp:["Pengembangan diri","Kreativitas","Menemukan pengetahuan","Kerendahan hati & empati"] },
  { id:"masyarakat", num:6, label:"Bermasyarakat",         icon:"🤝", color:"#DB2777", type:"text",
    desc:"Catat kegiatan sosial hari ini",
    ph:"Contoh: Bantu orang tua, Gotong royong, Kegiatan OSIS...",
    komp:["Gotong royong","Toleransi","Keadilan","Tanggung jawab","Kegembiraan"] },
  { id:"tidur",      num:7, label:"Tidur Cepat",           icon:"🌙", color:"#4F46E5", type:"time",
    desc:"Tuliskan jam berapa kamu tidur malam ini",
    komp:["Organ tubuh pulih","Kesehatan mental","Keseimbangan","Produktivitas"] },
];

// ── GOOGLE SHEETS API ───────────────────────────────────────────
// Ganti URL ini setelah deploy Apps Script
const GAS_URL = "https://script.google.com/macros/s/AKfycbwOcvF8nVRs9ex9iUYkqkUdbFcSJjBKF_1IZH043hmZQhFmswmrb4Kdsli7TjvZoOPz/exec";

async function gasRequest(action, body={}) {
  try {
    const res = await fetch(GAS_URL, {
      method:"POST",
      body: JSON.stringify({ action, ...body }),
    });
    return await res.json();
  } catch(e) {
    console.error("GAS Error:", e);
    return { status:"error" };
  }
}

async function apiSaveJurnal(user, tanggal, entry) {
  // URL sudah terpasang
  await gasRequest("saveJurnal", {
    nisn:   user.nisn || "",
    nis:    user.nis  || "",
    nama:   user.name,
    kelas:  user.kelas,
    gender: user.gender || "",
    tanggal,
    entry,
  });
}

async function apiGetJurnal(user) {
  // URL sudah terpasang
  const res = await gasRequest("getJurnal", { nis: user.nis, nisn: user.nisn });
  return res.status==="ok" ? res.data : {};
}

async function apiGetAllJurnal(kelas) {
  // URL sudah terpasang
  const res = await gasRequest("getAllJurnal", { kelas });
  return res.status==="ok" ? res.data : {};
}

const todayKey = () => {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
};
const fmtDate = k => {
  const [y,m,dd] = k.split("-");
  return parseInt(dd)+" "+MONTHS[parseInt(m)-1]+" "+y;
};
const daysInMonth = (y,m) => new Date(y,m+1,0).getDate();

function calcScore(e) {
  if (!e) return 0;
  let s = 0;
  if (e.bangun) s++;
  if (e.ibadah) s += Math.min(1, Object.values(e.ibadah).filter(Boolean).length / 5);
  if (e.olahraga) s++;
  if (e.makan) s += Math.min(1, ["P","S","M"].filter(k => e.makan[k] && e.makan[k].trim()).length / 3);
  if (e.belajar) s++;
  if (e.masyarakat) s++;
  if (e.tidur) s++;
  return Math.round(s / 7 * 100);
}

function getBadge(sc) {
  if (sc>=90) return { lbl:"🏆 Bintang",  c:"#D97706", bg:"#FFFBEB" };
  if (sc>=70) return { lbl:"🥈 Hebat",    c:"#475569", bg:"#F8FAFC" };
  if (sc>=50) return { lbl:"🥉 Bagus",    c:"#92400E", bg:"#FEF3C7" };
  return             { lbl:"💪 Semangat", c:G,         bg:"#F0FDF4" };
}

const CS  = { background:"#fff", borderRadius:18, boxShadow:"0 2px 14px rgba(0,0,0,0.07)", padding:16 };
const INP = { width:"100%", border:"2px solid #D1FAE5", borderRadius:10, padding:"9px 12px",
              fontFamily:"Nunito,sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" };

/* ── LOGIN ─────────────────────────────────────────────────── */
function Login({ onLogin, siswaList, guruList }) {
  const [role, setRole] = useState("siswa");
  const [val,  setVal]  = useState("");
  const [err,  setErr]  = useState("");

  function go() {
    setErr("");
    const v = val.trim();
    if (!v) return setErr("Harap isi kolom di bawah.");
    if (role === "siswa") {
      const u = (siswaList||[]).find(s => s.nisn === v);
      if (!u) return setErr('NIS "'+v+'" tidak ditemukan. Pastikan NIS sudah benar.');
      onLogin(u);
    } else {
      const u = (guruList||[]).find(g => g.name.toLowerCase() === v.toLowerCase());
      if (!u) return setErr('Nama "'+v+'" tidak ditemukan. Tulis nama lengkap.');
      onLogin(u);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,"+G+","+T+")",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet"/>
      <div style={{ textAlign:"center", marginBottom:22 }}>
        <div style={{ display:"inline-block", filter:"drop-shadow(0 6px 18px rgba(0,0,0,0.3))", marginBottom:10 }}>
          <Logo size={110}/>
        </div>
        <h1 style={{ fontFamily:"Nunito,sans-serif", fontWeight:900, fontSize:32, color:"#fff", margin:"0 0 4px", letterSpacing:2 }}>G7KAIH</h1>
        <p style={{ color:"rgba(255,255,255,0.9)", fontFamily:"Nunito,sans-serif", fontWeight:700, fontSize:13, margin:0 }}>
          Gerakan 7 Kebiasaan Anak Indonesia Hebat
        </p>
        <p style={{ color:"rgba(255,255,255,0.75)", fontSize:12, margin:"4px 0 0" }}>SMA Negeri 2 Banda Aceh</p>
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:8 }}>
          {HABITS.map(h => <span key={h.id} style={{ fontSize:22 }}>{h.icon}</span>)}
        </div>
      </div>

      <div style={{ ...CS, width:"100%", maxWidth:370 }}>
        <div style={{ textAlign:"center", marginBottom:14, paddingBottom:12, borderBottom:"1px solid #D1FAE5" }}>
          <p style={{ margin:0, fontWeight:800, fontSize:13, color:G }}>🌿 Assalamualaykum Warahmatullahi Wabarakatuh</p>
          <p style={{ margin:"3px 0 0", fontSize:11, color:MU }}>Selamat datang di Jurnal Digital G7KAIH</p>
        </div>

        <div style={{ display:"flex", background:"#F0FDF4", borderRadius:11, padding:3, marginBottom:14 }}>
          {[["siswa","👦 Siswa"],["guru","👩‍🏫 Guru"]].map(([r,lbl]) => (
            <button key={r} onClick={() => { setRole(r); setVal(""); setErr(""); }}
              style={{ flex:1, padding:"10px 0", border:"none", borderRadius:9,
                fontFamily:"Nunito,sans-serif", fontWeight:800, fontSize:14, cursor:"pointer",
                background:role===r?"#fff":"transparent", color:role===r?G:MU,
                boxShadow:role===r?"0 1px 6px rgba(0,0,0,0.1)":"none" }}>{lbl}</button>
          ))}
        </div>

        <label style={{ display:"block", fontSize:11, fontWeight:800, color:MU, marginBottom:5,
          textTransform:"uppercase", letterSpacing:.5 }}>
          {role==="siswa" ? "Nomor Induk Siswa Nasional (NISN)" : "Nama Lengkap Guru / Wali Kelas"}
        </label>
        <input style={{ ...INP, fontSize:16, padding:"12px 14px" }}
          placeholder={role==="siswa" ? "Ketik NISN kamu, contoh: 3092221783" : "Ketik nama lengkap, contoh: Ruhina"}
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key==="Enter" && go()} autoFocus/>

        {err && <p style={{ color:"#DC2626", fontSize:12, fontWeight:700, marginTop:6, lineHeight:1.4 }}>⚠ {err}</p>}

        <button onClick={go}
          style={{ width:"100%", marginTop:14, padding:"13px 0", border:"none", borderRadius:13,
            fontFamily:"Nunito,sans-serif", fontWeight:900, fontSize:16, color:"#fff", cursor:"pointer",
            background:"linear-gradient(90deg,"+G+","+T+")" }}>
          Masuk →
        </button>

        <div style={{ marginTop:12, padding:"10px 12px", background:"#F0FDF4",
          borderRadius:9, fontSize:11, color:MU, borderLeft:"3px solid "+G }}>
          <strong style={{ color:G }}>Contoh — </strong>
          {role==="siswa"
            ? "NISN: 3092221783 · 3106247910 · 3096166887 · 0109048832"
            : "Nama: Ruhina / Herlina / Ani Afrah / Eva Ifrida"}
        </div>
      </div>
    </div>
  );
}

/* ── BERANDA ───────────────────────────────────────────────── */
function Beranda({ user, journals, goJurnal, siswaList, refreshJournals }) {
  const now=new Date(), y=now.getFullYear(), mo=now.getMonth();

  // Guru: refresh data jurnal saat buka beranda
  useEffect(() => {
    if (user.role === "guru" && refreshJournals) {
      refreshJournals();
    }
  }, []);
  const days=daysInMonth(y,mo), tk=todayKey();
  const myJ = journals[user.id] || {};

  let tot=0, fil=0;
  const daySc=[];
  for (let dd=1; dd<=days; dd++) {
    const k = y+"-"+String(mo+1).padStart(2,"0")+"-"+String(dd).padStart(2,"0");
    const sc = myJ[k] ? calcScore(myJ[k]) : null;
    if (sc!==null) { tot+=sc; fil++; }
    daySc.push({ dd, sc, k });
  }
  const avg = fil>0 ? Math.round(tot/fil) : 0;
  const b   = getBadge(avg);
  const todSc = calcScore(myJ[tk]);
  const todE  = myJ[tk];
  let streak = 0;
  for (let dd=now.getDate(); dd>=1; dd--) {
    const k = y+"-"+String(mo+1).padStart(2,"0")+"-"+String(dd).padStart(2,"0");
    if (myJ[k] && calcScore(myJ[k])>0) streak++; else break;
  }

  const hPct = HABITS.map(h => {
    let cnt=0;
    Object.values(myJ).forEach(e => {
      const v=e[h.id]; if(!v) return;
      if(h.type==="sholat") { if(Object.values(v).some(Boolean)) cnt++; }
      else if(h.type==="makan") { if(["P","S","M"].some(k=>v[k]&&v[k].trim())) cnt++; }
      else cnt++;
    });
    return { ...h, pct: fil>0 ? Math.round(cnt/fil*100) : 0 };
  });

  return (
    <div style={{ paddingBottom:32 }}>
      {/* HERO */}
      <div style={{ background:"linear-gradient(145deg,"+G+","+T+")", padding:"22px 16px 44px", borderRadius:"0 0 28px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <Logo size={46}/>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>Assalamualaykum,</p>
            <h2 style={{ margin:0, fontWeight:900, fontSize:17, color:"#fff" }}>{user.name}</h2>
            <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.7)" }}>Kelas {user.kelas}</p>
          </div>
          <div style={{ background:"rgba(255,255,255,0.18)", borderRadius:12, padding:"7px 12px", textAlign:"center" }}>
            <div style={{ fontSize:22 }}>{b.lbl.split(" ")[0]}</div>
            <div style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.9)" }}>{b.lbl.split(" ")[1]}</div>
          </div>
        </div>
        <div style={{ background:"rgba(255,255,255,0.16)", borderRadius:16, padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ position:"relative", width:58, height:58, flexShrink:0 }}>
            <svg width="58" height="58" style={{ transform:"rotate(-90deg)" }}>
              <circle cx="29" cy="29" r="23" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="6"/>
              <circle cx="29" cy="29" r="23" fill="none" stroke="#fff" strokeWidth="6"
                strokeDasharray={todSc*1.445+" 144.5"} strokeLinecap="round"/>
            </svg>
            <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#fff" }}>{todSc}%</div>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontWeight:900, fontSize:14, color:"#fff" }}>Jurnal Hari Ini</p>
            <p style={{ margin:"2px 0 5px", fontSize:11, color:"rgba(255,255,255,0.8)" }}>
              {todE ? Object.keys(todE).length+"/7 kebiasaan diisi" : "Belum diisi"}
            </p>
            <span style={{ background:"rgba(255,255,255,0.2)", color:"#fff", borderRadius:7, padding:"2px 8px", fontSize:10, fontWeight:700 }}>🔥 {streak} hari streak</span>
          </div>
          {user.role==="siswa" && (
            <button onClick={() => goJurnal(null)}
              style={{ background:"#fff", color:G, border:"none", borderRadius:11, padding:"9px 13px",
                fontFamily:"Nunito,sans-serif", fontWeight:900, fontSize:13, cursor:"pointer" }}>
              {todE ? "Edit ✏️" : "Isi 📓"}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding:"0 14px", marginTop:-12 }}>
        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:9, marginBottom:14 }}>
          {[["📊",avg+"%","Rata-rata","#2563EB"],["📅",fil+"/"+days,"Hari Terisi",G],["🔥",streak+"h","Streak","#F97316"]].map(([ic,v,lbl,c]) => (
            <div key={lbl} style={{ ...CS, padding:"12px 8px", textAlign:"center", border:"2px solid "+c+"22" }}>
              <div style={{ fontSize:20 }}>{ic}</div>
              <div style={{ fontWeight:900, fontSize:18, color:c }}>{v}</div>
              <div style={{ fontSize:10, color:MU, marginTop:1 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        {user.role==="siswa" && !todE && (
          <div onClick={() => goJurnal(null)}
            style={{ background:"linear-gradient(135deg,"+G+","+T+")", borderRadius:14, padding:"14px 16px",
              marginBottom:14, cursor:"pointer", display:"flex", alignItems:"center", gap:12,
              boxShadow:"0 4px 14px rgba(21,128,61,0.28)" }}>
            <span style={{ fontSize:34 }}>📓</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:900, fontSize:14, color:"#fff" }}>Isi Jurnal Hari Ini!</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)" }}>Yuk isi sekarang — tap di sini ✨</div>
            </div>
            <span style={{ color:"#fff", fontSize:20, fontWeight:900 }}>→</span>
          </div>
        )}
        {user.role==="siswa" && todE && (
          <div onClick={() => goJurnal(null)}
            style={{ background:"#F0FDF4", borderRadius:14, padding:"11px 14px", marginBottom:14,
              cursor:"pointer", display:"flex", alignItems:"center", gap:10, border:"2px solid "+G+"30" }}>
            <span style={{ fontSize:26 }}>✅</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:13, color:G }}>Jurnal hari ini sudah diisi!</div>
              <div style={{ fontSize:11, color:MU }}>Skor: {todSc}% · Tap untuk edit</div>
            </div>
            <span style={{ color:G, fontSize:16 }}>✏️</span>
          </div>
        )}

        {/* Rekap Prestasi */}
        <div style={{ ...CS, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <h4 style={{ fontWeight:900, margin:0, fontSize:14, color:TX }}>🏅 Rekap Prestasi Bulan Ini</h4>
            <span style={{ background:b.bg, color:b.c, borderRadius:9, padding:"2px 9px", fontSize:11, fontWeight:800 }}>{b.lbl}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14, background:"#F8FAFC", borderRadius:12, padding:"12px 14px" }}>
            <div style={{ position:"relative", width:72, height:72, flexShrink:0 }}>
              <svg width="72" height="72" style={{ transform:"rotate(-90deg)" }}>
                <circle cx="36" cy="36" r="29" fill="none" stroke="#E5E7EB" strokeWidth="9"/>
                <circle cx="36" cy="36" r="29" fill="none"
                  stroke={avg>=80?G:avg>=50?"#F59E0B":"#EF4444"} strokeWidth="9"
                  strokeDasharray={avg*1.822+" 182.2"} strokeLinecap="round"/>
              </svg>
              <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
                <span style={{ fontWeight:900, fontSize:20, color:TX, lineHeight:1 }}>{avg}%</span>
                <span style={{ fontSize:9, color:MU }}>avg</span>
              </div>
            </div>
            <div>
              <p style={{ margin:0, fontSize:11, color:MU }}>Kelengkapan jurnal rata-rata</p>
              <p style={{ margin:"3px 0", fontWeight:900, fontSize:22, color:TX }}>{avg}<span style={{ fontSize:12,color:MU,fontWeight:600 }}>%</span></p>
              <p style={{ margin:0, fontSize:11, color:MU }}>{fil} dari {days} hari diisi</p>
            </div>
          </div>
          {hPct.map(h => (
            <div key={h.id} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:12, fontWeight:700, color:TX }}>{h.icon} {h.label}</span>
                <span style={{ fontSize:11, fontWeight:900, color:h.color }}>{h.pct}%</span>
              </div>
              <div style={{ background:"#F3F4F6", borderRadius:99, height:8, overflow:"hidden" }}>
                <div style={{ width:h.pct+"%", height:"100%", background:"linear-gradient(90deg,"+h.color+","+h.color+"88)", borderRadius:99 }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Kalender */}
        <div style={{ ...CS, marginBottom:14 }}>
          <h4 style={{ fontWeight:900, margin:"0 0 10px", fontSize:14, color:TX }}>🗓 Kalender {MONTHS[mo]} {y}</h4>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
            {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(dd => (
              <div key={dd} style={{ textAlign:"center", fontSize:9, fontWeight:800, color:MU, paddingBottom:3 }}>{dd}</div>
            ))}
            {Array.from({ length: new Date(y,mo,1).getDay() }).map((_,i) => <div key={"e"+i}/>)}
            {daySc.map(({ dd, sc, k }) => {
              const isT = k===tk;
              const bg  = sc===null ? "#F3F4F6" : sc>=80 ? G : sc>=50 ? "#F59E0B" : "#EF4444";
              return (
                <div key={dd} onClick={() => user.role==="siswa" && goJurnal(k)}
                  style={{ aspectRatio:"1", borderRadius:7, background:bg, display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800,
                    color:sc===null?MU:"#fff", border:isT?"2px solid #2563EB":"none",
                    cursor:user.role==="siswa"?"pointer":"default" }}>{dd}</div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:9, marginTop:8, flexWrap:"wrap" }}>
            {[[G,"≥80%"],["#F59E0B","50–79%"],["#EF4444","<50%"],["#F3F4F6","Belum"]].map(([c,lbl]) => (
              <div key={lbl} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10 }}>
                <div style={{ width:10,height:10,borderRadius:2,background:c,border:c==="#F3F4F6"?"1px solid #D1D5DB":"none" }}/>
                <span style={{ color:MU }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── JURNAL ────────────────────────────────────────────────── */
function Jurnal({ user, journals, setJournals, initDate }) {
  const [date,    setDate]    = useState(initDate || todayKey());
  const [open,    setOpen]    = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [draft,   setDraft]   = useState({});

  // Saat initDate berubah (klik tanggal dari kalender), update date
  useEffect(() => {
    if (initDate) { setDate(initDate); setOpen(null); setDraft({}); }
  }, [initDate]);

  const isToday = date === todayKey();
  const myJ     = journals[user.id] || {};
  const entry   = myJ[date] || {};

  // Gabung entry tersimpan + draft yang belum disimpan
  const current = { ...entry, ...draft };
  const sc      = calcScore(current);
  const b       = getBadge(sc);
  const hasDraft = Object.keys(draft).length > 0;

  // Update draft lokal (belum kirim ke Sheets)
  function updDraft(hid, val) {
    setDraft(prev => ({ ...prev, [hid]: val }));
    setSaved(false);
  }

  // Tombol SIMPAN — kirim ke state global + Google Sheets
  async function doSave() {
    setSaving(true);
    const newEntry = { ...entry, ...draft };
    setJournals(prev => {
      const uid   = user.id;
      const prev2 = prev[uid] || {};
      return { ...prev, [uid]: { ...prev2, [date]: newEntry } };
    });
    await apiSaveJurnal(user, date, newEntry);
    setDraft({});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function prevDay() {
    if (hasDraft && !window.confirm("Ada perubahan yang belum disimpan. Lanjutkan?")) return;
    const d = new Date(date+"T00:00:00"); d.setDate(d.getDate()-1);
    setDate(d.toISOString().split("T")[0]); setOpen(null); setDraft({});
  }
  function nextDay() {
    if (hasDraft && !window.confirm("Ada perubahan yang belum disimpan. Lanjutkan?")) return;
    const d = new Date(date+"T00:00:00"); d.setDate(d.getDate()+1);
    if (d <= new Date()) { setDate(d.toISOString().split("T")[0]); setOpen(null); setDraft({}); }
  }

  return (
    <div style={{ padding:"0 14px 120px" }}>
      {/* Nav tanggal */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 0 8px" }}>
        <button onClick={prevDay}
          style={{ background:"#fff", border:"2px solid "+G, color:G, borderRadius:11,
            padding:"7px 16px", fontFamily:"Nunito,sans-serif", fontWeight:900, fontSize:20, cursor:"pointer" }}>‹</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontWeight:900, fontSize:15, color:TX }}>{fmtDate(date)}</div>
          {isToday
            ? <div style={{ fontSize:10, color:G, fontWeight:700 }}>📅 Hari ini</div>
            : <div style={{ fontSize:10, color:MU }}>Jurnal tanggal lalu</div>
          }
        </div>
        <button onClick={nextDay} disabled={isToday}
          style={{ background:"#fff", border:"2px solid "+G, color:G, borderRadius:11,
            padding:"7px 16px", fontFamily:"Nunito,sans-serif", fontWeight:900, fontSize:20,
            cursor:"pointer", opacity:isToday?.4:1 }}>›</button>
      </div>

      {/* Skor + status simpan */}
      <div style={{ ...CS, marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ position:"relative", width:64, height:64, flexShrink:0 }}>
          <svg width="64" height="64" style={{ transform:"rotate(-90deg)" }}>
            <circle cx="32" cy="32" r="26" fill="none" stroke="#F3F4F6" strokeWidth="8"/>
            <circle cx="32" cy="32" r="26" fill="none"
              stroke={sc>=80?G:sc>=50?"#F59E0B":"#EF4444"} strokeWidth="8"
              strokeDasharray={sc*1.634+" 163.4"} strokeLinecap="round"/>
          </svg>
          <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",
            justifyContent:"center",fontWeight:900,fontSize:17,color:TX }}>{sc}%</div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:900, fontSize:14, color:TX }}>Skor Jurnal Harian</div>
          <div style={{ background:b.bg, color:b.c, borderRadius:7, padding:"2px 9px",
            fontSize:11, fontWeight:800, display:"inline-block", marginTop:3 }}>{b.lbl}</div>
          {hasDraft && <div style={{ fontSize:10, color:"#F59E0B", fontWeight:700, marginTop:3 }}>
            ✏️ Ada perubahan belum disimpan
          </div>}
          {saved && <div style={{ fontSize:10, color:"#22C55E", fontWeight:700, marginTop:3 }}>
            ✅ Jurnal berhasil disimpan!
          </div>}
        </div>
      </div>

      {/* 7 Habit Cards */}
      {HABITS.map(h => {
        const val  = current[h.id];
        const isOp = open === h.id;
        const done = (() => {
          if (!val) return false;
          if (h.type==="sholat") return Object.values(val).some(Boolean);
          if (h.type==="makan")  return ["P","S","M"].some(k => val[k] && val[k].trim());
          return !!val;
        })();
        const sub = (() => {
          if (!val) return "Ketuk untuk mengisi";
          if (h.type==="sholat") return Object.values(val).filter(Boolean).length+"/5 waktu sholat ✓";
          if (h.type==="makan")  return ["P","S","M"].filter(k=>val[k]&&val[k].trim()).length+"/3 waktu makan ✓";
          if (h.type==="time")   return "Jam "+val;
          return val.length>36 ? val.slice(0,36)+"…" : val;
        })();

        return (
          <div key={h.id} style={{ ...CS, padding:0, overflow:"hidden", marginBottom:9,
            border:"2px solid "+(isOp?h.color:"transparent") }}>
            <div onClick={() => setOpen(isOp ? null : h.id)}
              style={{ display:"flex", alignItems:"center", gap:11, padding:"12px 14px",
                cursor:"pointer", background:isOp ? h.color+"0D" : "#fff" }}>
              <div style={{ width:44, height:44, borderRadius:13, background:h.color+"18",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{h.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:900, fontSize:13, color:TX }}>
                  <span style={{ color:h.color, marginRight:3 }}>{h.num}.</span>{h.label}
                </div>
                <div style={{ fontSize:11, color:done?h.color:MU, marginTop:1, fontWeight:done?700:400 }}>{sub}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                {done && <div style={{ width:20,height:20,borderRadius:99,background:h.color,
                  display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:900 }}>✓</div>}
                <span style={{ color:"#D1D5DB", fontSize:13 }}>{isOp?"▲":"▼"}</span>
              </div>
            </div>
            {isOp && (
              <div style={{ padding:"4px 14px 14px", borderTop:"1px solid "+h.color+"20" }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, margin:"8px 0 12px" }}>
                  {h.komp.map(k => (
                    <span key={k} style={{ background:h.color+"15", color:h.color,
                      borderRadius:18, padding:"2px 8px", fontSize:9, fontWeight:700 }}>{k}</span>
                  ))}
                </div>
                <HInput h={h} v={val} upd={v => updDraft(h.id, v)}/>
              </div>
            )}
          </div>
        );
      })}

      {/* ── TOMBOL SIMPAN JURNAL ── */}
      <div style={{ position:"fixed", bottom:72, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:480, padding:"10px 16px", zIndex:99,
        background:"linear-gradient(to top, #F0FDF4 80%, transparent)" }}>
        <button onClick={doSave} disabled={saving || (!hasDraft && Object.keys(entry).length===0)}
          style={{ width:"100%", padding:"15px 0", border:"none", borderRadius:14,
            fontFamily:"Nunito,sans-serif", fontWeight:900, fontSize:16, cursor:"pointer",
            color:"#fff", transition:"all .2s",
            background: saving ? "#9CA3AF"
              : !hasDraft && Object.keys(entry).length>0 ? "#86EFAC"
              : "linear-gradient(90deg,"+G+","+T+")",
            boxShadow: hasDraft ? "0 4px 20px rgba(21,128,61,0.4)" : "none",
            opacity: (!hasDraft && Object.keys(entry).length===0) ? .5 : 1 }}>
          {saving ? "⏳ Menyimpan ke Google Sheets..."
            : saved ? "✅ Jurnal Tersimpan!"
            : hasDraft ? "💾 Simpan Jurnal Sekarang"
            : Object.keys(entry).length>0 ? "✅ Jurnal Sudah Tersimpan"
            : "💾 Simpan Jurnal"}
        </button>
        {hasDraft && (
          <p style={{ textAlign:"center", fontSize:11, color:MU, margin:"5px 0 0" }}>
            Tekan simpan agar data masuk ke Google Sheets
          </p>
        )}
      </div>
    </div>
  );
}

function HInput({ h, v, upd }) {
  if (h.type === "time") {
    const isBangun = h.id === "bangun";
    const tip = v ? (isBangun
      ? (v<="05:00"?"🌟 Luar biasa!":v<="06:00"?"✅ Sangat pagi!":v<="07:00"?"👍 Tepat waktu":"⏰ Coba lebih pagi")
      : (v<="20:00"?"🌟 Sangat cepat!":v<="21:00"?"✅ Bagus!":v<="22:00"?"👍 Lumayan":"⚠ Terlalu malam")) : "";
    return (
      <div>
        <p style={{ fontSize:11, color:MU, margin:"0 0 10px" }}>{h.desc}:</p>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <div style={{ background:"#F0FDF4", border:"2px solid "+h.color+"40", borderRadius:12,
            padding:"10px 18px", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:26 }}>{isBangun?"⏰":"🌙"}</span>
            <input type="time" value={v||""} onChange={e => upd(e.target.value || null)}
              style={{ border:"none", background:"transparent", fontFamily:"Nunito,sans-serif",
                fontSize:24, fontWeight:900, color:h.color, outline:"none", width:110 }}/>
          </div>
          {tip && <div style={{ background:h.color+"15", color:h.color, borderRadius:9,
            padding:"7px 12px", fontSize:11, fontWeight:800 }}>{tip}</div>}
        </div>
      </div>
    );
  }

  if (h.type === "sholat") {
    const val = v || {};
    const cnt = h.sholat.filter(s => val[s]).length;
    return (
      <div>
        <p style={{ fontSize:11, color:MU, margin:"0 0 8px" }}>{h.desc}:</p>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {h.sholat.map((s,i) => (
            <label key={s} style={{ display:"flex", alignItems:"center", gap:11, cursor:"pointer",
              background:val[s] ? h.color+"10" : "#F9FAFB",
              border:"2px solid "+(val[s]?h.color:"#E5E7EB"), borderRadius:11, padding:"10px 13px" }}>
              <input type="checkbox" checked={!!val[s]}
                onChange={e => upd({ ...val, [s]: e.target.checked })} style={{ display:"none" }}/>
              <span style={{ fontSize:20 }}>{h.sIcon[i]}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:14, color:val[s]?h.color:TX }}>{s}</div>
                <div style={{ fontSize:10, color:MU }}>{h.sTime[i]}</div>
              </div>
              <div style={{ width:24,height:24,borderRadius:99,
                border:"2px solid "+(val[s]?h.color:"#D1D5DB"),
                background:val[s]?h.color:"transparent",
                display:"flex",alignItems:"center",justifyContent:"center" }}>
                {val[s] && <span style={{ color:"#fff", fontSize:13, fontWeight:900 }}>✓</span>}
              </div>
            </label>
          ))}
        </div>
        <div style={{ marginTop:8, background:"#F3F4F6", borderRadius:99, height:9, overflow:"hidden" }}>
          <div style={{ width:(cnt/5*100)+"%", height:"100%",
            background:"linear-gradient(90deg,"+h.color+","+h.color+"88)", borderRadius:99 }}/>
        </div>
        <p style={{ fontSize:11, color:h.color, fontWeight:800, margin:"4px 0 0", textAlign:"right" }}>{cnt}/5 waktu sholat ✓</p>
      </div>
    );
  }

  if (h.type === "makan") {
    const val = v || {};
    const WK  = [["P","🌄 Pagi","#FFF7ED","#FED7AA"],["S","☀️ Siang","#FEFCE8","#FEF08A"],["M","🌙 Malam","#EFF6FF","#BFDBFE"]];
    const FOOD = ["🍚","🍗","🐟","🥦","🥕","🍳","🥛","🍌","🥚","🍜","🥗","🍎","🍞","🥩","🫘","🍠"];
    return (
      <div>
        <p style={{ fontSize:11, color:MU, margin:"0 0 8px" }}>{h.desc}:</p>
        {WK.map(([k,lbl,bg,brd]) => (
          <div key={k} style={{ background:bg, border:"2px solid "+brd, borderRadius:12, padding:"10px 12px", marginBottom:9 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7 }}>
              <span style={{ fontSize:14, fontWeight:800, color:TX }}>{lbl}</span>
              {val[k]&&val[k].trim() && <span style={{ color:"#22C55E", fontSize:10, fontWeight:700, marginLeft:"auto" }}>✓ Terisi</span>}
            </div>
            <input style={{ ...INP, borderColor:val[k]?h.color+"50":"#E5E7EB", background:"#fff" }}
              placeholder={"Menu "+lbl.split(" ")[1].toLowerCase()+" hari ini..."}
              value={val[k]||""} onChange={e => upd({ ...val, [k]: e.target.value || undefined })}/>
            <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginTop:6 }}>
              {FOOD.map(em => (
                <button key={em} onClick={() => upd({ ...val, [k]: (val[k]||"")+(val[k]?" ":"")+em })}
                  style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:7,
                    padding:"3px 4px", fontSize:15, cursor:"pointer", lineHeight:1 }}>{em}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (h.type === "text") {
    const msgs = { olahraga:"💪 Tetap semangat!", belajar:"📖 Terus belajar!", masyarakat:"🤝 Peduli sesama!" };
    return (
      <div>
        <p style={{ fontSize:11, color:MU, margin:"0 0 7px" }}>{h.desc}:</p>
        <textarea style={{ ...INP, minHeight:85, resize:"vertical", borderColor:v?h.color+"50":"#D1FAE5" }}
          placeholder={h.ph} value={v||""}
          onChange={e => upd(e.target.value || null)}/>
        {v && <div style={{ fontSize:11, color:h.color, fontWeight:700, marginTop:4 }}>{msgs[h.id]}</div>}
      </div>
    );
  }
  return null;
}

/* ── DOWNLOAD REKAP CSV ────────────────────────────────────── */
function downloadCSV(user, journals, y, mo, siswaList) {
  const days    = daysInMonth(y, mo);
  const students= (siswaList||[]).filter(s => s.kelas === user.kelas);
  const bulan   = MONTHS[mo];

  const headers = ["No","NISN","NIS","Nama Siswa","L/P","Hari Terisi","Rata-rata (%)","Badge",
    ...HABITS.map(h => h.label+" (hari)"), "Keterangan"];
  const rows = [headers];

  students.forEach((st, idx) => {
    const myJ = journals[st.id] || {};
    let tot=0, fil=0;
    for (let dd=1; dd<=days; dd++) {
      const k = y+"-"+String(mo+1).padStart(2,"0")+"-"+String(dd).padStart(2,"0");
      if (myJ[k]) { tot+=calcScore(myJ[k]); fil++; }
    }
    const avg2 = fil>0 ? Math.round(tot/fil) : 0;
    const b2   = getBadge(avg2);
    const hd   = HABITS.map(h => {
      let cnt=0;
      Object.values(myJ).forEach(e => {
        const vv=e[h.id]; if(!vv) return;
        if(h.type==="sholat"){ if(Object.values(vv).some(Boolean)) cnt++; }
        else if(h.type==="makan"){ if(["P","S","M"].some(k2=>vv[k2]&&vv[k2].trim())) cnt++; }
        else cnt++;
      });
      return cnt;
    });
    const ket = avg2>=80?"Sangat Baik":avg2>=70?"Baik":avg2>=50?"Cukup":"Perlu Bimbingan";
    rows.push([idx+1, st.nisn, st.nis, st.name, st.gender, fil, avg2, b2.lbl.replace(/[^\w\s]/g,"").trim(), ...hd, ket]);
  });

  const sep = ",";
  const nl  = "\r\n";
  const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(sep)).join(nl);
  const BOM  = "\uFEFF";
  const blob = new Blob([BOM+csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "Rekap_G7KAIH_"+user.kelas.replace(/ /g,"_")+"_"+bulan+"_"+y+".csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadHTML(user, journals, y, mo, siswaList) {
  const days     = daysInMonth(y, mo);
  const students = (siswaList||[]).filter(s => s.kelas === user.kelas);
  const bulan    = MONTHS[mo];

  const statsRows = students.map((st, idx) => {
    const myJ = journals[st.id] || {};
    let tot=0, fil=0;
    for (let dd=1; dd<=days; dd++) {
      const k = y+"-"+String(mo+1).padStart(2,"0")+"-"+String(dd).padStart(2,"0");
      if (myJ[k]) { tot+=calcScore(myJ[k]); fil++; }
    }
    const avg2 = fil>0 ? Math.round(tot/fil) : 0;
    const b2   = getBadge(avg2);
    const hd   = HABITS.map(h => {
      let cnt=0;
      Object.values(myJ).forEach(e => {
        const vv=e[h.id]; if(!vv) return;
        if(h.type==="sholat"){ if(Object.values(vv).some(Boolean)) cnt++; }
        else if(h.type==="makan"){ if(["P","S","M"].some(k2=>vv[k2]&&vv[k2].trim())) cnt++; }
        else cnt++;
      });
      return cnt;
    });
    const catColor = avg2>=80?"#15803D":avg2>=70?"#2563EB":avg2>=50?"#F59E0B":"#EF4444";
    const catatan  = avg2>=80?"Sangat Baik":avg2>=70?"Baik":avg2>=50?"Cukup":"Perlu Bimbingan";
    const barW     = avg2+"%";
    return `
      <tr>
        <td>${idx+1}</td>
        <td>${st.nisn}</td>
        <td>${st.nis}</td>
        <td style="text-align:left;font-weight:700">${st.name}</td>
        <td>${st.gender}</td>
        <td>${fil}/${days}</td>
        <td><div style="display:flex;align-items:center;gap:6px">
          <div style="width:60px;height:8px;background:#E5E7EB;border-radius:99px;overflow:hidden">
            <div style="width:${barW};height:100%;background:${catColor};border-radius:99px"></div>
          </div>
          <strong style="color:${catColor}">${avg2}%</strong>
        </div></td>
        ${hd.map(n => `<td>${n}</td>`).join("")}
        <td style="color:${catColor};font-weight:700">${catatan}</td>
      </tr>`;
  }).join("");

  const totalSiswa  = students.length;
  const filledCount = students.filter(st => Object.keys(journals[st.id]||{}).length>0).length;
  const allAvg      = students.reduce((acc,st)=>{
    const myJ=journals[st.id]||{};
    let tot=0,fil=0;
    for(let dd=1;dd<=days;dd++){const k=y+"-"+String(mo+1).padStart(2,"0")+"-"+String(dd).padStart(2,"0");if(myJ[k]){tot+=calcScore(myJ[k]);fil++;}}
    return acc+(fil>0?Math.round(tot/fil):0);
  },0);
  const classAvg = totalSiswa>0 ? Math.round(allAvg/totalSiswa) : 0;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Rekap G7KAIH - Kelas ${user.kelas} - ${bulan} ${y}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; padding: 20px; color: #0F2318; background:#f8fafb; }
  .header { background: linear-gradient(135deg,#15803D,#0D9488); color:#fff; padding:20px 24px; border-radius:12px; margin-bottom:20px; display:flex; align-items:center; gap:20px; }
  .header-text h1 { font-size:22px; font-weight:900; letter-spacing:1px; }
  .header-text p  { font-size:12px; opacity:.85; margin-top:2px; }
  .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
  .stat-card  { background:#fff; border-radius:10px; padding:14px; text-align:center; box-shadow:0 1px 8px rgba(0,0,0,.07); }
  .stat-card .val { font-size:26px; font-weight:900; color:#15803D; }
  .stat-card .lbl { font-size:11px; color:#6B7280; margin-top:3px; }
  table { width:100%; border-collapse:collapse; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 8px rgba(0,0,0,.07); font-size:12px; }
  th { background:#15803D; color:#fff; padding:9px 8px; text-align:center; font-size:11px; }
  td { padding:8px; text-align:center; border-bottom:1px solid #F3F4F6; }
  tr:hover td { background:#F0FDF4; }
  tr:last-child td { border-bottom:none; }
  .footer { margin-top:16px; text-align:center; font-size:11px; color:#9CA3AF; }
  @media print { body{background:#fff;padding:10px} .header{print-color-adjust:exact;-webkit-print-color-adjust:exact} }
</style>
</head>
<body>
  <div class="header">
    <div class="header-text">
      <h1>G7KAIH — LAPORAN JURNAL KEBIASAAN</h1>
      <p>SMA Negeri 2 Banda Aceh &nbsp;|&nbsp; Kelas ${user.kelas} &nbsp;|&nbsp; Wali Kelas: ${user.name}</p>
      <p>Bulan: ${bulan} ${y} &nbsp;|&nbsp; Tanggal cetak: ${new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}</p>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card"><div class="val">${totalSiswa}</div><div class="lbl">Total Siswa</div></div>
    <div class="stat-card"><div class="val">${filledCount}</div><div class="lbl">Sudah Mengisi</div></div>
    <div class="stat-card"><div class="val">${classAvg}%</div><div class="lbl">Rata-rata Kelas</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>No</th><th>NISN</th><th>NIS</th><th>Nama Siswa</th><th>L/P</th>
        <th>Hari Terisi</th><th>Rata-rata</th>
        ${HABITS.map(h=>`<th>${h.icon}<br/>${h.label.replace("& ","&<br/>")}</th>`).join("")}
        <th>Keterangan</th>
      </tr>
    </thead>
    <tbody>${statsRows}</tbody>
  </table>

  <div class="footer">
    <p>Laporan ini dibuat otomatis oleh sistem G7KAIH — Gerakan 7 Kebiasaan Anak Indonesia Hebat</p>
    <p>SMA Negeri 2 Banda Aceh © ${y}</p>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type:"text/html;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "Laporan_G7KAIH_"+user.kelas.replace(/ /g,"_")+"_"+bulan+"_"+y+".html";
  a.click();
  URL.revokeObjectURL(url);
}

/* ── KELAS (Guru) ──────────────────────────────────────────── */
function Kelas({ user, journals, siswaList, refreshJournals }) {
  const now=new Date(), y=now.getFullYear(), mo=now.getMonth();
  const days    = daysInMonth(y, mo);
  const students= (siswaList||[]).filter(s => s.kelas === user.kelas);
  const bulan   = MONTHS[mo];
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Auto-refresh saat halaman kelas dibuka
  useEffect(() => {
    handleRefresh();
  }, []);

  async function handleRefresh() {
    if (!refreshJournals) return;
    setRefreshing(true);
    await refreshJournals();
    setRefreshing(false);
    setLastRefresh(new Date().toLocaleTimeString("id-ID"));
  }

  // Summary stats
  let totalFil=0;
  students.forEach(st => { if(Object.keys(journals[st.id]||{}).length>0) totalFil++; });
  const allAvg = students.reduce((acc,st)=>{
    const myJ=journals[st.id]||{};
    let tot=0,fil=0;
    for(let dd=1;dd<=days;dd++){const k=y+"-"+String(mo+1).padStart(2,"0")+"-"+String(dd).padStart(2,"0");if(myJ[k]){tot+=calcScore(myJ[k]);fil++;}}
    return acc+(fil>0?Math.round(tot/fil):0);
  },0);
  const classAvg = students.length>0 ? Math.round(allAvg/students.length) : 0;

  return (
    <div style={{ padding:"14px 14px 100px" }}>
      {/* Header */}
      <div style={{ marginBottom:14, display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div>
          <h3 style={{ fontWeight:900, fontSize:15, color:TX, margin:"0 0 4px" }}>
            📊 Rekap Kelas {user.kelas}
          </h3>
          <p style={{ fontSize:11, color:MU, margin:0 }}>{bulan} {y} · Wali Kelas: {user.name}</p>
          {lastRefresh && <p style={{ fontSize:10, color:"#22C55E", margin:"3px 0 0" }}>✅ Diperbarui pukul {lastRefresh}</p>}
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          style={{ background:refreshing?"#9CA3AF":"linear-gradient(90deg,"+G+","+T+")",
            color:"#fff", border:"none", borderRadius:10, padding:"8px 14px",
            fontFamily:"Nunito,sans-serif", fontWeight:800, fontSize:12, cursor:"pointer",
            display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
          {refreshing ? "⏳ Memuat..." : "🔄 Refresh"}
        </button>
      </div>

      {/* Class summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:9, marginBottom:14 }}>
        {[["👨‍👩‍👧",students.length+"","Total Siswa","#2563EB"],
          ["✅",totalFil+"","Sudah Isi",G],
          ["📊",classAvg+"%","Rata-rata","#F97316"]].map(([ic,v,l,col])=>(
          <div key={l} style={{ ...CS, padding:"12px 8px", textAlign:"center", border:"2px solid "+col+"22" }}>
            <div style={{ fontSize:20 }}>{ic}</div>
            <div style={{ fontWeight:900, fontSize:18, color:col }}>{v}</div>
            <div style={{ fontSize:10, color:MU, marginTop:1 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* ── TOMBOL DOWNLOAD ── */}
      <div style={{ ...CS, marginBottom:14, background:"linear-gradient(135deg,#F0FDF4,#E0F2FE)", border:"2px solid "+G+"30" }}>
        <p style={{ fontWeight:900, fontSize:13, color:TX, margin:"0 0 4px" }}>📥 Download Rekap Laporan</p>
        <p style={{ fontSize:11, color:MU, margin:"0 0 12px" }}>Unduh laporan pengisian jurnal siswa kelas {user.kelas} bulan {bulan} {y}</p>
        <div style={{ display:"flex", gap:9 }}>
          <button onClick={() => downloadHTML(user, journals, y, mo, siswaList)}
            style={{ flex:1, padding:"11px 0", border:"none", borderRadius:11,
              fontFamily:"Nunito,sans-serif", fontWeight:800, fontSize:13, cursor:"pointer", color:"#fff",
              background:"linear-gradient(90deg,"+G+","+T+")",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            📄 Laporan HTML
          </button>
          <button onClick={() => downloadCSV(user, journals, y, mo, siswaList)}
            style={{ flex:1, padding:"11px 0", border:"2px solid "+G, borderRadius:11,
              fontFamily:"Nunito,sans-serif", fontWeight:800, fontSize:13, cursor:"pointer", color:G,
              background:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            📊 Data Excel/CSV
          </button>
        </div>
        <p style={{ fontSize:10, color:MU, margin:"8px 0 0", textAlign:"center" }}>
          💡 File HTML bisa dibuka di browser &amp; dicetak sebagai PDF. File CSV bisa dibuka di Excel.
        </p>
      </div>

      {/* Daftar siswa */}
      {students.map(st => {
        const myJ = journals[st.id] || {};
        let tot=0, fil=0;
        for (let dd=1; dd<=days; dd++) {
          const k = y+"-"+String(mo+1).padStart(2,"0")+"-"+String(dd).padStart(2,"0");
          if (myJ[k]) { tot+=calcScore(myJ[k]); fil++; }
        }
        const avg2 = fil>0 ? Math.round(tot/fil) : 0;
        const b2   = getBadge(avg2);
        const hd   = HABITS.map(h => {
          let cnt=0;
          Object.values(myJ).forEach(e => {
            const vv=e[h.id]; if(!vv) return;
            if(h.type==="sholat") { if(Object.values(vv).some(Boolean)) cnt++; }
            else if(h.type==="makan") { if(["P","S","M"].some(k2=>vv[k2]&&vv[k2].trim())) cnt++; }
            else cnt++;
          });
          return cnt;
        });
        return (
          <div key={st.id} style={{ ...CS, marginBottom:11 }}>
            <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:10 }}>
              <div style={{ width:42,height:42,borderRadius:11,background:"#D1FAE5",
                display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:18,color:G }}>
                {st.name[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:900, fontSize:14, color:TX }}>{st.name}</div>
                <div style={{ fontSize:11, color:MU }}>NISN: {st.nisn} | NIS: {st.nis} · {fil}/{days} hari</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontWeight:900, fontSize:22, color:avg2>=80?G:avg2>=50?"#F59E0B":"#EF4444" }}>{avg2}%</div>
                <div style={{ background:b2.bg,color:b2.c,borderRadius:7,padding:"1px 7px",fontSize:10,fontWeight:800 }}>{b2.lbl}</div>
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
              {HABITS.map((h,i) => (
                <div key={h.id} style={{ display:"flex",alignItems:"center",gap:3,
                  background:h.color+"15",borderRadius:7,padding:"3px 7px",fontSize:11 }}>
                  <span>{h.icon}</span><span style={{ fontWeight:800, color:h.color }}>{hd[i]}</span>
                </div>
              ))}
            </div>
            <div style={{ background:"#F3F4F6", borderRadius:99, height:7, overflow:"hidden" }}>
              <div style={{ width:avg2+"%", height:"100%", background:"linear-gradient(90deg,"+G+","+T+")", borderRadius:99 }}/>
            </div>
          </div>
        );
      })}
      {students.length===0 && (
        <div style={{ textAlign:"center", padding:40, color:MU }}>
          <div style={{ fontSize:48 }}>📭</div><p>Tidak ada siswa di kelas ini</p>
        </div>
      )}
    </div>
  );
}

/* ── APP ROOT ──────────────────────────────────────────────── */
export default function App() {
  const [user,      setUser]     = useState(null);
  const [page,      setPage]     = useState("beranda");
  const [journals,  setJournals] = useState({});
  const [initDate,  setInitDate] = useState(null);
  const [loading,   setLoading]  = useState(false);
  const [siswaList, setSiswaList]= useState([]);
  const [guruList,  setGuruList] = useState([]);
  const [dataReady, setDataReady]= useState(false);

  // Load data siswa & guru saat pertama buka (lazy)
  useEffect(() => {
    async function loadData() {
      try {
        const [sRes, gRes] = await Promise.all([
          fetch("/data/siswa.json"),
          fetch("/data/guru.json"),
        ]);
        const [sData, gData] = await Promise.all([sRes.json(), gRes.json()]);
        setSiswaList(sData);
        setGuruList(gData);
        setDataReady(true);
      } catch(e) {
        console.error("Gagal load data:", e);
        setDataReady(true);
      }
    }
    loadData();
  }, []);

  async function login(u) {
    setUser(u);
    setPage("beranda");
    setLoading(true);
    try {
      if (u.role === "siswa") {
        const data = await apiGetJurnal(u);
        if (Object.keys(data).length > 0) {
          setJournals(prev => ({ ...prev, [u.id]: data }));
        }
      } else {
        const data = await apiGetAllJurnal(u.kelas);
        const mapped = {};
        Object.entries(data).forEach(([key, jurnals]) => {
          // Coba match dengan NISN dulu, lalu NIS
          const siswa = siswaList.find(s => s.nisn === key || s.nis === key);
          if (siswa) mapped[siswa.id] = jurnals;
        });
        if (Object.keys(mapped).length > 0) setJournals(mapped);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }
  function logout()    { setUser(null); setPage("beranda"); setJournals({}); }
  function goJurnal(d) { setInitDate(d || todayKey()); setPage("jurnal"); }

  // Guru: muat ulang semua jurnal kelas
  async function refreshJournals() {
    if (!user || user.role !== "guru") return;
    try {
      const data = await apiGetAllJurnal(user.kelas);
      const mapped = {};
      Object.entries(data).forEach(([key, jurnals]) => {
        const siswa = siswaList.find(s => s.nisn === key || s.nis === key);
        if (siswa) mapped[siswa.id] = jurnals;
      });
      if (Object.keys(mapped).length > 0) setJournals(mapped);
    } catch(e) { console.error("Refresh error:", e); }
  }

  // Tampilkan loading screen saat data belum siap
  if (!dataReady) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#15803D,#0D9488)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap" rel="stylesheet"/>
      <img src="/logo.png" alt="Logo" style={{ width:90, height:90, marginBottom:16,
        filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}/>
      <div style={{ fontFamily:"Nunito,sans-serif", fontWeight:900, fontSize:28, color:"#fff",
        letterSpacing:2, marginBottom:6 }}>G7KAIH</div>
      <div style={{ fontFamily:"Nunito,sans-serif", fontSize:13, color:"rgba(255,255,255,0.8)",
        marginBottom:24 }}>Memuat data aplikasi...</div>
      <div style={{ display:"flex", gap:8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:"#fff",
            animation:"pulse 1.2s ease-in-out "+i*0.2+"s infinite alternate",
            opacity:.5 }}/>
        ))}
      </div>
      <style>{"@keyframes pulse{to{opacity:1;transform:scale(1.3)}}"}</style>
    </div>
  );

  if (!user) return <Login onLogin={login} siswaList={siswaList} guruList={guruList}/>;

  const tabs = user.role==="siswa"
    ? [{ id:"beranda", ic:"🏠", lb:"Beranda" }, { id:"jurnal", ic:"📓", lb:"Isi Jurnal" }]
    : [{ id:"beranda", ic:"🏠", lb:"Beranda" }, { id:"kelas",  ic:"👥", lb:"Kelas Saya" }];

  return (
    <div style={{ fontFamily:"Nunito,sans-serif", maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"#F0FDF4" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet"/>

      {/* TOP BAR */}
      <div style={{ background:"linear-gradient(90deg,"+G+","+T+")", padding:"7px 14px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <Logo size={38}/>
          <div>
            <div style={{ fontWeight:900, fontSize:15, color:W, letterSpacing:1 }}>G7KAIH</div>
            <div style={{ fontSize:8, color:"rgba(255,255,255,0.8)", fontWeight:600, lineHeight:1.3 }}>
              Gerakan 7 Kebiasaan<br/>Anak Indonesia Hebat
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.7)" }}>{user.role==="guru"?"Guru":"Siswa"} · {user.kelas}</div>
            <div style={{ fontSize:12, fontWeight:800, color:W }}>{user.name.split(" ").slice(0,2).join(" ")}</div>
          </div>
          <button onClick={logout}
            style={{ background:"rgba(255,255,255,0.18)", color:W, border:"1px solid rgba(255,255,255,0.3)",
              borderRadius:9, padding:"5px 10px", fontFamily:"Nunito,sans-serif", fontSize:11, fontWeight:700, cursor:"pointer" }}>
            Keluar
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ paddingBottom:80 }}>
        {loading && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:999,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ background:"#fff", borderRadius:20, padding:"28px 36px", textAlign:"center",
              boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>⏳</div>
              <div style={{ fontWeight:900, fontSize:16, color:G }}>Memuat data jurnal...</div>
              <div style={{ fontSize:12, color:MU, marginTop:4 }}>Mengambil data dari Google Sheets</div>
            </div>
          </div>
        )}
        {page==="beranda" && <Beranda user={user} journals={journals} goJurnal={goJurnal} siswaList={siswaList} refreshJournals={refreshJournals}/>}
        {page==="jurnal"  && user.role==="siswa" && <Jurnal user={user} journals={journals} setJournals={setJournals} initDate={initDate}/>}
        {page==="kelas"   && user.role==="guru"  && <Kelas  user={user} journals={journals} siswaList={siswaList} refreshJournals={refreshJournals}/>}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:480, background:"#fff",
        boxShadow:"0 -2px 14px rgba(0,0,0,0.09)", display:"flex", zIndex:100, borderTop:"1px solid #E5E7EB" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setPage(t.id)}
            style={{ flex:1, padding:"10px 0 12px", border:"none", background:"transparent", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              color:page===t.id?G:MU, fontFamily:"Nunito,sans-serif", fontWeight:page===t.id?900:600, fontSize:11 }}>
            <span style={{ fontSize:23 }}>{t.ic}</span>{t.lb}
            {page===t.id && <div style={{ width:26, height:3, borderRadius:99, background:G, marginTop:1 }}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
