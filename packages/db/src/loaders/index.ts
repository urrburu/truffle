import { DocumentNode } from "graphql";
import { WorkflowCompileResult } from "@truffle/compile-common";
import { IdObject, toIdObject } from "@truffle/db/meta";
import { NamedCollectionName, NamedResource } from "@truffle/db/definitions";
import { WorkspaceRequest, WorkspaceResponse } from "./types";
import {
  generateCompileLoad,
  generateInitializeLoad,
  generateNamesLoad
} from "./commands";

interface ITruffleDB {
  query: (query: DocumentNode | string, variables: any) => Promise<any>;
}

export interface LoadersConstructorOptions {
  db: ITruffleDB;
}

export class Loaders {
  private db: ITruffleDB;

  constructor(options: LoadersConstructorOptions) {
    this.db = options.db;
  }

  private async runLoader<
    Request extends WorkspaceRequest,
    Response extends WorkspaceResponse,
    Args extends unknown[],
    Return
  >(
    loader: (...args: Args) => Generator<Request, Return, Response>,
    ...args: Args
  ): Promise<Return> {
    const saga = loader(...args);
    let current = saga.next();

    while (!current.done) {
      const { request, variables } = current.value as Request;

      const response: Response = await this.db.query(request, variables);

      current = saga.next(response);
    }

    return current.value;
  }

  async loadProject(options: {
    directory: string;
  }): Promise<IdObject<DataModel.Project>> {
    const project = await this.runLoader(generateInitializeLoad, {
      directory: options.directory
    });

    return toIdObject(project);
  }

  async loadNames(options: {
    project: IdObject<DataModel.Project>;
    assignments: Partial<
      {
        [N in NamedCollectionName]: IdObject<NamedResource<N>>[];
      }
    >;
  }) {
    return await this.runLoader(
      generateNamesLoad,
      options.project,
      options.assignments
    );
  }

  async loadCompilations(options: {
    project: IdObject<DataModel.Project>;
    result: WorkflowCompileResult;
    assignNames?: boolean;
  }): Promise<IdObject<DataModel.Compilation>[]> {
    const { project, result, assignNames } = options;

    const { compilations, contracts } = await this.runLoader(
      generateCompileLoad,
      result
    );

    if (assignNames) {
      await this.loadNames({
        project,
        assignments: {
          contracts: contracts.map(toIdObject)
        }
      });
    }

    return compilations.map(toIdObject);
  }
}
