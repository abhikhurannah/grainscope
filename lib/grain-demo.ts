export type Crop = 'Rice' | 'Sorghum'
export type SpectrumPoint = { wavelength_nm: number; reflectance: number }

export const riceExamples = [
  { id: 'rice-balanced', name: 'Rice · balanced grain', crop: 'Rice' as Crop, center: 0.52 },
  { id: 'rice-high-protein', name: 'Rice · protein-rich', crop: 'Rice' as Crop, center: 0.58 },
  { id: 'rice-low-moisture', name: 'Rice · dry grain', crop: 'Rice' as Crop, center: 0.49 },
]
export const sorghumExamples = [
  { id: 'sorghum-balanced', name: 'Sorghum · balanced grain', crop: 'Sorghum' as Crop, center: 0.48 },
  { id: 'sorghum-moisture', name: 'Sorghum · higher moisture', crop: 'Sorghum' as Crop, center: 0.54 },
  { id: 'sorghum-protein', name: 'Sorghum · protein-rich', crop: 'Sorghum' as Crop, center: 0.43 },
]

export function makeSyntheticSpectrum(crop: Crop, exampleId = crop === 'Rice' ? riceExamples[0].id : sorghumExamples[0].id): SpectrumPoint[] {
  const example = [...riceExamples, ...sorghumExamples].find((item) => item.id === exampleId)
  const start = crop === 'Rice' ? 400 : 900
  const end = crop === 'Rice' ? 1000 : 1700
  const count = crop === 'Rice' ? 121 : 161
  const center = example?.center ?? 0.5
  return Array.from({ length: count }, (_, index) => {
    const wavelength_nm = start + ((end - start) * index) / (count - 1)
    const x = index / (count - 1)
    const waterBand = crop === 'Rice' ? 0.11 * Math.exp(-((x - 0.52) ** 2) / 0.012) : 0.16 * Math.exp(-((x - 0.49) ** 2) / 0.02)
    const proteinBand = 0.045 * Math.exp(-((x - 0.28) ** 2) / 0.014) + 0.035 * Math.exp(-((x - 0.74) ** 2) / 0.022)
    const reflectance = Math.max(0.12, Math.min(0.9, center + 0.06 * Math.sin(x * 16) + 0.024 * Math.cos(x * 41) - waterBand - proteinBand + 0.014 * Math.sin(x * 80)))
    return { wavelength_nm: Math.round(wavelength_nm * 10) / 10, reflectance: Math.round(reflectance * 10000) / 10000 }
  })
}

export function validateCsv(text: string): { points?: SpectrumPoint[]; error?: string } {
  const rows = text.trim().split(/\r?\n/)
  if (rows.length < 2) return { error: 'The CSV needs a header and at least one data row.' }
  if (rows[0].trim() !== 'wavelength_nm,reflectance') return { error: 'Use exactly this header: wavelength_nm,reflectance' }
  const points: SpectrumPoint[] = []
  for (let index = 1; index < rows.length; index++) {
    const values = rows[index].split(',').map((value) => value.trim())
    if (values.length !== 2 || values.some((value) => value === '')) return { error: `Row ${index + 1} is missing a value.` }
    const wavelength_nm = Number(values[0]); const reflectance = Number(values[1])
    if (!Number.isFinite(wavelength_nm) || !Number.isFinite(reflectance)) return { error: `Row ${index + 1} must contain numeric values.` }
    if (wavelength_nm <= 0) return { error: `Row ${index + 1} has a wavelength that is not positive.` }
    if (reflectance < 0 || reflectance > 1) return { error: `Row ${index + 1} has reflectance outside 0–1.` }
    if (points.at(-1) && wavelength_nm <= points.at(-1)!.wavelength_nm) return { error: `Row ${index + 1} must have increasing, unique wavelengths.` }
    points.push({ wavelength_nm, reflectance })
  }
  return { points }
}

export function simulatePrediction(points: SpectrumPoint[], crop: Crop) {
  const mean = points.reduce((sum, point) => sum + point.reflectance, 0) / points.length
  const variation = points.reduce((sum, point) => sum + Math.abs(point.reflectance - mean), 0) / points.length
  const protein = Math.round((5.2 + mean * 10 + variation * 8) * 100) / 100
  const moisture = Math.round((7.5 + (1 - mean) * 8 + variation * 4) * 100) / 100
  return { protein, moisture: crop === 'Sorghum' ? moisture : Math.round((moisture - 0.8) * 100) / 100, mean: Math.round(mean * 1000) / 1000, variation: Math.round(variation * 1000) / 1000 }
}

export function toCsv(points: SpectrumPoint[]) { return ['wavelength_nm,reflectance', ...points.map((point) => `${point.wavelength_nm},${point.reflectance}`)].join('\n') }
export function downloadText(filename: string, content: string, type = 'text/plain') { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url) }
export function reportText(crop: Crop, sampleName: string, result: ReturnType<typeof simulatePrediction>) { return `Grain Quality Prediction Using Hyperspectral Imaging\n\nDEMO REPORT — SIMULATED RESULTS\nSample: ${sampleName}\nCrop: ${crop}\nProtein: ${result.protein} g/100 g\nMoisture: ${result.moisture} g/100 g\n\nThese values were generated deterministically from synthetic reflectance data. They have no scientific predictive validity and are not laboratory measurements.` }
export function futureModelIntegrationPoint() { return 'future-model-api' }
export const wavelengthBands = [
  { label: 'Visible', range: '400–700 nm', color: 'var(--chart-1)' },
  { label: 'Red edge', range: '700–900 nm', color: 'var(--chart-2)' },
  { label: 'NIR', range: '900–1300 nm', color: 'var(--chart-3)' },
  { label: 'SWIR', range: '1300–1700 nm', color: 'var(--chart-4)' },
]
export const processingSteps = ['Check input', 'Calibrate spectrum', 'Find informative bands', 'Run quality models', 'Display result']
export const riceWorkflow = ['Reflectance input', 'MSC correction', 'SPA selection', 'MLR regression', 'Protein estimate']
export const sorghumWorkflow = ['Reflectance input', '1D CNN features', 'LSTM sequence', 'CLNet layer', 'Protein + moisture']
export const researchNotes = [
  { crop: 'Rice', title: 'MSC–SPA–MLR baseline', text: 'The rice method uses multiplicative scatter correction, successive projections algorithm wavelength selection, and multiple linear regression for protein estimation.', meta: 'Xuan et al. · 144 samples · 400–1000 nm' },
  { crop: 'Sorghum', title: 'CNN + LSTM = CLNet', text: 'The sorghum method learns local spectral patterns with a one-dimensional CNN and ordered relationships with an LSTM for protein and moisture.', meta: 'Hu et al. · 240 samples · about 900–1700 nm' },
]
