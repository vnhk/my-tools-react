import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useNotification } from '../../components/ui/Notification'
import {
  recipesApi, ingredientsApi, shoppingCartsApi, unitsApi,
  type RecipeDto, type RecipeIngredientDto, type CartDto, type IngredientDto, type UnitOption,
} from '../../api/cookBook'
import { CustomSelect } from '../../components/fields/CustomSelect'
import styles from './RecipeDetailPage.module.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

function Stars({ rating, count }: { rating: number | null; count: number | null }) {
  const n = Math.round(rating ?? 0)
  return (
    <span className={styles.stars} title={`${(rating ?? 0).toFixed(1)} (${count ?? 0} ratings)`}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
      {rating != null && <span className={styles.ratingNum}> {rating.toFixed(1)} ({count ?? 0})</span>}
    </span>
  )
}

function InlineText({ label, value, onSave }: { label: string; value: string | null; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const save = () => { onSave(draft); setEditing(false) }
  return editing ? (
    <div className={styles.inlineEdit}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={styles.inlineInput} value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }} autoFocus />
      <button className={`${styles.btn} ${styles.success}`} onClick={save}>Save</button>
      <button className={styles.btn} onClick={() => setEditing(false)}>Cancel</button>
    </div>
  ) : (
    <div className={styles.inlineView} onClick={() => { setDraft(value ?? ''); setEditing(true) }}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value || <em className={styles.empty}>click to edit</em>}</span>
    </div>
  )
}

function InlineNumber({ label, value, onSave, suffix = '' }: {
  label: string; value: number | null; onSave: (v: number | null) => void; suffix?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))
  const save = () => { onSave(draft === '' ? null : Number(draft)); setEditing(false) }
  return editing ? (
    <div className={styles.inlineEdit}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={styles.inlineInput} type="number" value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }} autoFocus />
      {suffix && <span className={styles.suffix}>{suffix}</span>}
      <button className={`${styles.btn} ${styles.success}`} onClick={save}>Save</button>
      <button className={styles.btn} onClick={() => setEditing(false)}>Cancel</button>
    </div>
  ) : (
    <div className={styles.inlineView} onClick={() => { setDraft(String(value ?? '')); setEditing(true) }}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value != null ? `${value}${suffix}` : <em className={styles.empty}>—</em>}</span>
    </div>
  )
}

// ── AddIngredient dialog ──────────────────────────────────────────────────────

function AddIngredientDialog({ recipeId, existingCategories, units, onAdded, onClose }: {
  recipeId: string
  existingCategories: string[]
  units: UnitOption[]
  onAdded: () => void
  onClose: () => void
}) {
  const { showError } = useNotification()
  const [ingSearch, setIngSearch] = useState('')
  const [suggestions, setSuggestions] = useState<IngredientDto[]>([])
  const [selectedIng, setSelectedIng] = useState<IngredientDto | null>(null)
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('GRAM')
  const [category, setCategory] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [optional, setOptional] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      ingredientsApi.search(ingSearch, 0, 20)
        .then(r => setSuggestions(r.data))
        .catch(() => {})
    }, 200)
  }, [ingSearch])

  const handleAdd = () => {
    const name = selectedIng?.name ?? ingSearch.trim()
    if (!name) { showError('Enter ingredient name'); return }
    recipesApi.addIngredient(recipeId, {
      ingredientId: selectedIng?.id ?? null,
      ingredientName: name,
      quantity: qty !== '' ? Number(qty) : null,
      unit: unit || null,
      category: category || null,
      originalText: originalText || null,
      optional,
    })
      .then(() => { onAdded(); onClose() })
      .catch(() => showError('Failed to add ingredient'))
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>Add Ingredient</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.dialogBody}>
          <label className={styles.dialogLabel}>Ingredient</label>
          <input className={styles.dialogInput} value={ingSearch} onChange={e => { setIngSearch(e.target.value); setSelectedIng(null) }}
            placeholder="Type to search..." />
          {suggestions.length > 0 && !selectedIng && (
            <div className={styles.suggestions}>
              {suggestions.map(s => (
                <div key={s.id} className={styles.suggestion}
                  onClick={() => { setSelectedIng(s); setIngSearch(s.name); setSuggestions([]) }}>
                  {s.icon && <span>{s.icon} </span>}{s.name}
                  {s.category && <span className={styles.suggCat}> · {s.category}</span>}
                </div>
              ))}
            </div>
          )}
          <div className={styles.dialogRow}>
            <div className={styles.dialogField}>
              <label className={styles.dialogLabel}>Quantity</label>
              <input className={styles.dialogInput} type="number" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div className={styles.dialogField}>
              <label className={styles.dialogLabel}>Unit</label>
              <CustomSelect
                className={styles.dialogSelect}
                options={units.map(u => ({ value: u.value, label: u.label }))}
                value={unit}
                onChange={setUnit}
              />
            </div>
          </div>
          <label className={styles.dialogLabel}>Category (e.g., Na ciasto)</label>
          <input className={styles.dialogInput} value={category} onChange={e => setCategory(e.target.value)}
            list="cats" placeholder="Optional grouping" />
          <datalist id="cats">{existingCategories.map(c => <option key={c} value={c} />)}</datalist>
          <label className={styles.dialogLabel}>Original text</label>
          <input className={styles.dialogInput} value={originalText} onChange={e => setOriginalText(e.target.value)}
            placeholder="e.g., 2 szklanki mąki pszennej" />
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={optional} onChange={e => setOptional(e.target.checked)} />
            Optional ingredient
          </label>
        </div>
        <div className={styles.dialogFooter}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={handleAdd}>Add</button>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── AddToCart dialog ──────────────────────────────────────────────────────────

