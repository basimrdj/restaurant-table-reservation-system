import API from "./API";

class TableAPI {
  createTable(tableData) {
    return API().post("/tables", tableData);
  }
  getTables() {
    return API().get("/tables");
  }
  updateTable(tableId, payload) {
    return API().patch("/tables/" + tableId, payload);
  }
}

export default new TableAPI();
