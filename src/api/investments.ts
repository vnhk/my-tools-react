import client from './client'
import type { Page } from './crud'

export interface Wallet {
  id: string
  name: string
  description: string | null
  currency: string
  riskLevel: string
  walletType: string
  compareWithSP500: boolean | null
  createdDate: string | null
  modificationDate: string | null
  currentValue: number
  totalDeposits: number
  totalWithdrawals: number
  totalEarnings: number
  returnRate: number
}

export interface WalletSnapshot {
  id: string
  walletId: string
  snapshotDate: string
  portfolioValue: number
  monthlyDeposit: number
  monthlyWithdrawal: number
  monthlyEarnings: number
  notes: string | null
}

export interface BudgetEntry {
  id: string
  name: string
  category: string | null
  currency: string
  value: number
  entryDate: string | null
  paymentMethod: string | null
  entryType: string | null
  notes: string | null
  isRecurring: boolean | null
  modificationDate: string | null
}

export interface AlertConfig {
  id: string
  price: number
  operator: string
  amountOfNotifications: number
  checkIntervalMinutes: number
  anotherNotificationEachPercentage: number
  previouslyNotifiedDate: string | null
  previouslyNotifiedPrice: number | null
}

export interface StockAlert {
  id: string
  name: string
  symbol: string
  exchange: string
  emails: string[]
  config: AlertConfig | null
}

export interface InvestmentRecommendation {
  id: string
  symbol: string
  strategy: string
  changeInPercentMorning: number | null
  changeInPercentEvening: number | null
  date: string
  recommendationType: string
  recommendationResult: string
  modificationDate: string | null
}

export const walletsApi = {
  getAll: (params?: Record<string, unknown>) =>
    client.get<Page<Wallet>>('/invest-track/wallets', { params }),

  getById: (id: string) =>
    client.get<Wallet>(`/invest-track/wallets/${id}`),

  getSnapshots: (id: string) =>
    client.get<WalletSnapshot[]>(`/invest-track/wallets/${id}/snapshots`),

  getMetrics: (id: string) =>
    client.get<Record<string, unknown>>(`/invest-track/wallets/${id}/metrics`),

  create: (data: Partial<Wallet>) =>
    client.post<Wallet>('/invest-track/wallets', data),

  update: (id: string, data: Partial<Wallet>) =>
    client.put<Wallet>(`/invest-track/wallets/${id}`, data),

  delete: (id: string) =>
    client.delete(`/invest-track/wallets/${id}`),

  createSnapshot: (walletId: string, data: Partial<WalletSnapshot>) =>
    client.post<WalletSnapshot>(`/invest-track/wallets/${walletId}/snapshots`, data),

  updateSnapshot: (walletId: string, snapshotId: string, data: Partial<WalletSnapshot>) =>
    client.put<WalletSnapshot>(`/invest-track/wallets/${walletId}/snapshots/${snapshotId}`, data),

  deleteSnapshot: (walletId: string, snapshotId: string) =>
    client.delete(`/invest-track/wallets/${walletId}/snapshots/${snapshotId}`),
}

export const budgetEntriesApi = {
  getAll: (params?: Record<string, unknown>) =>
    client.get<Page<BudgetEntry>>('/invest-track/budget-entries', { params }),

  getCategories: () =>
    client.get<string[]>('/invest-track/budget-entries/categories'),

  create: (data: Partial<BudgetEntry>) =>
    client.post<BudgetEntry>('/invest-track/budget-entries', data),

  update: (id: string, data: Partial<BudgetEntry>) =>
    client.put<BudgetEntry>(`/invest-track/budget-entries/${id}`, data),

  delete: (id: string) =>
    client.delete(`/invest-track/budget-entries/${id}`),
}

