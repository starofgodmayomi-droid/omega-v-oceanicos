import { GraphQLSchema, createVerificationSchema, getSchemaIntrospection } from '../graphql';

describe('GraphQL Schema', () => {
  let schema: GraphQLSchema;

  beforeEach(() => {
    schema = createVerificationSchema();
  });

  describe('Query Execution', () => {
    it('should execute simple query', async () => {
      const result = await schema.execute('{ health }');

      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should execute query with arguments', async () => {
      const result = await schema.execute('{ observations(limit: 20) }');

      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should execute multiple fields', async () => {
      const result = await schema.execute('{ health metrics observations(limit: 10) }');

      expect(result.data).toBeDefined();
      expect(Object.keys(result.data as any).length).toBeGreaterThan(0);
    });

    it('should return error for invalid query', async () => {
      const result = await schema.execute('invalid');

      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should return error for unknown field', async () => {
      const result = await schema.execute('{ unknownField }');

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('not found');
    });
  });

  describe('Verification Schema', () => {
    it('should resolve observations query', async () => {
      const result = await schema.execute('{ observations }');

      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.observations).toBeDefined();
    });

    it('should resolve verifications query', async () => {
      const result = await schema.execute('{ verifications }');

      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.verifications).toBeDefined();
    });

    it('should resolve attestations query', async () => {
      const result = await schema.execute('{ attestations }');

      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.attestations).toBeDefined();
    });

    it('should resolve metrics query', async () => {
      const result = await schema.execute('{ metrics }');

      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.metrics).toBeDefined();
      expect(data.metrics.successRate).toBeDefined();
    });

    it('should resolve trace query with arguments', async () => {
      const result = await schema.execute('{ trace(id: "obs-123") }');

      expect(result.data).toBeDefined();
    });

    it('should resolve health query', async () => {
      const result = await schema.execute('{ health }');

      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.health.status).toBe('ok');
      expect(data.health.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Custom Queries', () => {
    it('should define custom query resolvers', async () => {
      const customSchema = new GraphQLSchema();

      customSchema.defineQuery('customField', async () => {
        return { value: 'test' };
      });

      const result = await customSchema.execute('{ customField }');

      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.customField.value).toBe('test');
    });

    it('should support async resolvers', async () => {
      const customSchema = new GraphQLSchema();

      customSchema.defineQuery('asyncField', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { delayed: true };
      });

      const result = await customSchema.execute('{ asyncField }');

      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.asyncField.delayed).toBe(true);
    });

    it('should support resolver with arguments', async () => {
      const customSchema = new GraphQLSchema();

      customSchema.defineQuery('echo', async (_, args) => {
        return { message: args.message };
      });

      const result = await customSchema.execute('{ echo(message: "hello") }');

      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.echo.message).toBe('hello');
    });
  });

  describe('Introspection', () => {
    it('should provide schema introspection', () => {
      const introspection = getSchemaIntrospection(schema);

      expect(introspection.__schema).toBeDefined();
      expect(introspection.__schema.queryType).toBeDefined();
      expect(introspection.__schema.queryType.name).toBe('Query');
    });

    it('should list available query fields', () => {
      const introspection = getSchemaIntrospection(schema);

      const fields = introspection.__schema.queryType.fields;
      const fieldNames = fields.map((f: any) => f.name);

      expect(fieldNames).toContain('health');
      expect(fieldNames).toContain('metrics');
      expect(fieldNames).toContain('observations');
      expect(fieldNames).toContain('verifications');
      expect(fieldNames).toContain('attestations');
      expect(fieldNames).toContain('trace');
    });

    it('should include field descriptions', () => {
      const introspection = getSchemaIntrospection(schema);

      const healthField = introspection.__schema.queryType.fields.find(
        (f: any) => f.name === 'health'
      );

      expect(healthField.description).toBeDefined();
    });

    it('should include field arguments', () => {
      const introspection = getSchemaIntrospection(schema);

      const observationsField = introspection.__schema.queryType.fields.find(
        (f: any) => f.name === 'observations'
      );

      expect(observationsField.args).toBeDefined();
      expect(observationsField.args.length).toBeGreaterThan(0);
    });
  });

  describe('Query Parsing', () => {
    it('should parse simple field queries', async () => {
      const result = await schema.execute('{ health }');
      expect(result.data).toBeDefined();
    });

    it('should parse multiple fields', async () => {
      const result = await schema.execute('{ health metrics }');
      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.health).toBeDefined();
      expect(data.metrics).toBeDefined();
    });

    it('should parse numeric arguments', async () => {
      const result = await schema.execute('{ observations(limit: 10 offset: 20) }');
      expect(result.data).toBeDefined();
    });

    it('should parse string arguments', async () => {
      const result = await schema.execute('{ trace(id: "test-id") }');
      expect(result.data).toBeDefined();
    });

    it('should handle whitespace variations', async () => {
      const result = await schema.execute('{  health  metrics  }');
      expect(result.data).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed queries', async () => {
      const result = await schema.execute('{ health invalid syntax }');

      expect(result.errors).toBeDefined();
    });

    it('should handle missing query braces', async () => {
      const result = await schema.execute('health');

      expect(result.errors).toBeDefined();
    });

    it('should handle resolver errors gracefully', async () => {
      const errorSchema = new GraphQLSchema();
      errorSchema.defineQuery('error', async () => {
        throw new Error('Test error');
      });

      const result = await errorSchema.execute('{ error }');

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Test error');
    });
  });
});
