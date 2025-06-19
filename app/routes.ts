import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('search', 'routes/search.tsx'),
  route('series/:seriesId', 'routes/series.tsx'),
  route('episode/:episodeId', 'routes/episode.tsx')
] satisfies RouteConfig
