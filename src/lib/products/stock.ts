export function nextStock(previousStock: number, quantity: number) {
  const newStock = previousStock + quantity;

  if (newStock < 0) {
    return {
      ok: false as const,
      error: "Stock insuffisant.",
      stock: previousStock,
    };
  }

  return {
    ok: true as const,
    previousStock,
    quantity,
    newStock,
  };
}
