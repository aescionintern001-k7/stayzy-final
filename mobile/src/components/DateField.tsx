import React, { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react-native";
export function DateField({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (v: string) => void;
}) {
  const [open, toggle] = useState(false),
    [month, show] = useState(new Date());
  const y = month.getFullYear(),
    m = month.getMonth(),
    offset = new Date(y, m, 1).getDay(),
    days = new Date(y, m + 1, 0).getDate();
  return (
    <View style={{ gap: 8 }}>
      <Text>{label.split(" (")[0]}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => toggle(!open)}
        style={{
          borderWidth: 1,
          borderColor: "#d4d2d3",
          borderRadius: 10,
          padding: 12,
          flexDirection: "row",
          gap: 10,
        }}
      >
        <CalendarDays size={19} />
        <Text>{value || "Choose date"}</Text>
      </Pressable>
      {open && (
        <View
          style={{
            maxWidth: 420,
            padding: 12,
            backgroundColor: "#f6f5f5",
            borderRadius: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable
              accessibilityLabel="Previous month"
              onPress={() => show(new Date(y, m - 1, 1))}
              style={{ padding: 10 }}
            >
              <ChevronLeft size={20} />
            </Pressable>
            <Text>
              {month.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Pressable
              accessibilityLabel="Next month"
              onPress={() => show(new Date(y, m + 1, 1))}
              style={{ padding: 10 }}
            >
              <ChevronRight size={20} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <Text key={d} style={{ width: "14.28%", textAlign: "center" }}>
                {d}
              </Text>
            ))}
            {Array.from({ length: offset + days }, (_, i) => {
              const n = i - offset + 1,
                date = [
                  y,
                  String(m + 1).padStart(2, "0"),
                  String(n).padStart(2, "0"),
                ].join("-");
              return (
                <Pressable
                  key={i}
                  disabled={n < 1}
                  onPress={() => {
                    change(date);
                    toggle(false);
                  }}
                  style={{
                    width: "14.28%",
                    paddingVertical: 10,
                    backgroundColor: value === date ? "#f4d8df" : "transparent",
                  }}
                >
                  <Text style={{ textAlign: "center" }}>{n > 0 ? n : ""}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
