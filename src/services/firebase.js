import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDSssuGJjTdX_ZsTpBqsKe5_cZbmTrmz2I",
    authDomain: "whishlist-2be06.firebaseapp.com",
    projectId: "whishlist-2be06",
    storageBucket: "whishlist-2be06.appspot.com",
    messagingSenderId: "976515073890",
    appId: "1:976515073890:web:df2b23c525b66731318e3b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);