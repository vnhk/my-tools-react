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

    ingredients.forEach((ri, idx) => {
        const index1Based = idx + 1
        const primary = getPrimaryVariableName(ri, index1Based)
        const unit = ri.unitDisplayName || ri.unit || ''

        const resolved: ResolvedIngredient = {
            ingredient: ri,
            index: index1Based,
            primaryVariable: primary,
            baseQuantity: ri.quantity,
            unitDisplayName: unit,
        }

        // 1. Alias by primary variable (e.g. 'flour' or 'ingredient1')
        map.set(normalizeVarKey(primary), resolved)

        // 2. Default fallback alias by position: 'ingredient1', 'ingredient2', ...
        map.set(`ingredient${index1Based}`, resolved)

        // 3. Normalized ingredient name alias (e.g. 'mąka pszenna' or 'sugar')
        if (ri.ingredientName) {
            map.set(normalizeVarKey(ri.ingredientName), resolved)
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

    // Match variables: {key} or {key.modifier} where modifier is qty, name, full
    // Supports alphanumeric, underscores, hyphens, and unicode characters (e.g. Polish letters)
    const regex = /\{([a-zA-Z0-9_\-\u00C0-\u024F]+)(?:\.(qty|quantity|name|full))?\}/g

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

        if (mod === 'qty' || mod === 'quantity') {
            displayText = scaledQtyStr || '—'
        } else if (mod === 'name') {
            displayText = ingName
        } else if (mod === 'full') {
            const qtyUnit = scaledQtyStr ? (unit ? `${scaledQtyStr} ${unit}` : scaledQtyStr) : ''
            displayText = qtyUnit ? `${qtyUnit} ${ingName}` : ingName
        } else {
            // Default modifier: scaled quantity + unit (or just quantity if unit is empty)
            if (scaledQtyStr) {
                displayText = unit ? `${scaledQtyStr} ${unit}` : scaledQtyStr
            } else {
                displayText = ingName
            }
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
