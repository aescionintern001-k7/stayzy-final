import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ImageBackground,
} from "react-native";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../config/firebase";
export const sections = [
  "home",
  "help",
  "contact",
  "terms",
  "privacy",
  "cancellation",
] as const;
export type Section = (typeof sections)[number];
export const labels: Record<Section, string> = {
  home: "Home",
  help: "Help & FAQs",
  contact: "Contact",
  terms: "Terms",
  privacy: "Privacy",
  cancellation: "Cancellation",
};

export function Editorial({
  editor = false,
  section = "home",
}: {
  editor?: boolean;
  section?: Section;
}) {
  const initial = {
    title: section === "home" ? "Find your next stay" : labels[section],
    description:
      section === "home" ? "Explore PGs by property or locality." : "",
    revision: 0,
  };
  const [record, receive] = useState(initial),
    [draft, edit] = useState(initial),
    [dirty, mark] = useState(false),
    [msg, notice] = useState("");
  useEffect(
    () =>
      onSnapshot(
        doc(db, "stayzyContent", section),
        (s) => receive(s.exists() ? (s.data() as typeof initial) : initial),
        () => notice("Content could not be loaded."),
      ),
    [],
  );
  useEffect(() => {
    if (!dirty) edit(record);
  }, [record, dirty]);
  async function publish() {
    try {
      if (!draft.title.trim()) throw Error("Enter a headline.");
      await runTransaction(db, async (tx) => {
        const ref = doc(db, "stayzyContent", section),
          snap = await tx.get(ref),
          rev = snap.data()?.revision || 0;
        if (rev !== draft.revision)
          throw Error(
            "Another admin published changes. Reload before editing.",
          );
        tx.set(ref, {
          title: draft.title.trim(),
          description: draft.description.trim(),
          revision: rev + 1,
        });
      });
      mark(false);
      notice("Published.");
    } catch (e) {
      notice(e instanceof Error ? e.message : "Publish failed.");
    }
  }
  if (!editor && section !== "home")
    return (
      <View
        style={{
          padding: 14,
          backgroundColor: "#f7f6f7",
          borderRadius: 10,
          gap: 8,
        }}
      >
        <Text style={{ fontWeight: "700" }}>{record.title}</Text>
        <Text>{record.description || "No information published yet."}</Text>
      </View>
    );
  if (!editor)
    return (
      <ImageBackground
        source={require("../../assets/stay-cover.jpg")}
        imageStyle={{ borderRadius: 18 }}
        style={{ minHeight: 185, justifyContent: "flex-end" }}
      >
        <View
          style={{
            backgroundColor: "rgba(0,0,0,.62)",
            padding: 20,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: "white", fontSize: 28, fontWeight: "800" }}>
            {record.title}
          </Text>
          <Text style={{ color: "white", marginTop: 5 }}>
            {record.description}
          </Text>
        </View>
      </ImageBackground>
    );
  return (
    <View
      style={{
        padding: 24,
        gap: 14,
        maxWidth: 760,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "800" }}>
        {labels[section]} content
      </Text>
      {(["title", "description"] as const).map((k) => (
        <View key={k}>
          <Text>{k === "title" ? "Headline" : "Supporting text"}</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 10,
              padding: 12,
              marginTop: 5,
            }}
            multiline={k === "description"}
            value={draft[k]}
            maxLength={k === "title" ? 90 : section === "home" ? 220 : 6000}
            onChangeText={(v) => {
              mark(true);
              edit({ ...draft, [k]: v });
            }}
          />
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={publish}
        style={{ backgroundColor: "#bc193d", padding: 14, borderRadius: 10 }}
      >
        <Text
          style={{ color: "white", textAlign: "center", fontWeight: "700" }}
        >
          Publish to customer app
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          mark(false);
          edit(record);
          notice("");
        }}
      >
        <Text>Reload published version</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite">{msg}</Text>
    </View>
  );
}
