import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCIvW3CA6HupHJK2lPmqPnH7APeNmpKvjQ",
  authDomain: "argus-gpt5hack.firebaseapp.com",
  projectId: "argus-gpt5hack",
  storageBucket: "argus-gpt5hack.firebasestorage.app",
  messagingSenderId: "169292103793",
  appId: "1:169292103793:web:0c29749fdeb1dceb9e9bd0",
  measurementId: "G-T8D3NKCF3L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export { app };

