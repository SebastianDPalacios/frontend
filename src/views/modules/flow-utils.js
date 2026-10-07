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

export const isIntegerUnit = (unit) => {
  return ["unit", "unidad", "unidades", "ud", "uds", "box", "caja", "cajas", "package", "paquete", "paquetes", "roll", "rollo", "rollos", "bag", "bolsa", "bolsas"].includes(
    String(unit || "").trim().toLowerCase()
  );
};

export const hasDecimals = (value) => Math.abs(Number(value || 0) % 1) > 0;

// Conserva la precisión real, pero evita exponer ceros decimales provenientes
// de columnas DECIMAL de la base de datos (por ejemplo, 50000.0000 -> 50000).
export const formatEditableNumber = (value, fallback = "") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(value);
};

export const formatInventoryQuantity = (value, unit) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(number);
};
