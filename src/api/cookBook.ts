import client from './client'
import type { Page } from './crud'

export interface IngredientDto {
  id: string
  name: string
  icon: string | null
  category: string | null
  kcalPer100g: number | null
  proteinPer100g: number | null
  fatPer100g: number | null
  carbsPer100g: number | null
  fiberPer100g: number | null
}

export interface RecipeIngredientDto {
  id: string
  ingredientId: string
  ingredientName: string
  ingredientIcon: string | null
  quantity: number | null
  unit: string | null
  unitDisplayName: string | null
  optional: boolean | null
  category: string | null
  originalText: string | null
}

export interface RecipeDto {
  id: string
  name: string
  description: string | null
  instruction: string | null
  prepTime: number | null
  cookTime: number | null
  totalTime: number | null
  servings: number | null
  totalCalories: number | null
  averageRating: number | null
  ratingCount: number | null
  favorite: boolean | null
  tags: string[]
  requiredEquipment: string | null
  mainImageUrl: string | null
  sourceUrl: string | null
  ingredients: RecipeIngredientDto[]
}

export interface CartItemDto {
  id: string
  ingredientId: string
  ingredientName: string
  quantity: number | null
  unit: string | null
  unitDisplayName: string | null
  purchased: boolean | null
  sourceRecipeId: string | null
  sourceRecipeName: string | null
}

export interface CartDto {
  id: string
  name: string
  archived: boolean | null
  items: CartItemDto[]
}

export interface RecipeMatchDto {
  id: string
  name: string
  averageRating: number | null
  ratingCount: number | null
  mainImageUrl: string | null
  matchCount: number
  coveragePercent: number
  matched: string[]
  missing: string[]
}

export interface UnitOption {
  value: string
  label: string
}

export const recipesApi = {
  getAll: (params?: Record<string, unknown>) =>
    client.get<Page<RecipeDto>>('/cook-book/recipes', { params }),

  getById: (id: string) =>
    client.get<RecipeDto>(`/cook-book/recipes/${id}`),

  getTags: () =>
    client.get<string[]>('/cook-book/recipes/tags'),

  getScrapers: () =>
    client.get<string[]>('/cook-book/recipes/scrapers'),

  create: (data: Partial<RecipeDto>) =>
    client.post<RecipeDto>('/cook-book/recipes', data),

  update: (id: string, data: Partial<RecipeDto>) =>
    client.put<RecipeDto>(`/cook-book/recipes/${id}`, data),

  delete: (id: string) =>
    client.delete(`/cook-book/recipes/${id}`),

  toggleFavorite: (id: string) =>
    client.post(`/cook-book/recipes/${id}/toggle-favorite`),

  rate: (id: string, rating: number, comment?: string) =>
    client.post(`/cook-book/recipes/${id}/rate`, null, { params: { rating, ...(comment ? { comment } : {}) } }),

  addIngredient: (id: string, data: Record<string, unknown>) =>
    client.post<RecipeIngredientDto>(`/cook-book/recipes/${id}/ingredients`, data),

  removeIngredient: (id: string, riId: string) =>
    client.delete(`/cook-book/recipes/${id}/ingredients/${riId}`),

  importHtml: (scraperName: string, html: string) =>
    client.post<RecipeDto>('/cook-book/recipes/import-html', { scraperName, html }),
}

export const ingredientsApi = {
  search: (search = '', offset = 0, limit = 50) =>
    client.get<IngredientDto[]>('/cook-book/ingredients', { params: { search, offset, limit } }),

  create: (data: Partial<IngredientDto>) =>
    client.post<IngredientDto>('/cook-book/ingredients', data),

  update: (id: string, data: Partial<IngredientDto>) =>
    client.put<IngredientDto>(`/cook-book/ingredients/${id}`, data),

  delete: (id: string) =>
    client.delete(`/cook-book/ingredients/${id}`),
}

// ── Diet ────────────────────────────────────────────────────────────────────

export interface DietMealItemDto {
  id: string
  displayName: string
  description: string | null
  ingredientId: string | null
  ingredientName: string | null
  amountGrams: number | null
  kcal: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  quickEntry: boolean
}

