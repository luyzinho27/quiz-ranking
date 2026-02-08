const functions = require('firebase-functions');
const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch (e) {
  // already initialized
}

exports.adminUpdateUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    return { success: false, error: 'unauthenticated' };
  }

  // Recomendação: checar custom claims para admin
  // const requesterUid = context.auth.uid;
  // const requester = await admin.auth().getUser(requesterUid);
  // if (!requester.customClaims || !requester.customClaims.admin) {
  //   return { success: false, error: 'permission-denied' };
  // }

  const uid = data.uid;
  const email = data.email;
  const password = data.password;

  if (!uid) {
    return { success: false, error: 'missing-uid' };
  }

  const updatePayload = {};
  if (email) updatePayload.email = email;
  if (password) updatePayload.password = password;

  if (Object.keys(updatePayload).length === 0) {
    return { success: true, message: 'nothing-to-update' };
  }

  try {
    await admin.auth().updateUser(uid, updatePayload);
    return { success: true };
  } catch (err) {
    console.error('adminUpdateUser error:', err);
    return { success: false, error: err.message || String(err) };
  }
});