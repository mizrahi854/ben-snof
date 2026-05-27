// =============================================
// LUXE BARBER · app.js  (client)
// =============================================
import {
  db,
  collection, doc, addDoc, getDocs,
  query, where, serverTimestamp
} from "./firebase.js";

const ADMIN_EMAIL = "info@kurodigital.co.il";

// ─── State ───────────────────────────────────────────
const state = {
  services: [],
  barbers: [],
  gallery: [],
  booking: {
    service: null,
    barber: null,
    date: null,
    time: null,
    firstName: "",
    lastName: "",
    language: "",
    phone: ""
  }
};

// ─── Helpers ─────────────────────────────────────────────
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const fmtPrice = n => `₪${Number(n).toLocaleString("he-IL")}`;
const pad      = n => String(n).padStart(2, "0");
const dateKey  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const heDay    = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
const heMonth  = ["ינו","פבר","מרץ","אפר","מאי","יוני","יולי","אוג","ספט","אוק","נוב","דצמ"];

function toast(msg, type = "") {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 3500);
}

window.addEventListener("load", () => {
  setTimeout(() => $("#splash")?.classList.add("hide"), 900);
  animateStats();
});
function animateStats() {
  $$('[data-count]').forEach(el => {
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

function navigate(name) {
  $$(".page").forEach(p => p.classList.remove("active"));
  const target = $(`#page-${name}`);
  if (target) target.classList.add("active");
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.nav === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "booking") resetBookingFlow();
}

document.addEventListener("click", e => {
  const navBtn = e.target.closest("[data-nav]");
  if (navBtn) {
    navigate(navBtn.dataset.nav);
    const s = navBtn.dataset.scroll;
    if (s) setTimeout(() => $(`#${s}`)?.scrollIntoView({ behavior: "smooth" }), 200);
    return;
  }
});

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
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486c?auto=format&fit=crop&w=400&q=80",
];

async function loadServices() {
  try {
    const snap = await getDocs(collection(db, "services"));
    state.services = snap.empty ? DEMO_SERVICES : snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch {
    state.services = DEMO_SERVICES;
  }
  renderServices(); renderBookServices();
}
async function loadBarbers() {
  try {
    const snap = await getDocs(collection(db, "barbers"));
    state.barbers = snap.empty ? DEMO_BARBERS : snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch {
    state.barbers = DEMO_BARBERS;
  }
  renderBarbers(); renderBookBarbers();
}
async function loadGallery() {
  try {
    const snap = await getDocs(collection(db, "gallery"));
    state.gallery = snap.empty ? DEMO_GALLERY.map((url,i)=>({id:`g${i}`,url})) : snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch {
    state.gallery = DEMO_GALLERY.map((url,i)=>({id:`g${i}`,url}));
  }
  renderGallery();
}

function renderServices() {
  const el = $("#servicesGrid"); if(!el) return;
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
    const c = e.target.closest("[data-service]"); if(!c) return;
    state.booking.service = state.services.find(s=>s.id===c.dataset.service);
    navigate("booking");
  };
}
function renderBarbers() {
  const el = $("#barbersScroll"); if(!el) return;
  el.innerHTML = state.barbers.map(b => `
    <div class="barber-card" data-select-barber="${b.id}">
      <div class="barber-photo" style="background-image:url('${b.img||""}')"></div>
      <div class="barber-info"><h4>${b.name}</h4><p>${b.specialty||""}</p></div>
    </div>`).join("");
}
function renderGallery() {
  const el = $("#galleryGrid"); if(!el) return;
  el.innerHTML = state.gallery.map(g => `<div class="gallery-tile" style="background-image:url('${g.url}')"></div>`).join("");
}

function resetBookingFlow() {
  state.booking = {
    service: state.booking.service || null,
    barber: null,
    date: null,
    time: null,
    firstName: state.booking.firstName || "",
    lastName: state.booking.lastName || "",
    language: state.booking.language || "",
    phone: state.booking.phone || ""
  };
  updateCustomerForm();
  renderBookServices();
  renderBookBarbers();
  goToStep(1);
}
function goToStep(n) {
  $$(".step").forEach(s => {
    s.classList.toggle("active", +s.dataset.step === n);
    s.classList.toggle("done", +s.dataset.step < n);
  });
  $$(".step-content").forEach(c => c.classList.toggle("active", +c.dataset.content === n));
  if (n === 4) renderDatePicker();
  if (n === 5) renderTimeSlots();
}

function updateCustomerForm() {
  const firstName = $("#customerFirstName");
  const lastName = $("#customerLastName");
  const language = $("#customerLanguage");
  const phone = $("#customerPhone");
  const button = $("#customerContinueBtn");
  if (!firstName || !lastName || !language || !phone || !button) return;
  firstName.value = state.booking.firstName;
  lastName.value = state.booking.lastName;
  language.value = state.booking.language;
  phone.value = state.booking.phone;
  const canContinue = firstName.value.trim() && lastName.value.trim() && language.value && phone.value.trim();
  button.disabled = !canContinue;
}
function initCustomerForm() {
  const fields = ["#customerFirstName", "#customerLastName", "#customerLanguage", "#customerPhone"];
  fields.forEach(selector => {
    const el = $(selector);
    if (!el) return;
    el.addEventListener("input", () => {
      state.booking.firstName = $("#customerFirstName").value.trim();
      state.booking.lastName = $("#customerLastName").value.trim();
      state.booking.language = $("#customerLanguage").value;
      state.booking.phone = $("#customerPhone").value.trim();
      updateCustomerForm();
    });
  });
  const continueBtn = $("#customerContinueBtn");
  continueBtn?.addEventListener("click", () => {
    if (!state.booking.firstName || !state.booking.lastName || !state.booking.language || !state.booking.phone) {
      toast("אנא מלא את כל פרטי הלקוח", "error");
      return;
    }
    goToStep(2);
  });
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
    state.booking.service = state.services.find(s => s.id === c.dataset.selectService);
    goToStep(3);
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
    state.booking.barber = c.dataset.selectBarber === "any" ? null : state.barbers.find(b => b.id === c.dataset.selectBarber);
    goToStep(4);
  };
}

function renderDatePicker() {
  const el = $("#datePicker"); if (!el) return;
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
    if (!state.booking.phone) {
      toast("נא להזין מספר טלפון לפני בחירת תאריך", "error");
      $("#customerPhone")?.focus();
      return;
    }
    state.booking.date = c.dataset.date;
    goToStep(5);
  };
}

async function renderTimeSlots() {
  const el = $("#timeSlots"); if (!el || !state.booking.date) return;
  el.innerHTML = "<div style='padding:20px;text-align:center;color:var(--text-dim)'>טוען שעות...</div>";
  try {
    const appointmentQuery = state.booking.barber
      ? query(
          collection(db, "appointments"),
          where("barberId", "==", state.booking.barber.id),
          where("date", "==", state.booking.date)
        )
      : query(
          collection(db, "appointments"),
          where("date", "==", state.booking.date)
        );
    const snap = await getDocs(appointmentQuery);
    const taken = snap.docs.map(d => d.data().time);
    renderSlots(taken);
  } catch {
    renderSlots([]);
  }
}

function renderSlots(taken) {
  const el = $("#timeSlots"); if (!el) return;
  const settingsOpen = 9;
  const settingsClose = 21;
  const interval = 30;
  const now = new Date();
  const isToday = state.booking.date === dateKey(now);
  const slots = [];
  for (let h = settingsOpen; h < settingsClose; h++) {
    for (let m = 0; m < 60; m += interval) {
      const time = `${pad(h)}:${pad(m)}`;
      if (isToday) {
        const slotTime = new Date();
        slotTime.setHours(h, m, 0, 0);
        if (slotTime <= now) continue;
      }
      slots.push(time);
    }
  }
  if (!slots.length) {
    el.innerHTML = `<div style='padding:20px;text-align:center;color:var(--text-dim)'>אין שעות פנויות</div>`;
    return;
  }
  el.innerHTML = slots.map(t => {
    const isTaken = taken.includes(t);
    return `<button class="time-slot ${isTaken?"taken":""} ${state.booking.time===t?"selected":""}" data-time="${t}" ${isTaken?"disabled":""}>
      ${t}${isTaken?`<small>תפוס</small>`:""}
    </button>`;
  }).join("");
  el.onclick = e => {
    const c = e.target.closest("[data-time]:not([disabled])"); if (!c) return;
    state.booking.time = c.dataset.time;
    $$(".time-slot").forEach(s => s.classList.remove("selected"));
    c.classList.add("selected");
    const btn = $("#confirmBookingBtn");
    if (btn) btn.disabled = false;
  };
}

function normalizeWhatsappNumber(phone) {
  if (!phone) return "";
  let value = String(phone).replace(/[^0-9+]/g, "");
  if (value.startsWith("+")) value = value.slice(1);
  if (value.startsWith("972")) return value;
  if (value.startsWith("0")) return `972${value.slice(1)}`;
  return value;
}

async function confirmBooking() {
  const btn = $("#confirmBookingBtn");
  const booking = state.booking;
  if (!booking.firstName || !booking.lastName || !booking.language || !booking.phone) {
    return toast("אנא מלא את כל פרטי הלקוח", "error");
  }
  if (!booking.service || !booking.date || !booking.time) {
    return toast("נא לבחור שירות, תאריך ושעה", "error");
  }
  btn.disabled = true;
  btn.textContent = "שומר...";

  const customerName = `${booking.firstName} ${booking.lastName}`;
  const barberName = booking.barber?.name || "כל ספר זמין";
  const barberPhone = booking.barber?.phone || "";
  const notificationText = `הזמנה חדשה\nשם: ${customerName}\nטלפון: ${booking.phone}\nשפה: ${booking.language}\nשירות: ${booking.service.name}\nתאריך: ${booking.date}\nשעה: ${booking.time}\nספר: ${barberName}`;
    const waNumber = normalizeWhatsappNumber(barberPhone);
    const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(notificationText)}` : null;
    const mailto = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent("תור חדש מהאתר")}&body=${encodeURIComponent(notificationText)}`;

    const whatsappTab = waUrl ? window.open(waUrl, "_blank", "noopener") : null;
    const emailTab = window.open(mailto, "_blank", "noopener");

    try {
      await addDoc(collection(db, "appointments"), {
        customerFirstName: booking.firstName,
        customerLastName: booking.lastName,
        customerName,
        customerLanguage: booking.language,
        customerPhone: booking.phone,
        serviceId: booking.service.id,
        serviceName: booking.service.name,
        servicePrice: booking.service.price,
        serviceDuration: booking.service.duration,
        barberId: booking.barber?.id || "any",
        barberName,
        barberPhone,
        date: booking.date,
        time: booking.time,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      toast(`🎉 התור ל-${booking.service.name} ב-${booking.date} בשעה ${booking.time} נשלח!`, "success");
      state.booking = { service:null, barber:null, date:null, time:null, firstName: "", lastName: "", language: "", phone: "" };
      updateCustomerForm();
      setTimeout(() => navigate("home"), 1200);
    } catch (e) {
      toast("שגיאה בשמירה: " + e.message, "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "אשר הזמנה"; }
    }
}

document.addEventListener("click", e => {
  if (e.target.closest("#confirmBookingBtn")) {
    confirmBooking();
  }
});

loadServices();
loadBarbers();
loadGallery();
initCustomerForm();


const firstName = document.getElementById('customerFirstName').value;
const lastName = document.getElementById('customerLastName').value;
const phone = document.getElementById('customerPhone').value;
// איסוף משתני שירות, ספר, תאריך ושעה שנבחרו...

// שליחה לשרת/שמירה לניהול התורים של הברברבורד
saveToAdminDashboard({firstName, lastName, phone, service, barber, date, time});

// בניית טקסט לוואטסאפ של הספר הנבחר
const text = `היי, אני רוצה לקבוע תור דרך האפליקציה! ✂️\n\n👤 שם: ${firstName} ${lastName}\n📞 טלפון: ${phone}\n💇‍♂️ שירות: ${service}\n🗓️ תאריך: ${date}\n🕒 שעה: ${time}`;
window.open(`https://wa.me/${barberPhone}?text=${encodeURIComponent(text)}`, '_blank');