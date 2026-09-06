export const getApiErrorMessage = (error, fallback) => {
  const response = error?.response?.data;
  const message = response?.message || error?.message;
  const details = response?.details;

  if (message === "Error interno del servidor" && details) {
    if (/duplicate entry/i.test(details) && /(sku|uq_.*sku)/i.test(details)) {
      return "Ya existe un producto con ese SKU. Escribe un identificador diferente.";
    }
    if (/duplicate entry/i.test(details) && /(name|nombre)/i.test(details)) {
      return "Ya existe un producto con ese nombre. Revisa el nombre ingresado.";
    }
    if (/foreign key constraint/i.test(details)) {
      return "La categoría o la tasa de impuesto seleccionada ya no está disponible. Vuelve a seleccionarla.";
    }
  }

  return message || fallback;
};
