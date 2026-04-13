const customerService = require("../services/customerService");

const listHandler = async (req, res) => {
  const customers = await customerService.listCustomers(req.query.query || "");

  return res.status(200).json({
    success: true,
    collection: customers,
  });
};

const getByIdHandler = async (req, res) => {
  const customer = await customerService.getCustomerDetail(req.params.customerId);

  return res.status(200).json({
    success: true,
    item: customer,
  });
};

const updateHandler = async (req, res) => {
  const customer = await customerService.updateCustomer(
    req.params.customerId,
    req.body
  );

  return res.status(200).json({
    success: true,
    item: customer,
  });
};

module.exports = {
  getByIdHandler,
  listHandler,
  updateHandler,
};
