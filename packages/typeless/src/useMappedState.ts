import * as React from 'react';
import { StateGetter } from './types';
import { Store } from './Store';

export function useMappedState<
  T extends [] | [StateGetter<any>, ...StateGetter<any>[]],
  R
>(
  stateGetters: T,
  mapper: (
    ...args: T extends StateGetter<any>[]
      ? { [P in keyof T]: T[P] extends StateGetter<infer S> ? S : never }
      : never
  ) => R,
  deps?: any[]
): R;

export function useMappedState(
  stateGetters: StateGetter<any>[],
  mapper: (...args: any[]) => any,
  deps: any[] = []
) {
  const mapperCached = React.useCallback(mapper, deps);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  const stores = React.useMemo(
    () =>
      stateGetters.map((getter: any) => {
        if (!getter._store) {
          throw new Error(
            `_store not found in getter for module "${getter._module ||
              'unknown'}". Make sure to load the module before using 'useState' or 'useMappedState'.`
          );
        }
        return getter._store as Store;
      }),
    []
  );

  const getMappedState = () => {
    const states = stores.map(store => store.state);
    return mapperCached(...states);
  };

  const getSubscribeFn = () => {
    stateRef.current = getMappedState();
    forceUpdate({});
  };

  const stateRef = React.useRef(getMappedState());
  const subscribeRef = React.useRef(getSubscribeFn);

  // subscribe to stored immediately
  // React.useEffect can sometimes miss updates
  React.useLayoutEffect(() => {
    const subscriptions = stores.map(store =>
      store.subscribe(() => subscribeRef.current())
    );
    return () => {
      subscriptions.forEach(subscription => subscription());
    };
  }, []);

  React.useMemo(() => {
    stateRef.current = getMappedState();
    subscribeRef.current = getSubscribeFn;
  }, deps);

  return stateRef.current;
}
