process.env.RECEPTION_NUMBER = process.env.RECEPTION_NUMBER || "+923060792539";

const request = require("supertest");
const createServer = require("../utils/server");
const { db, futureDate, resetDatabase } = require("./helpers/testDb");

describe("Retell API", () => {
  const app = createServer();
  const getDayOfWeek = (dateString) =>
    new Date(`${dateString}T00:00:00Z`).getUTCDay();

  const setOperatingHoursForDate = async (dateString, openTime, closeTime) => {
    await db.operatingHour.update(
      {
        closeTime,
        isClosed: false,
        openTime,
      },
      {
        where: {
          dayOfWeek: getDayOfWeek(dateString),
        },
      }
    );
  };

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
      {
        tableName: "OR1",
        area: "outdoor_rooftop",
        capacity: 4,
      },
    ]);
  });

  it("exposes a lightweight health endpoint for deployment health checks", async () => {
    const response = await request(app).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      success: true,
    });
  });

  it("returns a Retell inbound webhook payload with string dynamic variables", async () => {
    const customer = await db.customer.create({
      name: "Basim",
      phoneE164: "+923001234567",
      preferredLanguage: "urdu",
    });

    await db.reservation.create({
      customerId: customer.id,
      endTime: "22:00:00",
      guestCount: 4,
      reservationDate: futureDate(2),
      seatingArea: "indoor_rooftop",
      source: "manual",
      startTime: "20:00:00",
      status: "completed",
      tableId: 2,
    });

    const response = await request(app)
      .post("/api/retell/inbound-webhook")
      .send({
        call_inbound: {
          from_number: "03001234567",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      call_inbound: {
        dynamic_variables: {
          availability_error_retry_count: "0",
          caller_phone_number: "+923001234567",
          customer_name: "Basim",
          is_returning_customer: "true",
          last_party_size: "4",
          last_seating_area: "indoor rooftop",
          last_visit_summary:
            "Booked indoor rooftop for 4 guests on the last completed visit.",
          normalized_reservation_time: "",
          preferred_language: "urdu",
          reception_number: expect.stringMatching(/\S/),
          time_ambiguous: "false",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
        metadata: {
          customer_id: String(customer.id),
        },
      },
    });
  });

  it("returns lookup fields ready for Retell dynamic variable hydration", async () => {
    const response = await request(app)
      .post("/api/retell/lookup-customer")
      .send({ phone_number: "03001234567" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        caller_phone_number: "+923001234567",
        customer_name: "",
        is_returning_customer: "false",
        last_party_size: "",
        last_seating_area: "",
        last_visit_summary: "",
        preferred_language: "",
        reception_number: expect.stringMatching(/\S/),
        success: "true",
      })
    );
  });

  it("returns string-normalized availability success for Retell custom functions", async () => {
    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          reservation_date: futureDate(2),
          reservation_time: "8 pm",
          seating_preference: "indoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual([
      "alternative_areas",
      "alternative_slots",
      "availability_error",
      "availability_error_retry_count",
      "available",
      "error_code",
      "explanation",
      "matched_area",
      "normalized_reservation_time",
      "success",
      "time_ambiguous",
      "time_clarification_attempts",
      "time_resolution_status",
      "user_safe_message",
    ]);
    expect(response.body).toEqual(
      expect.objectContaining({
        alternative_areas: "",
        alternative_slots: "",
        availability_error: "false",
        availability_error_retry_count: "0",
        available: "true",
        matched_area: "indoor rooftop",
        normalized_reservation_time: "20:00:00",
        success: "true",
        time_ambiguous: "false",
        time_clarification_attempts: "0",
        time_resolution_status: "resolved",
        user_safe_message: "",
      })
    );
  });

  it("resolves explicit daypart context without asking for AM or PM again", async () => {
    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          reservation_date: "20 April",
          reservation_time: "shaam 7 baje",
          seating_preference: "indoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "true",
        normalized_reservation_time: "19:00:00",
        success: "true",
        time_ambiguous: "false",
        time_clarification_attempts: "0",
        time_resolution_status: "resolved",
      })
    );
  });

  it.each([
    "بیس April",
    "بیس اپریل",
    "बीस April",
    "बीस अप्रैल",
  ])(
    "normalizes mixed-script Urdu/Hindi date words like %s into a valid booking date",
    async (spokenDate) => {
      const response = await request(app)
        .post("/api/retell/check-availability")
        .send({
          args: {
            availability_error_retry_count: "0",
            guest_count: "2",
            reservation_date: spokenDate,
            reservation_time: "7 pm",
            seating_preference: "indoor rooftop",
            time_clarification_attempts: "0",
            time_resolution_status: "unresolved",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          availability_error: "false",
          available: "true",
          normalized_reservation_time: "19:00:00",
          success: "true",
          time_ambiguous: "false",
          time_resolution_status: "resolved",
        })
      );
    }
  );

  it("resolves Urdu/Hindi-script explicit evening context without asking for AM or PM again", async () => {
    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          reservation_date: "20 April",
          reservation_time: "सात बजे शाम",
          seating_preference: "indoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "true",
        normalized_reservation_time: "19:00:00",
        success: "true",
        time_ambiguous: "false",
        time_clarification_attempts: "0",
        time_resolution_status: "resolved",
      })
    );
  });

  it("resolves mixed Latin digit plus Urdu/Hindi-script daypart directly", async () => {
    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          reservation_date: "20 April",
          reservation_time: "7 बजे शाम",
          seating_preference: "indoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "true",
        normalized_reservation_time: "19:00:00",
        success: "true",
        time_ambiguous: "false",
        time_resolution_status: "resolved",
      })
    );
  });

  it("resolves Urdu-script morning context directly", async () => {
    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          reservation_date: "20 April",
          reservation_time: "सुबह 9 बजे",
          seating_preference: "indoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "false",
        normalized_reservation_time: "09:00:00",
        success: "true",
        time_ambiguous: "false",
        time_resolution_status: "resolved",
      })
    );
  });

  it("resolves explicit pm markers directly without ambiguity", async () => {
    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          reservation_date: "20 April",
          reservation_time: "7 pm",
          seating_preference: "indoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        normalized_reservation_time: "19:00:00",
        success: "true",
        time_ambiguous: "false",
        time_resolution_status: "resolved",
      })
    );
  });

  it("accepts the exact Urdu/Hindi mixed-script follow-up scenario without leaking date-format language", async () => {
    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "2",
          reservation_date: "बीस April",
          reservation_time: "शाम सात बजे",
          seating_preference: "indoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "true",
        normalized_reservation_time: "19:00:00",
        success: "true",
        time_ambiguous: "false",
        time_resolution_status: "resolved",
      })
    );
    expect(response.body.user_safe_message || "").not.toMatch(/YYYY-MM-DD|ISO format|date format issue/i);
  });

  it("auto-resolves 7 baje to evening when only evening fits Kaya opening hours", async () => {
    const reservationDate = "20 April";
    const resolvedDate = "2026-04-20";
    await setOperatingHoursForDate(resolvedDate, "17:00:00", "23:00:00");

    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          reservation_date: reservationDate,
          reservation_time: "7 baje",
          seating_preference: "indoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "true",
        normalized_reservation_time: "19:00:00",
        success: "true",
        time_ambiguous: "false",
        time_resolution_status: "resolved",
      })
    );
  });

  it("returns genuine unavailability with real alternatives instead of availability errors", async () => {
    const reservationDate = futureDate(3);

    await db.customer.create({
      name: "Existing Guest",
      phoneE164: "+923009998887",
    });

    await db.reservation.create({
      customerId: 1,
      endTime: "21:00:00",
      guestCount: 2,
      reservationDate,
      seatingArea: "indoor",
      source: "manual",
      startTime: "19:00:00",
      status: "confirmed",
      tableId: 1,
    });

    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "2",
          reservation_date: reservationDate,
          reservation_time: "19:00",
          seating_preference: "indoor",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "false",
        success: "true",
      })
    );
    expect(response.body.alternative_areas).toContain("indoor rooftop");
    expect(response.body.alternative_slots).not.toBe("");
  });

  it("treats empty guest_count as a Retell-facing availability error instead of unavailability", async () => {
    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "",
          reservation_date: futureDate(2),
          reservation_time: "20:00",
          seating_preference: "indoor",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "true",
        availability_error_retry_count: "1",
        available: "false",
        success: "false",
        time_ambiguous: "false",
      })
    );
  });

  it("returns a natural date clarification instead of leaking YYYY-MM-DD when the date is unclear", async () => {
    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "2",
          reservation_date: "पैंतीस April",
          reservation_time: "7 pm",
          seating_preference: "indoor",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "true",
        error_code: "VALIDATION_ERROR",
        success: "false",
      })
    );
    expect(response.body.user_safe_message).toBe("معذرت، تاریخ دوبارہ بتا دیں۔");
    expect(response.body.user_safe_message).not.toMatch(/YYYY-MM-DD|ISO format|date format issue/i);
    expect(response.body.availability_error_retry_count).toBe("0");
  });

  it("returns a structured ambiguity response for spoken times that should not be guessed", async () => {
    const reservationDate = "20 April";
    const resolvedDate = "2026-04-20";
    await setOperatingHoursForDate(resolvedDate, "07:00:00", "23:00:00");

    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "1",
          guest_count: "4",
          reservation_date: reservationDate,
          reservation_time: "7 bjy",
          seating_preference: "outdoor rooftop",
          time_clarification_attempts: "1",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "true",
        availability_error_retry_count: "1",
        available: "false",
        error_code: "TIME_AMBIGUOUS",
        normalized_reservation_time: "",
        success: "false",
        time_ambiguous: "true",
        time_clarification_attempts: "2",
        time_resolution_status: "ambiguous",
        user_safe_message: "سات بجے صبح یا شام؟",
      })
    );
  });

  it("does not erase a previously resolved time on later turns that only add guest count or name", async () => {
    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          normalized_reservation_time: "19:00:00",
          reservation_date: futureDate(2),
          reservation_time: "",
          seating_preference: "indoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "resolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "true",
        normalized_reservation_time: "19:00:00",
        success: "true",
        time_ambiguous: "false",
        time_resolution_status: "resolved",
      })
    );
  });

  it("returns a closed-time response instead of an ambiguity loop when the explicit time is outside opening hours", async () => {
    const reservationDate = "20 April";
    const resolvedDate = "2026-04-20";
    await setOperatingHoursForDate(resolvedDate, "17:00:00", "23:00:00");

    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          reservation_date: reservationDate,
          reservation_time: "12 baje din",
          seating_preference: "outdoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "false",
        normalized_reservation_time: "12:00:00",
        success: "true",
        time_ambiguous: "false",
        time_clarification_attempts: "0",
        time_resolution_status: "resolved",
      })
    );
    expect(response.body.user_safe_message).toContain("ہمارا restaurant open نہیں ہوتا");
    expect(response.body.user_safe_message).toContain("شام 7 بجے");
  });

  it("resolves Urdu-script bare سات بجے to evening when only evening fits Kaya opening hours", async () => {
    const reservationDate = "بیس April";
    const resolvedDate = "2026-04-20";
    await setOperatingHoursForDate(resolvedDate, "17:00:00", "23:00:00");

    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "2",
          reservation_date: reservationDate,
          reservation_time: "سات بجے",
          seating_preference: "indoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "true",
        normalized_reservation_time: "19:00:00",
        success: "true",
        time_ambiguous: "false",
        time_resolution_status: "resolved",
        user_safe_message: "",
      })
    );
  });

  it("returns an Urdu-first closed-time response for صبح 7 بجے", async () => {
    const reservationDate = "بیس April";
    const resolvedDate = "2026-04-20";
    await setOperatingHoursForDate(resolvedDate, "17:00:00", "23:00:00");

    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "2",
          reservation_date: reservationDate,
          reservation_time: "صبح 7 بجے",
          seating_preference: "indoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "false",
        normalized_reservation_time: "07:00:00",
        success: "true",
        time_ambiguous: "false",
        time_resolution_status: "resolved",
      })
    );
    expect(response.body.user_safe_message).toContain("صبح 7 بجے");
    expect(response.body.user_safe_message).toContain("ہمارا restaurant open نہیں ہوتا");
    expect(response.body.user_safe_message).toContain("شام 7 بجے");
  });

  it("treats late times that wrap into the next day as a closed-time response", async () => {
    const reservationDate = "بیس April";
    const resolvedDate = "2026-04-20";
    await setOperatingHoursForDate(resolvedDate, "13:00:00", "01:00:00");

    const response = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "2",
          reservation_date: reservationDate,
          reservation_time: "رات 11 بجے",
          seating_preference: "indoor",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "false",
        normalized_reservation_time: "",
        success: "true",
        time_ambiguous: "false",
        time_resolution_status: "closed",
      })
    );
    expect(response.body.user_safe_message).toContain("رات 11 بجے");
    expect(response.body.user_safe_message).not.toContain("duration_minutes creates an invalid time range");
  });

  it("asks for ambiguous AM or PM at most once unless the user changes the time", async () => {
    const reservationDate = "20 April";
    const resolvedDate = "2026-04-20";
    await setOperatingHoursForDate(resolvedDate, "07:00:00", "23:00:00");

    const firstAttempt = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          reservation_date: reservationDate,
          reservation_time: "7 baje",
          seating_preference: "outdoor rooftop",
          time_clarification_attempts: "0",
          time_resolution_status: "unresolved",
        },
      });

    expect(firstAttempt.body).toEqual(
      expect.objectContaining({
        availability_error: "true",
        time_ambiguous: "true",
        time_clarification_attempts: "1",
      })
    );

    expect(firstAttempt.body.availability_error_retry_count).toBe("0");

    const secondAttempt = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          reservation_date: reservationDate,
          reservation_time: "7 baje",
          seating_preference: "outdoor rooftop",
          time_clarification_attempts: "1",
          time_resolution_status: "ambiguous",
        },
      });

    expect(secondAttempt.body).toEqual(
      expect.objectContaining({
        availability_error: "true",
        time_ambiguous: "true",
        time_clarification_attempts: "2",
      })
    );
    expect(secondAttempt.body.availability_error_retry_count).toBe("0");

    const resolvedAttempt = await request(app)
      .post("/api/retell/check-availability")
      .send({
        args: {
          availability_error_retry_count: "0",
          guest_count: "4",
          reservation_date: reservationDate,
          reservation_time: "7 pm",
          seating_preference: "outdoor rooftop",
          time_clarification_attempts: "1",
          time_resolution_status: "ambiguous",
        },
      });

    expect(resolvedAttempt.body).toEqual(
      expect.objectContaining({
        availability_error: "false",
        available: "true",
        normalized_reservation_time: "19:00:00",
        time_ambiguous: "false",
        time_clarification_attempts: "0",
        time_resolution_status: "resolved",
      })
    );
  });

  it("creates reservations through the real backend and returns the Retell-facing contract", async () => {
    const phoneNumber = "03005556666";
    const response = await request(app)
      .post("/api/retell/create-reservation")
      .send({
        args: {
          customer_name: "Areeba",
          guest_count: "4",
          normalized_reservation_time: "20:30:00",
          phone_number: phoneNumber,
          reservation_date: futureDate(4),
          reservation_time: "",
          raw_reservation_time: "8:30 pm",
          seating_preference: "outdoor rooftop",
          special_request: "birthday setup",
          time_clarification_attempts: "0",
          time_resolution_status: "resolved",
        },
      });

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual([
      "alternative_areas",
      "alternative_slots",
      "confirmation_text",
      "error_code",
      "reservation_id",
      "success",
      "user_safe_message",
    ]);
    expect(response.body).toEqual(
      expect.objectContaining({
        confirmation_text: expect.stringContaining("جی، آپ کی booking confirm ہو گئی ہے۔"),
        error_code: "",
        reservation_id: expect.any(String),
        success: "true",
        user_safe_message: "",
      })
    );

    const createdReservation = await db.reservation.findByPk(
      Number(response.body.reservation_id)
    );
    expect(createdReservation).toEqual(
      expect.objectContaining({
        guestCount: 4,
        seatingArea: "outdoor_rooftop",
        source: "phone_agent",
        startTime: "20:30:00",
        status: "confirmed",
      })
    );

    const createdCustomer = await db.customer.findOne({
      where: { phoneE164: "+923005556666" },
    });
    expect(createdCustomer).toEqual(
      expect.objectContaining({
        name: "Areeba",
      })
    );

    const lookupResponse = await request(app)
      .post("/api/retell/lookup-customer")
      .send({ phone_number: phoneNumber });

    expect(lookupResponse.status).toBe(200);
    expect(lookupResponse.body).toEqual(
      expect.objectContaining({
        customer_id: String(createdCustomer.id),
        customer_name: "Areeba",
        is_returning_customer: "false",
        reception_number: expect.stringMatching(/\S/),
        success: "true",
      })
    );

    const inboundResponse = await request(app)
      .post("/api/retell/inbound-webhook")
      .send({
        call_inbound: {
          from_number: phoneNumber,
        },
      });

    expect(inboundResponse.status).toBe(200);
    expect(inboundResponse.body.call_inbound.dynamic_variables).toEqual(
      expect.objectContaining({
        customer_name: "Areeba",
        is_returning_customer: "false",
        reception_number: expect.stringMatching(/\S/),
      })
    );
    expect(inboundResponse.body.call_inbound.metadata.customer_id).toBe(
      String(createdCustomer.id)
    );
  });

  it("accepts customer_name_candidate as a fallback when the confirmed-name field is empty", async () => {
    const response = await request(app)
      .post("/api/retell/create-reservation")
      .send({
        args: {
          customer_name: "",
          customer_name_candidate: "Basim",
          guest_count: "2",
          phone_number: "03006667777",
          reservation_date: futureDate(6),
          reservation_time: "19:00:00",
          raw_reservation_time: "سات بجے",
          seating_preference: "indoor rooftop",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        error_code: "",
        reservation_id: expect.any(String),
        success: "true",
      })
    );

    const createdCustomer = await db.customer.findOne({
      where: { phoneE164: "+923006667777" },
    });
    expect(createdCustomer).toEqual(
      expect.objectContaining({
        name: "Basim",
      })
    );
  });

  it("returns a safe Retell failure payload when create-reservation hits an unavailable slot", async () => {
    const reservationDate = futureDate(5);

    const customer = await db.customer.create({
      name: "Returning Guest",
      phoneE164: "+923006667778",
    });

    await db.reservation.create({
      customerId: customer.id,
      endTime: "21:00:00",
      guestCount: 4,
      reservationDate,
      seatingArea: "indoor_rooftop",
      source: "manual",
      startTime: "20:00:00",
      status: "confirmed",
      tableId: 2,
    });

    const response = await request(app)
      .post("/api/retell/create-reservation")
      .send({
        args: {
          customer_name: "New Caller",
          guest_count: "4",
          phone_number: "03008889999",
          reservation_date: reservationDate,
          reservation_time: "8 pm",
          seating_preference: "indoor rooftop",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        error_code: "UNAVAILABLE_SLOT",
        reservation_id: "",
        success: "false",
      })
    );
    expect(response.body.alternative_areas).toContain("outdoor rooftop");
  });
});
