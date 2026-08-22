import { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";
import { isIntegerUnit } from "views/modules/flow-utils";

const getInvalidUnitSaleAmount = (product, entry) => {
  if (!["sale", "bonus"].includes(entry?.orderMode) || entry?.captureMode !== "amount" || !isIntegerUnit(product?.unit)) {
    return null;
  }

  const price = Number(product?.base_price || 0);
  const amount = Number(entry?.value || 0);
  if (price <= 0 || amount <= 0 || Number.isInteger(amount / price)) {
    return null;
  }

  const lower = Math.floor(amount / price) * price;
  const upper = Math.ceil(amount / price) * price;
  const alternatives = [lower, upper]
    .filter((value) => value > 0)
    .map((value) => `$${formatCurrencyValue(value, 0)}`)
    .join(" o ");

  return {
    product,
    price,
    lower,
    upper,
    message: `El valor de ${entry.orderMode === "bonus" ? "Solo vendaje" : "Venta"} debe ser múltiplo de $${formatCurrencyValue(price, 0)}. Ingresa ${alternatives}.`,
  };
};

export default getInvalidUnitSaleAmount;
