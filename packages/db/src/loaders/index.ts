import { DocumentNode } from "graphql";
import { WorkflowCompileResult } from "@truffle/compile-common";
import { IdObject, toIdObject } from "@truffle/db/meta";
import { NamedCollectionName, NamedResource } from "@truffle/db/definitions";
import { LoaderRunner } from "./types";
import { forDb } from "./run";
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
  private run: LoaderRunner;

  constructor(options: LoadersConstructorOptions) {
    this.run = forDb(options.db);
  }

  async loadProject(options: {
    directory: string;
  }): Promise<IdObject<DataModel.Project>> {
    const project = await this.run(generateInitializeLoad, {
      directory: options.directory
    });

    return project;
  }

  async loadNames(options: {
    project: IdObject<DataModel.Project>;
    assignments: Partial<
      {
        [N in NamedCollectionName]: IdObject<NamedResource<N>>[];
      }
    >;
  }) {
    return await this.run(
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

    const { compilations, contracts } = await this.run(
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
