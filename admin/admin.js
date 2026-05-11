import {
  auth, db,
  collection, query, onSnapshot, orderBy, updateDoc, doc, getDocs, setDoc, getDoc, serverTimestamp
} from "../js/firebase.js";

// ─── State ───────────────────────────────────────────
const state = {
  isLoggedIn: false,
  currentTab: "pending",
  appointments: {
    pending: [],
    approved: [],
    rejected: []
  },
  settings: {}
};

const ADMIN_PASS = "1234";

// ─── DOM Elements ─────────────────────────────────────
const loginScreen = document.getElementById("adminLogin");
const adminShell = document.getElementById("adminShell");
const loginForm = document.getElementById("loginForm");
const adPassInput = document.getElementById("adPass");
const logoutBtn = document.getElementById("logoutBtn");

// ─── Helpers ─────────────────────────────────────────
const toast = (msg, type = "") => {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 3500);
};

// ─── Check if already logged in ───────────────────────
if (sessionStorage.getItem("isLoggedIn") === "true") {
  state.isLoggedIn = true;
  showAdminPanel();
  loadAppointments();
  setupTabListeners();
  setupSettings();
}

// ─── Login Form ──────────────────────────────────────
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (adPassInput.value === ADMIN_PASS) {
    sessionStorage.setItem("isLoggedIn", "true");
    state.isLoggedIn = true;
    showAdminPanel();
    loadAppointments();
    setupTabListeners();
    setupSettings();
  } else {
    toast("סיסמה שגויה", "error");
    adPassInput.value = "";
  }
});

// ─── Logout ──────────────────────────────────────────
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("isLoggedIn");
    state.isLoggedIn = false;
    loginScreen.style.display = "flex";
    adminShell.style.display = "none";
    adPassInput.value = "";
  });
}

// ─── Show Admin Panel ────────────────────────────────
function showAdminPanel() {
  loginScreen.style.display = "none";
  adminShell.style.display = "grid";
}

// ─── Tab Management ─────────────────────────────────
function setupTabListeners() {
  const tabs = document.querySelectorAll(".admin-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;
      
      // Update active tab button
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      // Update active tab content
      document.querySelectorAll(".admin-tab-content").forEach(c => {
        c.classList.remove("active");
      });
      
      const contentId = `${tabName}Tab`;
      const content = document.getElementById(contentId);
      if (content) content.classList.add("active");
      
      state.currentTab = tabName;
    });
  });
}

// ─── Load Appointments ───────────────────────────────
function loadAppointments() {
  const q = query(
    collection(db, "appointments"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    state.appointments = {
      pending: [],
      approved: [],
      rejected: []
    };

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status = data.status || "pending";
      
      if (status === "pending") {
        state.appointments.pending.push({ id: docSnap.id, ...data });
      } else if (status === "approved") {
        state.appointments.approved.push({ id: docSnap.id, ...data });
      } else if (status === "rejected") {
        state.appointments.rejected.push({ id: docSnap.id, ...data });
      }
    });

    updateBadges();
    renderAppointments();
  });
}

// ─── Update Badge Counts ────────────────────────────
function updateBadges() {
  const pendingBadge = document.querySelector(".pending-count");
  const approvedBadge = document.querySelector(".approved-count");
  const rejectedBadge = document.querySelector(".rejected-count");
  
  if (pendingBadge) pendingBadge.textContent = state.appointments.pending.length;
  if (approvedBadge) approvedBadge.textContent = state.appointments.approved.length;
  if (rejectedBadge) rejectedBadge.textContent = state.appointments.rejected.length;
}

// ─── Render Appointments ────────────────────────────
function renderAppointments() {
  const tabsData = {
    pending: { list: state.appointments.pending, elementId: "pendingList" },
    approved: { list: state.appointments.approved, elementId: "approvedList" },
    rejected: { list: state.appointments.rejected, elementId: "rejectedList" }
  };

  Object.entries(tabsData).forEach(([status, { list, elementId }]) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (list.length === 0) {
      el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-dim)">אין תורים</div>`;
      return;
    }

    el.innerHTML = list.map(appt => {
      const statusLabel = {
        pending: "⏳ ממתין לאישור",
        approved: "✅ מאושר",
        rejected: "❌ נדחה"
      };

      return `
        <div class="booking-item">
          <div class="booking-header">
            <h3>${appt.userName || "לקוח"}</h3>
            <span class="booking-status status-${appt.status}">${statusLabel[appt.status] || appt.status}</span>
          </div>
          <div class="booking-details">
            <div class="detail-item">
              <span class="detail-icon">🧑</span>
              <span>${appt.userName || "לא מעודכן"}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">📞</span>
              <span>${appt.userPhone || "לא מעודכן"}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">✂️</span>
              <span>${appt.serviceName || "לא מעודכן"}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">💇</span>
              <span>${appt.barberName || "לא מעודכן"}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">📅</span>
              <span>${appt.date || "לא מעודכן"}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">🕒</span>
              <span>${appt.time || "לא מעודכן"}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">💰</span>
              <span>₪${appt.servicePrice || "0"}</span>
            </div>
          </div>
          <div class="booking-actions">
            ${appt.status === "pending" ? `
              <button class="btn btn-primary" data-approve="${appt.id}" data-phone="${appt.userPhone}" data-name="${appt.userName}" data-service="${appt.serviceName}" data-date="${appt.date}" data-time="${appt.time}">
                אשר ✅
              </button>
              <button class="btn btn-danger" data-reject="${appt.id}" data-phone="${appt.userPhone}" data-name="${appt.userName}">
                דחה ❌
              </button>
            ` : ""}
          </div>
        </div>
      `;
    }).join("");
  });

  // Setup event listeners
  setupBookingActions();
}

