import { QueryClient, QueryObserver } from "@tanstack/query-core";
import type {
  DefaultError,
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
} from "@tanstack/query-core";
import { useMemo, useResource, useState } from "@use-gpu/live";

export const queryClient = new QueryClient();

export function useQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: QueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >,
  client: QueryClient = queryClient
): QueryObserverResult<TData, TError> {
  const observer = useMemo(
    () =>
      new QueryObserver<
        TQueryFnData,
        TError,
        TData,
        TQueryData,
        TQueryKey
      >(client, options),
    [client, options]
  );

  const [result, setResult] = useState<QueryObserverResult<TData, TError>>(() =>
    observer.getCurrentResult()
  );

  useResource((dispose) => {
    setResult(observer.getCurrentResult());

    const unsubscribe = observer.subscribe(setResult);
    dispose(unsubscribe);
  }, [observer]);

  return result;
}