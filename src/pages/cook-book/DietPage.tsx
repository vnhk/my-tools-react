import { useEffect, useRef, useState } from 'react'
import { useNotification } from '../../components/ui/Notification'
import { dietApi, ingredientsApi, type DietDayDto, type DietMealDto, type DietMealItemDto, type IngredientDto } from '../../api/cookBook'
import styles from './DietPage.module.css'

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER']
const ACTIVITY_LEVELS = [
  { value: 'SEDENTARY', label: 'Sedentary (1.2)' },
  { value: 'LIGHT', label: 'Light (1.375)' },
  { value: 'MODERATE', label: 'Moderate (1.55)' },
  { value: 'ACTIVE', label: 'Active (1.725)' },
  { value: 'VERY_ACTIVE', label: 'Very Active (1.9)' },
]
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  SEDENTARY: 1.2, LIGHT: 1.375, MODERATE: 1.55, ACTIVE: 1.725, VERY_ACTIVE: 1.9,
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ── Macro tile ────────────────────────────────────────────────────────────────
function MacroTile({ label, consumed, target, unit = 'g' }: {
  label: string; consumed: number; target: number | null; unit?: string
}) {
  const pct = target && target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  const over = target != null && consumed > target
  return (
    <div className={styles.macroTile}>
      <div className={styles.macroLabel}>{label}</div>
      <div className={styles.macroConsumed}>{consumed.toFixed(unit === 'kcal' ? 0 : 1)}<span className={styles.macroUnit}>{unit}</span></div>
      {target != null && (
        <>
          <div className={`${styles.macroRemaining} ${over ? styles.over : ''}`}>
            {over ? `+${(consumed - target).toFixed(unit === 'kcal' ? 0 : 1)}` : `${(target - consumed).toFixed(unit === 'kcal' ? 0 : 1)}`} {unit} {over ? 'over' : 'left'}
          </div>
          <div className={styles.macroBar}>
            <div className={`${styles.macroBarFill} ${over ? styles.overBar : ''}`} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.macroTarget}>Target: {target}{unit}</div>
        </>
      )}
    </div>
  )
}

