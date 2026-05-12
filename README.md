# LUXE Barber 💈

אפליקציית הזמנת תורים יוקרתית למספרה — HTML / CSS / Vanilla JavaScript + Firebase v12.
RTL בעברית, מובייל-פירסט, Dark Mode, Glassmorphism, מוכנה ל-Capacitor.

## 📂 מבנה הפרויקט

```
barber/
├── index.html              ← אפליקציית הלקוח
├── manifest.json           ← PWA manifest
├── css/
│   └── style.css           ← עיצוב יוקרתי (dark + glass + animations)
├── js/
│   ├── firebase.js         ← הגדרת Firebase (להחליף את ה-config)
│   └── app.js              ← לוגיקת הלקוח
├── admin/
│   ├── admin.html          ← פאנל ניהול
│   ├── admin.css
│   └── admin.js
├── assets/
│   └── icon-192.png / icon-512.png  ← אייקונים (להחליף)
├── firestore.rules         ← חוקי אבטחה למסד הנתונים
└── storage.rules           ← חוקי אבטחה לאחסון
```

## 🚀 הפעלה מהירה

### 1. צור פרויקט Firebase
1. כנס ל-https://console.firebase.google.com → New Project
2. הפעל **Authentication** → אפשר Email/Password ו-Phone
3. הפעל **Firestore Database** (Production mode)
4. הפעל **Storage**
5. ב-Project Settings → Your apps → צור Web App וקח את ה-config

### 2. הדבק את ה-Firebase config
פתח `js/firebase.js` והחלף את `firebaseConfig`:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

### 3. הגדר מנהל
- צור משתמש ב-Firebase Auth (Email/Password) — למשל `admin@luxe.com`
- ערוך `admin/admin.js`:
  ```js
  const ADMIN_EMAILS = ["admin@luxe.com"];
  ```
- (מומלץ) צור גם מסמך ב-Firestore: `admins/{uid}` עם `{ role: "admin" }` כדי ש-rules יעבדו.

### 4. הרצה מקומית
```bash
# כל שרת סטטי יעבוד. למשל:
npx serve .
# או
python3 -m http.server 8080
```
פתח: http://localhost:8080  
פאנל ניהול: http://localhost:8080/admin/admin.html

> ⚠️ Phone Auth דורש דומיין מורשה ב-Firebase Console → Authentication → Settings → Authorized domains.

## 🗃️ מבנה Firestore

| Collection      | שדות עיקריים |
|-----------------|--------------|
| `users`         | `name, email, phone, createdAt` |
| `services`      | `name, desc, price, duration, img` |
| `barbers`       | `name, specialty, img, hours` |
| `gallery`       | `url, path, createdAt` |
| `appointments`  | `userId, userName, userPhone, serviceId, serviceName, servicePrice, serviceDuration, barberId, barberName, date (YYYY-MM-DD), time (HH:MM), status (pending/approved/rejected/completed), createdAt` |
| `settings/main` | `openTime, closeTime, interval, whatsapp, instagram, address` |
| `blockedHours`  | `date, fromTime, toTime, reason` (לחסימת שעות) |
| `admins/{uid}`  | `role: "admin"` |
| `notifications` | `userId, title, body, type, read, createdAt` |

## 🔒 חוקי אבטחה
פרוס את הקבצים `firestore.rules` ו-`storage.rules`:
```bash
firebase deploy --only firestore:rules,storage
```

## 📱 הכנה ל-Capacitor (iOS App)

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "LUXE Barber" com.luxe.barber --web-dir=.
npx cap add ios
npx cap sync
npx cap open ios
```
- וודא ש-`capacitor.config.json` מצביע על `webDir: "."` (תיקיית הפרויקט).
- ב-Xcode: בחר Team, Bundle ID, ולחץ Run על מכשיר/סימולטור.
- אייקון/Splash: השתמש ב-`@capacitor/assets` כדי לייצר אוטומטית מכל הגדלים.

## 🔔 Push Notifications (FCM)
1. ב-Firebase Console → Project Settings → Cloud Messaging → צור VAPID key
2. צור קובץ `firebase-messaging-sw.js` ב-root עם:
   ```js
   importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js");
   importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js");
   firebase.initializeApp({ /* same config */ });
   firebase.messaging();
   ```
3. ב-`js/firebase.js` הוסף:
   ```js
   import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging.js";
   export const messaging = getMessaging(app);
   // getToken(messaging, { vapidKey: "YOUR_VAPID_KEY" })
   ```
4. ב-Capacitor iOS: השתמש ב-`@capacitor/push-notifications` במקום FCM Web SDK.

## 🌐 Hosting

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # public dir = "."
firebase deploy
```

### Netlify / Vercel
פשוט גרור את כל התיקייה לדשבורד או חבר ל-Git. אין צורך ב-build.

## 🎨 התאמה אישית
- **צבעי המותג**: ערוך את `--gold` / `--accent` ב-`css/style.css` (CSS variables).
- **גופנים**: מוגדרים דרך Google Fonts ב-`<head>`.
- **לוגו / אייקון**: החלף את `assets/icon-192.png` ו-`icon-512.png`.
- **WhatsApp**: עדכן את המספר ב-`index.html` (FAB) וב-`settings/main`.

## ✅ פיצ'רים מובנים
- 🔐 Auth: Email + Phone (OTP)
- 📅 הזמנת תור: שירות → ספר → תאריך (3 חודשים קדימה) → שעה
- 🚫 חסימת תורים שנלקחו / עברו
- ⏳ סטטוסים: pending / approved / rejected / completed
- 👤 פרופיל + תורים שלי + ביטול
- 📊 פאנל ניהול: דשבורד KPI, יומן שבועי, אישור/דחייה, ניהול שירותים/ספרים/גלריה/הגדרות
- 💚 שילוב WhatsApp deep links
- 🖼️ גלריה דינמית מ-Firebase Storage
- 📱 PWA + Capacitor ready + iPhone safe-area
- ✨ Glassmorphism, skeletons, smooth animations, splash

מקווה שתהנה! 🖤