export interface DietMealDto {
  id: string
  mealType: string
  mealTypeName: string
  items: DietMealItemDto[]
  totalKcal: number
  totalProtein: number
  totalFat: number
  totalCarbs: number
  totalFiber: number
}

export interface DietDayDto {
  date: string
  targetKcal: number | null
  estimatedDailyKcal: number | null
  targetProtein: number | null
  targetCarbs: number | null
  targetFat: number | null
  targetFiber: number | null
  activityKcal: number | null
  activityKcalPercent: number | null
  weightKg: number | null
  notes: string | null
  age: number | null
  gender: string | null
  heightCm: number | null
  activityLevel: string | null
  totalKcal: number
  totalProtein: number
  totalFat: number
  totalCarbs: number
  totalFiber: number
  meals: DietMealDto[]
}

export interface DietChartDataDto {
  labels: string[]
  activityKcal: number[]
  consumedKcal: number[]
  targetKcal: number[]
  effectiveTdee: number[]
  deficit: number[]
  weight: (number | null)[]
}

export interface MacroBreakdownDto {
  avgConsumedProtein: number
  avgConsumedFat: number
  avgConsumedCarbs: number
  avgTargetProtein: number
  avgTargetFat: number
  avgTargetCarbs: number
  hasData: boolean
}

export interface WeightProjectionDto {
  labels: string[]
  actualWeight: (number | null)[]
  projectedWeight: (number | null)[]
  avgDailyDeficit: number
  weeklyWeightChange: number
}

export interface DashboardDto {
  chartData: DietChartDataDto
  macroBreakdown: MacroBreakdownDto
  weightProjection: WeightProjectionDto
}

export const dietApi = {
  getDay: (date: string) =>
    client.get<DietDayDto>('/cook-book/diet/day', { params: { date } }),

  updateDay: (date: string, data: Record<string, unknown>) =>
    client.put<DietDayDto>('/cook-book/diet/day', data, { params: { date } }),

  addItem: (date: string, mealType: string, data: Record<string, unknown>) =>
    client.post<DietDayDto>(`/cook-book/diet/day/${date}/meals/${mealType}/items`, data),

  removeItem: (date: string, itemId: string) =>
    client.delete<DietDayDto>(`/cook-book/diet/day/${date}/items/${itemId}`),

  copyMeal: (date: string, mealType: string, sourceDate: string, sourceType: string) =>
    client.post<DietDayDto>(`/cook-book/diet/day/${date}/meals/${mealType}/copy`, null,
      { params: { sourceDate, sourceType } }),

  getDashboard: (from: string, to: string, groupBy: string) =>
    client.get<DashboardDto>('/cook-book/diet/dashboard', { params: { from, to, groupBy } }),
}

export const unitsApi = {
  getAll: () => client.get<UnitOption[]>('/cook-book/units'),
}

export const shoppingCartsApi = {
  getAll: () => client.get<CartDto[]>('/cook-book/shopping-carts'),

  getById: (id: string) => client.get<CartDto>(`/cook-book/shopping-carts/${id}`),

  create: (name: string) =>
    client.post<CartDto>('/cook-book/shopping-carts', { name }),

  delete: (id: string) =>
    client.delete(`/cook-book/shopping-carts/${id}`),

  archive: (id: string) =>
    client.post(`/cook-book/shopping-carts/${id}/archive`),

  addRecipe: (id: string, recipeId: string, multiplier = 1.0) =>
    client.post(`/cook-book/shopping-carts/${id}/add-recipe`, null, { params: { recipeId, multiplier } }),

  toggleItem: (id: string, itemId: string) =>
    client.post(`/cook-book/shopping-carts/${id}/items/${itemId}/toggle`),

  export: (id: string) =>
    client.get<string>(`/cook-book/shopping-carts/${id}/export`),
}

export const fridgeSearchApi = {
  search: (ingredients: string[], minCoverage = 50) =>
    client.post<RecipeMatchDto[]>('/cook-book/search', { ingredients, minCoverage }),
}
