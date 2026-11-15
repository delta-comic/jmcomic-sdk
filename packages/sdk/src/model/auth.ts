import type { UserMe } from './user'

export * from './generated/auth'

/** @zod */
export interface LoginData {
  username: string
  password: string
}

/** @zod */
export interface LoginUser {
  data?: LoginData
  username: string
  user: UserMe
}