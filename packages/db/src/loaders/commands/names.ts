import { singular } from "pluralize";
import pascalCase from "pascal-case";
import {
  generateProjectNameResolve,
  generateProjectNamesAssign
} from "@truffle/db/loaders/resources/projects";

import { generateNameRecordsLoad } from "@truffle/db/loaders/resources/nameRecords";
import { WorkspaceRequest, WorkspaceResponse } from "@truffle/db/loaders/types";
import { IdObject } from "@truffle/db/meta";
import { NamedCollectionName, NamedResource } from "@truffle/db/definitions";

/**
 * generator function to load nameRecords and project names into Truffle DB
 */
export function* generateNamesLoad(
  project: IdObject<DataModel.Project>,
  assignments: {
    [N in NamedCollectionName]: IdObject<NamedResource<N>>[];
  }
): Generator<WorkspaceRequest, any, WorkspaceResponse<string>> {
  let getCurrent = function*(name, type) {
    return yield* generateProjectNameResolve(project, name, type);
  };

  for (const [collectionName, resources] of Object.entries(assignments)) {
    const type = singular(pascalCase(collectionName));

    const nameRecords = yield* generateNameRecordsLoad(
      resources,
      type,
      getCurrent
    );

    yield* generateProjectNamesAssign(project, nameRecords);
  }
}
