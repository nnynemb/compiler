import admin from 'firebase-admin';
import serviceAccount from './../certs/nnynemb-editor-firebase-adminsdk-ytgkb-a0a9bc24f8.json' assert { type: 'json' };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const verifyIdToken = async (token) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw error;
  }
};