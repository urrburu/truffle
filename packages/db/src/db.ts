import { GraphQLSchema, DocumentNode, parse, execute } from "graphql";
import { Loaders } from "./loaders";
import { schema } from "./schema";
import { connect } from "./connect";
import { Context } from "./definitions";

interface IConfig {
  contracts_build_directory: string;
  contracts_directory: string;
  working_directory?: string;
  db?: {
    adapter?: {
      name: string;
      settings?: any;
    };
  };
}

export class TruffleDB {
  public schema: GraphQLSchema;
  public loaders: Loaders;

  private context: Context;

  constructor(config: IConfig) {
    this.schema = schema;
    this.context = this.createContext(config);
    this.loaders = new Loaders({
      db: this
    });
  }

  async query(query: DocumentNode | string, variables: any = {}): Promise<any> {
    const document: DocumentNode =
      typeof query !== "string" ? query : parse(query);

    return await execute(this.schema, document, null, this.context, variables);
  }

  private createContext(config: IConfig): Context {
    return {
      workspace: connect({
        workingDirectory: config.working_directory,
        adapter: (config.db || {}).adapter
      }),
      workingDirectory: config.working_directory || process.cwd()
    };
  }
}
