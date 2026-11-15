import type { Numeric } from './utils'

export * from './generated/book'

/** @zod */
export interface CommonBook {
  author: string
  /**
   * @description 这个字段是book的唯一id，本质数字
   * @example '1145'
   */
  id: Numeric
  image: string
  name: string
  update_at: Numeric
}

/** @zod */
export interface LessBook {
  /**
   * @description 这个字段是book的唯一id，本质数字
   * @example '1145'
   */
  id: Numeric
  author_name: string
  /**
   * @example "77 days ago"
   */
  update_date: string
  author_avatar: string
  background_image: string
}

/** @zod */
export interface RelatedBook {
  /**
   * @description 这个字段是book的唯一id，本质数字
   * @example '1145'
   */
  id: Numeric
  /**
   * @example "/media/library/album/1043902/thumb/album.jpg"
   */
  work_image: string
  work_title: string
  work_date: string
  platform_name: string
}

/** @zod */
export interface BookAuthor {
  /**
   * @deprecated 恒定为该无意义值
   * @schema string().optional().default('')
   */
  work_title: string
  /**
   * @deprecated 恒定为该无意义值
   * @schema string().optional().default('')
   */
  work_date: string
  /** @schema string().optional().default('') */
  author_id: string
  author_name: string
  /**
   * @example "/media/library/artists/6212623/icon/136650067.gif"
   */
  author_avatar: string
  /**
   * @example "/media/library/artists/6212623/banner/136650067.gif"
   */
  background_image: string
  sponsor: {
    /**
     * @example "https://www.patreon.com/user?u=136650067"
     */
    platform_url: string
    platform_name: string
  }[]
  related_works: RelatedBook[]
  filters: { language: string[]; source: { service: string; name: string }[] }
}

/** @zod */
export interface BookRelates {
  /**
   * @example "20392 days ago"
   */
  work_date: string
  author_name: string
  work_title: string
  related_works: RelatedBook[]
}

/** @zod */
export interface BookContents {
  /**
   * @description 这个字段是book的唯一id，本质数字
   * @example '1145'
   */
  id: Numeric
  name: string
  total_page: Numeric
  images: {
    page: Numeric
    /**
     * @example "https://cdn-msp12.jmdanjonproxy.xyz/media/library/album/1023045/00000.jpg"
     */
    image: string
  }[]
  /**
   * @example "<p>72Pic</p>"
   * @description 该内容疑似已经在服务端完成xss过滤，但仍建议再进行本地过滤
   */
  content: string
  /**
   * @deprecated 使用`adddt`代替
   * @example 1970 // 恒定为该无意义值
   */
  addtime: Numeric
  /**
   * @example "2025-05-18 01:00:14"
   */
  adddt: string
}