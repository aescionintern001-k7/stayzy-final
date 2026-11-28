import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../src/config/firebase";
import { useRole } from "../../src/context/RoleContext";
import { Person } from "../../src/context/people";

type Row = Person & { id: string };
function Action({ label, press }: { label: string; press: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={press} style={s.button}>
      <Text style={s.white}>{label}</Text>
    </Pressable>
  );
}
export default function Directory() {
  const { role, firebaseUser } = useRole();
  const admin = role === "ADMIN";
  const [rows, setRows] = useState<Row[]>([]),
    [edit, setEdit] = useState<Row | null>(null);
  const [term, search] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const [original,setOriginal]=useState<Row|null>(null);
  const [feedback,report]=useState("");
  const uid = firebaseUser?.id;
  useEffect(() => {
    setRows([]);
    setEdit(null);
    if (!uid || role === "CUSTOMER") return;
    setStatus("Loading directory…");
    const people = collection(db, "stayzyPeople");
    const source = admin
      ? people
      : query(
          people,
          where("role", "==", "CUSTOMER"),
          where("ownerId", "==", uid),
        );
    return onSnapshot(
      source,
      (snap) => {
        setRows(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Row));
        setStatus("");
      },
      () => {
        setRows([]);
        setStatus(
          "Directory unavailable. Check access and Firestore configuration.",
        );
      },
    );
  }, [role, uid]);
  async function save() {
    if (!edit || busy || !admin) return;
    const { id, name, email, phone, role: kind, ownerId, property } = edit;
    if (
      !name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (phone && !/^[+\d ()-]{6,25}$/.test(phone))
    )
      return report("Enter a name, valid contact email and optional phone number.");
    setBusy(true);
    try {
      await runTransaction(db,async tx=>{const ref=doc(db,"stayzyPeople",id),snap=await tx.get(ref);
        if(!original || !snap.exists() || Object.entries(original).some(([k,v])=>k!=="id" && snap.get(k)!==v))throw Error("Profile changed on another device. Close and reopen it to see the latest version.");
        tx.update(ref, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: kind,
        ownerId: kind === "OWNER" ? "" : ownerId,
        property: property.trim(),
      });});
      setEdit(null);
    } catch(e) {
      report(e instanceof Error?e.message:"Changes could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  if (!uid || role === "CUSTOMER")
    return (
      <Text style={s.page}>
        Sign in with an authorized staff account to open the directory.
      </Text>
    );
  const visible = rows.filter((r) =>
    [r.name, r.email, r.property, r.phone]
      .join(" ")
      .toLowerCase()
      .includes(term.trim().toLowerCase()),
  );
  return (
    <ScrollView
      contentContainerStyle={s.page}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>{admin ? "People directory" : "My residents"}</Text>
      {edit && admin ? (
        <View style={s.card}>
          <Text style={s.heading}>Edit contact profile</Text>
          {(["name", "phone", "email", "property"] as const).map((k) => (
            <View key={k}>
              <Text>{k === "email" ? "Contact email" : k}</Text>
              <TextInput
                style={s.input}
                editable={!busy}
                value={edit[k]}
                onChangeText={(v) => setEdit({ ...edit, [k]: v })}
              />
            </View>
          ))}
          <Text>Account type · {edit.role}</Text>
          <Action
            label={
              edit.role === "OWNER"
                ? "Change to customer"
                : "Change to PG owner"
            }
            press={() =>
              setEdit({
                ...edit,
                role: edit.role === "OWNER" ? "CUSTOMER" : "OWNER",
                ownerId: "",
              })
            }
          />
          {edit.role === "CUSTOMER" && (
            <>
              <Text>Assigned PG owner</Text>
              {[
                { id: "", name: "Unassigned" },
                ...rows.filter((r) => r.role === "OWNER" && r.id !== edit.id),
              ].map((o) => (
                <Action
                  key={o.id}
                  label={(edit.ownerId === o.id ? "✓ " : "") + o.name}
                  press={() => setEdit({ ...edit, ownerId: o.id })}
                />
              ))}
            </>
          )}
          <Text accessibilityLiveRegion="polite">{feedback}</Text>
          <Action label={busy ? "Saving…" : "Save changes"} press={save} />
          <Action label="Close" press={() => setEdit(null)} />
        </View>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Search directory"
            placeholder="Search name, phone or PG"
            style={s.input}
            value={term}
            onChangeText={search}
          />
          <Text>{status || visible.length + " profiles"}</Text>
          {visible.map((p) => (
            <View key={p.id} style={s.card}>
              <Text style={s.tag}>{p.role}</Text>
              <Text style={s.heading}>{p.name}</Text>
              <Text selectable>{p.email}</Text>
              <Text selectable>{p.phone || "Phone pending"}</Text>
              <Text>{p.property || "Property unassigned"}</Text>
              {admin && (
                <Action label="Edit profile" press={() => {setOriginal(p);setEdit({...p});report("")}} />
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 20, gap: 14, backgroundColor: "#fafafa", flexGrow: 1 },
  title: { fontSize: 28, fontWeight: "700", color: "#262427" },
  heading: { fontSize: 19, fontWeight: "700" },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CAD6CE",
    padding: 12,
    borderRadius: 10,
  },
  card: {
    padding: 18,
    gap: 10,
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DFE7E1",
  },
  button: { backgroundColor: "#28262A", borderRadius: 8, padding: 11 },
  white: { color: "white", fontWeight: "600" },
  tag: { color: "#477057", fontSize: 12 },
});
