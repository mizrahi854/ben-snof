// =============================================
// LUXE BARBER · app.js  (client)
// =============================================
import {
  auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile,
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc, getDoc, getDocs,
  onSnapshot, query, where, orderBy, serverTimestamp
} from "./firebase.js";

// ─── State ───────────────────────────────────────────
const state = {
  user:        null,
  profile:     null,
  isAdmin:     false,
  services:    [],
  barbers:     [],
  gallery:     [],
  bookings:    [],
  booking:     { service: null, barber: null, date: null, time: null, phone: "" },
  authMode:    "login",
  bookingsTab: "upcoming",
};

// ─── Helpers ─────────────────────────────────────────────
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const fmtPrice = n => `₪${Number(n).toLocaleString("he-IL")}`;
const pad      = n => String(n).padStart(2, "0");
const dateKey  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const heDay    = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
const heMonth  = ["ינו","פבר","מרץ","אפר","מאי","יוני","יולי","אוג","ספט","אוק","נוב","דצמ"];

// ─── Toast ───────────────────────────────────────────────
function toast(msg, type = "") {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 3500);
}

// ─── Splash ──────────────────────────────────────────────
window.addEventListener("load", () => {
  setTimeout(() => $("#splash")?.classList.add("hide"), 900);
  animateStats();
});
function animateStats() {
  $$("[data-count]").forEach(el => {
    const target = +el.dataset.count;
    let cur = 0;
    const step = Math.max(1, Math.floor(target / 60));
    const tick = () => {
      cur += step;
      if (cur >= target) { el.textContent = target.toLocaleString("he-IL"); return; }
      el.textContent = cur.toLocaleString("he-IL");
      requestAnimationFrame(tick);
    };
    setTimeout(tick, 700);
  });
}

// ─── Navigation ──────────────────────────────────────────
function navigate(name) {
  $$(".page").forEach(p => p.classList.remove("active"));
  const target = $(`#page-${name}`);
  if (target) target.classList.add("active");
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.nav === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "bookings") renderMyBookings();
  if (name === "profile")  renderProfile();
  if (name === "booking") {
    if (!state.user) { openAuth(); return navigate("home"); }
    resetBookingFlow();
  }
}

document.addEventListener("click", e => {
  const navBtn = e.target.closest("[data-nav]");
  if (navBtn) {
    navigate(navBtn.dataset.nav);
    const s = navBtn.dataset.scroll;
    if (s) setTimeout(() => $(`#${s}`)?.scrollIntoView({ behavior: "smooth" }), 200);
  }
  const scrollBtn = e.target.closest("[data-scroll]:not([data-nav])");
  if (scrollBtn) $(`#${scrollBtn.dataset.scroll}`)?.scrollIntoView({ behavior: "smooth" });
  if (e.target.closest("[data-close]")) closeAuth();
});

