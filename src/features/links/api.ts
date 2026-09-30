import type { Database } from '../../lib/database.types'
import { getSupabase } from '../../lib/supabase'
import type { LinkFilters } from '../../hooks/useUrlFilters'

export type Tag = { id: string; name: string; link_count: number }
export type SavedLink = Database['public']['Tables']['links']['Row'] & {
  tags: { id: string; name: string }[]
}
export type LinkDraft = {
  id?: string
  url: string
  title: string
  source: string
  description: string
  tags: string[]
}
export async function listLinks(
  filters: LinkFilters,
  tagIds: string[],
  offset: number,
  signal: AbortSignal,
) {
  const { data, error } = await getSupabase()
    .rpc('search_links', {
      p_query: filters.query,
      p_tag_ids: tagIds,
      p_source: filters.source || undefined,
      p_sort: filters.sort,
      p_limit: 50,
      p_offset: offset,
    })
    .select('*, tags(id, name)')
    .abortSignal(signal)
    .returns<SavedLink[]>()
  if (error) throw error
  return data
}
export async function saveLink(draft: LinkDraft) {
  const { data, error } = await getSupabase().rpc('save_link', {
    p_id: draft.id,
    p_url: draft.url,
    p_title: draft.title,
    p_source: draft.source,
    p_description: draft.description,
    p_tag_names: draft.tags,
  })
  if (error) throw error
  return data[0]
}
export async function deleteLink(id: string) {
  const { error } = await getSupabase().from('links').delete().eq('id', id).select('id').single()
  if (error) throw error
}
