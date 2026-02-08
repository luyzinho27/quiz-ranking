/**
 * Script auxiliar para definir a custom claim `admin` em um usuário.
 * Uso (local):
 *   node set-admin-claim.js <UID>
 * Nota: execute este script na pasta `functions` onde o Admin SDK está instalado e após ter
 * inicializado `admin.initializeApp()` com credenciais apropriadas (em ambiente local, você pode usar
 * `GOOGLE_APPLICATION_CREDENTIALS` ou outra forma). Em produção, use a Firebase CLI `auth:import` ou um
 * script seguro no backend.
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node set-admin-claim.js <UID>');
  process.exit(1);
}

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log('Custom claim `admin` set for UID:', uid);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error setting custom claim:', err);
    process.exit(1);
  });
