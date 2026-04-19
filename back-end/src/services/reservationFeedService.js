"use strict";

const HEARTBEAT_INTERVAL_MS = 15000;
const clients = new Set();

const writeEvent = (response, eventName, payload) => {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const normalizeFilterDate = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const clientWantsEvent = (client, payload) => {
  if (!client.filterDate) {
    return true;
  }

  if (!Array.isArray(payload.affected_dates) || payload.affected_dates.length === 0) {
    return true;
  }

  return payload.affected_dates.includes(client.filterDate);
};

const removeClient = (client) => {
  if (!clients.has(client)) {
    return;
  }

  clearInterval(client.heartbeat);
  clients.delete(client);
};

const openReservationFeed = (request, response) => {
  response.status(200);
  response.set({
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "X-Accel-Buffering": "no",
  });

  if (typeof response.flushHeaders === "function") {
    response.flushHeaders();
  }

  response.write("retry: 5000\n\n");

  const client = {
    filterDate: normalizeFilterDate(request.query.date),
    response,
    heartbeat: null,
  };

  client.heartbeat = setInterval(() => {
    response.write(": heartbeat\n\n");
  }, HEARTBEAT_INTERVAL_MS);

  clients.add(client);

  writeEvent(response, "connected", {
    connected: true,
    filter_date: client.filterDate,
  });

  const cleanup = () => removeClient(client);

  request.on("close", cleanup);
  request.on("end", cleanup);
  request.on("error", cleanup);
};

const publishReservationEvent = (payload) => {
  const eventPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
  };

  for (const client of clients) {
    if (!clientWantsEvent(client, eventPayload)) {
      continue;
    }

    try {
      writeEvent(client.response, "reservation_changed", eventPayload);
    } catch {
      removeClient(client);
    }
  }
};

module.exports = {
  openReservationFeed,
  publishReservationEvent,
};
