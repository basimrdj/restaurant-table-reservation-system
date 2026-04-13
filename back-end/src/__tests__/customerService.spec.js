const customerService = require("../services/customerService");
const { resetDatabase } = require("./helpers/testDb");

describe("customerService", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("normalizes phone numbers and prevents duplicate customers", async () => {
    const customer = await customerService.getOrCreateCustomer({
      customerName: "Maham Ali",
      phoneNumber: "03001234567",
    });

    const sameCustomer = await customerService.getOrCreateCustomer({
      customerName: "Maham Ali",
      phoneNumber: "+923001234567",
    });

    expect(customer.id).toBe(sameCustomer.id);
    expect(customer.phoneE164).toBe("+923001234567");
  });
});
