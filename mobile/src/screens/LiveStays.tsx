import { DateField } from "../components/DateField";
import { useRouter } from "expo-router";
import { StayAction as Button } from "../components/StayAction";
import { Editorial } from "../components/Editorial";
import React, { useEffect, useState } from "react";
import { ROOMS_DATA } from "../data/roomsData";

const DEFAULT_PROPERTIES: DocumentData[] = ROOMS_DATA.map((r) => ({
  id: r.id,
  name: r.name,
  area: r.displayLocality,
  status: "Approved",
  rate: r.rates.monthly,
  beds: r.category === "PRIVATE" ? 1 : r.category === "DOUBLE" ? 2 : 3,
  photo: r.images[0],
  blocks: {},
}));
import {
  ScrollView,
  Pressable,
  Image,
  Text,
  View,
  TextInput,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import {
  collection,
  query,
  where,
  onSnapshot,
  DocumentData,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, app } from "../config/firebase";
import { useRole } from "../context/RoleContext";
const run = httpsCallable(getFunctions(app), "stayzyOperation");
export function LiveStays({
  bookingsOnly = false,
  savedOnly = false,
}: {
  bookingsOnly?: boolean;
  savedOnly?: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const { role, firebaseUser, favorites, toggleFavorite } = useRole(),
    uid = firebaseUser?.id;
  const [tickets, setTickets] = useState<DocumentData[]>([]);
  const [properties, props] = useState<DocumentData[]>([]),
    [records, bookings] = useState<DocumentData[]>([]),
    [selected, select] = useState(""),
    [busy, setBusy] = useState(false),
    [error, fail] = useState("");
  const [form, setForm] = useState<Record<string, string>>({}),
    [term, search] = useState("");
  useEffect(() => {
    if (!uid) {
      props(DEFAULT_PROPERTIES);
      return;
    }
    props(DEFAULT_PROPERTIES);
    bookings([]);
    setTickets([]);
    select("");
    fail("");
    const pg = collection(db, "stayzyListings"),
      bk = collection(db, "stayzyBookings");
    const q =
      role === "ADMIN"
        ? pg
        : role === "OWNER"
          ? query(pg, where("ownerId", "==", uid))
          : query(pg, where("status", "==", "Approved"));
    const b =
      role === "ADMIN"
        ? bk
        : query(
            bk,
            where(role === "OWNER" ? "ownerId" : "customerId", "==", uid),
          );
    const err = () => {
      // Keep DEFAULT_PROPERTIES on connection or rules fallback
    };
    const one = onSnapshot(
      q,
      (s) => {
        if (s.docs.length > 0) {
          props(s.docs.map((d) => ({ ...d.data(), id: d.id })));
        } else {
          props(DEFAULT_PROPERTIES);
        }
      },
      err,
    );
    const two = onSnapshot(
      b,
      (s) => bookings(s.docs.map((d) => ({ ...d.data(), id: d.id }))),
      err,
    );
    const requests = collection(db, "stayzyRequests");
    const three = onSnapshot(
      role === "ADMIN"
        ? requests
        : query(
            requests,
            where(role === "OWNER" ? "ownerId" : "customerId", "==", uid),
          ),
      (s) => setTickets(s.docs.map((d) => ({ ...d.data(), id: d.id }))),
      err,
    );
    return () => {
      one();
      two();
      three();
    };
  }, [role, uid]);
  async function action(payload: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    fail("");
    try {
      await run(payload);
      if (payload.action === "list") setAdding(false);
      if (payload.action === "book" || payload.action === "request")
        router.push("/stays");
      select("");
      setForm({});
    } catch (e) {
      fail(e instanceof Error ? e.message : "Request failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  const input = (label: string, key: string) =>
    ["start", "end"].includes(key) ? (
      <DateField
        label={label}
        value={form[key]}
        change={(v) => setForm({ ...form, [key]: v })}
      />
    ) : (
      <View>
        <Text>{label}</Text>
        <TextInput
          style={s.input}
          accessibilityLabel={label}
          value={form[key] || ""}
          onChangeText={(v) => setForm({ ...form, [key]: v })}
        />
      </View>
    );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.page}
    >
      <Text style={s.title}>
        {savedOnly
          ? "Saved PGs"
          : bookingsOnly
            ? "Stays and requests"
            : role === "OWNER"
              ? "My properties"
              : role === "ADMIN"
                ? "Property operations"
                : "Explore PGs"}
      </Text>
      {role === "CUSTOMER" && !savedOnly && !bookingsOnly && <Editorial />}
      {role !== "CUSTOMER" && !bookingsOnly && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            [properties.length, "Properties"],
            [
              records.filter((b) => b.status === "Reserved").length,
              "Reservations",
            ],
            [
              tickets.filter((t) => t.status === "Pending").length,
              "Open requests",
            ],
          ].map(([v, k]) => (
            <View
              key={k}
              style={{
                flex: 1,
                borderRadius: 12,
                padding: 12,
                backgroundColor: "#eeedef",
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: "700" }}>{v}</Text>
              <Text>{k}</Text>
            </View>
          ))}
        </View>
      )}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {!bookingsOnly && (
        <>
          {role === "OWNER" && (
            <Button
              title={adding ? "Close listing form" : "Add property"}
              onPress={() => {
                setAdding(!adding);
                setForm({});
                select("");
              }}
            />
          )}
          {role === "OWNER" && adding && (
            <View style={s.card}>
              <Text style={s.h}>List a PG</Text>
              {input("Property name", "name")}
              {input("Locality", "area")}
              {input("Property photo URL (optional)", "photo")}
              {input("Beds", "beds")}
              {input("Nightly rate in rupees", "rate")}
              <Button
                color="#123D2B"
                disabled={busy}
                title="Submit for approval"
                onPress={() =>
                  action({
                    ...form,
                    action: "list",
                    beds: Number(form.beds),
                    rate: Number(form.rate),
                  })
                }
              />
            </View>
          )}
          <TextInput
            style={s.input}
            placeholder="Search PG or locality"
            value={term}
            onChangeText={search}
          />

          {role === "CUSTOMER" && !savedOnly && properties.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 3 }}
            >
              {Array.from(new Set(properties.map((p) => p.area as string)))
                .filter(Boolean)
                .sort()
                .map((area) => (
                  <Pressable
                    key={area}
                    accessibilityRole="button"
                    accessibilityState={{ selected: term === area }}
                    onPress={() => search(term === area ? "" : area)}
                    style={{
                      borderRadius: 22,
                      paddingVertical: 10,
                      paddingHorizontal: 15,
                      backgroundColor: term === area ? "#29272a" : "#eeedef",
                    }}
                  >
                    <Text
                      style={{ color: term === area ? "white" : "#343236" }}
                    >
                      {area}
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
          )}
          {term.trim() &&
            !properties.some(
              (p) =>
                (!savedOnly || favorites.includes(p.id)) &&
                (p.name + " " + p.area)
                  .toLowerCase()
                  .includes(term.trim().toLowerCase()),
            ) && (
              <View style={s.card}>
                <Text style={s.h}>No matching PGs</Text>
                <Text>Try another locality or clear your search.</Text>
                <Button title="Clear search" onPress={() => search("")} />
              </View>
            )}
          {properties
            .filter((p) => !savedOnly || favorites.includes(p.id))
            .filter((p) =>
              (p.name + " " + p.area)
                .toLowerCase()
                .includes(term.trim().toLowerCase()),
            )
            .map((p) => (
              <View key={p.id} style={s.card}>
                {p.photo ? (
                  <Image
                    accessibilityLabel={p.name}
                    source={{ uri: p.photo }}
                    style={{ height: 170, width: "100%", borderRadius: 10 }}
                  />
                ) : null}
                <Text style={s.h}>{p.name}</Text>
                <Text>
                  {p.area} · {p.status}
                </Text>
                <Text>
                  ₹{p.rate} / night · {p.beds} beds
                </Text>
                {role === "CUSTOMER" && (
                  <Button
                    color="#123D2B"
                    title={
                      favorites.includes(p.id) ? "Remove from saved" : "Save PG"
                    }
                    onPress={() => toggleFavorite(p.id)}
                  />
                )}
                {role !== "CUSTOMER" &&
                  (selected === p.id ? (
                    <>
                      {role === "ADMIN" && (
                        <>
                          {input("Listing name", "name")}
                          {input("Locality", "area")}
                          {input("Photo URL", "photo")}
                          <Button
                            title="Save listing details"
                            disabled={busy}
                            onPress={() =>
                              action({
                                action: "details",
                                id: p.id,
                                name: form.name,
                                area: form.area,
                                photo: form.photo,
                              })
                            }
                          />
                        </>
                      )}
                      {input("Updated nightly rate", "rate")}
                      <Button
                        color="#123D2B"
                        title="Save rate"
                        disabled={busy}
                        onPress={() =>
                          action({
                            action: "rate",
                            id: p.id,
                            rate: Number(form.rate),
                          })
                        }
                      />
                      {input("Bed number", "bed")}
                      {input("Maintenance from (YYYY-MM-DD)", "start")}
                      {input("Available again (YYYY-MM-DD)", "end")}
                      <Text>
                        {Object.entries(p.blocks || {})
                          .map(
                            ([bed, b]: [string, any]) =>
                              "Bed " + bed + " · " + b.start + " to " + b.end,
                          )
                          .join("\n")}
                      </Text>
                      <Button
                        color="#123D2B"
                        title="Block bed for maintenance"
                        disabled={busy}
                        onPress={() =>
                          action({
                            action: "maintenance",
                            id: p.id,
                            bed: form.bed,
                            start: form.start,
                            end: form.end,
                          })
                        }
                      />
                      <Button
                        color="#123D2B"
                        title="Clear bed block"
                        disabled={busy}
                        onPress={() =>
                          action({ action: "restore", id: p.id, bed: form.bed })
                        }
                      />
                    </>
                  ) : (
                    <Button
                      color="#123D2B"
                      title="Manage rate and beds"
                      onPress={() => {
                        select(p.id);
                        setForm({
                          name: p.name,
                          area: p.area,
                          photo: p.photo || "",
                          rate: String(p.rate),
                        });
                      }}
                    />
                  ))}
                {role === "ADMIN" && p.status === "Pending" && (
                  <Button
                    color="#123D2B"
                    disabled={busy}
                    title="Approve listing"
                    onPress={() => action({ action: "approve", id: p.id })}
                  />
                )}
                {role === "CUSTOMER" &&
                  (selected === p.id ? (
                    <>
                      {input("Check-in (YYYY-MM-DD)", "start")}
                      {input("Check-out (YYYY-MM-DD)", "end")}
                      {Date.parse(form.end) > Date.parse(form.start) && (
                        <Text>
                          Total ₹
                          {(p.rate *
                            (Date.parse(form.end) - Date.parse(form.start))) /
                            86400000}
                        </Text>
                      )}
                      <Button
                        color="#123D2B"
                        disabled={busy}
                        title="Reserve bed · pay at PG"
                        onPress={() =>
                          action({
                            action: "book",
                            id: p.id,
                            start: form.start,
                            end: form.end,
                          })
                        }
                      />
                      {input("Visit preference or support message", "note")}
                      <Button
                        color="#123D2B"
                        title="Request visit"
                        disabled={busy}
                        onPress={() =>
                          action({
                            action: "request",
                            id: p.id,
                            kind: "Visit",
                            note: form.note,
                          })
                        }
                      />
                      <Button
                        color="#123D2B"
                        title="Contact support"
                        disabled={busy}
                        onPress={() =>
                          action({
                            action: "request",
                            id: p.id,
                            kind: "Support",
                            note: form.note,
                          })
                        }
                      />
                    </>
                  ) : (
                    <Button
                      color="#123D2B"
                      title="Select dates"
                      onPress={() => {
                        select(p.id);
                        setForm({
                          name: p.name,
                          area: p.area,
                          photo: p.photo || "",
                          rate: String(p.rate),
                        });
                      }}
                    />
                  ))}
              </View>
            ))}
          {!(
            savedOnly
              ? properties.filter((p) => favorites.includes(p.id))
              : properties
          ).length && <Text>No properties available yet.</Text>}
        </>
      )}
      {bookingsOnly && (
        <>
          {tickets.map((t) => (
            <View key={t.id} style={s.card}>
              <Text style={s.h}>
                {t.kind} · {t.property}
              </Text>
              <Text>
                {t.name} · {t.status}
              </Text>
              <Text>{t.note}</Text>
              {role !== "CUSTOMER" && t.status === "Pending" && (
                <Button
                  color="#123D2B"
                  title={
                    t.kind === "Visit" ? "Approve visit" : "Resolve ticket"
                  }
                  disabled={busy}
                  onPress={() => action({ action: "resolve", id: t.id })}
                />
              )}
            </View>
          ))}
          {!records.length && <Text>No reservations yet.</Text>}
          {records.map((b) => (
            <View key={b.id} style={s.card}>
              <Text style={s.h}>{b.property}</Text>
              <Text>
                {b.start} → {b.end} · Bed {b.bed}
              </Text>
              <Text>
                ₹{b.total} · {b.status}
              </Text>
              {role !== "CUSTOMER" && (
                <Text selectable>
                  {b.name} · {b.phone} · {b.email}
                </Text>
              )}
              {b.status === "Reserved" &&
                (selected === b.id ? (
                  <>
                    {input("New check-in (YYYY-MM-DD)", "start")}
                    {input("New check-out (YYYY-MM-DD)", "end")}
                    <Text>Changes use the current nightly rate.</Text>
                    <Button
                      color="#123D2B"
                      title="Save new dates"
                      disabled={busy}
                      onPress={() =>
                        action({
                          action: "change",
                          id: b.id,
                          start: form.start,
                          end: form.end,
                        })
                      }
                    />
                  </>
                ) : (
                  <Button
                    color="#123D2B"
                    title="Change or extend stay"
                    onPress={() => {
                      select(b.id);
                      setForm({ start: b.start, end: b.end });
                    }}
                  />
                ))}
              {b.status === "Reserved" && (
                <Button
                  color="#123D2B"
                  disabled={busy}
                  title="Cancel reservation"
                  onPress={() =>
                    Platform.OS === "web"
                      ? window.confirm(
                          "Cancel this reservation and release the bed?",
                        ) && action({ action: "cancel", id: b.id })
                      : Alert.alert(
                          "Cancel reservation?",
                          "The bed will become available again.",
                          [
                            { text: "Keep stay" },
                            {
                              text: "Cancel reservation",
                              onPress: () =>
                                action({ action: "cancel", id: b.id }),
                            },
                          ],
                        )
                  }
                />
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: {
    padding: 20,
    gap: 12,
    flexGrow: 1,
    backgroundColor: "#fafafa",
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
  },
  title: { fontSize: 29, fontWeight: "700", color: "#252326" },
  h: { fontSize: 19, fontWeight: "700" },
  card: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e3e1e2",
    padding: 16,
    gap: 9,
    borderRadius: 14,
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderWidth: 1,
    borderColor: "#c8c6c7",
    borderRadius: 8,
  },
});
