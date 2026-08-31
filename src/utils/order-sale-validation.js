import { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";
import { isIntegerUnit } from "views/modules/flow-utils";

const getInvalidUnitSaleAmount = (product, entry) => {
  if (!["sale", "sale_bonus", "bonus", "gift", "exchange"].includes(entry?.orderMode) || entry?.captureMode !== "amount" || !isIntegerUnit(product?.unit)) {
    return null;
  }

  const price = Number(product?.base_price || 0);
  const validationStep = entry.orderMode === "sale_bonus" ? 500 : price;
  const amount = Number(entry?.value || 0);
  if (price <= 0 || amount <= 0 || Number.isInteger(amount / validationStep)) {
    return null;
  }

  const lower = Math.floor(amount / validationStep) * validationStep;
  const upper = Math.ceil(amount / validationStep) * validationStep;
  const alternatives = [lower, upper]
    .filter((value) => value > 0)
    .map((value) => `$${formatCurrencyValue(value, 0)}`)
    .join(" o ");

  const modeLabel = {
    sale: "Venta",
    sale_bonus: "Venta + vendaje",
    bonus: "Solo vendaje",
    gift: "Obsequio",
    exchange: "Cambio",
  }[entry.orderMode] || "Venta";

  return {
    product,
    price: validationStep,
    lower,
    upper,
    message: `El valor de ${modeLabel} debe ser múltiplo de $${formatCurrencyValue(validationStep, 0)}. Ingresa ${alternatives}.`,
  };
};

export default getInvalidUnitSaleAmount;
