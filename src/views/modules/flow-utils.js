export const normalizeRows = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
};

export const getTotal = (payload) => {
  if (!payload) {
    return 0;
  }
  if (typeof payload.total === "number") {
    return payload.total;
  }
  return normalizeRows(payload).length;
};

export const getDisplayName = (item) => {
  return item?.description || item?.name || item?.full_name || item?.username || item?.email || "Sin nombre";
};

export const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString("es-CO");
};
