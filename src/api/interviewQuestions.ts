import client from './client'
import type {Page, SearchParams} from './crud'

export interface InterviewQuestion {
    id: string
    name: string
    tags: string | null
    difficulty: number | null
    questionDetails: string | null
    answerDetails: string | null
    maxPoints: number | null
}

export const interviewQuestionsApi = {
    getAll: (params?: SearchParams) =>
        client.get<Page<InterviewQuestion>>('/interview/questions', {params}),

    getById: (id: string) =>
        client.get<InterviewQuestion>(`/interview/questions/${id}`),

    create: (data: Partial<InterviewQuestion>) =>
        client.post<InterviewQuestion>('/interview/questions', data),

    update: (id: string, data: Partial<InterviewQuestion>) =>
        client.put<InterviewQuestion>(`/interview/questions/${id}`, data),

    delete: (id: string) =>
        client.delete(`/interview/questions/${id}`),
}
