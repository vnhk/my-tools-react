import type {RecipeIngredientDto} from '../../api/cookBook'

export interface ResolvedIngredient {
    ingredient: RecipeIngredientDto
    index: number
    primaryVariable: string
    baseQuantity: number | null
    unitDisplayName: string
}

/**
 * Format a numeric quantity cleanly (e.g. 1, 0.5, 0.33, 2.75).
 */
export function formatQuantity(qty: number | null | undefined): string {
    if (qty == null || isNaN(qty)) return ''
    const rounded = Math.round(qty * 100) / 100
    // If it's an integer
    if (Math.abs(rounded - Math.round(rounded)) < 0.001) {
        return String(Math.round(rounded))
    }
    // Clean string representation without weird floats
    return Number(rounded.toFixed(2)).toString()
}

/**
 * Format a scaled quantity given a base quantity and scale multiplier.
 */
export function formatScaledQuantity(baseQty: number | null | undefined, scale: number): string {
    if (baseQty == null || isNaN(baseQty)) return '—'
    const scaled = baseQty * scale
    return formatQuantity(scaled)
}

/**
 * Normalizes a variable key for lookup: trimmed, lowercased, and without enclosing braces.
 */
export function normalizeVarKey(key: string): string {
    return key.replace(/^\{+/, '').replace(/\}+$/, '').trim().toLowerCase()
}

/**
 * Returns the primary variable name for an ingredient (custom name or default ingredientN).
 */
export function getPrimaryVariableName(ri: RecipeIngredientDto, index1Based: number): string {
    if (ri.variableName && ri.variableName.trim().length > 0) {
        return ri.variableName.trim()
    }
    return `ingredient${index1Based}`
}

/**
 * Builds a lookup map of all aliases for the ingredients in a recipe.
 */
export function buildVariableMap(ingredients: RecipeIngredientDto[]): Map<string, ResolvedIngredient> {
    const map = new Map<string, ResolvedIngredient>()

    // Pass 1: Explicit variableName on ingredients (e.g. 'ingredient1', 'maka', etc.)
    // These have highest priority and must never be overwritten by positional fallbacks.
    ingredients.forEach((ri, idx) => {
        const explicitVar = ri.variableName?.trim()
        if (explicitVar) {
            const unit = ri.unitDisplayName || ri.unit || ''
            const resolved: ResolvedIngredient = {
                ingredient: ri,
                index: idx + 1,
                primaryVariable: explicitVar,
                baseQuantity: ri.quantity,
                unitDisplayName: unit,
            }
            map.set(normalizeVarKey(explicitVar), resolved)
        }
    })

    // Pass 2: Ingredients WITHOUT explicit variableName
    // Assign fallback 'ingredientN' only if the key is not already taken by an explicit variable.
    ingredients.forEach((ri, idx) => {
        const explicitVar = ri.variableName?.trim()
        if (!explicitVar) {
            const unit = ri.unitDisplayName || ri.unit || ''
            let n = idx + 1
            while (map.has(`ingredient${n}`)) {
                n++
            }
            const fallbackKey = `ingredient${n}`
            const resolved: ResolvedIngredient = {
                ingredient: ri,
                index: idx + 1,
                primaryVariable: fallbackKey,
                baseQuantity: ri.quantity,
                unitDisplayName: unit,
            }
            map.set(fallbackKey, resolved)
        }
    })

    // Pass 3: Ingredient name aliases (e.g. 'cukier', 'jogurt naturalny')
    // Only map if key is not already claimed.
    ingredients.forEach((ri, idx) => {
        if (ri.ingredientName) {
            const nameKey = normalizeVarKey(ri.ingredientName)
            if (!map.has(nameKey)) {
                const explicitVar = ri.variableName?.trim()
                const primary = explicitVar || `ingredient${idx + 1}`
                const unit = ri.unitDisplayName || ri.unit || ''
                const resolved: ResolvedIngredient = {
                    ingredient: ri,
                    index: idx + 1,
                    primaryVariable: primary,
                    baseQuantity: ri.quantity,
                    unitDisplayName: unit,
                }
                map.set(nameKey, resolved)
            }
        }
    })

    return map
}

/**
 * Interpolates variables in instruction HTML or text, replacing {ingredient1}, {flour},
 * {ingredient1.qty}, {ingredient1.name}, {ingredient1.full} with scaled values.
 */
export function interpolateInstructionVariables(
    htmlOrText: string | null | undefined,
    ingredients: RecipeIngredientDto[],
    scaleMultiplier: number
): string {
    if (!htmlOrText) return ''
    if (!ingredients || ingredients.length === 0) return htmlOrText

    const varMap = buildVariableMap(ingredients)

    // Match variables: {key} or {key.modifier} where modifier is name, qty, quantity, full, num
    // Supports alphanumeric, underscores, hyphens, and unicode characters (e.g. Polish letters)
    const regex = /\{([a-zA-Z0-9_\-\u00C0-\u024F]+)(?:\.(qty|quantity|name|full|num|val|number))?\}/g

    return htmlOrText.replace(regex, (match, rawKey: string, modifier?: string) => {
        const normalizedKey = normalizeVarKey(rawKey)
        const found = varMap.get(normalizedKey)

        if (!found) {
            // Variable not found among ingredients; leave as-is
            return match
        }

        const ing = found.ingredient
        const baseQty = found.baseQuantity
        const unit = found.unitDisplayName
        const ingName = ing.ingredientName || rawKey

        let scaledQtyStr = ''
        if (baseQty != null) {
            const scaledQty = baseQty * scaleMultiplier
            scaledQtyStr = formatQuantity(scaledQty)
        }

        // Determine replacement text based on modifier
        let displayText = ''
        const mod = modifier?.toLowerCase()
        const qtyUnit = scaledQtyStr ? (unit ? `${scaledQtyStr} ${unit}` : scaledQtyStr) : ''

        if (mod === 'name') {
            displayText = ingName
        } else if (mod === 'qty' || mod === 'quantity') {
            displayText = qtyUnit || scaledQtyStr || '—'
        } else if (mod === 'num' || mod === 'val' || mod === 'number') {
            displayText = scaledQtyStr || '—'
        } else {
            // Default modifier {name}: scaled quantity + unit + ingredient name (e.g. "100 g Śmietanka")
            displayText = qtyUnit ? `${qtyUnit} ${ingName}` : ingName
        }

        const baseQtyDisplay = baseQty != null
            ? `${formatQuantity(baseQty)}${unit ? ' ' + unit : ''}`
            : 'no set quantity'
        const tooltip = `${ingName} · Base: ${baseQtyDisplay} · Var: {${found.primaryVariable}}`

        // Wrap in styled span for UI highlighting and tooltip
        return `<span class="recipe-ingredient-var" title="${escapeHtml(tooltip)}" data-var="${escapeHtml(found.primaryVariable)}">${escapeHtml(displayText)}</span>`
    })
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}
