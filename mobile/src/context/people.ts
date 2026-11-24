import { User } from "firebase/auth";
import { doc, runTransaction } from "firebase/firestore";
import { db } from "../config/firebase";
export type Person = {
  name: string;
  phone: string;
  email: string;
  role: "CUSTOMER" | "OWNER";
  ownerId: string;
  property: string;
};
export async function ensurePerson(user: User) {
  const ref = doc(db, "stayzyPeople", user.uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return snap.data() as Person;
    const record: Person = {
      name: user.displayName || user.email?.split("@")[0] || "Member",
      phone: "",
      email: user.email || "",
      role: "CUSTOMER",
      ownerId: "",
      property: "",
    };
    tx.set(ref, record);
    return record;
  });
}
