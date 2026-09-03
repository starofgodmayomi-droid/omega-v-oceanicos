import {
  IndexBuilder,
  QueryParser,
  SearchEngine,
  SearchAuditor,
  SearchHub,
  Document,
} from '../search';

describe('Advanced Search & Indexing System', () => {
  describe('IndexBuilder', () => {
    let builder: IndexBuilder;

    beforeEach(() => {
      builder = new IndexBuilder();
    });

    afterEach(async () => {
      await builder.clear();
    });

    it('should create index', () => {
      const index = builder.createIndex('users', 'fulltext');

      expect(index.name).toBe('users');
      expect(index.type).toBe('fulltext');
      expect(index.documents.size).toBe(0);
    });

    it('should get index', () => {
      builder.createIndex('products', 'fulltext');
      const index = builder.getIndex('products');

      expect(index).toBeDefined();
      expect(index?.name).toBe('products');
    });

    it('should add document to index', () => {
      builder.createIndex('docs');
      const doc: Document = {
        id: 'doc1',
        content: 'Hello world',
        metadata: { type: 'text' },
        indexed: false,
      };

      const result = builder.addDocument('docs', doc);

      expect(result).toBe(true);
      expect(doc.indexed).toBe(true);
      expect(doc.indexedAt).toBeDefined();
    });

    it('should remove document from index', () => {
      builder.createIndex('docs');
      const doc: Document = {
        id: 'doc1',
        content: 'Test content',
        metadata: {},
        indexed: false,
      };

      builder.addDocument('docs', doc);
      const result = builder.removeDocument('docs', doc.id);

      expect(result).toBe(true);
      expect(builder.getIndex('docs')?.documents.size).toBe(0);
    });

    it('should update document in index', () => {
      builder.createIndex('docs');
      const doc: Document = {
        id: 'doc1',
        content: 'Original content',
        metadata: {},
        indexed: false,
      };

      builder.addDocument('docs', doc);
      doc.content = 'Updated content';
      const result = builder.updateDocument('docs', doc);

      expect(result).toBe(true);
      expect(doc.indexed).toBe(true);
    });

    it('should get documents from index', () => {
      builder.createIndex('docs');
      const doc1: Document = { id: 'doc1', content: 'First', metadata: {}, indexed: false };
      const doc2: Document = { id: 'doc2', content: 'Second', metadata: {}, indexed: false };

      builder.addDocument('docs', doc1);
      builder.addDocument('docs', doc2);

      const documents = builder.getDocuments('docs');

      expect(documents.length).toBe(2);
    });

    it('should get index stats', () => {
      builder.createIndex('docs', 'keyword');
      const doc: Document = {
        id: 'doc1',
        content: 'Test content here',
        metadata: {},
        indexed: false,
      };

      builder.addDocument('docs', doc);

      const stats = builder.getIndexStats('docs');

      expect(stats.name).toBe('docs');
      expect(stats.type).toBe('keyword');
      expect(stats.documentCount).toBe(1);
      expect(stats.tokenCount).toBeGreaterThan(0);
    });
  });

  describe('QueryParser', () => {
    let parser: QueryParser;

    beforeEach(() => {
      parser = new QueryParser();
    });

    afterEach(async () => {
      await parser.clear();
    });

    it('should parse simple query', () => {
      const parsed = parser.parse('hello world');

      expect(parsed.terms.length).toBeGreaterThan(0);
      expect(parsed.terms.some((t) => t === 'hello')).toBe(true);
    });

    it('should parse phrase query', () => {
      const parsed = parser.parse('"hello world" test');

      expect(parsed.phrases.length).toBeGreaterThan(0);
      expect(parsed.phrases[0]).toBe('hello world');
    });

    it('should parse operators', () => {
      const parsed = parser.parse('hello AND world OR test');

      expect(parsed.operators.length).toBeGreaterThan(0);
      expect(parsed.operators.includes('and')).toBe(true);
    });

    it('should parse filters', () => {
      const parsed = parser.parse('hello type:article status:published');

      expect(Object.keys(parsed.filters).length).toBeGreaterThan(0);
      expect(parsed.filters.type).toBe('article');
    });

    it('should remove stopwords', () => {
      const parsed = parser.parse('the quick brown fox');

      expect(parsed.terms.some((t) => t === 'the')).toBe(false);
      expect(parsed.terms.some((t) => t === 'quick')).toBe(true);
    });

    it('should normalize query', () => {
      const normalized = parser.normalizeQuery('HELLO World! @#$');

      expect(normalized).toBe('hello world');
    });
  });

  describe('SearchEngine', () => {
    let builder: IndexBuilder;
    let parser: QueryParser;
    let engine: SearchEngine;

    beforeEach(() => {
      builder = new IndexBuilder();
      parser = new QueryParser();
      engine = new SearchEngine(builder, parser);
    });

    afterEach(async () => {
      await builder.clear();
      await parser.clear();
    });

    it('should search documents', () => {
      builder.createIndex('docs');
      const doc: Document = {
        id: 'doc1',
        content: 'The quick brown fox jumps',
        metadata: {},
        indexed: false,
      };

      builder.addDocument('docs', doc);

      const results = engine.search('docs', { text: 'quick fox' });

      expect(results.results.length).toBeGreaterThan(0);
      expect(results.total).toBeGreaterThan(0);
    });

    it('should calculate relevance scores', () => {
      builder.createIndex('docs');
      const doc1: Document = {
        id: 'doc1',
        content: 'cat dog',
        metadata: {},
        indexed: false,
      };
      const doc2: Document = {
        id: 'doc2',
        content: 'cat cat cat dog',
        metadata: {},
        indexed: false,
      };

      builder.addDocument('docs', doc1);
      builder.addDocument('docs', doc2);

      const results = engine.search('docs', { text: 'cat dog' });

      expect(results.results.length).toBe(2);
      expect(results.results[0].score).toBeGreaterThanOrEqual(results.results[1].score);
    });

    it('should apply filters', () => {
      builder.createIndex('docs');
      const doc1: Document = {
        id: 'doc1',
        content: 'article content',
        metadata: { type: 'article' },
        indexed: false,
      };
      const doc2: Document = {
        id: 'doc2',
        content: 'blog content',
        metadata: { type: 'blog' },
        indexed: false,
      };

      builder.addDocument('docs', doc1);
      builder.addDocument('docs', doc2);

      const results = engine.search('docs', {
        text: 'content',
        filters: { type: 'article' },
      });

      expect(results.results.length).toBe(1);
      expect(results.results[0].documentId).toBe('doc1');
    });

    it('should generate highlights', () => {
      builder.createIndex('docs');
      const doc: Document = {
        id: 'doc1',
        content: 'The quick quick brown fox',
        metadata: {},
        indexed: false,
      };

      builder.addDocument('docs', doc);

      const results = engine.search('docs', { text: 'quick' });

      expect(results.results[0].highlights).toBeDefined();
      expect(results.results[0].highlights?.quick).toBeDefined();
    });

    it('should paginate results', () => {
      builder.createIndex('docs');
      for (let i = 0; i < 25; i++) {
        const doc: Document = {
          id: `doc${i}`,
          content: `Document ${i} content`,
          metadata: {},
          indexed: false,
        };
        builder.addDocument('docs', doc);
      }

      const results = engine.search('docs', { text: 'document', limit: 10, offset: 0 });

      expect(results.results.length).toBeLessThanOrEqual(10);
      expect(results.total).toBe(25);
    });
  });

  describe('SearchAuditor', () => {
    let auditor: SearchAuditor;

    beforeEach(() => {
      auditor = new SearchAuditor();
    });

    afterEach(async () => {
      await auditor.clear();
    });

    it('should log search', () => {
      const log = auditor.logSearch('test query', 5, 100, 'user1');

      expect(log.id).toBeDefined();
      expect(log.query).toBe('test query');
      expect(log.resultCount).toBe(5);
      expect(log.executionTime).toBe(100);
    });

    it('should get logs', () => {
      auditor.logSearch('query1', 10, 50);
      auditor.logSearch('query2', 20, 75);

      const logs = auditor.getLogs();

      expect(logs.length).toBe(2);
    });

    it('should get logs by user', () => {
      auditor.logSearch('query1', 10, 50, 'user1');
      auditor.logSearch('query2', 20, 75, 'user2');
      auditor.logSearch('query3', 15, 60, 'user1');

      const userLogs = auditor.getLogsByUser('user1');

      expect(userLogs.length).toBe(2);
      expect(userLogs.every((log) => log.userId === 'user1')).toBe(true);
    });

    it('should calculate search stats', () => {
      auditor.logSearch('query1', 10, 100, 'user1');
      auditor.logSearch('query2', 20, 100, 'user2');

      const stats = auditor.getSearchStats();

      expect(stats.totalSearches).toBe(2);
      expect(stats.avgExecutionTime).toBe(100);
      expect(stats.avgResults).toBe(15);
    });
  });

  describe('SearchHub', () => {
    let hub: SearchHub;

    beforeEach(() => {
      hub = new SearchHub();
    });

    afterEach(async () => {
      await hub.clear();
    });

    it('should provide index builder', () => {
      const builder = hub.getIndexBuilder();
      expect(builder).toBeDefined();
    });

    it('should provide query parser', () => {
      const parser = hub.getQueryParser();
      expect(parser).toBeDefined();
    });

    it('should provide search engine', () => {
      const engine = hub.getSearchEngine();
      expect(engine).toBeDefined();
    });

    it('should provide auditor', () => {
      const auditor = hub.getAuditor();
      expect(auditor).toBeDefined();
    });

    it('should create index', () => {
      const index = hub.createIndex('docs', 'fulltext');

      expect(index.name).toBe('docs');
    });

    it('should index document', () => {
      hub.createIndex('docs');
      const doc: Document = {
        id: 'doc1',
        content: 'Test content',
        metadata: {},
        indexed: false,
      };

      const result = hub.index('docs', doc);

      expect(result).toBe(true);
      expect(doc.indexed).toBe(true);
    });

    it('should search documents', () => {
      hub.createIndex('docs');
      const doc: Document = {
        id: 'doc1',
        content: 'The quick brown fox',
        metadata: {},
        indexed: false,
      };

      hub.index('docs', doc);

      const results = hub.search('docs', { text: 'quick fox' });

      expect(results.results.length).toBeGreaterThan(0);
    });

    it('should remove document', () => {
      hub.createIndex('docs');
      const doc: Document = {
        id: 'doc1',
        content: 'Content',
        metadata: {},
        indexed: false,
      };

      hub.index('docs', doc);
      const result = hub.removeDocument('docs', doc.id);

      expect(result).toBe(true);
    });

    it('should update document', () => {
      hub.createIndex('docs');
      const doc: Document = {
        id: 'doc1',
        content: 'Original',
        metadata: {},
        indexed: false,
      };

      hub.index('docs', doc);
      doc.content = 'Updated';
      const result = hub.updateDocument('docs', doc);

      expect(result).toBe(true);
    });

    it('should get index stats', () => {
      hub.createIndex('docs');
      const doc: Document = {
        id: 'doc1',
        content: 'Test document',
        metadata: {},
        indexed: false,
      };

      hub.index('docs', doc);

      const stats = hub.getIndexStats('docs');

      expect(stats.documentCount).toBe(1);
      expect(stats.tokenCount).toBeGreaterThan(0);
    });

    it('should get search stats', () => {
      hub.createIndex('docs');
      const doc: Document = {
        id: 'doc1',
        content: 'Content',
        metadata: {},
        indexed: false,
      };

      hub.index('docs', doc);
      hub.search('docs', { text: 'content' }, 'user1');

      const stats = hub.getSearchStats();

      expect(stats.totalSearches).toBe(1);
    });

    it('should integrate all components for complex search', () => {
      hub.createIndex('articles');

      const docs: Document[] = [
        {
          id: '1',
          content: 'JavaScript tutorial for beginners',
          metadata: { type: 'tutorial' },
          indexed: false,
        },
        {
          id: '2',
          content: 'Advanced JavaScript patterns',
          metadata: { type: 'guide' },
          indexed: false,
        },
        {
          id: '3',
          content: 'Python basics reference',
          metadata: { type: 'tutorial' },
          indexed: false,
        },
      ];

      docs.forEach((doc) => hub.index('articles', doc));

      const results = hub.search('articles', {
        text: 'JavaScript tutorial',
        filters: { type: 'tutorial' },
        limit: 10,
      });

      expect(results.results.length).toBe(1);
      expect(results.results[0].documentId).toBe('1');
    });
  });
});
