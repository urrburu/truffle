import camelCase from "camel-case";
import { IdObject, toIdObject } from "@truffle/db/meta";
import { NamedCollectionName, NamedResource } from "@truffle/db/definitions";

import { WorkspaceRequest, WorkspaceResponse } from "@truffle/db/loaders/types";

import { AddNameRecords } from "./add.graphql";
import { forType } from "./get.graphql";
export { AddNameRecords };

type ResolveFunc = (
  name: string,
  type: string
) => Generator<
  WorkspaceRequest,
  DataModel.NameRecord | null,
  WorkspaceResponse
>;

function* getResourceName<N extends NamedCollectionName>(
  { id }: IdObject<NamedResource<N>>,
  type: string
): Generator<
  WorkspaceRequest,
  NamedResource<N>,
  WorkspaceResponse<N, NamedResource<N>>
> {
  const GetResourceName = forType(type);

  const result = yield {
    request: GetResourceName,
    variables: { id }
  };

  return result.data[camelCase(type)];
}

export function* generateNameRecordsLoad<N extends NamedCollectionName>(
  resources: IdObject<NamedResource<N>>[],
  type: string,
  getCurrent: ResolveFunc
): Generator<WorkspaceRequest, DataModel.NameRecord[], WorkspaceResponse> {
  const nameRecords = [];
  for (const resource of resources) {
    const { name }: NamedResource<N> = yield* getResourceName(resource, type);

    const current: DataModel.NameRecord = yield* getCurrent(name, type);

    if (current) {
      nameRecords.push({
        name,
        type,
        resource,
        previous: toIdObject(current)
      });
    } else {
      nameRecords.push({
        name,
        type,
        resource
      });
    }
  }

  const result = yield {
    request: AddNameRecords,
    variables: { nameRecords }
  };

  return result.data.nameRecordsAdd.nameRecords;
}
