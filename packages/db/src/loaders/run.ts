import { Loader, LoaderRunner, LoadRequest, RequestName } from "./types";

export const forDb = (db): LoaderRunner => async <
  Args extends unknown[],
  Return,
  N extends RequestName | string
>(
  loader: Loader<Args, Return, N>,
  ...args: Args
) => {
  const saga = loader(...args);
  let current = saga.next();

  while (!current.done) {
    const { request, variables } = current.value as LoadRequest<N>;

    const response = await db.query(request, variables);

    current = saga.next(response);
  }

  return current.value;
};
