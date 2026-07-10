export function formatBindingDimension(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}
