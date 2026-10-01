import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useTags } from '../tags/hooks'
import { deleteLink, LINKS_PER_PAGE, listLinks, saveLink, type SavedLink } from './api'
import type { LinkFilters } from '../../hooks/useUrlFilters'

export function useRefreshLibrary() {
  const client = useQueryClient()
  return () =>
    Promise.all(
      ['links', 'tags', 'sources', 'link-count', 'duplicate'].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
    )
}
export function useLinks(filters: LinkFilters, page: number) {
  const { session } = useAuth()
  const tags = useTags()
  const selectedTags = (tags.data || [])
    .filter((tag) => filters.tags.includes(tag.name))
    .map((tag) => tag.id)
  return useQuery({
    queryKey: ['links', session?.user.id, filters, selectedTags, page],
    enabled: !!session && tags.isSuccess,
    queryFn: ({ signal }) =>
      selectedTags.length !== filters.tags.length
        ? Promise.resolve({ rows: [], hasNextPage: false })
        : listLinks(filters, selectedTags, (page - 1) * LINKS_PER_PAGE, signal),
  })
}
export function useSaveLink() {
  const refresh = useRefreshLibrary()
  return useMutation({ mutationFn: saveLink, onSuccess: refresh })
}
export function useDeleteLink() {
  const refresh = useRefreshLibrary()
  return useMutation({ mutationFn: deleteLink, onSuccess: refresh })
}
export function useSources() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['sources', session?.user.id],
    enabled: !!session,
    queryFn: async ({ signal }) => {
      const { data, error } = await getSupabase().rpc('link_sources').abortSignal(signal)
      if (error) throw error
      return data.map((item) => item.source)
    },
  })
}
export function useLinkCount() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['link-count', session?.user.id],
    enabled: !!session,
    queryFn: async ({ signal }) => {
      const { count, error } = await getSupabase()
        .from('links')
        .select('*', { head: true, count: 'exact' })
        .abortSignal(signal)
      if (error) throw error
      return count || 0
    },
  })
}
export function useLinkByUrl(url: string, excludeId?: string) {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['duplicate', session?.user.id, url, excludeId],
    enabled: !!url && !!session,
    queryFn: async ({ signal }) => {
      let query = getSupabase().from('links').select('*, tags(id, name)').eq('url', url)
      if (excludeId) query = query.neq('id', excludeId)
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .abortSignal(signal)
        .maybeSingle<SavedLink>()
      if (error) throw error
      return data
    },
  })
}
