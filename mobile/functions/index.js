const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
initializeApp();
const db = getFirestore();
function check(ok, message, code = "invalid-argument") {
  if (!ok) throw new HttpsError(code, message);
}
function validDate(v) {
  return (
    typeof v === "string" &&
    /^\d{4}-\d\d-\d\d$/.test(v) &&
    !isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  );
}
exports.stayzyOperation = onCall(async (request) => {
  const uid = request.auth?.uid;
  check(uid, "Sign in first", "unauthenticated");
  const a = request.data || {},
    admin = request.auth.token.stayzyAdmin === true;
  const listings = db.collection("stayzyListings"),
    bookings = db.collection("stayzyBookings");
  return db.runTransaction(async (tx) => {
    const user = (await tx.get(db.doc("stayzyPeople/" + uid))).data();
    check(user, "Complete your profile", "failed-precondition");
    if (a.action === "list") {
      check(
        user.role === "OWNER",
        "Owner access required",
        "permission-denied",
      );
      check(
        typeof a.name === "string" &&
          a.name.trim() &&
          a.name.length <= 120 &&
          typeof a.area === "string" &&
          a.area.trim() &&
          a.area.length <= 150,
        "Enter property name and locality",
      );
      check(
        Number.isInteger(a.beds) &&
          a.beds > 0 &&
          a.beds <= 100 &&
          Number.isInteger(a.rate) &&
          a.rate > 0 &&
          a.rate <= 100000,
        "Check capacity and nightly rate",
      );
      check(
        !a.photo ||
          (typeof a.photo === "string" &&
            a.photo.length <= 2000 &&
            /^https:\/\//.test(a.photo)),
        "Use an HTTPS photo URL",
      );
      const ref = listings.doc();
      tx.create(ref, {
        ownerId: uid,
        photo: a.photo || "",
        name: a.name.trim(),
        area: a.area.trim(),
        rate: a.rate,
        beds: a.beds,
        status: "Pending",
      });
      return ref.id;
    }
    check(
      typeof a.id === "string" && /^[A-Za-z0-9]{1,100}$/.test(a.id),
      "Invalid record",
    );
    if (a.action === "resolve") {
      const ref = db.collection("stayzyRequests").doc(a.id),
        r = (await tx.get(ref)).data();
      check(
        r && (admin || (user.role === "OWNER" && r.ownerId === uid)),
        "Staff access required",
        "permission-denied",
      );
      tx.update(ref, { status: r.kind === "Visit" ? "Approved" : "Resolved" });
      return ref.id;
    }
    if (a.action === "cancel") {
      const ref = bookings.doc(a.id),
        b = (await tx.get(ref)).data();
      check(
        b &&
          (admin ||
            b.customerId === uid ||
            (user.role === "OWNER" && b.ownerId === uid)),
        "Booking unavailable",
        "permission-denied",
      );
      tx.update(ref, { status: "Cancelled" });
      return ref.id;
    }
    let prior;
    if (a.action === "change") {
      prior = (await tx.get(bookings.doc(a.id))).data();
      check(
        prior &&
          prior.status === "Reserved" &&
          (admin ||
            prior.customerId === uid ||
            (user.role === "OWNER" && prior.ownerId === uid)),
        "Booking unavailable",
        "permission-denied",
      );
    }
    const ref = listings.doc(prior ? prior.propertyId : a.id),
      pg = (await tx.get(ref)).data();
    check(pg, "Property unavailable", "not-found");
    if (a.action === "details") {
      check(admin, "Admin access required", "permission-denied");
      check(
        typeof a.name === "string" &&
          a.name.trim() &&
          a.name.length <= 120 &&
          typeof a.area === "string" &&
          a.area.trim() &&
          a.area.length <= 150,
        "Enter name and locality",
      );
      check(
        typeof a.photo === "string" &&
          a.photo.length <= 2000 &&
          (!a.photo || /^https:\/\//.test(a.photo)),
        "Enter an HTTPS photo URL",
      );
      tx.update(ref, {
        name: a.name.trim(),
        area: a.area.trim(),
        photo: a.photo,
      });
      return ref.id;
    }
    if (a.action === "rate") {
      check(
        admin || (user.role === "OWNER" && pg.ownerId === uid),
        "Property access required",
        "permission-denied",
      );
      check(
        Number.isInteger(a.rate) && a.rate > 0 && a.rate <= 100000,
        "Enter a valid nightly rate",
      );
      tx.update(ref, { rate: a.rate });
      return ref.id;
    }
    if (a.action === "request") {
      check(
        pg.status === "Approved" && user.role === "CUSTOMER",
        "Customer access required",
      );
      check(
        ["Visit", "Support"].includes(a.kind) &&
          typeof a.note === "string" &&
          a.note.trim().length > 0 &&
          a.note.length <= 1000,
        "Enter visit preferences or a support message",
      );
      const ticket = db.collection("stayzyRequests").doc();
      tx.create(ticket, {
        customerId: uid,
        ownerId: pg.ownerId,
        property: pg.name,
        name: user.name,
        kind: a.kind,
        note: a.note.trim(),
        status: "Pending",
      });
      return ticket.id;
    }
    if (a.action === "approve") {
      check(admin, "Admin access required", "permission-denied");
      tx.update(ref, { status: "Approved" });
      return ref.id;
    }
    if (a.action === "maintenance" || a.action === "restore") {
      check(
        admin || (user.role === "OWNER" && pg.ownerId === uid),
        "Property access required",
        "permission-denied",
      );
      const bed = Number(a.bed);
      check(
        Number.isInteger(bed) && bed >= 1 && bed <= pg.beds,
        "Enter a valid bed number",
      );
      const blocks = { ...(pg.blocks || {}) };
      if (a.action === "restore") delete blocks[bed];
      else {
        check(
          validDate(a.start) && validDate(a.end) && a.end > a.start,
          "Enter a valid maintenance interval",
        );
        const current = await tx.get(
          bookings.where("propertyId", "==", ref.id),
        );
        check(
          !current.docs.some((d) => {
            const b = d.data();
            return (
              b.status === "Reserved" &&
              b.bed === bed &&
              b.start < a.end &&
              a.start < b.end
            );
          }),
          "Bed has a reservation in this interval",
        );
        blocks[bed] = { start: a.start, end: a.end };
      }
      tx.update(ref, { blocks });
      return ref.id;
    }
    check(
      !!prior ||
        (a.action === "book" &&
          pg.status === "Approved" &&
          user.role === "CUSTOMER"),
      "Booking unavailable",
    );
    check(
      validDate(a.start) &&
        validDate(a.end) &&
        a.start >= new Date(Date.now() + 19800000).toISOString().slice(0, 10) &&
        a.end > a.start,
      "Choose valid future stay dates",
    );
    const nights = (Date.parse(a.end) - Date.parse(a.start)) / 86400000;
    check(nights <= 366, "Maximum stay is 366 nights");
    const existing = await tx.get(bookings.where("propertyId", "==", ref.id));
    const occupied = new Set(
      existing.docs
        .filter((d) => !prior || d.id !== a.id)
        .map((d) => d.data())
        .filter(
          (b) => b.status === "Reserved" && b.start < a.end && a.start < b.end,
        )
        .map((b) => b.bed),
    );
    for (const [number, block] of Object.entries(pg.blocks || {})) {
      if (block.start < a.end && a.start < block.end)
        occupied.add(Number(number));
    }
    let bed = 1;
    while (occupied.has(bed)) bed++;
    check(
      bed <= pg.beds,
      "No beds available for the full date range",
      "failed-precondition",
    );
    if (prior) {
      tx.update(bookings.doc(a.id), {
        bed,
        start: a.start,
        end: a.end,
        total: nights * pg.rate,
      });
      tx.update(ref, { lastBooking: a.id });
      return a.id;
    }
    const reservation = bookings.doc();
    tx.update(ref, { lastBooking: reservation.id });
    tx.create(reservation, {
      customerId: uid,
      ownerId: pg.ownerId,
      propertyId: ref.id,
      property: pg.name,
      name: user.name,
      email: user.email,
      phone: user.phone,
      start: a.start,
      end: a.end,
      bed,
      total: nights * pg.rate,
      status: "Reserved",
    });
    return reservation.id;
  });
});
