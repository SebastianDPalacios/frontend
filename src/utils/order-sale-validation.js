import { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";
import { isIntegerUnit } from "views/modules/flow-utils";

const getInvalidUnitSaleAmount = (product, entry, { bonusPercent = 0 } = {}) => {
  if (!["sale", "sale_bonus", "bonus", "gift", "exchange"].includes(entry?.orderMode) || entry?.captureMode !== "amount" || !isIntegerUnit(product?.unit)) {
    return null;
  }

  const price = Number(product?.base_price || 0);
  const amount = Number(entry?.value || 0);
  if (price <= 0 || amount <= 0) {
    return null;
  }

  const taxPercent = Number(product?.tax_percent || product?.rate_percent || 0);
  const commercialPrice = price * (1 + taxPercent / 100);
  const normalizedBonusPercent = Number(bonusPercent || 0);
  const validationStep = entry.orderMode === "sale_bonus"
    ? commercialPrice / (1 + normalizedBonusPercent / 100)
    : commercialPrice;
  const calculatedUnits = amount / validationStep;
  if (Math.abs(calculatedUnits - Math.round(calculatedUnits)) < 0.000001) return null;

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
    price: commercialPrice,
    lower,
    upper,
    message: entry.orderMode === "sale_bonus"
      ? `El valor de ${modeLabel} debe producir unidades completas con el ${formatCurrencyValue(normalizedBonusPercent, 0)}% de vendaje. Ingresa ${alternatives}.`
      : `El valor de ${modeLabel} debe ser múltiplo de $${formatCurrencyValue(validationStep, 0)}. Ingresa ${alternatives}.`,
  };
};

export default getInvalidUnitSaleAmount;
