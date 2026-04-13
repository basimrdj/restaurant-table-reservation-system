import API from "./API";

class ClosureAPI {
  getClosures(params = {}) {
    return API().get("/closures", { params });
  }

  createClosure(payload) {
    return API().post("/closures", payload);
  }

  deleteClosure(closureId) {
    return API().delete(`/closures/${closureId}`);
  }
}

export default new ClosureAPI();
