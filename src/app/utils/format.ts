export function formatMozCurrency(amount: number, locale: string = 'pt-MZ') {
  return `MT ${amount.toLocaleString(locale)}`;
}