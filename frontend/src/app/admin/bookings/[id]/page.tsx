import React from "react";
import prisma from "@/lib/prisma";
import AdminBookingDetailClient from "./AdminBookingDetailClient";

export async function generateStaticParams() {
  try {
    const bookings = await prisma.booking.findMany({ select: { id: true } });
    if (!bookings || bookings.length === 0) {
      return [{ id: "preview" }];
    }
    return bookings.map((b) => ({ id: b.id }));
  } catch {
    return [{ id: "preview" }];
  }
}

export default function AdminBookingDetailPage() {
  return <AdminBookingDetailClient />;
}
