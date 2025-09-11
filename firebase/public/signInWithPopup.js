import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';



const firebaseConfig = {
  apiKey: "AIzaSyBDw5cjVNw5_SqPTkKUem2hUHjGBpsELPY",
  authDomain: "zyora-c8df7.firebaseapp.com",
  projectId: "zyora-c8df7",
  storageBucket: "zyora-c8df7.firebasestorage.app",
  messagingSenderId: "50915062990",
  appId: "1:50915062990:web:d2bf4b6c62a8f12b854c9f",
  measurementId:  "G-1ZKX1EJYH"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth();

// This gives you a reference to the parent frame, i.e. the offscreen document.
const PARENT_FRAME = document.location.ancestorOrigins[0];

const PROVIDER = new GoogleAuthProvider();

function sendResponse(result) {
  window.parent.postMessage(JSON.stringify(result), PARENT_FRAME);
}

window.addEventListener('message', function({data}) {
  if (data.initAuth) {
    signInWithPopup(auth, PROVIDER)
      .then(sendResponse)
      .catch(sendResponse);
  }
});