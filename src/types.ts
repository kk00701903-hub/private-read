export type Episode = {
  id: string
  file: string
  number: number
  title: string
  wordCount: number
}

export type Novel = {
  slug: string
  title: string
  author: string
  description: string
  cover: string | null
  genre: string
  status: string
  updatedAt: string | null
  contentVersion?: string | null
  episodeCount: number
  episodes: Episode[]
}

export type NovelsIndex = {
  generatedAt: string
  novels: Novel[]
}

export type ReaderTheme = 'paper' | 'sepia' | 'night'
export type ReaderWidth = 'narrow' | 'normal'

export type ReaderSettings = {
  fontSize: number
  lineHeight: number
  theme: ReaderTheme
  width: ReaderWidth
}
