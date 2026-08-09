import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD-Xu9fAshQHA1Qr1687mGak_OMg2LGIdA",
  authDomain: "painel-vendas-6979e.firebaseapp.com",
  projectId: "painel-vendas-6979e",
  storageBucket: "painel-vendas-6979e.firebasestorage.app",
  messagingSenderId: "157096756625",
  appId: "1:157096756625:web:3c0d3b1260dfbb306e4630"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta o banco de dados para usarmos no painel
export const db = getFirestore(app);