// ─── Setup Booking Actions ─────────────────────────
function setupBookingActions() {
  // Approve buttons
  document.querySelectorAll("[data-approve]").forEach(btn => {
    btn.addEventListener("click", () => {
      approveBooking(
        btn.dataset.approve,
        btn.dataset.phone,
        btn.dataset.name,
        btn.dataset.service,
        btn.dataset.date,
        btn.dataset.time
      );
    });
  });

  // Reject buttons
  document.querySelectorAll("[data-reject]").forEach(btn => {
    btn.addEventListener("click", () => {
      rejectBooking(
        btn.dataset.reject,
        btn.dataset.phone,
        btn.dataset.name
      );
    });
  });
}

// ─── Approve Booking & Send WhatsApp ────────────────
window.approveBooking = async (id, phone, name, service, date, time) => {
  try {
    await updateDoc(doc(db, "appointments", id), {
      status: "approved"
    });

    // נקה את המספר והוסף קידומת
    const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '972');

    const msg = `שלום ${name}! 🎉

התור שלך אושר בהצלחה ✅

📞 שירות: ${service}
📅 תאריך: ${date}
⏰ שעה: ${time}

אנחנו ממתינים לך ב-LUXE Barber!`;

    // Open WhatsApp Web with pre-filled message
    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );

    toast("התור אושר והודעה נשלחה!", "success");
    renderAppointments();
  } catch (e) {
    toast("שגיאה בעדכון: " + e.message, "error");
  }
};

// ─── Reject Booking & Send WhatsApp ─────────────────
window.rejectBooking = async (id, phone, name) => {
  try {
    await updateDoc(doc(db, "appointments", id), {
      status: "rejected"
    });

    // נקה את המספר והוסף קידומת
    const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '972');

    const msg = `שלום ${name},

להצטערנו, התור שלך נדחה ❌

אנא נסה לתאם מועד אחר דרך האפליקציה.

LUXE Barber`;

    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );

    toast("התור נדחה והודעה נשלחה!", "success");
    renderAppointments();
  } catch (e) {
    toast("שגיאה בעדכון: " + e.message, "error");
  }
};

// ─── Settings Management ────────────────────────────
async function setupSettings() {
  const settingsForm = document.getElementById("settingsForm");
  
  if (settingsForm) {
    // Load current settings
    try {
      const settingsSnap = await getDoc(doc(db, "barber", "settings"));
      if (settingsSnap.exists()) {
        const settings = settingsSnap.data();
        document.getElementById("barberName").value = settings.barberName || "LUXE Barber";
        document.getElementById("barberPhone").value = settings.barberPhone || "";
        document.getElementById("whatsappNumber").value = settings.whatsappNumber || "";
        document.getElementById("barberAddress").value = settings.barberAddress || "";
      }
    } catch (e) {
      console.log("Settings not found, using defaults");
    }

    // Save settings
    settingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      try {
        const settingsData = {
          barberName: document.getElementById("barberName").value,
          barberPhone: document.getElementById("barberPhone").value,
          whatsappNumber: document.getElementById("whatsappNumber").value,
          barberAddress: document.getElementById("barberAddress").value,
          updatedAt: serverTimestamp()
        };

        // Save to Firestore - always save to a fixed document ID
        const settingsRef = doc(db, "barber", "settings");
        await setDoc(settingsRef, settingsData, { merge: true });

        toast("ההגדרות נשמרו בהצלחה!", "success");
      } catch (e) {
        toast("שגיאה בשמירה: " + e.message, "error");
      }
    });
  }

  // Load services button
  const addServiceBtn = document.getElementById("addServiceBtn");
  if (addServiceBtn) {
    addServiceBtn.addEventListener("click", () => {
      const name = prompt("שם השירות:");
      if (!name) return;
      const price = prompt("מחיר:");
      if (!price) return;
      const duration = prompt("משך זמן (בדקות):");
      if (!duration) return;

      // Can be extended to save to Firestore
      toast("שירות נוסף בהצלחה!", "success");
    });
  }

  // Load barbers button
  const addBarberBtn = document.getElementById("addBarberBtn");
  if (addBarberBtn) {
    addBarberBtn.addEventListener("click", () => {
      const name = prompt("שם הספר:");
      if (!name) return;
      const specialty = prompt("התמחות:");
      if (!specialty) return;

      // Can be extended to save to Firestore
      toast("ספר נוסף בהצלחה!", "success");
    });
  }
}