export const stockAlertsApi = {
  getAll: (params?: Record<string, unknown>) =>
    client.get<Page<StockAlert>>('/invest-track/stock-alerts', { params }),

  create: (data: Partial<StockAlert> & { price?: number; operator?: string; amountOfNotifications?: number; checkIntervalMinutes?: number; anotherNotificationEachPercentage?: number }) =>
    client.post<StockAlert>('/invest-track/stock-alerts', data),

  update: (id: string, data: Partial<StockAlert> & { price?: number; operator?: string; amountOfNotifications?: number; checkIntervalMinutes?: number; anotherNotificationEachPercentage?: number }) =>
    client.put<StockAlert>(`/invest-track/stock-alerts/${id}`, data),

  delete: (id: string) =>
    client.delete(`/invest-track/stock-alerts/${id}`),
}

export const recommendationsApi = {
  getAll: (params?: Record<string, unknown>) =>
    client.get<Page<InvestmentRecommendation>>('/invest-track/recommendations', { params }),

  create: (data: Partial<InvestmentRecommendation>) =>
    client.post<InvestmentRecommendation>('/invest-track/recommendations', data),

  update: (id: string, data: Partial<InvestmentRecommendation>) =>
    client.put<InvestmentRecommendation>(`/invest-track/recommendations/${id}`, data),

  delete: (id: string) =>
    client.delete(`/invest-track/recommendations/${id}`),
}

export interface DashboardKpi {
  investBalance: number
  investNetDeposits: number
  investReturn: number
  investReturnPct: number
  investTwr: number
  investCagr: number
  savingsBalance: number
  savingsGrowth: number
  netWorth: number
  avgMonthlyDeposit: number
  investMonthsSpan: number
}

export interface TimeSeriesPoint {
  date: string
  balance: number
  cumDeposit: number
}

export interface AllocationEntry {
  name: string
  type: string
  valuePln: number
}

export interface BudgetPoint {
  month: string
  income: number
  expense: number
}

export interface WalletTimeSeriesEntry {
  walletId: string
  walletName: string
  isInvestment: boolean
  returnRate: number
  series: TimeSeriesPoint[]
}

export interface DashboardData {
  kpi: DashboardKpi
  investTimeSeries: TimeSeriesPoint[]
  netWorthTimeSeries: TimeSeriesPoint[]
  allocation: AllocationEntry[]
  heatmap: Record<string, number>
  budget: BudgetPoint[]
  walletSeries: WalletTimeSeriesEntry[]
}

export const investDashboardApi = {
  get: () => client.get<DashboardData>('/invest-track/dashboard'),
}

export interface StockDto {
  symbol: string
  date: string | null
  price: number | null
  change: number | null
  changePercent: number | null
  transactions: number | null
}

export interface StockReportDto {
  bestToInvest: StockDto[]
  goodToInvest: StockDto[]
  riskyToInvest: StockDto[]
  goodInvestmentsBasedOnBestRecommendation: StockDto[]
  goodInvestmentsBasedOnGoodRecommendation: StockDto[]
  goodInvestmentsBasedOnRiskyRecommendation: StockDto[]
  badInvestmentsBasedOnBestRecommendation: StockDto[]
  badInvestmentsBasedOnGoodRecommendation: StockDto[]
  badInvestmentsBasedOnRiskyRecommendation: StockDto[]
  goodInvestmentProbabilityBasedOnBestToday: number | null
  goodInvestmentProbabilityBasedOnGoodToday: number | null
  goodInvestmentProbabilityBasedOnRiskyToday: number | null
  goodInvestmentTotalProbabilityBasedOnToday: number | null
}

export const stockReportApi = {
  getStrategies: () =>
    client.get<string[]>('/invest-track/stock-report/strategies'),

  getReport: (date: string, strategy: string) =>
    client.get<StockReportDto>('/invest-track/stock-report', { params: { date, strategy } }),

  triggerMorning: () =>
    client.post<{ message: string }>('/invest-track/stock-report/trigger/morning'),

  triggerEvening: () =>
    client.post<{ message: string }>('/invest-track/stock-report/trigger/evening'),
}

export interface ImportResultDto {
  imported: number
  skipped: number
  errors: string[]
}

export const dataIEApi = {
  export: () =>
    client.get<Blob>('/invest-track/data-ie/export', { responseType: 'blob' }),

  import: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return client.post<ImportResultDto>('/invest-track/data-ie/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
