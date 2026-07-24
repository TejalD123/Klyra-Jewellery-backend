const admin = require("firebase-admin");

// serviceAccountKey.json Firebase console se download hoti hai
// (Project Settings -> Service Accounts -> Generate New Private Key)
// IMPORTANT: is file ko .gitignore mein zaroor daalna, GitHub pe kabhi push mat karna

let serviceAccount;

try {
  // Option 1: JSON file se load karna (local development)
  serviceAccount = require("./serviceAccountKey.json");
} catch (err) {
  // Option 2: Environment variable se load karna (production - Render/Railway/etc)
  // .env mein poora JSON ek string ke roop mein daalna padta hai
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;