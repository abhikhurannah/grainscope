export type Crop = 'Rice' | 'Sorghum'
export type SpectrumPoint = { wavelength_nm: number; reflectance: number }

export const riceExamples = [
  { id: 'rice-xd9', name: 'XD9 · lower protein', crop: 'Rice' as Crop, center: 0.49 },
  { id: 'rice-sx66', name: 'SX66 · medium protein', crop: 'Rice' as Crop, center: 0.53 },
  { id: 'rice-jf105', name: 'JF105 · higher protein', crop: 'Rice' as Crop, center: 0.58 },
  { id: 'rice-jf103', name: 'JF103 · higher protein', crop: 'Rice' as Crop, center: 0.56 },
  { id: 'rice-balanced', name: 'Balanced rice sample', crop: 'Rice' as Crop, center: 0.52 },
  { id: 'rice-noisy', name: 'Noisy rice spectrum', crop: 'Rice' as Crop, center: 0.51, noisy: true },
]
export const sorghumExamples = [
  { id: 'sorghum-low-protein', name: 'Low-protein sorghum', crop: 'Sorghum' as Crop, center: 0.42 },
  { id: 'sorghum-high-protein', name: 'High-protein sorghum', crop: 'Sorghum' as Crop, center: 0.5 },
  { id: 'sorghum-high-moisture', name: 'High-moisture sorghum', crop: 'Sorghum' as Crop, center: 0.46, moisture: 0.18 },
  { id: 'sorghum-low-moisture', name: 'Low-moisture sorghum', crop: 'Sorghum' as Crop, center: 0.51, moisture: -0.12 },
  { id: 'sorghum-balanced', name: 'Balanced sorghum', crop: 'Sorghum' as Crop, center: 0.47 },
  { id: 'sorghum-noisy', name: 'Noisy sorghum spectrum', crop: 'Sorghum' as Crop, center: 0.46, noisy: true },
]

export function makeSyntheticSpectrum(crop: Crop, exampleId = crop === 'Rice' ? riceExamples[0].id : sorghumExamples[0].id): SpectrumPoint[] {
  const example = [...riceExamples, ...sorghumExamples].find((item) => item.id === exampleId) as (typeof riceExamples[number] & { moisture?: number; noisy?: boolean }) | undefined
  const start = crop === 'Rice' ? 400 : 900; const end = crop === 'Rice' ? 1000 : 1700; const count = crop === 'Rice' ? 121 : 161
  const center = example?.center ?? 0.5; const moistureShift = example?.moisture ?? 0; const noisy = example?.noisy ? 0.018 : 0
  return Array.from({ length: count }, (_, index) => {
    const wavelength_nm = start + ((end - start) * index) / (count - 1); const x = index / (count - 1)
    const waterBand = (crop === 'Rice' ? 0.1 : 0.16 + moistureShift) * Math.exp(-((x - 0.52) ** 2) / (crop === 'Rice' ? 0.012 : 0.02))
    const proteinBand = 0.045 * Math.exp(-((x - 0.28) ** 2) / 0.014) + 0.035 * Math.exp(-((x - 0.74) ** 2) / 0.022)
    const noise = noisy * Math.sin(index * 3.7) + 0.006 * Math.sin(x * 16) + 0.024 * Math.cos(x * 41)
    const reflectance = Math.max(0.12, Math.min(0.9, center + noise - waterBand - proteinBand + 0.014 * Math.sin(x * 80)))
    return { wavelength_nm: Math.round(wavelength_nm * 10) / 10, reflectance: Math.round(reflectance * 10000) / 10000 }
  })
}

export function validateCsv(text: string): { points?: SpectrumPoint[]; error?: string } {
  const rows = text.trim().split(/\r?\n/); if (rows.length < 2) return { error: 'The CSV needs a header and at least one data row.' }
  if (!/^wavelength(_nm)?,reflectance$/i.test(rows[0].trim())) return { error: 'Use exactly this header: wavelength_nm,reflectance' }
  const points: SpectrumPoint[] = []
  for (let index = 1; index < rows.length; index++) { const values = rows[index].split(',').map((value) => value.trim()); if (values.length !== 2 || values.some((value) => value === '')) return { error: `Row ${index + 1} is missing a value.` }; const wavelength_nm = Number(values[0]); const reflectance = Number(values[1]); if (!Number.isFinite(wavelength_nm) || !Number.isFinite(reflectance)) return { error: `Row ${index + 1} must contain numeric values.` }; if (reflectance < 0 || reflectance > 1) return { error: `Row ${index + 1} reflectance must be between 0 and 1.` }; if (points.at(-1) && wavelength_nm <= points.at(-1)!.wavelength_nm) return { error: `Row ${index + 1} must have increasing, unique wavelengths.` }; points.push({ wavelength_nm, reflectance }) }
  return { points }
}

export function simulatePrediction(points: SpectrumPoint[], crop: Crop) { const mean = points.reduce((sum, point) => sum + point.reflectance, 0) / points.length; const variation = points.reduce((sum, point) => sum + Math.abs(point.reflectance - mean), 0) / points.length; const protein = Math.round((5.2 + mean * 10 + variation * 8) * 100) / 100; const moisture = Math.round((7.5 + (1 - mean) * 8 + variation * 4) * 100) / 100; return { protein, moisture: crop === 'Sorghum' ? moisture : null, mean: Math.round(mean * 1000) / 1000, variation: Math.round(variation * 1000) / 1000 } }
export function toCsv(points: SpectrumPoint[]) { return ['wavelength_nm,reflectance', ...points.map((point) => `${point.wavelength_nm},${point.reflectance}`)].join('\n') }
export function downloadText(filename: string, content: string, type = 'text/plain') { const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url) }
export function reportText(crop: Crop, sampleName: string, result: ReturnType<typeof simulatePrediction>) { return `GrainScope analysis\nDemo data — not for laboratory or commercial use\n\nSample: ${sampleName}\nCrop: ${crop}\nProtein: ${result.protein} g/100 g${result.moisture === null ? '' : `\nMoisture: ${result.moisture} g/100 g`}\nMean reflectance: ${result.mean}` }
export const wavelengthBands = [
  { label: 'Visible', range: '400–700 nm', color: '#0f766e', note: 'pigment and surface response' },
  { label: 'Red edge', range: '700–900 nm', color: '#f97316', note: 'transition into NIR' },
  { label: 'Water-related', range: '970–1200 nm', color: '#2563eb', note: 'O–H absorption' },
  { label: 'Protein-related', range: '1450–1550 nm', color: '#ef4444', note: 'N–H combination bands' },
  { label: 'Carbohydrate-related', range: '1100–1300 nm', color: '#8b5cf6', note: 'starch and carbohydrate response' },
]
export const processingSteps = ['Input check', 'Calibration', 'Preprocessing', 'Feature selection', 'Prediction']
export const riceWorkflow = ['Reflectance input', 'MSC correction', 'SPA selection', 'MLR regression', 'Protein estimate']
export const sorghumWorkflow = ['Reflectance input', 'Calibration', 'CLNet features', 'Protein + moisture', 'Quality summary']
export function futureModelIntegrationPoint() { return 'future-model-api' }
export const researchNotes = []
