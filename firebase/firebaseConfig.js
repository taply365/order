import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from "dotenv";
dotenv.config()

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account JSON manually
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});




export async function pushNotification(data) {
  const message = {
    token: data.token,
    notification: {
      title: data.title || "Order Update",
      body: data.body || "This is a web push notification",
    },
    webpush: {
      notification: {
        icon: data.icon,
        badge: data.badge,
        image: data.image
      },
      fcmOptions: {
        link: data.link 
      },
      data: {
        link: data.link
      },
    },
  };

  const response = await admin.messaging().send(message);
  console.log("Successfully sent message:", response);
  return response;
}

export default pushNotification;