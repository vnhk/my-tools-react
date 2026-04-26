// UtilsMessage equivalent
export interface UtilsMessage {
  message: string
  isSuccess: boolean
  isError: boolean
  isWarning: boolean
}

// Action equivalent
export type Action = () => void
