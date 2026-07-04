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

export const formatInventoryQuantity = (value, unit) => {
  const number = Number(value || 0);
  const maximumFractionDigits = isIntegerUnit(unit) ? 0 : hasDecimals(number) ? 3 : 0;

  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits,
  }).format(number);
};
