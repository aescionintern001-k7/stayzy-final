import React from "react";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BookingDetailsView } from "./BookingDetailsView";

export async function generateStaticParams() {
  try {
    const bookings = await prisma.booking.findMany({ select: { id: true } });
    if (!bookings || bookings.length === 0) return [{ id: "preview" }];
    return bookings.map((b) => ({ id: b.id }));
  } catch {
    return [{ id: "preview" }];
  }
}

export default async function SingleBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const booking = await prisma.booking.findFirst({
    where: {
      OR: [{ id }, { bookingReference: id }],
    },
    include: {
      property: true,
      roomType: {
        include: {
          ratePlans: true,
        },
      },
      inventoryUnit: {
        include: { room: true },
      },
      payments: true,
      paymentSchedules: {
        orderBy: { dueDate: "asc" },
      },
      refunds: true,
    },
  });

  if (!booking) {
    notFound();
  }

  let images: string[] = [];
  try {
    images = JSON.parse(booking.roomType.images);
  } catch {
    images = [];
  }

  return (
    <BookingDetailsView
      booking={{
        ...booking,
        roomType: {
          ...booking.roomType,
          images,
        },
      }}
    />
  );
}
