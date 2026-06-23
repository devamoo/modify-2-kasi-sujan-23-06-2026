// Merged client lookup used by BOQs, quotes, and any form that needs to
// auto-fill from an existing client. Mirrors the merge logic in Client.jsx
// (static seed + localStorage adds, minus soft-deleted IDs).

import { ClientTableData } from "./ClientTableData";

const NEW_KEY = "newClientsData";
const DELETED_KEY = "deletedClients";

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

export const getAllClients = () => {
  const newClients = readJson(NEW_KEY, []);
  const deleted = readJson(DELETED_KEY, []);
  const base = [...ClientTableData];
  const trulyNew = [];

  newClients.forEach((nc) => {
    const idx = base.findIndex((c) => c.clientID === nc.clientID);
    if (idx >= 0) base[idx] = nc;
    else trulyNew.push(nc);
  });

  return [...trulyNew, ...base].filter((c) => !deleted.includes(c.clientID));
};

export const getClient = (clientID) => {
  if (!clientID) return null;
  return getAllClients().find((c) => c.clientID === clientID) || null;
};

// Flatten a client record into the shape the BOQ Client & Project section
// expects. Lets the editor stay decoupled from the client data schema.
export const clientToBoqFields = (c) => {
  if (!c) return { client: {}, project: {} };
  return {
    client: {
      id: c.clientID,
      name: c.clientName || "",
      phone: c.clientPhone || "",
      email: c.clientEmail || "",
      address: c.locationSecondary || "",
      gstin: c.gstin || "",
    },
    project: {
      name: c.projectName || c.locationSecondary || "",
      propertyType: c.location || "",
      address: c.locationSecondary || "",
      sizeRange: c.sizeRange || "",
    },
  };
};
