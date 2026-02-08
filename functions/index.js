const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Callable function to allow admin users to update other users in Firebase Auth and Firestore
exports.adminUpdateUser = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        return { success: false, message: 'Usuário não autenticado.' };
    }

    // Verify caller is admin (based on custom claim or Firestore userType)
    const callerUid = context.auth.uid;

    try {
        // Try to read user document to check role
        const callerDoc = await db.collection('users').doc(callerUid).get();
        const callerData = callerDoc.exists ? callerDoc.data() : null;
        if (!callerData || callerData.userType !== 'admin') {
            return { success: false, message: 'Permissão negada. Apenas administradores podem realizar esta operação.' };
        }
    } catch (err) {
        console.error('Erro ao verificar permissões do chamador:', err);
        return { success: false, message: 'Erro ao verificar permissões.' };
    }

    const targetUid = data.targetUid;
    const email = data.email;
    const password = data.password; // may be null
    const name = data.name;
    const userType = data.userType;
    const status = data.status;

    if (!targetUid) {
        return { success: false, message: 'targetUid é obrigatório.' };
    }

    try {
        // Update Auth user
        const updateAuth = {};
        if (email) updateAuth.email = email;
        if (password) updateAuth.password = password;

        if (Object.keys(updateAuth).length > 0) {
            await admin.auth().updateUser(targetUid, updateAuth);
        }

        // Update Firestore user document
        const userData = {
            name: name,
            email: email,
            userType: userType,
            status: status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Remove undefined fields
        Object.keys(userData).forEach(k => (userData[k] === undefined) && delete userData[k]);

        await db.collection('users').doc(targetUid).set(userData, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('Erro ao atualizar usuário no Admin SDK:', error);
        return { success: false, message: error.message || 'Erro desconhecido' };
    }
});
