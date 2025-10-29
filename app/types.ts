export interface Episode {
  episode_id: string
  title: string
  description: string
  episode_number: number
  duration: number
  duration_string: string
  timestamp: string
  format_id: string
  width: number
  height: number
  dynamic_range: string
  video_url: string
  thumbnail_url: string
}

export interface Season {
  series_id: string
  season_id: string
  season_title: string
  season_title_yomi: string
  season_number: number
  shoboi_tid: number
  description: string
  first_year: number
  first_month: number
  first_end_year: number
  first_end_month: number
  thumbnail_url: string
  episodes?: Episode[]
}

export interface Series {
  series_id: string
  title: string
  title_yomi: string
  title_en: string
  description: string
  thumbnail_url: string
  portrait_url: string
  seasons?: Season[]
}
