const availabilityService = require("../services/availabilityService");
const { db, futureDate, resetDatabase } = require("./helpers/testDb");

describe("availabilityService", () => {
  let indoorTwoTop;
  let indoorFourTop;
  let rooftopFourTop;

  beforeEach(async () => {
    await resetDatabase();

    [indoorTwoTop, indoorFourTop, rooftopFourTop] = await Promise.all([
      db.table.create({
        tableName: "I1",
        area: "indoor",
        capacity: 2,
      }),
      db.table.create({
        tableName: "I2",
        area: "indoor",
        capacity: 4,
      }),
      db.table.create({
        tableName: "IR1",
        area: "indoor_rooftop",
        capacity: 4,
      }),
    ]);
  });

  it("selects the smallest suitable table", async () => {
    const result = await availabilityService.checkAvailability({
      reservation_date: futureDate(),
      reservation_time: "19:00",
      guest_count: 2,
      seating_preference: "indoor",
    });

    expect(result.available).toBe(true);
    expect(result.matched_table_id).toBe(indoorTwoTop.id);
  });

  it("avoids overlapping confirmed reservations on the same table", async () => {
    const customer = await db.customer.create({
      name: "Overlap Guest",
      phoneE164: "+923001111111",
    });

    await db.reservation.create({
      customerId: customer.id,
      tableId: indoorTwoTop.id,
      reservationDate: futureDate(),
      startTime: "19:00:00",
      endTime: "21:00:00",
      guestCount: 2,
      seatingArea: "indoor",
      status: "confirmed",
      source: "manual",
    });

    const result = await availabilityService.checkAvailability({
      reservation_date: futureDate(),
      reservation_time: "20:00",
      guest_count: 2,
      seating_preference: "indoor",
    });

    expect(result.available).toBe(true);
    expect(result.matched_table_id).toBe(indoorFourTop.id);
  });

  it("respects blocked slot closures and returns alternative areas", async () => {
    await db.closure.create({
      date: futureDate(),
      startTime: "19:00:00",
      endTime: "21:00:00",
      area: "indoor",
      reason: "Private dining event",
    });

    const result = await availabilityService.checkAvailability({
      reservation_date: futureDate(),
      reservation_time: "19:30",
      guest_count: 4,
      seating_preference: "indoor",
    });

    expect(result.available).toBe(false);
    expect(result.alternative_areas).toContain("indoor_rooftop");
  });

  it("allows the final 11 PM seating by shortening the reservation to close", async () => {
    const result = await availabilityService.checkAvailability({
      reservation_date: futureDate(),
      reservation_time: "23:00",
      guest_count: 2,
      seating_preference: "indoor",
    });

    expect(result.available).toBe(true);
    expect(result.matched_table_id).toBe(indoorTwoTop.id);
  });

  it("rejects starts that are later than the final 11 PM seating window", async () => {
    const result = await availabilityService.checkAvailability({
      reservation_date: futureDate(),
      reservation_time: "23:30",
      guest_count: 2,
      seating_preference: "indoor",
    });

    expect(result.available).toBe(false);
    expect(result.explanation).toContain("closing time");
  });
});