// ── Add item dialog ───────────────────────────────────────────────────────────
function AddItemDialog({ date, mealType, mealName, onAdded, onClose }: {
  date: string; mealType: string; mealName: string
  onAdded: (day: DietDayDto) => void; onClose: () => void
}) {
  const { showError } = useNotification()
  const [tab, setTab] = useState<'ingredient' | 'quick'>('ingredient')
  const [ingSearch, setIngSearch] = useState('')
  const [suggestions, setSuggestions] = useState<IngredientDto[]>([])
  const [selectedIng, setSelectedIng] = useState<IngredientDto | null>(null)
  const [amountGrams, setAmountGrams] = useState('')
  const [quickMode, setQuickMode] = useState<'direct' | 'per100g'>('direct')
  const [desc, setDesc] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fiber, setFiber] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (ingSearch.trim().length < 1) { setSuggestions([]); return }
    debounceRef.current = setTimeout(() => {
      ingredientsApi.search(ingSearch, 0, 10)
        .then(r => setSuggestions(r.data))
        .catch(() => {})
    }, 250)
  }, [ingSearch])

  const effectiveKcal = () => {
    if (tab === 'ingredient' && selectedIng && amountGrams) {
      const g = parseFloat(amountGrams)
      if (selectedIng.kcalPer100g != null && !isNaN(g)) return (selectedIng.kcalPer100g * g / 100).toFixed(0)
    }
    if (tab === 'quick' && quickMode === 'per100g' && kcal && amountGrams) {
      const k = parseFloat(kcal), g = parseFloat(amountGrams)
      if (!isNaN(k) && !isNaN(g)) return (k * g / 100).toFixed(0)
    }
    return kcal || '—'
  }

  const handleAdd = () => {
    if (tab === 'ingredient') {
      if (!selectedIng) { showError('Select an ingredient'); return }
      const g = parseFloat(amountGrams)
      if (isNaN(g) || g <= 0) { showError('Enter amount in grams'); return }
      dietApi.addItem(date, mealType, { ingredientId: selectedIng.id, amountGrams: g })
        .then(r => { onAdded(r.data); onClose() })
        .catch(() => showError('Failed to add item'))
    } else {
      if (!desc.trim() && !kcal) { showError('Enter description or kcal'); return }
      let body: Record<string, unknown> = { description: desc }
      if (quickMode === 'direct') {
        if (kcal) body.kcal = parseFloat(kcal)
        if (protein) body.protein = parseFloat(protein)
        if (fat) body.fat = parseFloat(fat)
        if (carbs) body.carbs = parseFloat(carbs)
        if (fiber) body.fiber = parseFloat(fiber)
      } else {
        const g = parseFloat(amountGrams) || 100
        const scale = g / 100
        if (kcal) body.kcal = parseFloat(kcal) * scale
        if (protein) body.protein = parseFloat(protein) * scale
        if (fat) body.fat = parseFloat(fat) * scale
        if (carbs) body.carbs = parseFloat(carbs) * scale
        if (fiber) body.fiber = parseFloat(fiber) * scale
      }
      dietApi.addItem(date, mealType, body)
        .then(r => { onAdded(r.data); onClose() })
        .catch(() => showError('Failed to add item'))
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>Add to {mealName}</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.tabBar}>
          <button className={`${styles.tabBtn} ${tab === 'ingredient' ? styles.tabActive : ''}`}
            onClick={() => setTab('ingredient')}>From Ingredient</button>
          <button className={`${styles.tabBtn} ${tab === 'quick' ? styles.tabActive : ''}`}
            onClick={() => setTab('quick')}>Quick Entry</button>
        </div>
        <div className={styles.dialogBody}>
          {tab === 'ingredient' ? (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Ingredient</label>
                <div className={styles.suggestWrap}>
                  <input className={styles.input}
                    value={selectedIng ? selectedIng.name : ingSearch}
                    placeholder="Search…"
                    onChange={e => { setIngSearch(e.target.value); setSelectedIng(null) }}
                    onFocus={() => { if (selectedIng) setIngSearch('') }}
                  />
                  {suggestions.length > 0 && !selectedIng && (
                    <div className={styles.suggestions}>
                      {suggestions.map(s => (
                        <div key={s.id} className={styles.suggestion}
                          onMouseDown={() => { setSelectedIng(s); setIngSearch(''); setSuggestions([]) }}>
                          {s.icon} {s.name}
                          {s.kcalPer100g != null && <span className={styles.kcalHint}>{s.kcalPer100g} kcal/100g</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {selectedIng && (
                <div className={styles.ingPreview}>
                  <span>{selectedIng.icon} {selectedIng.name}</span>
                  {selectedIng.kcalPer100g != null && <span className={styles.muted}>{selectedIng.kcalPer100g} kcal / {selectedIng.proteinPer100g}P / {selectedIng.fatPer100g}F / {selectedIng.carbsPer100g}C per 100g</span>}
                </div>
              )}
              <div className={styles.field}>
                <label className={styles.label}>Amount (grams)</label>
                <input className={styles.input} type="number" min="1"
                  value={amountGrams} onChange={e => setAmountGrams(e.target.value)} />
              </div>
              {selectedIng && amountGrams && (
                <div className={styles.preview}>
                  ≈ {effectiveKcal()} kcal
                  {selectedIng.proteinPer100g != null && ` · ${(selectedIng.proteinPer100g * parseFloat(amountGrams) / 100).toFixed(1)}P`}
                  {selectedIng.fatPer100g != null && ` · ${(selectedIng.fatPer100g * parseFloat(amountGrams) / 100).toFixed(1)}F`}
                  {selectedIng.carbsPer100g != null && ` · ${(selectedIng.carbsPer100g * parseFloat(amountGrams) / 100).toFixed(1)}C`}
                </div>
              )}
            </>
          ) : (
            <>
              <div className={styles.tabBar} style={{ marginBottom: 0 }}>
                <button className={`${styles.tabBtn} ${quickMode === 'direct' ? styles.tabActive : ''}`}
                  onClick={() => setQuickMode('direct')}>Direct</button>
                <button className={`${styles.tabBtn} ${quickMode === 'per100g' ? styles.tabActive : ''}`}
                  onClick={() => setQuickMode('per100g')}>Per 100g</button>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Description</label>
                <input className={styles.input} value={desc}
                  onChange={e => setDesc(e.target.value)} placeholder="e.g. Chicken breast" autoFocus />
              </div>
              {quickMode === 'per100g' && (
                <div className={styles.field}>
                  <label className={styles.label}>Amount (grams)</label>
                  <input className={styles.input} type="number" min="1"
                    value={amountGrams} onChange={e => setAmountGrams(e.target.value)} />
                </div>
              )}
              <div className={styles.macroGrid5}>
                {[['kcal', kcal, setKcal], ['Protein', protein, setProtein],
                  ['Fat', fat, setFat], ['Carbs', carbs, setCarbs], ['Fiber', fiber, setFiber]].map(
                  ([lbl, val, setter]) => (
                    <div key={lbl as string} className={styles.field}>
                      <label className={styles.label}>{lbl as string}{quickMode === 'per100g' ? '/100g' : ''}</label>
                      <input className={styles.input} type="number" min="0" step="0.1"
                        value={val as string}
                        onChange={e => (setter as (v: string) => void)(e.target.value)} />
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
        <div className={styles.dialogFooter}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={handleAdd}>Add</button>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Copy meal dialog ──────────────────────────────────────────────────────────
function CopyMealDialog({ date, mealType, mealName, onCopied, onClose }: {
  date: string; mealType: string; mealName: string
  onCopied: (day: DietDayDto) => void; onClose: () => void
}) {
  const { showError } = useNotification()
  const [srcDate, setSrcDate] = useState(date)
  const [srcType, setSrcType] = useState(mealType)

  const handle = () => {
    dietApi.copyMeal(date, mealType, srcDate, srcType)
      .then(r => { onCopied(r.data); onClose() })
      .catch(() => showError('Failed to copy'))
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>Copy to {mealName}</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.dialogBody}>
          <div className={styles.field}>
            <label className={styles.label}>Source Date</label>
            <input className={styles.input} type="date" value={srcDate} onChange={e => setSrcDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Source Meal</label>
            <select className={styles.input} value={srcType} onChange={e => setSrcType(e.target.value)}>
              {MEAL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.dialogFooter}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={handle}>Copy</button>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Set Data dialog ───────────────────────────────────────────────────────────
function SetDataDialog({ day, onSaved, onClose }: {
  day: DietDayDto; onSaved: (d: DietDayDto) => void; onClose: () => void
}) {
  const { showError } = useNotification()
  const [f, setF] = useState({
    targetKcal: day.targetKcal ?? '',
    estimatedDailyKcal: day.estimatedDailyKcal ?? '',
    targetProtein: day.targetProtein ?? '',
    targetCarbs: day.targetCarbs ?? '',
    targetFat: day.targetFat ?? '',
    targetFiber: day.targetFiber ?? '',
    activityKcal: day.activityKcal ?? '',
    activityKcalPercent: day.activityKcalPercent ?? 85,
    weightKg: day.weightKg ?? '',
    notes: day.notes ?? '',
    age: day.age ?? '',
    gender: day.gender ?? 'M',
    heightCm: day.heightCm ?? '',
    activityLevel: day.activityLevel ?? 'SEDENTARY',
  })
  const [macroPct, setMacroPct] = useState({ protein: 30, fat: 25, carbs: 45 })

  const n = (v: string | number) => (v === '' ? null : Number(v))

  const calcTDEE = () => {
    const age = n(f.age), height = n(f.heightCm), weight = day.weightKg
    if (!age || !height || !weight) return
    const bmr = f.gender === 'M'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161
    const mult = ACTIVITY_MULTIPLIERS[f.activityLevel] ?? 1.2
    setF(prev => ({ ...prev, estimatedDailyKcal: Math.round(bmr * mult) }))
  }

  const applyMacroPct = () => {
    const kcal = n(f.targetKcal)
    if (!kcal) return
    setF(prev => ({
      ...prev,
      targetProtein: Math.round(kcal * macroPct.protein / 100 / 4),
      targetFat: Math.round(kcal * macroPct.fat / 100 / 9),
      targetCarbs: Math.round(kcal * macroPct.carbs / 100 / 4),
    }))
  }

  const handleSave = () => {
    const body = {
      targetKcal: n(f.targetKcal), estimatedDailyKcal: n(f.estimatedDailyKcal),
      targetProtein: n(f.targetProtein), targetCarbs: n(f.targetCarbs),
      targetFat: n(f.targetFat), targetFiber: n(f.targetFiber),
      activityKcal: n(f.activityKcal), activityKcalPercent: n(f.activityKcalPercent),
      weightKg: f.weightKg === '' ? null : Number(f.weightKg),
      notes: f.notes, age: n(f.age), gender: f.gender,
      heightCm: n(f.heightCm), activityLevel: f.activityLevel,
    }
    dietApi.updateDay(day.date, body)
      .then(r => { onSaved(r.data); onClose() })
      .catch(() => showError('Failed to save'))
  }

  const field = (key: keyof typeof f, label: string, type = 'number', opts?: { min?: number }) => (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input className={styles.input} type={type} min={opts?.min ?? 0}
        value={f[key] as string | number}
        onChange={e => setF(prev => ({ ...prev, [key]: e.target.value }))} />
    </div>
  )

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} style={{ width: 560 }} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>Set Data — {day.date}</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.dialogBody}>
          <div className={styles.sectionTitle}>Targets</div>
          <div className={styles.grid3}>
            {field('targetKcal', 'Target kcal')}
            {field('estimatedDailyKcal', 'TDEE (est.)')}
            {field('activityKcal', 'Activity kcal')}
          </div>
          <div className={styles.grid2}>
            {field('activityKcalPercent', 'Activity accuracy %')}
            {field('weightKg', 'Weight (kg)')}
          </div>
          <div className={styles.grid4}>
            {field('targetProtein', 'Protein (g)')}
            {field('targetFat', 'Fat (g)')}
            {field('targetCarbs', 'Carbs (g)')}
            {field('targetFiber', 'Fiber (g)')}
          </div>

          <div className={styles.sectionTitle} style={{ marginTop: 12 }}>Macro % Calculator</div>
          <div className={styles.grid3}>
            {(['protein', 'fat', 'carbs'] as const).map(m => (
              <div key={m} className={styles.field}>
                <label className={styles.label}>{m.charAt(0).toUpperCase() + m.slice(1)} %</label>
                <input className={styles.input} type="number" min="0" max="100"
                  value={macroPct[m]}
                  onChange={e => setMacroPct(prev => ({ ...prev, [m]: Number(e.target.value) }))} />
              </div>
            ))}
          </div>
          <button className={`${styles.btn} ${styles.secondary}`} onClick={applyMacroPct}>
            Apply to targets (from {f.targetKcal || '?'} kcal)
          </button>

          <div className={styles.sectionTitle} style={{ marginTop: 12 }}>Profile & TDEE Calculator</div>
          <div className={styles.grid4}>
            {field('age', 'Age')}
            {field('heightCm', 'Height (cm)')}
            <div className={styles.field}>
              <label className={styles.label}>Gender</label>
              <select className={styles.input} value={f.gender}
                onChange={e => setF(prev => ({ ...prev, gender: e.target.value }))}>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Activity Level</label>
              <select className={styles.input} value={f.activityLevel}
                onChange={e => setF(prev => ({ ...prev, activityLevel: e.target.value }))}>
                {ACTIVITY_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <button className={`${styles.btn} ${styles.secondary}`} onClick={calcTDEE}>
            Calculate TDEE (Mifflin-St Jeor)
          </button>

          <div className={styles.field} style={{ marginTop: 12 }}>
            <label className={styles.label}>Notes</label>
            <textarea className={styles.input} rows={2} value={f.notes}
              onChange={e => setF(prev => ({ ...prev, notes: e.target.value }))} />
          </div>
        </div>
        <div className={styles.dialogFooter}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={handleSave}>Save</button>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Meal section ──────────────────────────────────────────────────────────────
function MealSection({ meal, date, onUpdated }: {
  meal: DietMealDto; date: string; onUpdated: (d: DietDayDto) => void
}) {
  const { showError } = useNotification()
  const [showAdd, setShowAdd] = useState(false)
  const [showCopy, setShowCopy] = useState(false)

  const handleRemove = (item: DietMealItemDto) => {
    dietApi.removeItem(date, item.id)
      .then(r => onUpdated(r.data))
      .catch(() => showError('Failed'))
  }

  return (
    <div className={styles.mealSection}>
      <div className={styles.mealHeader}>
        <span className={styles.mealName}>{meal.mealTypeName}</span>
        <span className={styles.mealMacros}>
          {meal.totalKcal.toFixed(0)} kcal · {meal.totalProtein.toFixed(1)}P · {meal.totalFat.toFixed(1)}F · {meal.totalCarbs.toFixed(1)}C
        </span>
        <div className={styles.mealActions}>
          <button className={styles.mealBtn} onClick={() => setShowAdd(true)}>+ Add</button>
          <button className={styles.mealBtn} onClick={() => setShowCopy(true)}>Copy</button>
        </div>
      </div>
      {meal.items.length === 0 && (
        <div className={styles.mealEmpty}>Empty — add items above</div>
      )}
      {meal.items.map(item => (
        <div key={item.id} className={styles.itemRow}>
          <span className={styles.itemName}>{item.displayName}</span>
          <span className={styles.itemMacros}>
            {item.kcal.toFixed(0)} kcal
            {item.protein > 0 && ` · ${item.protein.toFixed(1)}P`}
            {item.fat > 0 && ` · ${item.fat.toFixed(1)}F`}
            {item.carbs > 0 && ` · ${item.carbs.toFixed(1)}C`}
          </span>
          <button className={styles.removeBtn} onClick={() => handleRemove(item)}>×</button>
        </div>
      ))}
      {showAdd && (
        <AddItemDialog date={date} mealType={meal.mealType} mealName={meal.mealTypeName}
          onAdded={d => { onUpdated(d); setShowAdd(false) }}
          onClose={() => setShowAdd(false)} />
      )}
      {showCopy && (
        <CopyMealDialog date={date} mealType={meal.mealType} mealName={meal.mealTypeName}
          onCopied={d => { onUpdated(d); setShowCopy(false) }}
          onClose={() => setShowCopy(false)} />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DietPage() {
  const { showError } = useNotification()
  const [date, setDate] = useState(todayStr())
  const [day, setDay] = useState<DietDayDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSetData, setShowSetData] = useState(false)

  const load = (d: string) => {
    setLoading(true)
    dietApi.getDay(d)
      .then(r => setDay(r.data))
      .catch(() => showError('Failed to load day'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(date) }, [date])

  const nav = (delta: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().slice(0, 10))
  }

  const allMealTypes = MEAL_TYPES
  const mealsMap = new Map((day?.meals ?? []).map(m => [m.mealType, m]))

  const effectiveTdee = day
    ? (day.estimatedDailyKcal ?? 0) + (day.activityKcal && day.activityKcalPercent ? day.activityKcal * day.activityKcalPercent / 100 : 0)
    : 0

  const handleExport = () => {
    if (!day) return
    const lines = [
      `Date: ${day.date}`,
      `Consumed: ${day.totalKcal.toFixed(0)} kcal | P: ${day.totalProtein.toFixed(1)}g | F: ${day.totalFat.toFixed(1)}g | C: ${day.totalCarbs.toFixed(1)}g`,
      day.targetKcal ? `Target: ${day.targetKcal} kcal` : '',
      '',
      ...(day.meals ?? []).flatMap(m => [
        `[${m.mealTypeName}] ${m.totalKcal.toFixed(0)} kcal`,
        ...m.items.map(i => `  - ${i.displayName}: ${i.kcal.toFixed(0)} kcal`),
        '',
      ]),
      day.notes ? `Notes: ${day.notes}` : '',
    ].filter(Boolean)
    const text = lines.join('\n')
    navigator.clipboard?.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <button className={styles.navBtn} onClick={() => nav(-1)}>‹</button>
        <input type="date" className={styles.datePicker} value={date}
          onChange={e => setDate(e.target.value)} />
        <button className={styles.navBtn} onClick={() => nav(1)}>›</button>
        <button className={styles.navBtn} onClick={() => setDate(todayStr())}>Today</button>
        <div style={{ flex: 1 }} />
        <button className={styles.btn} onClick={handleExport}>Export</button>
        <button className={`${styles.btn} ${styles.primary}`} onClick={() => setShowSetData(true)}>Set Data</button>
      </div>

      {loading && <div className={styles.loading}>Loading…</div>}

      {!loading && day && (
        <div className={styles.content}>
          {/* Summary */}
          <div className={styles.summary}>
            <div className={styles.macroTiles}>
              <MacroTile label="Calories" consumed={day.totalKcal} target={day.targetKcal} unit="kcal" />
              <MacroTile label="Protein" consumed={day.totalProtein} target={day.targetProtein} />
              <MacroTile label="Fat" consumed={day.totalFat} target={day.targetFat} />
              <MacroTile label="Carbs" consumed={day.totalCarbs} target={day.targetCarbs} />
              <MacroTile label="Fiber" consumed={day.totalFiber} target={day.targetFiber} />
            </div>
            <div className={styles.profileChips}>
              {day.estimatedDailyKcal != null && <span className={styles.chip}>TDEE: {day.estimatedDailyKcal} kcal</span>}
              {effectiveTdee > 0 && day.activityKcal && <span className={styles.chip}>Eff. TDEE: {effectiveTdee.toFixed(0)} kcal</span>}
              {day.weightKg != null && <span className={styles.chip}>⚖ {day.weightKg} kg</span>}
              {day.gender && <span className={styles.chip}>{day.gender === 'M' ? '♂' : '♀'}</span>}
              {day.age != null && <span className={styles.chip}>{day.age} y</span>}
              {day.heightCm != null && <span className={styles.chip}>{day.heightCm} cm</span>}
              {day.activityLevel && <span className={styles.chip}>{day.activityLevel}</span>}
              {day.notes && <span className={styles.chip} title={day.notes}>📝</span>}
            </div>
          </div>

          {/* Meals */}
          <div className={styles.meals}>
            {allMealTypes.map(mt => {
              const meal = mealsMap.get(mt)
              const fakeMeal: DietMealDto = meal ?? {
                id: '', mealType: mt, mealTypeName: mt.charAt(0) + mt.slice(1).toLowerCase(),
                items: [], totalKcal: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, totalFiber: 0,
              }
              return (
                <MealSection key={mt} meal={fakeMeal} date={date} onUpdated={d => setDay(d)} />
              )
            })}
          </div>
        </div>
      )}

      {showSetData && day && (
        <SetDataDialog day={day} onSaved={d => { setDay(d); setShowSetData(false) }} onClose={() => setShowSetData(false)} />
      )}
    </div>
  )
}
