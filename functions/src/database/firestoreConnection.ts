import * as admin from "firebase-admin";
import * as serviceAccount from "../utils/serviceAccount.json";

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
export default db;
