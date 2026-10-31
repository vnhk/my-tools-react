import {useEffect, useRef, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {useNotification} from '../../components/ui/Notification'
import {
    type CartDto,
    type RecipeDto,
    type RecipeIngredientDto,
    recipesApi,
    shoppingCartsApi,
    type UnitOption,
    unitsApi,
} from '../../api/cookBook'
import {CustomSelect} from '../../components/fields/CustomSelect'
import {IngredientDialog} from './IngredientDialog'
import {RecipeServingsScaler} from './RecipeServingsScaler'
import {RecipeVariablesHelp} from './RecipeVariablesHelp'
import {
    formatScaledQuantity,
    getPrimaryVariableName,
    interpolateInstructionVariables,
} from './recipeVariableUtils'
import styles from './RecipeDetailPage.module.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

function Stars({rating, count}: { rating: number | null; count: number | null }) {
    const n = Math.round(rating ?? 0)
    return (
        <span className={styles.stars} title={`${(rating ?? 0).toFixed(1)} (${count ?? 0} ratings)`}>
            {'★'.repeat(n)}{'☆'.repeat(5 - n)}
            {rating != null && <span className={styles.ratingNum}> {rating.toFixed(1)} ({count ?? 0})</span>}
        </span>
    )
}

function InlineText({label, value, onSave}: { label: string; value: string | null; onSave: (v: string) => void }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value ?? '')
    const save = () => {
        onSave(draft)
        setEditing(false)
    }
    return editing ? (
        <div className={styles.inlineEdit}>
            <span className={styles.fieldLabel}>{label}</span>
            <input
                className={styles.inlineInput}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') save()
                    if (e.key === 'Escape') setEditing(false)
                }}
                autoFocus
            />
            <button className={`${styles.btn} ${styles.success}`} onClick={save}>Save</button>
            <button className={styles.btn} onClick={() => setEditing(false)}>Cancel</button>
        </div>
    ) : (
        <div className={styles.inlineView} onClick={() => {
            setDraft(value ?? '')
            setEditing(true)
        }}>
            <span className={styles.fieldLabel}>{label}</span>
            <span className={styles.fieldValue}>{value || <em className={styles.empty}>click to edit</em>}</span>
        </div>
    )
}

function InlineNumber({label, value, onSave, suffix = ''}: {
    label: string; value: number | null; onSave: (v: number | null) => void; suffix?: string
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(String(value ?? ''))
    const save = () => {
        onSave(draft === '' ? null : Number(draft))
        setEditing(false)
    }
    return editing ? (
        <div className={styles.inlineEdit}>
            <span className={styles.fieldLabel}>{label}</span>
            <input
                className={styles.inlineInput}
                type="number"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') save()
                    if (e.key === 'Escape') setEditing(false)
                }}
                autoFocus
            />
            {suffix && <span className={styles.suffix}>{suffix}</span>}
            <button className={`${styles.btn} ${styles.success}`} onClick={save}>Save</button>
            <button className={styles.btn} onClick={() => setEditing(false)}>Cancel</button>
        </div>
    ) : (
        <div className={styles.inlineView} onClick={() => {
            setDraft(String(value ?? ''))
            setEditing(true)
        }}>
            <span className={styles.fieldLabel}>{label}</span>
            <span className={styles.fieldValue}>{value != null ? `${value}${suffix}` :
                <em className={styles.empty}>—</em>}</span>
        </div>
    )
}

// ── AddToCart dialog ──────────────────────────────────────────────────────────

