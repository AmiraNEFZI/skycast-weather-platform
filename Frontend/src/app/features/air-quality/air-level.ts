const aqiLabels = ['Bon', 'Modéré', 'Mauvais pour les groupes sensibles', 'Mauvais', 'Très mauvais', 'Dangereux'];
const uvLabels = ['Faible', 'Modéré', 'Élevé', 'Très élevé', 'Extrême'];

export function airLevel(metric: string, value: number | null): string | undefined {
  if (value === null || value < 0 || !Number.isFinite(value)) return undefined;
  const index = Math.round(value);
  const aqi = metric === 'aqi';
  if (!aqi && metric !== 'uv') return undefined;
  const bounds = aqi ? [50, 100, 150, 200, 300] : [2, 5, 7, 10];
  const level = bounds.filter((limit) => index > limit).length;
  return (aqi ? aqiLabels : uvLabels)[level];
}
