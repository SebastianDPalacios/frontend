const UNIT_NAMES = {
  g: "Gramos",
  gram: "Gramos",
  gramo: "Gramos",
  gramos: "Gramos",
  kg: "Kilogramos",
  kilogram: "Kilogramos",
  kilogramo: "Kilogramos",
  kilogramos: "Kilogramos",
  ml: "Mililitros",
  milliliter: "Mililitros",
  mililitro: "Mililitros",
  mililitros: "Mililitros",
  l: "Litros",
  liter: "Litros",
  litro: "Litros",
  litros: "Litros",
  unit: "Unidades",
  units: "Unidades",
  unidad: "Unidades",
  unidades: "Unidades",
  package: "Paquetes",
  packages: "Paquetes",
  paquete: "Paquetes",
  paquetes: "Paquetes",
  roll: "Rollos",
  rolls: "Rollos",
  rollo: "Rollos",
  rollos: "Rollos",
  bag: "Bolsas",
  bags: "Bolsas",
  bolsa: "Bolsas",
  bolsas: "Bolsas",
  box: "Cajas",
  boxes: "Cajas",
  caja: "Cajas",
  cajas: "Cajas",
};

export const normalizeMeasurementUnit = (unit) => String(unit || "unit").trim().toLowerCase();

export const getMeasurementUnitName = (unit) => {
  const normalized = normalizeMeasurementUnit(unit);
  return UNIT_NAMES[normalized] || String(unit || "Unidades");
};

export const formatMeasurementQuantity = (value, unit, formatter) => {
  return `${formatter(Number(value || 0))} ${getMeasurementUnitName(unit)}`;
};