function AddToCartDialog({recipeId, onClose}: { recipeId: string; onClose: () => void }) {
    const {showSuccess, showError} = useNotification()
    const [carts, setCarts] = useState<CartDto[]>([])
    const [cartId, setCartId] = useState('')
    const [multiplier, setMultiplier] = useState('1')

    useEffect(() => {
        shoppingCartsApi.getAll()
            .then(r => {
                const active = r.data.filter(c => !c.archived)
                setCarts(active)
                if (active.length) setCartId(active[0].id)
            })
            .catch(() => {})
    }, [])

    const handleAdd = () => {
        if (!cartId) {
            showError('Select a cart')
            return
        }
        shoppingCartsApi.addRecipe(cartId, recipeId, Number(multiplier) || 1)
            .then(() => {
                showSuccess('Added to cart')
                onClose()
            })
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
                        options={[{value: '', label: 'Select...'}, ...carts.map(c => ({value: c.id, label: c.name}))]}
                        value={cartId}
                        onChange={setCartId}
                    />
                    <label className={styles.dialogLabel}>Servings multiplier</label>
                    <input
                        className={styles.dialogInput}
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={multiplier}
                        onChange={e => setMultiplier(e.target.value)}
                    />
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

function RateDialog({recipeId, onRated, onClose}: { recipeId: string; onRated: () => void; onClose: () => void }) {
    const {showSuccess, showError} = useNotification()
    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')

    const handleRate = () => {
        recipesApi.rate(recipeId, rating, comment || undefined)
            .then(() => {
                showSuccess('Rating added')
                onRated()
                onClose()
            })
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
                        {[1, 2, 3, 4, 5].map(n => (
                            <button
                                key={n}
                                className={`${styles.starBtn} ${n <= rating ? styles.starActive : ''}`}
                                onClick={() => setRating(n)}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                    <label className={styles.dialogLabel}>Comment (optional)</label>
                    <textarea
                        className={styles.dialogTextarea}
                        rows={3}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                    />
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
    const {id} = useParams<{ id: string }>()
    const navigate = useNavigate()
    const {showSuccess, showError} = useNotification()
    const [recipe, setRecipe] = useState<RecipeDto | null>(null)
    const [loading, setLoading] = useState(true)
    const [units, setUnits] = useState<UnitOption[]>([])
    const [tags, setTags] = useState<string[]>([])
    const [editingInstruction, setEditingInstruction] = useState(false)
    const [instructionDraft, setInstructionDraft] = useState('')
    const [showAddIng, setShowAddIng] = useState(false)
    const [editingIngredient, setEditingIngredient] = useState<RecipeIngredientDto | null>(null)
    const [showAddCart, setShowAddCart] = useState(false)
    const [showRate, setShowRate] = useState(false)
    const [currentServings, setCurrentServings] = useState<number>(4)
    const instructionTextareaRef = useRef<HTMLTextAreaElement | null>(null)

    const isNew = id === 'new'

    const load = () => {
        if (isNew) {
            setLoading(false)
            setRecipe({
                id: '',
                name: '',
                description: null,
                instruction: null,
                prepTime: null,
                cookTime: null,
                totalTime: null,
                servings: null,
                totalCalories: null,
                averageRating: null,
                ratingCount: null,
                favorite: null,
                tags: [],
                requiredEquipment: null,
                mainImageUrl: null,
                sourceUrl: null,
                ingredients: [],
            })
            setCurrentServings(4)
            return
        }
        setLoading(true)
        recipesApi.getById(id!)
            .then(r => {
                setRecipe(r.data)
                setCurrentServings(r.data.servings && r.data.servings > 0 ? r.data.servings : 4)
            })
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
            const updated = {...recipe, ...fields}
            if (!updated.name?.trim()) {
                showError('Name is required')
                return
            }
            const res = await recipesApi.create(updated).catch(() => null)
            if (res) navigate(`/cook-book/recipes/${res.data.id}`, {replace: true})
            return
        }
        await recipesApi.update(recipe.id, fields).catch(() => showError('Save failed'))
        load()
    }

    const handleDelete = async () => {
        if (!recipe || isNew) return
        if (!confirm('Delete this recipe?')) return
        await recipesApi.delete(recipe.id)
        navigate('/cook-book/recipes', {replace: true})
    }

    const handleToggleFav = () => {
        if (recipe && !isNew) recipesApi.toggleFavorite(recipe.id).then(load)
    }

    const handleRemoveIng = (ri: RecipeIngredientDto) => {
        if (!recipe) return
        recipesApi.removeIngredient(recipe.id, ri.id).then(load).catch(() => showError('Failed'))
    }

    const saveInstruction = () => {
        patch({instruction: instructionDraft})
        setEditingInstruction(false)
    }

    const copyVariableTag = (varName: string) => {
        const tag = `{${varName}}`
        navigator.clipboard.writeText(tag).then(() => {
            showSuccess(`Copied ${tag} to clipboard!`)
        }).catch(() => {
            showError(`Failed to copy ${tag}`)
        })
    }

    const insertVariable = (varName: string) => {
        const textarea = instructionTextareaRef.current
        const tag = `{${varName}}`
        if (!textarea) {
            setInstructionDraft(prev => prev + ' ' + tag)
            return
        }
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = instructionDraft
        const before = text.substring(0, start)
        const after = text.substring(end)
        const nextDraft = before + tag + after
        setInstructionDraft(nextDraft)
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + tag.length, start + tag.length)
        }, 0)
    }

    const baseServings = recipe?.servings && recipe.servings > 0 ? recipe.servings : 1
    const scaleMultiplier = currentServings / baseServings
    const isScaled = Math.abs(scaleMultiplier - 1.0) > 0.001

    const handleResetServings = () => {
        setCurrentServings(recipe?.servings && recipe.servings > 0 ? recipe.servings : 4)
    }

    const existingCategories = [...new Set((recipe?.ingredients ?? []).map(r => r.category).filter(Boolean) as string[])]

    if (loading) return <div className={styles.state}>Loading...</div>
    if (!recipe) return <div className={styles.state}>Recipe not found.</div>

    return (
        <div className={styles.page}>
            <div className={styles.toolbar}>
                <button className={styles.backBtn} onClick={() => navigate('/cook-book/recipes')}>← Back</button>
                <div style={{flex: 1}}/>
                {!isNew && <>
                    <button
                        className={`${styles.btn} ${recipe.favorite ? styles.favActive : ''}`}
                        onClick={handleToggleFav}
                    >
                        {recipe.favorite ? '★ Favorite' : '☆ Favorite'}
                    </button>
                    <button className={`${styles.btn} ${styles.primary}`} onClick={() => setShowRate(true)}>
                        Rate
                    </button>
                    <button className={`${styles.btn} ${styles.success}`} onClick={() => setShowAddCart(true)}>
                        Add to Cart
                    </button>
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
                            ? <img src={recipe.mainImageUrl} alt={recipe.name} className={styles.mainImg}/>
                            : <div className={styles.noImg}>🍽</div>
                        }
                    </div>
                )}

                {/* Header card */}
                <div className={styles.card}>
                    <InlineText label="Name" value={recipe.name} onSave={v => patch({name: v})}/>
                    <InlineText label="Source URL" value={recipe.sourceUrl} onSave={v => patch({sourceUrl: v})}/>
                    <InlineText label="Image URL" value={recipe.mainImageUrl} onSave={v => patch({mainImageUrl: v})}/>
                    <div className={styles.inlineView}>
                        <span className={styles.fieldLabel}>Tags</span>
                        <TagEditor value={recipe.tags} allTags={tags} onSave={v => patch({tags: v})}/>
                    </div>
                    {!isNew && <Stars rating={recipe.averageRating} count={recipe.ratingCount}/>}
                </div>

                {/* Metadata */}
                <div className={`${styles.card} ${styles.metaGrid}`}>
                    <InlineNumber label="Prep Time" value={recipe.prepTime} suffix=" min" onSave={v => patch({prepTime: v})}/>
                    <InlineNumber label="Cook Time" value={recipe.cookTime} suffix=" min" onSave={v => patch({cookTime: v})}/>
                    <div className={styles.inlineView}>
                        <span className={styles.fieldLabel}>Total Time</span>
                        <span className={styles.fieldValue}>{recipe.totalTime != null ? `${recipe.totalTime} min` : '—'}</span>
                    </div>
                    <InlineNumber label="Base Servings" value={recipe.servings} onSave={v => patch({servings: v})}/>
                    <InlineNumber label="Calories" value={recipe.totalCalories} suffix=" kcal" onSave={v => patch({totalCalories: v})}/>
                    <InlineText label="Equipment" value={recipe.requiredEquipment} onSave={v => patch({requiredEquipment: v})}/>
                </div>

                {/* Dynamic Servings & Quantity Scaler */}
                {!isNew && (
                    <RecipeServingsScaler
                        baseServings={recipe.servings}
                        currentServings={currentServings}
                        onChangeServings={setCurrentServings}
                        onReset={handleResetServings}
                    />
                )}

                {/* Ingredients */}
                {!isNew && (
                    <div className={styles.card}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionTitle}>
                                Ingredients
                                {isScaled && (
                                    <span style={{fontSize: 11, fontWeight: 'normal', color: 'var(--color-primary)', marginLeft: 8}}>
                                        (Scaled {Number(scaleMultiplier.toFixed(2))}x)
                                    </span>
                                )}
                            </span>
                            <button className={`${styles.btn} ${styles.primary}`} onClick={() => setShowAddIng(true)}>
                                + Add
                            </button>
                        </div>
                        {recipe.ingredients.length === 0
                            ? <div className={styles.emptyMsg}>No ingredients yet.</div>
                            : (
                                <table className={styles.ingTable}>
                                    <thead>
                                    <tr>
                                        <th>Qty</th>
                                        <th>Ingredient</th>
                                        <th>Variable</th>
                                        <th>Original</th>
                                        <th></th>
                                        <th></th>
                                        <th></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {recipe.ingredients.map((ri, idx) => {
                                        const primaryVar = getPrimaryVariableName(ri, idx + 1)
                                        const scaledQtyStr = formatScaledQuantity(ri.quantity, scaleMultiplier)
                                        return (
                                            <tr key={ri.id} className={ri.optional ? styles.optionalRow : ''}>
                                                <td className={styles.qtyCell}>
                                                    <span className={isScaled ? styles.scaledQty : ''}>
                                                        {scaledQtyStr} {ri.unitDisplayName ?? ''}
                                                    </span>
                                                    {isScaled && ri.quantity != null && (
                                                        <span className={styles.baseQtyMuted} title="Original base quantity">
                                                            (base: {ri.quantity})
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {ri.ingredientIcon && <span>{ri.ingredientIcon} </span>}
                                                    {ri.ingredientName}
                                                    {ri.category && <span className={styles.cat}> · {ri.category}</span>}
                                                </td>
                                                <td>
                                                    <span
                                                        className={styles.varPill}
                                                        onClick={() => copyVariableTag(primaryVar)}
                                                        title={`Click to copy {${primaryVar}} to clipboard`}
                                                    >
                                                        &#123;{primaryVar}&#125; <span className={styles.copyIcon}>📋</span>
                                                    </span>
                                                </td>
                                                <td className={styles.origCell}>{ri.originalText ?? ''}</td>
                                                <td>{ri.optional && <span className={styles.optBadge}>optional</span>}</td>
                                                <td>
                                                    <button
                                                        className={styles.editRiBtn}
                                                        title="Edit ingredient & variable"
                                                        onClick={() => setEditingIngredient(ri)}
                                                    >
                                                        ✎
                                                    </button>
                                                </td>
                                                <td>
                                                    <button
                                                        className={styles.removeBtn}
                                                        title="Remove ingredient"
                                                        onClick={() => handleRemoveIng(ri)}
                                                    >
                                                        ×
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
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
                            <button
                                className={`${styles.btn} ${styles.primary}`}
                                onClick={() => {
                                    setInstructionDraft(recipe.instruction ?? '')
                                    setEditingInstruction(true)
                                }}
                            >
                                Edit
                            </button>
                        )}
                    </div>
                    {editingInstruction ? (
                        <>
                            {recipe.ingredients.length > 0 && (
                                <div className={styles.varToolbar}>
                                    <div className={styles.varToolbarTitle}>
                                        Click to insert ingredient variable at cursor:
                                    </div>
                                    <div className={styles.varChips}>
                                        {recipe.ingredients.map((ri, idx) => {
                                            const v = getPrimaryVariableName(ri, idx + 1)
                                            return (
                                                <button
                                                    key={ri.id}
                                                    type="button"
                                                    className={styles.varChip}
                                                    onClick={() => insertVariable(v)}
                                                    title={`${ri.ingredientName} (${ri.quantity ?? ''} ${ri.unitDisplayName ?? ''})`}
                                                >
                                                    + &#123;{v}&#125; ({ri.ingredientName})
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                            <textarea
                                ref={instructionTextareaRef}
                                className={styles.instructionEditor}
                                value={instructionDraft}
                                onChange={e => setInstructionDraft(e.target.value)}
                                rows={16}
                                placeholder="Write recipe steps with variables, e.g.: Dodaj {ingredient1} mąki i wymieszaj z {ingredient2} masła..."
                            />
                            <div className={styles.editorActions}>
                                <button className={`${styles.btn} ${styles.success}`} onClick={saveInstruction}>
                                    Save
                                </button>
                                <button className={styles.btn} onClick={() => setEditingInstruction(false)}>
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : (
                        recipe.instruction
                            ? <div
                                className={styles.instructionView}
                                dangerouslySetInnerHTML={{
                                    __html: interpolateInstructionVariables(
                                        recipe.instruction,
                                        recipe.ingredients,
                                        scaleMultiplier
                                    )
                                }}
                            />
                            : <div className={styles.emptyMsg}>No instructions yet. Click Edit to add.</div>
                    )}
                </div>

                {/* How Dynamic Scaling & Variables Work - English Help Guide */}
                <RecipeVariablesHelp />
            </div>

            {(showAddIng || editingIngredient) && recipe && !isNew && (
                <IngredientDialog
                    recipeId={recipe.id}
                    existingCategories={existingCategories}
                    units={units}
                    editingIngredient={editingIngredient}
                    defaultIndex={(recipe.ingredients?.length ?? 0) + 1}
                    onSaved={load}
                    onClose={() => {
                        setShowAddIng(false)
                        setEditingIngredient(null)
                    }}
                />
            )}
            {showAddCart && recipe && !isNew && (
                <AddToCartDialog recipeId={recipe.id} onClose={() => setShowAddCart(false)}/>
            )}
            {showRate && recipe && !isNew && (
                <RateDialog recipeId={recipe.id} onRated={load} onClose={() => setShowRate(false)}/>
            )}
        </div>
    )
}

// ── TagEditor ─────────────────────────────────────────────────────────────────

function TagEditor({value, allTags, onSave}: { value: string[]; allTags: string[]; onSave: (v: string[]) => void }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState<string[]>(value)
    const [input, setInput] = useState('')

    const addTag = (t: string) => {
        const trimmed = t.trim()
        if (trimmed && !draft.includes(trimmed)) setDraft(d => [...d, trimmed])
        setInput('')
    }

    if (!editing) return (
        <div className={styles.tagRow} onClick={() => {
            setDraft(value)
            setEditing(true)
        }}>
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
                        {t}
                        <button className={styles.tagRemove} onClick={() => setDraft(d => d.filter(x => x !== t))}>×</button>
                    </span>
                ))}
            </div>
            <input
                className={styles.tagInput}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        addTag(input)
                    }
                }}
                list="all-tags"
                placeholder="Add tag, Enter to confirm"
            />
            <datalist id="all-tags">
                {allTags.filter(t => !draft.includes(t)).map(t => <option key={t} value={t}/>)}
            </datalist>
            <div style={{display: 'flex', gap: 6, marginTop: 4}}>
                <button className={`${styles.btn} ${styles.success}`} onClick={() => {
                    onSave(draft)
                    setEditing(false)
                }}>
                    Save
                </button>
                <button className={styles.btn} onClick={() => setEditing(false)}>Cancel</button>
            </div>
        </div>
    )
}
