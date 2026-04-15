const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const notFound = require("../middleware/notFound");
const errorHandler = require("../middleware/errorHandler");
const tableRouter = require("../routes/table.router");
const reservationRouter = require("../routes/reservation.router");
const customerRouter = require("../routes/customer.router");
const closureRouter = require("../routes/closure.router");
const availabilityRouter = require("../routes/availability.router");
const operatingHourRouter = require("../routes/operatingHour.router");
const settingsRouter = require("../routes/settings.router");
const retellRouter = require("../routes/retell.router");
const createServer = () => {
  const app = express();

  app.use(cors());
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  ); // middleware for more secure response headers
  app.use(express.json());
  app.get("/healthz", (req, res) =>
    res.status(200).json({
      success: true,
      status: "ok",
    })
  );
  app.use("/api/v1", require("../routes"));
  app.use("/api/v1/settings", settingsRouter);
  app.use("/api/v1/operating-hours", operatingHourRouter);
  app.use("/api/v1/customers", customerRouter);
  app.use("/api/v1/tables", tableRouter);
  app.use("/api/v1/reservations", reservationRouter);
  app.use("/api/v1/closures", closureRouter);
  app.use("/api/v1/availability", availabilityRouter);
  app.use("/api/retell", retellRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};

module.exports = createServer;
