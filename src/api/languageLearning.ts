import client from './client'
import type { Page } from './crud'

export interface TranslationRecord {
  id: string
  sourceText: string
  level: string | null
  textTranslation: string | null
  type: string | null
  inSentence: string | null
  inSentenceTranslation: string | null
  factor: number | null
  nextRepeatTime: string | null
  markedForLearning: boolean
  language: string
}

export interface TranslationRecordDetail extends TranslationRecord {
  textSound: string | null
  inSentenceSound: string | null
  images: string[] | null
}

export interface CrosswordWord {
  word: string
  clue: string
  row: number
  col: number
  horizontal: boolean
  number: number
}

export interface CrosswordResult {
  grid: (string | null)[][]
  words: CrosswordWord[]
}

export interface LearningStats {
  total: number
  mastered: number
  dueNow: number
}

export type ReviewScore = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'

const BASE = '/api/language-learning/words'

export const languageLearningApi = {
  list: (params?: { page?: number; size?: number; sort?: string; direction?: string; language?: string }) =>
    client.get<Page<TranslationRecord>>(BASE, { params }),

  getById: (id: string) =>
    client.get<TranslationRecordDetail>(`${BASE}/${id}`),

  create: (data: Partial<TranslationRecord>) =>
    client.post<TranslationRecord>(BASE, data),

  update: (id: string, data: Partial<TranslationRecord>) =>
    client.put<TranslationRecord>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    client.delete(`${BASE}/${id}`),

  flashcards: (language: string, levels?: string[], size = 50) =>
    client.get<TranslationRecordDetail[]>(`${BASE}/flashcards`, {
      params: { language, levels: levels?.join(','), size },
    }),

  quiz: (language: string, levels?: string[], size = 10) =>
    client.get<TranslationRecord[]>(`${BASE}/quiz`, {
      params: { language, levels: levels?.join(','), size },
    }),

  review: (id: string, score: ReviewScore) =>
    client.post(`${BASE}/${id}/review`, { score }),

  crossword: (language: string, levels?: string[]) =>
    client.post<CrosswordResult>(`${BASE}/crossword`, null, {
      params: { language, levels: levels?.join(',') },
    }),

  stats: (language: string) =>
    client.get<LearningStats>(`${BASE}/stats`, { params: { language } }),
}
