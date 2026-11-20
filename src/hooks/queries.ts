import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import type { TryOn, User } from '@/lib/api/schemas';
import { useAuth } from '@/lib/auth/AuthProvider';
import { queryKeys } from '@/lib/queryKeys';

export function useMe() {
  const { status } = useAuth();
  return useQuery({ queryKey: queryKeys.me, queryFn: api.me, enabled: status === 'signedIn' });
}

/** Mutations that return the updated user write it straight into the cache. */
export function useUserMutation<TInput>(fn: (input: TInput) => Promise<User>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (user) => queryClient.setQueryData(queryKeys.me, user),
  });
}

const POLL_MS = 3000;

/** Polls while the server is still generating, then stops. */
export function useTryOn(id: string) {
  return useQuery({
    queryKey: queryKeys.tryOn(id),
    queryFn: () => api.tryOn(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'pending' || status === 'processing' ? POLL_MS : false;
    },
  });
}

export function useTryOnHistory(savedOnly: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.tryOns(savedOnly),
    queryFn: ({ pageParam }) => api.tryOns(pageParam, savedOnly),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
  });
}

export function useTryOnAction(fn: (id: string) => Promise<TryOn>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (tryOn) => {
      queryClient.setQueryData(queryKeys.tryOn(tryOn.id), tryOn);
      void queryClient.invalidateQueries({ queryKey: ['try-ons'] });
    },
  });
}