function AddToCartDialog({ recipeId, onClose }: { recipeId: string; onClose: () => void }) {
  const { showSuccess, showError } = useNotification()
  const [carts, setCarts] = useState<CartDto[]>([])
  const [cartId, setCartId] = useState('')
  const [multiplier, setMultiplier] = useState('1')

  useEffect(() => {
    shoppingCartsApi.getAll()
      .then(r => { const active = r.data.filter(c => !c.archived); setCarts(active); if (active.length) setCartId(active[0].id) })
      .catch(() => {})
  }, [])

  const handleAdd = () => {
    if (!cartId) { showError('Select a cart'); return }
    shoppingCartsApi.addRecipe(cartId, recipeId, Number(multiplier) || 1)
      .then(() => { showSuccess('Added to cart'); onClose() })
      .catch(() => showError('Failed'))
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>Add to Shopping Cart</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.dialogBody}>
          <label className={styles.dialogLabel}>Cart</label>
          <CustomSelect
            className={styles.dialogSelect}
            options={[{ value: '', label: 'Select...' }, ...carts.map(c => ({ value: c.id, label: c.name }))]}
            value={cartId}
            onChange={setCartId}
          />
          <label className={styles.dialogLabel}>Servings multiplier</label>
          <input className={styles.dialogInput} type="number" min="0.1" step="0.5" value={multiplier}
            onChange={e => setMultiplier(e.target.value)} />
        </div>
        <div className={styles.dialogFooter}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={handleAdd}>Add</button>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── RateDialog ────────────────────────────────────────────────────────────────

function RateDialog({ recipeId, onRated, onClose }: { recipeId: string; onRated: () => void; onClose: () => void }) {
  const { showSuccess, showError } = useNotification()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const handleRate = () => {
    recipesApi.rate(recipeId, rating, comment || undefined)
      .then(() => { showSuccess('Rating added'); onRated(); onClose() })
      .catch(() => showError('Failed to rate'))
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>Rate Recipe</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.dialogBody}>
          <label className={styles.dialogLabel}>Rating (1–5)</label>
          <div className={styles.starPicker}>
            {[1,2,3,4,5].map(n => (
              <button key={n} className={`${styles.starBtn} ${n <= rating ? styles.starActive : ''}`}
                onClick={() => setRating(n)}>★</button>
            ))}
          </div>
          <label className={styles.dialogLabel}>Comment (optional)</label>
          <textarea className={styles.dialogTextarea} rows={3} value={comment}
            onChange={e => setComment(e.target.value)} />
        </div>
        <div className={styles.dialogFooter}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={handleRate}>Submit</button>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showError } = useNotification()
  const [recipe, setRecipe] = useState<RecipeDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [units, setUnits] = useState<UnitOption[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [editingInstruction, setEditingInstruction] = useState(false)
  const [instructionDraft, setInstructionDraft] = useState('')
  const [showAddIng, setShowAddIng] = useState(false)
  const [showAddCart, setShowAddCart] = useState(false)
  const [showRate, setShowRate] = useState(false)

  const isNew = id === 'new'

  const load = () => {
    if (isNew) { setLoading(false); setRecipe({ id: '', name: '', description: null, instruction: null, prepTime: null, cookTime: null, totalTime: null, servings: null, totalCalories: null, averageRating: null, ratingCount: null, favorite: null, tags: [], requiredEquipment: null, mainImageUrl: null, sourceUrl: null, ingredients: [] }); return }
    setLoading(true)
    recipesApi.getById(id!)
      .then(r => setRecipe(r.data))
      .catch(() => showError('Failed to load recipe'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    unitsApi.getAll().then(r => setUnits(r.data)).catch(() => {})
    recipesApi.getTags().then(r => setTags(r.data)).catch(() => {})
  }, [id])

  const patch = async (fields: Partial<RecipeDto>) => {
    if (!recipe) return
    if (isNew) {
      const updated = { ...recipe, ...fields }
      if (!updated.name?.trim()) { showError('Name is required'); return }
      const res = await recipesApi.create(updated).catch(() => null)
      if (res) navigate(`/cook-book/recipes/${res.data.id}`, { replace: true })
      return
    }
    await recipesApi.update(recipe.id, fields).catch(() => showError('Save failed'))
    load()
  }

  const handleDelete = async () => {
    if (!recipe || isNew) return
    if (!confirm('Delete this recipe?')) return
    await recipesApi.delete(recipe.id)
    navigate('/cook-book/recipes', { replace: true })
  }

  const handleToggleFav = () => { if (recipe && !isNew) recipesApi.toggleFavorite(recipe.id).then(load) }

  const handleRemoveIng = (ri: RecipeIngredientDto) => {
    if (!recipe) return
    recipesApi.removeIngredient(recipe.id, ri.id).then(load).catch(() => showError('Failed'))
  }

  const saveInstruction = () => {
    patch({ instruction: instructionDraft })
    setEditingInstruction(false)
  }

  const existingCategories = [...new Set((recipe?.ingredients ?? []).map(r => r.category).filter(Boolean) as string[])]

  if (loading) return <div className={styles.state}>Loading...</div>
  if (!recipe) return <div className={styles.state}>Recipe not found.</div>

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <button className={styles.backBtn} onClick={() => navigate('/cook-book/recipes')}>← Back</button>
        <div style={{ flex: 1 }} />
        {!isNew && <>
          <button className={`${styles.btn} ${recipe.favorite ? styles.favActive : ''}`} onClick={handleToggleFav}>
            {recipe.favorite ? '★ Favorite' : '☆ Favorite'}
          </button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={() => setShowRate(true)}>Rate</button>
          <button className={`${styles.btn} ${styles.success}`} onClick={() => setShowAddCart(true)}>Add to Cart</button>
          <button className={`${styles.btn} ${styles.danger}`} onClick={handleDelete}>Delete</button>
        </>}
        {isNew && (
          <button className={`${styles.btn} ${styles.primary}`} onClick={() => patch({})}>Create</button>
        )}
      </div>

      <div className={styles.content}>
        {/* Image */}
        {!isNew && (
          <div className={styles.imgSection}>
            {recipe.mainImageUrl
              ? <img src={recipe.mainImageUrl} alt={recipe.name} className={styles.mainImg} />
              : <div className={styles.noImg}>🍽</div>
            }
          </div>
        )}

        {/* Header card */}
        <div className={styles.card}>
          <InlineText label="Name" value={recipe.name} onSave={v => patch({ name: v })} />
          <InlineText label="Source URL" value={recipe.sourceUrl} onSave={v => patch({ sourceUrl: v })} />
          <InlineText label="Image URL" value={recipe.mainImageUrl} onSave={v => patch({ mainImageUrl: v })} />
          <div className={styles.inlineView}>
            <span className={styles.fieldLabel}>Tags</span>
            <TagEditor value={recipe.tags} allTags={tags} onSave={v => patch({ tags: v })} />
          </div>
          {!isNew && <Stars rating={recipe.averageRating} count={recipe.ratingCount} />}
        </div>

        {/* Metadata */}
        <div className={`${styles.card} ${styles.metaGrid}`}>
          <InlineNumber label="Prep Time" value={recipe.prepTime} suffix=" min" onSave={v => patch({ prepTime: v })} />
          <InlineNumber label="Cook Time" value={recipe.cookTime} suffix=" min" onSave={v => patch({ cookTime: v })} />
          <div className={styles.inlineView}>
            <span className={styles.fieldLabel}>Total Time</span>
            <span className={styles.fieldValue}>{recipe.totalTime != null ? `${recipe.totalTime} min` : '—'}</span>
          </div>
          <InlineNumber label="Servings" value={recipe.servings} onSave={v => patch({ servings: v })} />
          <InlineNumber label="Calories" value={recipe.totalCalories} suffix=" kcal" onSave={v => patch({ totalCalories: v })} />
          <InlineText label="Equipment" value={recipe.requiredEquipment} onSave={v => patch({ requiredEquipment: v })} />
        </div>

        {/* Ingredients */}
        {!isNew && (
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Ingredients</span>
              <button className={`${styles.btn} ${styles.primary}`} onClick={() => setShowAddIng(true)}>+ Add</button>
            </div>
            {recipe.ingredients.length === 0
              ? <div className={styles.emptyMsg}>No ingredients yet.</div>
              : (
                <table className={styles.ingTable}>
                  <thead>
                    <tr>
                      <th>Qty</th>
                      <th>Ingredient</th>
                      <th>Original</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipe.ingredients.map(ri => (
                      <tr key={ri.id} className={ri.optional ? styles.optionalRow : ''}>
                        <td className={styles.qtyCell}>
                          {ri.quantity != null ? `${ri.quantity} ${ri.unitDisplayName ?? ''}` : '—'}
                        </td>
                        <td>
                          {ri.ingredientIcon && <span>{ri.ingredientIcon} </span>}
                          {ri.ingredientName}
                          {ri.category && <span className={styles.cat}> · {ri.category}</span>}
                        </td>
                        <td className={styles.origCell}>{ri.originalText ?? ''}</td>
                        <td>{ri.optional && <span className={styles.optBadge}>optional</span>}</td>
                        <td>
                          <button className={styles.removeBtn} onClick={() => handleRemoveIng(ri)}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        )}

        {/* Instructions */}
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Instructions</span>
            {!editingInstruction && (
              <button className={`${styles.btn} ${styles.primary}`}
                onClick={() => { setInstructionDraft(recipe.instruction ?? ''); setEditingInstruction(true) }}>
                Edit
              </button>
            )}
          </div>
          {editingInstruction ? (
            <>
              <textarea className={styles.instructionEditor} value={instructionDraft}
                onChange={e => setInstructionDraft(e.target.value)} rows={16} />
              <div className={styles.editorActions}>
                <button className={`${styles.btn} ${styles.success}`} onClick={saveInstruction}>Save</button>
                <button className={styles.btn} onClick={() => setEditingInstruction(false)}>Cancel</button>
              </div>
            </>
          ) : (
            recipe.instruction
              ? <div className={styles.instructionView} dangerouslySetInnerHTML={{ __html: recipe.instruction }} />
              : <div className={styles.emptyMsg}>No instructions yet. Click Edit to add.</div>
          )}
        </div>
      </div>

      {showAddIng && recipe && !isNew && (
        <AddIngredientDialog
          recipeId={recipe.id}
          existingCategories={existingCategories}
          units={units}
          onAdded={load}
          onClose={() => setShowAddIng(false)}
        />
      )}
      {showAddCart && recipe && !isNew && (
        <AddToCartDialog recipeId={recipe.id} onClose={() => setShowAddCart(false)} />
      )}
      {showRate && recipe && !isNew && (
        <RateDialog recipeId={recipe.id} onRated={load} onClose={() => setShowRate(false)} />
      )}
    </div>
  )
}

// ── TagEditor ─────────────────────────────────────────────────────────────────

function TagEditor({ value, allTags, onSave }: { value: string[]; allTags: string[]; onSave: (v: string[]) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>(value)
  const [input, setInput] = useState('')

  const addTag = (t: string) => {
    const trimmed = t.trim()
    if (trimmed && !draft.includes(trimmed)) setDraft(d => [...d, trimmed])
    setInput('')
  }

  if (!editing) return (
    <div className={styles.tagRow} onClick={() => { setDraft(value); setEditing(true) }}>
      {value.length === 0
        ? <em className={styles.empty}>click to add tags</em>
        : value.map(t => <span key={t} className={styles.tag}>{t}</span>)
      }
    </div>
  )

  return (
    <div className={styles.tagEditor}>
      <div className={styles.tagRow}>
        {draft.map(t => (
          <span key={t} className={styles.tag}>
            {t} <button className={styles.tagRemove} onClick={() => setDraft(d => d.filter(x => x !== t))}>×</button>
          </span>
        ))}
      </div>
      <input className={styles.tagInput} value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input) } }}
        list="all-tags" placeholder="Add tag, Enter to confirm" />
      <datalist id="all-tags">{allTags.filter(t => !draft.includes(t)).map(t => <option key={t} value={t} />)}</datalist>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button className={`${styles.btn} ${styles.success}`} onClick={() => { onSave(draft); setEditing(false) }}>Save</button>
        <button className={styles.btn} onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  )
}
