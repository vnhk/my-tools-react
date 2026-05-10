import client from './client'

export interface Ebook {
  id: string
  ebookName: string
  creationDate: string | null
  modificationDate: string | null
}

export interface Word {
  name: string
  count: number
}

export const ebookApi = {
  listEbooks: () =>
    client.get<Ebook[]>('/ebook/ebooks'),

  createEbook: (ebookName: string) =>
    client.post<Ebook>('/ebook/ebooks', { ebookName }),

  deleteEbook: (id: string) =>
    client.delete(`/ebook/ebooks/${id}`),

  getNotLearned: (ebookId: string) =>
    client.get<Word[]>('/ebook/not-learned', { params: { ebookId } }),

  markLearned: (word: string) =>
    client.post('/ebook/mark-learned', { word }),

  addFlashcard: (word: string) =>
    client.post('/ebook/add-flashcard', { word }),

  importKnownWords: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return client.post('/ebook/import-known-words', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
