import client from './client'
import type {Page} from './crud'

export interface ProjectDto {
    id: string
    name: string
    number: string
    status: string
    priority: string
    description: string | null
    modificationDate: string | null
}

export interface ProjectStats {
    total: number
    open: number
    inProgress: number
    done: number
    overdue: number
}

export interface TaskDto {
    id: string
    name: string
    number: string
    status: string
    type: string
    priority: string
    description: string | null
    dueDate: string | null
    assignee: string | null
    estimatedHours: number | null
    completionPercentage: number | null
    tags: string | null
    modificationDate: string | null
    projectId: string
    projectNumber: string
}

export interface TaskRelationDto {
    id: string
    direction: 'PARENT' | 'CHILD'
    type: string
    displayName: string
    relatedTaskId: string
    relatedTaskNumber: string
    relatedTaskName: string
    relatedTaskStatus: string
    relatedTaskType: string
}

export interface TaskDetailDto extends TaskDto {
    projectName: string
    relations: TaskRelationDto[]
}

export interface TaskSearchResult {
    id: string
    number: string
    name: string
    status: string
    type: string
}

export interface TaskCreateRequest {
    name: string
    status: string
    type: string
    priority: string
    description?: string | null
    dueDate?: string | null
    assignee?: string | null
    estimatedHours?: number | null
    tags?: string | null
    projectId: string
}

export const projectsApi = {
    getAll: (params?: Record<string, unknown>) =>
        client.get<Page<ProjectDto>>('/project-management/projects', {params}),

    getById: (id: string) =>
        client.get<ProjectDto>(`/project-management/projects/${id}`),

    getStats: (id: string) =>
        client.get<ProjectStats>(`/project-management/projects/${id}/stats`),

    create: (data: Partial<ProjectDto>) =>
        client.post<ProjectDto>('/project-management/projects', data),

    update: (id: string, data: Partial<ProjectDto>) =>
        client.put<ProjectDto>(`/project-management/projects/${id}`, data),

    delete: (id: string) =>
        client.delete(`/project-management/projects/${id}`),
}

export const tasksApi = {
    getAll: (params?: Record<string, unknown>) =>
        client.get<Page<TaskDto>>('/project-management/tasks', {params}),

    getByProject: (projectId: string, params?: Record<string, unknown>) =>
        client.get<Page<TaskDto>>('/project-management/tasks', {params: {projectId, ...params}}),

    getById: (id: string) =>
        client.get<TaskDetailDto>(`/project-management/tasks/${id}`),

    search: (projectId: string, q: string) =>
        client.get<TaskSearchResult[]>('/project-management/tasks/search', {params: {projectId, q}}),

    create: (data: TaskCreateRequest) =>
        client.post<TaskDto>('/project-management/tasks', data),

    patchUpdate: (id: string, data: Partial<TaskDto>) =>
        client.patch<TaskDto>(`/project-management/tasks/${id}`, data),

    update: (id: string, data: Partial<TaskDto>) =>
        client.put<TaskDto>(`/project-management/tasks/${id}`, data),

    delete: (id: string) =>
        client.delete(`/project-management/tasks/${id}`),

    addRelation: (taskId: string, parentTaskId: string, childTaskId: string, type: string) =>
        client.post<TaskRelationDto>(`/project-management/tasks/${taskId}/relations`, {
            parentTaskId,
            childTaskId,
            type,
        }),

    deleteRelation: (taskId: string, relationId: string) =>
        client.delete(`/project-management/tasks/${taskId}/relations/${relationId}`),
}

export const TASK_STATUSES = ['Open', 'In Progress', 'Done', 'Canceled']
export const TASK_TYPES = ['Task', 'Bug', 'Story', 'Feature', 'Objective']
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
export const PROJECT_STATUSES = ['Open', 'In Progress', 'Done', 'Canceled']
export const PROJECT_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

export const RELATION_TYPES = [
    {value: 'CHILD_IS_PART_OF', parentLabel: 'Parent of', childLabel: 'Is part of'},
    {value: 'BLOCKS', parentLabel: 'Blocks', childLabel: 'Is blocked by'},
    {value: 'REQUIRES', parentLabel: 'Requires', childLabel: 'Is required by'},
    {value: 'RELATES_TO', parentLabel: 'Relates to', childLabel: 'Relates to'},
    {value: 'CHILD_SOLVES', parentLabel: 'Solved by', childLabel: 'Solves'},
]
