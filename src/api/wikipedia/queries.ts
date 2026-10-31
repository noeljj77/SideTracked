import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchRelated, fetchTopic, searchTitles } from './client'

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

export const useSearch = (q: string) =>
  useQuery({
    queryKey: ['search', q],
    queryFn: ({ signal }) => searchTitles(q, signal),
    staleTime: HOUR,
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  })
