const admin = require("firebase-admin");

let serviceAccount = null;

if (process.env.FIREBASE_KEY) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
  } catch (e) {
    console.error("❌ Firebase JSON parse error:", e.message);
  }
} else {
  console.log("⚠️ FIREBASE_KEY not found – push disabled (localhost)");
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = admin;