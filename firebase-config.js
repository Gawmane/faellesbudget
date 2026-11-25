// Firebase-projektets offentlige web-konfiguration.
// Dette er IKKE en hemmelighed: den identificerer kun projektet.
// Adgang til data styres af sikkerhedsreglerne i firestore.rules.
export const firebaseConfig = {
  apiKey: "AIzaSyCTpwWYn7dVBPAurASWG0WdsY9_PFJDnHQ",
  authDomain: "faellesbudget-6deef.firebaseapp.com",
  projectId: "faellesbudget-6deef",
  storageBucket: "faellesbudget-6deef.firebasestorage.app",
  messagingSenderId: "624637093658",
  appId: "1:624637093658:web:bc2652141ca9c36f55eea3"
};

// Offentlig nøgle til web-push (Firebase-konsollen → Projektindstillinger → Cloud Messaging →
// Web Push-certifikater). Heller ikke hemmelig. Tom = notifikationer er ikke sat op endnu.
export const vapidKey = "";
