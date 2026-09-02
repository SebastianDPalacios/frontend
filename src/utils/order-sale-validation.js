import { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";
import { isIntegerUnit } from "views/modules/flow-utils";

const isWholeQuantity = (value) => Math.abs(value - Math.round(value)) < 0.000001;

const getInvalidUnitSaleAmount = (product, entry, { bonusPercent = 20 } = {}) => {
  if (!["sale", "sale_bonus", "bonus", "gift", "exchange"].includes(entry?.orderMode) || entry?.captureMode !== "amount" || !isIntegerUnit(product?.unit)) {
    return null;
  }

  const price = Number(product?.base_price || 0);
  const amount = Number(entry?.value || 0);
  if (price <= 0 || amount <= 0) {
    return null;
  }

  if (entry.orderMode === "sale_bonus") {
    const percent = Number(bonusPercent || 0);
    const convertedQuantity = (amount * (1 + percent / 100)) / price;
    if (isWholeQuantity(convertedQuantity)) return null;

    const isValidAmount = (candidate) => candidate > 0
      && isWholeQuantity((candidate * (1 + percent / 100)) / price);
    let lower = Math.floor(amount) - 1;
    let upper = Math.ceil(amount) + 1;
    while (lower > 0 && !isValidAmount(lower)) lower -= 1;
    while (!isValidAmount(upper)) upper += 1;
    const alternatives = [lower, upper]
      .filter((value) => value > 0)
      .map((value) => `$${formatCurrencyValue(value, 0)}`)
      .join(" o ");

    return {
      product,
      lower,
      upper,
      message: `Con el ${formatCurrencyValue(percent, 0)}% de vendaje, este valor equivale a ${formatCurrencyValue(convertedQuantity, 2)} unidades. Ingresa un valor que produzca unidades completas, como ${alternatives}.`,
    };
  }

  const validationStep = price;
  if (Number.isInteger(amount / validationStep)) return null;

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