// ─── Demo fallbacks ───────────────────────────────────────
const DEMO_SERVICES = [
  { id:"s1", name:"תספורת קלאסית",  desc:"תספורת מותאמת אישית עם גימור מושלם", price:80,  duration:30, img:"https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=400&q=80" },
  { id:"s2", name:"תספורת + זקן",   desc:"טיפוח מלא של שיער וזקן",             price:120, duration:45, img:"https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80" },
  { id:"s3", name:"Hot Towel Shave", desc:"גילוח מסורתי עם מגבת חמה",           price:100, duration:40, img:"https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=400&q=80" },
  { id:"s4", name:"טיפוח VIP",       desc:"חבילה מלאה – תספורת, זקן, פנים",     price:220, duration:75, img:"https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=400&q=80" },
];
const DEMO_BARBERS = [
  { id:"b1", name:"אבי כהן",  specialty:"תספורות קלאסיות", phone:"", img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80" },
  { id:"b2", name:"דוד לוי",  specialty:"סטיילינג מודרני", phone:"", img:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80" },
  { id:"b3", name:"יוסי בר",  specialty:"זקנים ועיצוב",   phone:"", img:"https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=400&q=80" },
];
const DEMO_GALLERY = [
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=400&q=80",
];

// ─── Load from Firestore ──────────────────────────────────
async function loadServices() {
  try {
    const snap = await getDocs(collection(db, "services"));
    state.services = snap.empty ? DEMO_SERVICES : snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch { state.services = DEMO_SERVICES; }
  renderServices(); renderBookServices();
}
async function loadBarbers() {
  try {
    const snap = await getDocs(collection(db, "barbers"));
    state.barbers = snap.empty ? DEMO_BARBERS : snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch { state.barbers = DEMO_BARBERS; }
  renderBarbers(); renderBookBarbers();
}
async function loadGallery() {
  try {
    const snap = await getDocs(collection(db, "gallery"));
    state.gallery = snap.empty
      ? DEMO_GALLERY.map((url,i)=>({id:`g${i}`,url}))
      : snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch { state.gallery = DEMO_GALLERY.map((url,i)=>({id:`g${i}`,url})); }
  renderGallery();
}

// ─── Render: Home ─────────────────────────────────────────
function renderServices() {
  const el = $("#servicesGrid"); if (!el) return;
  el.innerHTML = state.services.map(s => `
    <article class="service-card" data-service="${s.id}">
      <div class="service-img" style="background-image:url('${s.img||""}')"></div>
      <div class="service-info"><h3>${s.name}</h3><p>${s.desc||""}</p></div>
      <div class="service-meta">
        <div class="service-price">${fmtPrice(s.price)}</div>
        <div class="service-duration">${s.duration} דק׳</div>
      </div>
    </article>`).join("");
  el.onclick = e => {
    const c = e.target.closest("[data-service]"); if (!c) return;
    state.booking.service = state.services.find(s=>s.id===c.dataset.service);
    navigate("booking");
  };
}
function renderBarbers() {
  const el = $("#barbersScroll"); if (!el) return;
  el.innerHTML = state.barbers.map(b => `
    <div class="barber-card">
      <div class="barber-photo" style="background-image:url('${b.img||""}')"></div>
      <div class="barber-info"><h4>${b.name}</h4><p>${b.specialty||""}</p></div>
    </div>`).join("");
}
function renderGallery() {
  const el = $("#galleryGrid"); if (!el) return;
  el.innerHTML = state.gallery.map(g =>
    `<div class="gallery-tile" style="background-image:url('${g.url}')"></div>`
  ).join("");
}

// ─── Booking Flow ─────────────────────────────────────────
function resetBookingFlow() {
  state.booking = { service: state.booking.service||null, barber:null, date:null, time:null, phone: state.booking.phone||"" };
  goToStep(state.booking.service ? 2 : 1);
}
function goToStep(n) {
  $$(".step").forEach(s => {
    s.classList.toggle("active", +s.dataset.step===n);
    s.classList.toggle("done",   +s.dataset.step < n);
  });
  $$(".step-content").forEach(c => c.classList.toggle("active", +c.dataset.content===n));
  if (n===3) renderDatePicker();
  if (n===4) renderTimeSlots();
}
function renderBookServices() {
  const el = $("#bookServices"); if (!el) return;
  el.innerHTML = state.services.map(s => `
    <div class="book-item ${state.booking.service?.id===s.id?"selected":""}" data-select-service="${s.id}">
      <div class="book-item-img" style="background-image:url('${s.img||""}')"></div>
      <div class="book-item-info"><h4>${s.name}</h4><p>${s.desc||""}</p></div>
      <div class="book-item-price">${fmtPrice(s.price)}<small>${s.duration} דק׳</small></div>
    </div>`).join("");
  el.onclick = e => {
    const c = e.target.closest("[data-select-service]"); if (!c) return;
    state.booking.service = state.services.find(s=>s.id===c.dataset.selectService);
    goToStep(2);
  };
}
function renderBookBarbers() {
  const el = $("#bookBarbers"); if (!el) return;
  const anyOption = `
    <div class="book-item ${!state.booking.barber?"selected":""}" data-select-barber="any">
      <div class="book-item-img" style="font-size:28px;display:flex;align-items:center;justify-content:center">✂️</div>
      <div class="book-item-info"><h4>כל ספר זמין</h4><p>הקצה אוטומטית</p></div>
    </div>`;
  el.innerHTML = anyOption + state.barbers.map(b => `
    <div class="book-item ${state.booking.barber?.id===b.id?"selected":""}" data-select-barber="${b.id}">
      <div class="book-item-img" style="background-image:url('${b.img||""}')"></div>
      <div class="book-item-info"><h4>${b.name}</h4><p>${b.specialty||""}</p></div>
    </div>`).join("");
  el.onclick = e => {
    const c = e.target.closest("[data-select-barber]"); if (!c) return;
    state.booking.barber = c.dataset.selectBarber==="any" ? null : state.barbers.find(b=>b.id===c.dataset.selectBarber);
    goToStep(3);
  };
}

function renderDatePicker() {
  const el = $("#datePicker"); if (!el) return;
  const phoneInput = $("#bookingPhone");
  if (phoneInput) {
    phoneInput.value = state.booking.phone || state.profile?.phone || "";
    phoneInput.oninput = () => { state.booking.phone = phoneInput.value.trim(); };
  }
  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(today.getDate()+90);
  let html = "";
  const cur = new Date(today);
  while(cur <= maxDate) {
    const dk = dateKey(cur);
    const day = cur.getDay();
    const isShabbat = day === 6;
    const dayName = heDay[day];
    const monthName = heMonth[cur.getMonth()];
    html += `
      <div class="date-item ${isShabbat?"disabled":""} ${state.booking.date===dk?"selected":""}" data-date="${dk}">
        <div class="date-day">${dayName}</div>
        <div class="date-num">${cur.getDate()}</div>
        <div class="date-month">${monthName}</div>
      </div>`;
    cur.setDate(cur.getDate()+1);
  }
  el.innerHTML = html;
  el.onclick = e => {
    const c = e.target.closest("[data-date]:not(.disabled)"); if (!c) return;
    const phoneValue = phoneInput?.value.trim() || "";
    if (!phoneValue) {
      toast("נא להזין מספר טלפון לפני בחירת תאריך","error");
      phoneInput?.focus();
      return;
    }
    state.booking.phone = phoneValue;
    state.booking.date = c.dataset.date;
    goToStep(4);
  };
}

async function renderTimeSlots() {
  const el = $("#timeSlots"); if (!el || !state.booking.date) return;
  el.innerHTML = "<div style='padding:20px;text-align:center;color:var(--text-dim)'>טוען שעות...</div>";
  try {
    const appointmentQuery = state.booking.barber
      ? query(
          collection(db,"appointments"),
          where("barberId","==",state.booking.barber.id),
          where("date","==",state.booking.date)
        )
      : query(
          collection(db,"appointments"),
          where("date","==",state.booking.date)
        );
    const snap = await getDocs(appointmentQuery);
    const taken = snap.docs.map(d=>d.data().time);
    renderSlots(taken);
  } catch {
    renderSlots([]);
  }
}

function renderSlots(taken) {
  const el = $("#timeSlots"); if (!el) return;
  const settingsOpen  = 9;
  const settingsClose = 21;
  const interval = 30; // minutes
  const now = new Date();
  const isToday = state.booking.date === dateKey(now);
  const slots = [];
  for(let h=settingsOpen; h<settingsClose; h++) {
    for(let m=0; m<60; m+=interval) {
      const time = `${pad(h)}:${pad(m)}`;
      if(isToday) {
        const slotTime = new Date(); slotTime.setHours(h,m,0,0);
        if(slotTime <= now) continue;
      }
      slots.push(time);
    }
  }
  if(!slots.length){ el.innerHTML=`<div style='padding:20px;text-align:center;color:var(--text-dim)'>אין שעות פנויות</div>`; return; }
  el.innerHTML = slots.map(t => {
    const isTaken = taken.includes(t);
    return `<button class="time-slot ${isTaken?"taken":""} ${state.booking.time===t?"selected":""}"
      data-time="${t}" ${isTaken?"disabled":""}>
      ${t}${isTaken?`<small>תפוס</small>`:""}
    </button>`;
  }).join("");
  el.onclick = e => {
    const c = e.target.closest("[data-time]:not([disabled])"); if (!c) return;
    state.booking.time = c.dataset.time;
    $$(".time-slot").forEach(s=>s.classList.remove("selected"));
    c.classList.add("selected");
    const btn = $("#confirmBookingBtn");
    if(btn) btn.disabled = false;
  };
}

// ─── Confirm Booking ──────────────────────────────────────
document.addEventListener("click", e => {
  if(!e.target.closest("#confirmBookingBtn")) return;
  confirmBooking();
});
async function confirmBooking() {
  const btn = $("#confirmBookingBtn");
  if(!state.user) return openAuth();
  const { service, barber, date, time, phone } = state.booking;
  const profile = state.profile || {};
  const userPhone = phone || profile.phone || "";
  if(!service||!date||!time) return toast("נא לבחור שירות, תאריך ושעה","error");
  if(!userPhone) return toast("נא להזין מספר טלפון","error");
  btn.disabled=true; btn.textContent="שומר...";
  try {
    await addDoc(collection(db,"appointments"),{
      userId:          state.user.uid,
      userName:        profile.name || state.user.displayName || "לקוח",
      userEmail:       state.user.email || "",
      userPhone:       userPhone,
      serviceId:       service.id,
      serviceName:     service.name,
      servicePrice:    service.price,
      serviceDuration: service.duration,
      barberId:        barber?.id || "any",
      barberName:      barber?.name || "כל ספר זמין",
      barberPhone:     barber?.phone || "",
      date, time,
      status:          "pending",
      createdAt:       serverTimestamp(),
    });
    toast(`🎉 התור ל-${service.name} ב-${date} בשעה ${time} נשלח לאישור!`,"success");
    state.booking = { service:null, barber:null, date:null, time:null, phone: "" };
    setTimeout(()=>navigate("bookings"), 1200);
  } catch(e) {
    toast("שגיאה בשמירה: "+e.message,"error");
  } finally {
    if(btn){ btn.disabled=false; btn.textContent="אשר הזמנה"; }
  }
}

// ─── My Bookings ─────────────────────────────────────────
let unsubBookings = null;
function subscribeBookings() {
  if (unsubBookings) unsubBookings();
  if (!state.user) return;
  const q1 = query(collection(db,"appointments"), where("userId","==",state.user.uid));
  unsubBookings = onSnapshot(q1, snap => {
    state.bookings = snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
    if ($("#page-bookings")?.classList.contains("active")) renderMyBookings();
  });
}
function renderMyBookings() {
  const el = $("#myBookings"); if (!el) return;
  if (!state.user) {
    el.innerHTML=`<div style="padding:40px;text-align:center" class="muted">התחבר כדי לראות את התורים שלך</div>`;
    return;
  }
  const today = dateKey(new Date());
  const list = state.bookings.filter(b => state.bookingsTab==="upcoming"
    ? (b.date>=today && b.status!=="rejected" && b.status!=="completed")
    : (b.date<today  || b.status==="completed" || b.status==="rejected")
  );
  if (!list.length) {
    el.innerHTML=`<div style="padding:40px;text-align:center" class="muted">
      <div style="font-size:48px;margin-bottom:12px">📅</div>
      אין תורים ${state.bookingsTab==="upcoming"?"קרובים":"בהיסטוריה"}
    </div>`; return;
  }
  const lbl = { pending:"⏳ ממתין לאישור", approved:"✅ מאושר", rejected:"❌ נדחה", completed:"✔️ הושלם" };
  el.innerHTML = list.map(b=>`
    <article class="booking-card">
      <div class="booking-row">
        <h4>${b.serviceName}</h4>
        <span class="status-badge status-${b.status}">${lbl[b.status]||b.status}</span>
      </div>
      <div class="booking-meta">
        <span>📅 ${b.date}</span>
        <span>🕒 ${b.time}</span>
        <span>✂️ ${b.barberName}</span>
        <span>💰 ${fmtPrice(b.servicePrice)}</span>
      </div>
      <div class="booking-actions">
        ${(b.status==="pending"||b.status==="approved")?`<button class="btn btn-danger" data-cancel="${b.id}">בטל תור</button>`:""}
      </div>
    </article>`).join("");
  el.onclick = async e => {
    const c = e.target.closest("[data-cancel]"); if (!c) return;
    if (!confirm("לבטל את התור?")) return;
    try {
      const booking = state.bookings.find(b=>b.id===c.dataset.cancel);
      await deleteDoc(doc(db,"appointments",c.dataset.cancel));
      toast("התור בוטל","success");
      if(booking?.barberPhone) {
        const msg = `שלום ${booking.barberName||'ספר'}!\nהתור של ${booking.userName||booking.customerName||'לקוח'} ב-${booking.date} בשעה ${booking.time} בוטל.`;
        const normalized = String(booking.barberPhone).replace(/\D/g,'').replace(/^0/, '972');
        if(normalized) window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    }
    catch(er){ toast("שגיאה: "+er.message,"error"); }
  };
}
$$(".tab").forEach(t => t.addEventListener("click",()=>{
  $$(".tab").forEach(x=>x.classList.remove("active"));
  t.classList.add("active");
  state.bookingsTab = t.dataset.tab;
  renderMyBookings();
}));

// ─── Profile ─────────────────────────────────────────────
function renderProfile() {
  const el = $("#profileContent"); if (!el) return;
  if (!state.user) {
    el.innerHTML=`<div style="padding:48px 24px;text-align:center">
      <div style="font-size:72px;margin-bottom:16px">👤</div>
      <h3 style="margin-bottom:8px;font-size:20px">שלום! כנס לחשבון</h3>
      <p class="muted" style="margin-bottom:24px">כדי להזמין תורים ולנהל את הפרופיל שלך</p>
      <button class="btn btn-primary" id="openAuthBtn" style="font-size:16px;padding:14px 32px">התחברות / הרשמה</button>
    </div>`;
    $("#openAuthBtn").onclick = openAuth;
    return;
  }
  const name    = state.profile?.name || state.user.displayName || "לקוח";
  const initial = name.trim().charAt(0).toUpperCase();
  el.innerHTML=`
    <div class="profile-header">
      <div class="profile-avatar">${initial}</div>
      <div class="profile-info">
        <h3>${name}</h3>
        <p>${state.user.email||""}</p>
        ${state.profile?.phone?`<p>📞 ${state.profile.phone}</p>`:""}
      </div>
    </div>
    <div class="profile-list">
      <div class="profile-item" data-nav="bookings"><span>📅 התורים שלי</span><span>›</span></div>
      ${state.isAdmin?`<div class="profile-item" id="goAdminBtn" style="color:#c9a84c"><span>⚙️ פאנל ניהול</span><span>›</span></div>`:""}
      <div class="profile-item" id="logoutBtn"><span>🚪 התנתק</span><span>›</span></div>
    </div>`;
  $("#logoutBtn").onclick = async() => {
    await signOut(auth);
    toast("התנתקת, להתראות 👋");
    renderProfile();
  };
  if (state.isAdmin) {
    $("#goAdminBtn").onclick = () => { window.location.href = "admin/admin.html"; };
  }
}

// ─── Auth Modal ───────────────────────────────────────────
function openAuth()  { $("#authModal")?.classList.add("open"); }
function closeAuth() { $("#authModal")?.classList.remove("open"); }

// Update UI text based on mode
function updateAuthUI() {
  const isLogin = state.authMode === "login";
  const btn = $("#emailForm button[data-mode]");
  const toggle = $("#toggleAuthMode");
  const title  = $("#authTitle");
  const sub    = $("#authSubtitle");
  const nameField = $("#emName");
  if(btn)       btn.textContent    = isLogin ? "התחבר" : "הירשם";
  if(toggle)    toggle.textContent = isLogin ? "אין לך חשבון? הירשם" : "כבר יש חשבון? התחבר";
  if(title)     title.textContent  = isLogin ? "התחברות" : "הרשמה";
  if(sub)       sub.textContent    = isLogin ? "היכנס לחשבון שלך" : "צור חשבון חדש – פשוט ומהיר";
  if(nameField) nameField.style.display = isLogin ? "none" : "block";
}

// Toggle login / signup
const toggleBtn = $("#toggleAuthMode");
if (toggleBtn) toggleBtn.addEventListener("click",()=>{
  state.authMode = state.authMode==="login"?"signup":"login";
  updateAuthUI();
});

// Email/Password submit — Email+Password only, no SMS/reCAPTCHA
$("#emailForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("#emEmail")?.value.trim();
  const pass  = $("#emPass")?.value;
  const name  = $("#emName")?.value.trim();
  if (!email||!pass) return toast("נא למלא אימייל וסיסמה","error");

  const submitBtn = e.target.querySelector("button[data-mode]");
  if(submitBtn) { submitBtn.disabled=true; submitBtn.textContent="מעבד..."; }

  try {
    if (state.authMode==="signup") {
      if (pass.length<6) return toast("הסיסמה חייבת להכיל לפחות 6 תווים","error");
      const cred = await createUserWithEmailAndPassword(auth,email,pass);
      if (name) await updateProfile(cred.user,{displayName:name});
      await setDoc(doc(db,"users",cred.user.uid),{
        name:name||"לקוח", email, phone:"", createdAt:serverTimestamp(),
      });
      toast(`ברוך הבא ${name||""}! נרשמת בהצלחה 🎉`,"success");
    } else {
      const cred = await signInWithEmailAndPassword(auth,email,pass);
      const displayName = cred.user.displayName || state.profile?.name || "לקוח";
      toast(`שלום ${displayName}! התחברת בהצלחה ✅`,"success");
    }
    closeAuth();
  } catch(er) {
    const msgs = {
      "auth/user-not-found":      "המשתמש לא נמצא — נסה להירשם",
      "auth/wrong-password":      "סיסמה שגויה, נסה שוב",
      "auth/invalid-credential":  "אימייל או סיסמה שגויים",
      "auth/email-already-in-use":"האימייל כבר רשום — לחץ 'כבר יש חשבון? התחבר'",
      "auth/invalid-email":       "כתובת אימייל לא תקינה",
      "auth/too-many-requests":   "יותר מדי ניסיונות, נסה שוב בעוד כמה דקות",
      "auth/weak-password":       "הסיסמה חלשה מדי — בחר לפחות 6 תווים",
    };
    toast(msgs[er.code]||"שגיאה: "+er.message,"error");
  } finally {
    if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent=state.authMode==="login"?"התחבר":"הירשם"; }
  }
});

// Auth state listener
onAuthStateChanged(auth, async user => {
  state.user = user;
  if (user) {
    try {
      const snap = await getDoc(doc(db,"users",user.uid));
      state.profile = snap.exists() ? snap.data() : null;
    } catch { state.profile=null; }
    // Check admin
    try {
      const aSnap = await getDoc(doc(db,"admins",user.uid));
      state.isAdmin = aSnap.exists();
    } catch { state.isAdmin=false; }
    subscribeBookings();
  } else {
    if (unsubBookings){ unsubBookings(); unsubBookings=null; }
    state.bookings=[];
    state.isAdmin=false;
  }
  renderProfile();
});

// ─── Init ─────────────────────────────────────────────────
loadServices();
loadBarbers();
loadGallery();
updateAuthUI();