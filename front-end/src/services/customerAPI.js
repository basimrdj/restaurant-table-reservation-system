import API from "./API";

class CustomerAPI {
  getCustomers(query = "") {
    return API().get("/customers", {
      params: { query },
    });
  }

  getCustomer(customerId) {
    return API().get(`/customers/${customerId}`);
  }

  updateCustomer(customerId, payload) {
    return API().patch(`/customers/${customerId}`, payload);
  }
}

export default new CustomerAPI();
