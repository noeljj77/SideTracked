import { useQuery } from '@tanstack/react-query'
import { fetchRelated, fetchTopic } from './client'

const HOUR = 60 * 60 * 1000

export const useTopic = (id: string) =>
  useQuery({
    queryKey: ['topic', id],
    queryFn: ({ signal }) => fetchTopic(id, signal),
    staleTime: HOUR,
    enabled: !!id,
  })

export const useRelated = (id: string) =>
  useQuery({
    queryKey: ['related', id],
    queryFn: ({ signal }) => fetchRelated(id, signal),
    staleTime: HOUR,
    enabled: !!id,
  })
