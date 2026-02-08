const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Callable function to allow admin users to update other users in Firebase Auth and Firestore
exports.adminUpdateUser = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    // Verify caller is admin (based on Firestore userType)
    const callerUid = context.auth.uid;

    try {
        const callerDoc = await db.collection('users').doc(callerUid).get();
        const callerData = callerDoc.exists ? callerDoc.data() : null;
        if (!callerData || callerData.userType !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Permissão negada. Apenas administradores podem realizar esta operação.');
        }
    } catch (err) {
        console.error('Erro ao verificar permissões do chamador:', err);
        if (err instanceof functions.https.HttpsError) throw err;
        throw new functions.https.HttpsError('internal', 'Erro ao verificar permissões do usuário.');
    }

    const targetUid = data.targetUid;
    const email = data.email;
    const password = data.password; // may be null
    const name = data.name;
    const userType = data.userType;
    const status = data.status;

    if (!targetUid) {
        throw new functions.https.HttpsError('invalid-argument', 'targetUid é obrigatório.');
    }

    try {
        // Update Auth user (only if email/password provided)
        const updateAuth = {};
        if (typeof email === 'string' && email.trim() !== '') updateAuth.email = email.trim();
        if (typeof password === 'string' && password.trim() !== '') updateAuth.password = password;

        if (Object.keys(updateAuth).length > 0) {
            await admin.auth().updateUser(targetUid, updateAuth);
        }

        // Prepare Firestore data and remove undefined
        const userData = {
            name: name,
            email: email,
            userType: userType,
            status: status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        Object.keys(userData).forEach(k => (userData[k] === undefined) && delete userData[k]);

        await db.collection('users').doc(targetUid).set(userData, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('Erro ao atualizar usuário no Admin SDK:', error);
        // If error is already an HttpsError, rethrow
        if (error instanceof functions.https.HttpsError) throw error;

        // Map known admin.auth errors to better codes/messages
        if (error.code && error.code.startsWith('auth/')) {
            // Example: auth/invalid-email, auth/email-already-exists, auth/invalid-password
            const message = error.message || 'Erro de autenticação ao atualizar usuário.';
            throw new functions.https.HttpsError('invalid-argument', message);
        }

        throw new functions.https.HttpsError('internal', error.message || 'Erro interno ao atualizar usuário.');
    }
});
