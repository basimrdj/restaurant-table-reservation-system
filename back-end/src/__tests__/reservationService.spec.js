const availabilityService = require("../services/availabilityService");
const customerService = require("../services/customerService");
const reservationService = require("../services/reservationService");
const { db, futureDate, resetDatabase } = require("./helpers/testDb");

describe("reservationService", () => {
  beforeEach(async () => {
    await resetDatabase();

    await db.table.bulkCreate([
      {
        tableName: "I1",
        area: "indoor",
        capacity: 2,
      },
      {
        tableName: "IR1",
        area: "indoor_rooftop",
        capacity: 4,
      },
    ]);
  });

  it("creates a reservation successfully", async () => {
    const result = await reservationService.createReservation({
      customer_name: "Ayesha Khan",
      phone_number: "03001234567",
      reservation_date: futureDate(),
      reservation_time: "19:00",
      guest_count: 2,
      seating_preference: "indoor",
      source: "manual",
    });

    expect(result.created).toBe(true);
    expect(result.reservation.status).toBe("confirmed");
    expect(result.reservation.seating_area).toBe("indoor");
    expect(result.reservation.table.table_name).toBe("I1");
  });

  it("treats the same customer/date/time/guest_count as the same booking regardless of source", async () => {
    const first = await reservationService.createReservation({
      customer_name: "Ayesha Khan",
      phone_number: "03001234567",
      reservation_date: futureDate(),
      reservation_time: "19:00",
      guest_count: 2,
      source: "web",
    });

    const second = await reservationService.createReservation({
      customer_name: "Ayesha Khan",
      phone_number: "+923001234567",
      reservation_date: futureDate(),
      reservation_time: "19:00",
      guest_count: 2,
      source: "manual",
    });

    expect(first.reservation.id).toBe(second.reservation.id);
    expect(second.created).toBe(false);
  });

  it("reuses an idempotency key instead of creating a second reservation", async () => {
    const payload = {
      customer_name: "Sara Ahmed",
      phone_number: "03005555555",
      reservation_date: futureDate(),
      reservation_time: "20:00",
      guest_count: 2,
      source: "phone_agent",
      idempotency_key: "retell-call-1",
    };

    const first = await reservationService.createReservation(payload);
    const second = await reservationService.createReservation(payload);

    expect(first.reservation.id).toBe(second.reservation.id);
    expect(second.created).toBe(false);
  });

  it("cancellation frees availability", async () => {
    const created = await reservationService.createReservation({
      customer_name: "Ali Raza",
      phone_number: "03007777777",
      reservation_date: futureDate(),
      reservation_time: "19:00",
      guest_count: 2,
      seating_preference: "indoor",
    });

    let availability = await availabilityService.checkAvailability({
      reservation_date: futureDate(),
      reservation_time: "19:00",
      guest_count: 2,
      seating_preference: "indoor",
    });

    expect(availability.available).toBe(false);

    await reservationService.cancelReservation(created.reservation.id);

    availability = await availabilityService.checkAvailability({
      reservation_date: futureDate(),
      reservation_time: "19:00",
      guest_count: 2,
      seating_preference: "indoor",
    });

    expect(availability.available).toBe(true);
  });

  it("only counts completed visits in the returning-customer summary", async () => {
    const created = await reservationService.createReservation({
      customer_name: "Hamna Malik",
      phone_number: "03009999999",
      reservation_date: futureDate(),
      reservation_time: "18:00",
      guest_count: 4,
      seating_preference: "indoor_rooftop",
    });

    await reservationService.updateReservationStatus(created.reservation.id, "no_show");

    let lookup = await customerService.lookupCustomerByPhone("03009999999");
    expect(lookup.is_returning_customer).toBe(false);

    await reservationService.updateReservationStatus(created.reservation.id, "completed");

    lookup = await customerService.lookupCustomerByPhone("03009999999");
    expect(lookup.is_returning_customer).toBe(true);
    expect(lookup.last_seating_area).toBe("indoor_rooftop");
    expect(lookup.last_party_size).toBe(4);
    expect(lookup.last_visit_summary).toContain("indoor_rooftop");
  });

  it("stores the final 11 PM seating with a one-hour end time at close", async () => {
    const result = await reservationService.createReservation({
      customer_name: "Late Guest",
      phone_number: "03001112222",
      reservation_date: futureDate(),
      reservation_time: "23:00",
      guest_count: 2,
      seating_preference: "indoor",
      source: "phone_agent",
    });

    expect(result.created).toBe(true);
    expect(result.reservation.start_time).toBe("23:00:00");
    expect(result.reservation.end_time).toBe("24:00:00");
  });
});
