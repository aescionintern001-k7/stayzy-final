import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { RoleProvider } from "../src/context/RoleContext";
import { Colors } from "../src/theme/colors";

export default function RootLayout() {
  return (
    <RoleProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: "fade_from_bottom",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="register" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="room/[id]" options={{ headerShown: false }} />
      </Stack>
    </RoleProvider>
  );
}
