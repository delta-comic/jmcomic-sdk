import type { Comment } from './comment'
import type { Numeric } from './utils'

export * from './generated/comic'

/** @zod */
export interface Category {
  id: string | null
  title: string | null
}

/** @zod */
export interface Series {
  id: Numeric
  name: string
  sort: string
}

/** @zod */
export interface BaseComic {
  /**
   * @description 漫画的唯一id
   * @alias `AID`
   */
  id: Numeric
  name: string
  is_favorite: boolean
  liked: boolean
}

/** @zod */
export interface LessComic extends BaseComic {
  addtime: string
  images: string[]
  series: Series[]
  series_id: Numeric
  tags: string
}

/** @zod */
export interface CommonComic extends BaseComic {
  author: string
  description?: string | null
  image: string
  category: Category
  category_sub: Category
  update_at?: Numeric
}

/** @zod */
export interface RecommendComic {
  id: Numeric
  author: string
  name: string
  image: string
}

/** @zod */
export interface FullComic extends BaseComic {
  images: string[]
  addtime: Numeric
  description: string
  total_views: Numeric
  series: Series[]
  series_id: Numeric
  comment_total: Numeric
  author: string[]
  tags: string[]
  works: string[]
  actors: string[]
  related_list: RecommendComic[]
  liked: boolean
  is_aids: boolean
  price: Numeric | ''
  purchased: Numeric | ''
  likes: Numeric
}

/** @zod */
export interface ComicComment extends Comment {
  AID?: Numeric
  replys?: ComicComment[]
}