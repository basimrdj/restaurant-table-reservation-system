const db = require("../db/models");
const { Op } = db.Sequelize;

const Customer = db.customer;
const Reservation = db.reservation;
const Table = db.table;

const searchCustomers = async (query = "") => {
  const where = query
    ? {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { phoneE164: { [Op.like]: `%${query}%` } },
        ],
      }
    : {};

  return Customer.findAll({
    where,
    order: [
      ["vipFlag", "DESC"],
      ["name", "ASC"],
    ],
  });
};

const findCustomerById = async (customerId, options = {}) => {
  return Customer.findByPk(customerId, {
    include: [
      {
        model: Reservation,
        as: "reservations",
        include: [
          {
            model: Table,
            as: "table",
          },
        ],
      },
    ],
    order: [[{ model: Reservation, as: "reservations" }, "reservationDate", "DESC"]],
    ...options,
  });
};

const findCustomerByPhone = async (phoneE164, options = {}) => {
  return Customer.findOne({
    where: { phoneE164 },
    ...options,
  });
};

const createCustomer = async (payload, options = {}) => {
  return Customer.create(payload, options);
};

const updateCustomer = async (customer, payload, options = {}) => {
  return customer.update(payload, options);
};

module.exports = {
  createCustomer,
  findCustomerById,
  findCustomerByPhone,
  searchCustomers,
  updateCustomer,
};
