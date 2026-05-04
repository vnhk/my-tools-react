import client from './client'
import type { Page } from './crud'

export interface InterviewQuestion {
    id: string
    name: string
    tags: string | null
    difficulty: number | null
    questionDetails: string | null
    answerDetails: string | null
    maxPoints: number | null
}

export interface CodingTask {
    id: string
    name: string
    initialCode: string | null
    exampleCode: string | null
    exampleCodeDetails: string | null
    questions: string | null
}

export interface QuestionConfig {
    id: string
    name: string
    difficulty1Percent: number | null
    difficulty2Percent: number | null
    difficulty3Percent: number | null
    difficulty4Percent: number | null
    difficulty5Percent: number | null
    codingTasksAmount: number | null
}

export interface InterviewSessionDto {
    id: string
    candidateName: string
    configName: string
    status: string
    totalQuestions: number | null
    mainTags: string | null
    secondaryTags: string | null
    modificationDate: string | null
}

export interface SessionQuestionDto {
    id: string
    questionNumber: number
    score: number | null
    notes: string | null
    answerStatus: string
    questionId: string | null
    questionName: string | null
    questionTags: string | null
    questionDifficulty: number | null
    questionDetails: string | null
    answerDetails: string | null
    maxPoints: number | null
}

export interface SessionCodingTaskDto {
    id: string
    taskNumber: number
    score: number | null
    notes: string | null
    codingTaskId: string | null
    codingTaskName: string | null
    initialCode: string | null
    exampleCode: string | null
    exampleCodeDetails: string | null
    taskQuestions: string | null
}

export interface InterviewSessionDetail {
    id: string
    candidateName: string
    configName: string
    status: string
    totalQuestions: number | null
    mainTags: string | null
    secondaryTags: string | null
    notes: string | null
    planTemplate: string | null
    feedback: string | null
    skillLevelConfig: string | null
    modificationDate: string | null
    sessionQuestions: SessionQuestionDto[]
    sessionCodingTasks: SessionCodingTaskDto[]
}

export interface CreateSessionRequest {
    candidateName: string
    configName: string
    mainTags: string
    secondaryTags: string
    skillLevelConfig: string
    questionIds: string[]
    codingTaskIds: string[]
}

export interface UpdateSessionRequest {
    notes?: string
    status?: string
    feedback?: string
    sessionQuestions?: { id: string; score?: number; notes?: string; answerStatus?: string }[]
    sessionCodingTasks?: { id: string; score?: number; notes?: string }[]
}

export const interviewQuestionsApi = {
    getAll: (params?: Record<string, unknown>) =>
        client.get<Page<InterviewQuestion>>('/interview/questions', { params }),

    getById: (id: string) =>
        client.get<InterviewQuestion>(`/interview/questions/${id}`),

    getTags: () =>
        client.get<string[]>('/interview/questions/tags'),

    getByTagAndDifficulty: (tag: string, difficulty: number) =>
        client.get<InterviewQuestion[]>('/interview/questions/by-tag-difficulty', { params: { tag, difficulty } }),

    create: (data: Partial<InterviewQuestion>) =>
        client.post<InterviewQuestion>('/interview/questions', data),

    update: (id: string, data: Partial<InterviewQuestion>) =>
        client.put<InterviewQuestion>(`/interview/questions/${id}`, data),

    delete: (id: string) =>
        client.delete(`/interview/questions/${id}`),
}

export const codingTasksApi = {
    getAll: (params?: Record<string, unknown>) =>
        client.get<Page<CodingTask>>('/interview/coding-tasks', { params }),

    getById: (id: string) =>
        client.get<CodingTask>(`/interview/coding-tasks/${id}`),

    create: (data: Partial<CodingTask>) =>
        client.post<CodingTask>('/interview/coding-tasks', data),

    update: (id: string, data: Partial<CodingTask>) =>
        client.put<CodingTask>(`/interview/coding-tasks/${id}`, data),

    delete: (id: string) =>
        client.delete(`/interview/coding-tasks/${id}`),
}

export const questionConfigsApi = {
    getAll: (params?: Record<string, unknown>) =>
        client.get<Page<QuestionConfig>>('/interview/question-configs', { params }),

    getById: (id: string) =>
        client.get<QuestionConfig>(`/interview/question-configs/${id}`),

    create: (data: Partial<QuestionConfig>) =>
        client.post<QuestionConfig>('/interview/question-configs', data),

    update: (id: string, data: Partial<QuestionConfig>) =>
        client.put<QuestionConfig>(`/interview/question-configs/${id}`, data),

    delete: (id: string) =>
        client.delete(`/interview/question-configs/${id}`),
}

export const interviewSessionsApi = {
    getAll: (params?: Record<string, unknown>) =>
        client.get<Page<InterviewSessionDto>>('/interview/sessions', { params }),

    getById: (id: string) =>
        client.get<InterviewSessionDetail>(`/interview/sessions/${id}`),

    create: (data: CreateSessionRequest) =>
        client.post<InterviewSessionDetail>('/interview/sessions', data),

    update: (id: string, data: UpdateSessionRequest) =>
        client.put<InterviewSessionDetail>(`/interview/sessions/${id}`, data),

    delete: (id: string) =>
        client.delete(`/interview/sessions/${id}`),
}

export const interviewPlanApi = {
    get: () =>
        client.get<{ content: string }>('/interview/plan'),

    save: (content: string) =>
        client.put<{ content: string }>('/interview/plan', { content }),
}
