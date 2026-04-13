const closureService = require("../services/closureService");

const listHandler = async (req, res) => {
  const closures = await closureService.listClosures(req.query.date || null);

  return res.status(200).json({
    success: true,
    collection: closures,
  });
};

const createHandler = async (req, res) => {
  const closure = await closureService.createClosure(req.body);

  return res.status(201).json({
    success: true,
    item: closure,
  });
};

const deleteHandler = async (req, res) => {
  const result = await closureService.deleteClosure(req.params.closureId);

  return res.status(200).json({
    success: true,
    item: result,
  });
};

module.exports = {
  createHandler,
  deleteHandler,
  listHandler,
};
