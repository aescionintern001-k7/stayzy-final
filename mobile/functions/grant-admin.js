const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
async function main() {
  const [projectId, uid] = process.argv.slice(2);
  if (!projectId || !uid)
    throw Error("Usage: node grant-admin.js PROJECT_ID FIREBASE_UID");
  initializeApp({ credential: applicationDefault(), projectId });
  const auth = getAuth(),
    user = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, {
    ...user.customClaims,
    stayzyAdmin: true,
  });
  console.log("Admin access granted. Sign in again.");
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
