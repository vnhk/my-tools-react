import { useEffect, useRef, useState } from 'react'
import { useNotification } from '../../components/ui/Notification'
import { dietApi, ingredientsApi, type DietDayDto, type DietMealDto, type DietMealItemDto, type IngredientDto } from '../../api/cookBook'
import { CustomSelect } from '../../components/fields/CustomSelect'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
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
            <CustomSelect
              className={styles.input}
              options={MEAL_TYPES.map(t => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))}
              value={srcType}
              onChange={setSrcType}
            />
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
const ACCURACY_OPTIONS = [40, 50, 60, 70, 80, 90, 100].map(p => ({ value: String(p), label: `${p}%` }))

function SetDataDialog({ day, onSaved, onClose }: {
  day: DietDayDto; onSaved: (d: DietDayDto) => void; onClose: () => void
}) {
  const { showError, showSuccess } = useNotification()
  const [f, setF] = useState({
    targetKcal: day.targetKcal ?? '',
    estimatedDailyKcal: day.estimatedDailyKcal ?? '',
    targetProtein: day.targetProtein ?? '',
    targetCarbs: day.targetCarbs ?? '',
    targetFat: day.targetFat ?? '',
    targetFiber: day.targetFiber ?? '',
    activityKcal: day.activityKcal ?? '',
    activityKcalPercent: day.activityKcalPercent ?? 100,
    weightKg: day.weightKg ?? '',
    notes: day.notes ?? '',
    age: day.age ?? '',
    gender: day.gender ?? 'M',
    heightCm: day.heightCm ?? '',
    activityLevel: day.activityLevel ?? 'SEDENTARY',
  })
  const [macroPct, setMacroPct] = useState({ protein: 30, fat: 25, carbs: 45 })

  const n = (v: string | number) => (v === '' ? null : Number(v))

  const pctSum = macroPct.protein + macroPct.fat + macroPct.carbs
  const pctOk = Math.abs(pctSum - 100) < 1

  const calcTDEE = () => {
    const age = n(f.age), height = n(f.heightCm), weight = n(f.weightKg)
    if (!age || !height || !weight) { showError('Enter weight, height and age first'); return }
    const bmr = f.gender === 'M'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161
    const mult = ACTIVITY_MULTIPLIERS[f.activityLevel] ?? 1.2
    const tdee = Math.round(bmr * mult)
    setF(prev => ({ ...prev, estimatedDailyKcal: tdee }))
    showSuccess(`TDEE calculated: ${tdee} kcal`)
  }

  const applyMacroPct = () => {
    const kcal = n(f.targetKcal)
    const actKcal = n(f.activityKcal) ?? 0
    const actPct = n(f.activityKcalPercent) ?? 100
    const effective = (kcal ?? 0) + actKcal * actPct / 100
    if (!effective) { showError('Enter Target Calories first'); return }
    setF(prev => ({
      ...prev,
      targetProtein: Math.round(effective * macroPct.protein / 100 / 4),
      targetFat: Math.round(effective * macroPct.fat / 100 / 9),
      targetCarbs: Math.round(effective * macroPct.carbs / 100 / 4),
    }))
    showSuccess(`Macros calculated from ${Math.round(effective)} effective kcal`)
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

  const numField = (key: keyof typeof f, label: string, step = '1') => (
    <div className={styles.sdField}>
      <label className={styles.sdLabel}>{label}</label>
      <input className={styles.sdInput} type="number" min="0" step={step}
        value={f[key] as string | number}
        onChange={e => setF(prev => ({ ...prev, [key]: e.target.value }))} />
    </div>
  )

  return (
    <Dialog open title={`Daily Data — ${day.date}`} onClose={onClose} onConfirm={handleSave}
      width="min(95vw, 580px)">

      {/* ── 1. Targets ─────────────────────────────────────────── */}
      <div className={styles.sdSection}>
        <div className={styles.sdSectionTitle}>Targets</div>
        <div className={styles.sdGrid2}>
          {numField('targetKcal', 'Target Calories / Goal (kcal)')}
          {numField('estimatedDailyKcal', 'Est. Daily Calories / TDEE (kcal)')}
          {numField('targetProtein', 'Target Protein (g)')}
          {numField('targetCarbs', 'Target Carbs (g)')}
          {numField('targetFat', 'Target Fat (g)')}
          {numField('targetFiber', 'Target Fiber (g)')}
        </div>

        {/* Activity row: kcal field + accuracy % + info */}
        <div className={styles.sdActivityRow}>
          <div className={styles.sdField} style={{ flex: 1 }}>
            <label className={styles.sdLabel}>Activity Calories Burned</label>
            <input className={styles.sdInput} type="number" min="0"
              value={f.activityKcal as string | number}
              onChange={e => setF(prev => ({ ...prev, activityKcal: e.target.value }))} />
          </div>
          <div className={styles.sdField} style={{ width: 110 }}>
            <label className={styles.sdLabel}>Accuracy</label>
            <CustomSelect
              options={ACCURACY_OPTIONS}
              value={String(f.activityKcalPercent)}
              onChange={v => setF(prev => ({ ...prev, activityKcalPercent: Number(v) }))}
              size="sm"
            />
          </div>
          <div className={styles.sdInfoIcon} title="Fitness trackers often overestimate calorie burn. Select what % of reported activity calories should count toward your daily deficit.">
            ℹ
          </div>
        </div>
      </div>

      {/* ── 2. Macro % Calculator ──────────────────────────────── */}
      <div className={styles.sdSection}>
        <div className={styles.sdSectionTitle}>Macro % Calculator</div>
        <div className={styles.sdMacroPctRow}>
          {(['protein', 'fat', 'carbs'] as const).map(m => (
            <div key={m} className={styles.sdField}>
              <label className={styles.sdLabel}>{m.charAt(0).toUpperCase() + m.slice(1)} %</label>
              <input className={styles.sdInput} type="number" min="0" max="100"
                value={macroPct[m]}
                onChange={e => setMacroPct(prev => ({ ...prev, [m]: Number(e.target.value) }))} />
            </div>
          ))}
          <div className={`${styles.sdPctSum} ${pctOk ? styles.sdPctOk : styles.sdPctBad}`}>
            Sum: {pctSum}%
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={applyMacroPct} style={{ width: '100%' }}>
          Calculate macros from % (effective: {Number(f.targetKcal || 0) + (Number(f.activityKcal || 0) * Number(f.activityKcalPercent || 100) / 100)} kcal)
        </Button>
      </div>

      {/* ── 3. Profile & TDEE ──────────────────────────────────── */}
      <div className={styles.sdSection}>
        <div className={styles.sdSectionTitle}>Profile &amp; TDEE Calculator</div>
        <div className={styles.sdGrid2}>
          {numField('weightKg', 'Weight (kg)', '0.1')}
          {numField('heightCm', 'Height (cm)')}
          {numField('age', 'Age')}
          <div className={styles.sdField}>
            <label className={styles.sdLabel}>Gender</label>
            <div className={styles.sdRadioGroup}>
              {[{ v: 'M', l: '♂ Male' }, { v: 'F', l: '♀ Female' }].map(({ v, l }) => (
                <label key={v} className={`${styles.sdRadio} ${f.gender === v ? styles.sdRadioActive : ''}`}>
                  <input type="radio" name="gender" value={v} checked={f.gender === v}
                    onChange={() => setF(prev => ({ ...prev, gender: v }))} />
                  {l}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.sdField}>
          <label className={styles.sdLabel}>Activity Level</label>
          <CustomSelect
            options={ACTIVITY_LEVELS}
            value={f.activityLevel}
            onChange={v => setF(prev => ({ ...prev, activityLevel: v }))}
          />
        </div>
        <Button variant="primary" size="sm" onClick={calcTDEE} style={{ width: '100%' }}>
          Calculate TDEE → (Mifflin-St Jeor)
        </Button>
      </div>

      {/* ── 4. Notes ───────────────────────────────────────────── */}
      <div className={styles.sdField}>
        <label className={styles.sdLabel}>Notes</label>
        <textarea className={styles.sdInput} rows={3} value={f.notes}
          onChange={e => setF(prev => ({ ...prev, notes: e.target.value }))} />
      </div>
    </Dialog>
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
