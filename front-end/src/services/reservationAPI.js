import API from "./API";

class ReservationAPI {
  getReservations(params = {}) {
    return API().get("/reservations", { params });
  }
  createReservation(reservationData) {
    return API().post("/reservations", reservationData);
  }
  updateReservation(id, reservationData) {
    return API().patch("/reservations/" + id, reservationData);
  }
  cancelReservation(id) {
    return API().post(`/reservations/${id}/cancel`);
  }
  updateReservationStatus(id, status) {
    return API().post(`/reservations/${id}/status`, { status });
  }
  checkAvailability(payload) {
    return API().post("/availability/check", payload);
  }
}

export default new ReservationAPI();
