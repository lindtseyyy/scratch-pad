import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../../lib/supabase'
import { normalizeTag } from '../../lib/tags'
import { useAuth } from '../auth/AuthProvider'
import type { Tag } from '../links/api'
export function useTags() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['tags', session?.user.id],
    enabled: !!session,
    queryFn: async ({ signal }) => {
      const { data, error } = await getSupabase()
        .from('tag_usage')
        .select('id, name, link_count')
        .order('name')
        .abortSignal(signal)
      if (error) throw error
      return data.filter((tag): tag is Tag => !!tag.id && !!tag.name && tag.link_count !== null)
    },
  })
}
function useRefreshTags() {
  const client = useQueryClient()
  return () =>
    Promise.all(
      ['tags', 'links', 'duplicate'].map((key) => client.invalidateQueries({ queryKey: [key] })),
    )
}
export function useRenameTag() {
  const refresh = useRefreshTags()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await getSupabase()
        .from('tags')
        .update({ name: normalizeTag(name) })
        .eq('id', id)
        .select('id')
        .single()
      if (error) throw error
    },
    onSuccess: refresh,
  })
}
export function useDeleteTag() {
  const refresh = useRefreshTags()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('tags').delete().eq('id', id).select('id').single()
      if (error) throw error
    },
    onSuccess: refresh,
  })
}
export function useCreateTag() {
  const refresh = useRefreshTags()
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await getSupabase()
        .from('tags')
        .insert({ name: normalizeTag(name) })
      if (error) throw error
    },
    onSuccess: refresh,
  })
}
