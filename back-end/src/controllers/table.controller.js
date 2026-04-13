const tableService = require("../services/tableService");

const listHandler = async (req, res) => {
  const tables = await tableService.listTables();

  return res.status(200).json({
    success: true,
    collection: tables,
  });
};

const createHandler = async (req, res) => {
  const table = await tableService.createTable(req.body);

  return res.status(201).json({
    success: true,
    item: table,
  });
};

const updateHandler = async (req, res) => {
  const table = await tableService.updateTable(req.params.tableId, req.body);

  return res.status(200).json({
    success: true,
    item: table,
  });
};

module.exports = {
  createHandler,
  listHandler,
  updateHandler,
};
