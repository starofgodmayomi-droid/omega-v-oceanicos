/**
 * GraphQL schema and query interface for flexible data queries
 * Alternative to REST API for complex queries
 */

export interface GraphQLQuery {
  query: string;
  variables?: Record<string, unknown>;
}

export interface GraphQLResult {
  data?: unknown;
  errors?: Array<{ message: string; path?: string[] }>;
}

/**
 * GraphQL field resolver
 */
export type FieldResolver = (parent: any, args: Record<string, any>) => Promise<any> | any;

/**
 * GraphQL schema builder for simple query execution
 */
export class GraphQLSchema {
  private queryResolvers: Map<string, FieldResolver> = new Map();
  private fieldResolvers: Map<string, Map<string, FieldResolver>> = new Map();

  defineQuery(name: string, resolver: FieldResolver): void {
    this.queryResolvers.set(name, resolver);
  }

  defineField(type: string, field: string, resolver: FieldResolver): void {
    if (!this.fieldResolvers.has(type)) {
      this.fieldResolvers.set(type, new Map());
    }
    this.fieldResolvers.get(type)!.set(field, resolver);
  }

  async execute(query: string): Promise<GraphQLResult> {
    try {
      const parsed = parseQuery(query);

      if (!parsed) {
        return {
          errors: [{ message: 'Invalid query syntax' }],
        };
      }

      const data: Record<string, any> = {};

      for (const field of parsed.fields) {
        const resolver = this.queryResolvers.get(field.name);

        if (!resolver) {
          return {
            errors: [{ message: `Field '${field.name}' not found in Query type` }],
          };
        }

        const result = await resolver(null, field.args);
        data[field.name] = result;
      }

      return { data };
    } catch (error) {
      return {
        errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }],
      };
    }
  }
}

/**
 * Parse simple GraphQL query string
 * Supports basic field selection: { field1 field2(arg: value) }
 */
function parseQuery(
  query: string
): { fields: Array<{ name: string; args: Record<string, any> }> } | null {
  const match = query.match(/{\s*(.+?)\s*}/);

  if (!match) {
    return null;
  }

  const fieldStr = match[1];
  const fields: Array<{ name: string; args: Record<string, any> }> = [];

  const fieldPattern = /(\w+)(?:\s*\(\s*([^)]*)\s*\))?/g;
  let fieldMatch;

  while ((fieldMatch = fieldPattern.exec(fieldStr)) !== null) {
    const name = fieldMatch[1];
    const argsStr = fieldMatch[2] || '';

    const args: Record<string, any> = {};

    if (argsStr) {
      const argPattern = /(\w+):\s*("(?:\\.|[^"])*"|[^,)]+)/g;
      let argMatch;

      while ((argMatch = argPattern.exec(argsStr)) !== null) {
        const key = argMatch[1];
        const value = parseArgValue(argMatch[2].trim());
        args[key] = value;
      }
    }

    fields.push({ name, args });
  }

  return fields.length > 0 ? { fields } : null;
}

/**
 * Parse GraphQL argument value
 */
function parseArgValue(value: string): unknown {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;

  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }

  if (/^\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    const items = value
      .slice(1, -1)
      .split(',')
      .map((item) => parseArgValue(item.trim()));
    return items;
  }

  return value;
}

/**
 * Build GraphQL schema for verification queries
 */
export function createVerificationSchema(): GraphQLSchema {
  const schema = new GraphQLSchema();

  schema.defineQuery('observations', async (_, args) => {
    return {
      total: args.limit || 50,
      items: [],
    };
  });

  schema.defineQuery('verifications', async (_, args) => {
    return {
      total: args.limit || 50,
      items: [],
    };
  });

  schema.defineQuery('attestations', async (_, args) => {
    return {
      total: args.limit || 50,
      items: [],
    };
  });

  schema.defineQuery('metrics', async () => {
    return {
      observations: 0,
      verifications: 0,
      attestations: 0,
      successRate: 0,
    };
  });

  schema.defineQuery('trace', async (_, args) => {
    return {
      id: args.id,
      spans: [],
      duration: 0,
    };
  });

  schema.defineQuery('health', async () => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  return schema;
}

/**
 * GraphQL introspection - list available queries
 */
export function getSchemaIntrospection(_schema: GraphQLSchema): Record<string, any> {
  return {
    __schema: {
      queryType: {
        name: 'Query',
        fields: [
          {
            name: 'observations',
            description: 'Query observations with pagination',
            args: [
              { name: 'limit', type: 'Int' },
              { name: 'offset', type: 'Int' },
            ],
          },
          {
            name: 'verifications',
            description: 'Query verifications with pagination',
            args: [
              { name: 'limit', type: 'Int' },
              { name: 'offset', type: 'Int' },
            ],
          },
          {
            name: 'attestations',
            description: 'Query attestations with pagination',
            args: [
              { name: 'limit', type: 'Int' },
              { name: 'offset', type: 'Int' },
            ],
          },
          {
            name: 'metrics',
            description: 'Get system metrics',
            args: [],
          },
          {
            name: 'trace',
            description: 'Get trace for observation',
            args: [{ name: 'id', type: 'String!' }],
          },
          {
            name: 'health',
            description: 'Get health status',
            args: [],
          },
        ],
      },
    },
  };
}
