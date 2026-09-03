/**
 * Advanced Search & Indexing System
 * Enterprise-grade full-text search with indexing and query parsing
 */

export type IndexType = 'fulltext' | 'keyword' | 'numeric' | 'date' | 'range';
export type SearchOperator = 'and' | 'or' | 'not' | 'phrase';
export type SortOrder = 'asc' | 'desc';

export interface Document {
  id: string;
  content: string;
  metadata: Record<string, any>;
  indexed: boolean;
  indexedAt?: number;
}

export interface SearchIndex {
  name: string;
  type: IndexType;
  documents: Map<string, Document>;
  invertedIndex: Map<string, Set<string>>;
  metadata: Record<string, any>;
}

export interface SearchQuery {
  text: string;
  operators: SearchOperator[];
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
  sort?: { field: string; order: SortOrder };
}

export interface ParsedQuery {
  terms: string[];
  phrases: string[];
  operators: SearchOperator[];
  filters: Record<string, any>;
}

export interface SearchResult {
  documentId: string;
  score: number;
  document: Document;
  highlights?: Record<string, string[]>;
}

export interface SearchResults {
  query: SearchQuery;
  results: SearchResult[];
  total: number;
  limit: number;
  offset: number;
  executionTime: number;
}

export interface SearchAuditLog {
  id: string;
  query: string;
  resultCount: number;
  executionTime: number;
  userId?: string;
  timestamp: number;
}

/**
 * IndexBuilder: Build and manage search indices
 */
export class IndexBuilder {
  private indices: Map<string, SearchIndex> = new Map();

  createIndex(name: string, type: IndexType = 'fulltext'): SearchIndex {
    const index: SearchIndex = {
      name,
      type,
      documents: new Map(),
      invertedIndex: new Map(),
      metadata: { createdAt: Date.now(), docCount: 0 },
    };

    this.indices.set(name, index);
    return index;
  }

  getIndex(name: string): SearchIndex | undefined {
    return this.indices.get(name);
  }

  addDocument(indexName: string, document: Document): boolean {
    const index = this.indices.get(indexName);
    if (!index) return false;

    index.documents.set(document.id, document);
    this.indexDocument(index, document);
    document.indexed = true;
    document.indexedAt = Date.now();
    index.metadata.docCount = index.documents.size;

    return true;
  }

  private indexDocument(index: SearchIndex, document: Document): void {
    const tokens = this.tokenize(document.content);

    for (const token of tokens) {
      if (!index.invertedIndex.has(token)) {
        index.invertedIndex.set(token, new Set());
      }
      index.invertedIndex.get(token)!.add(document.id);
    }
  }

  private tokenize(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((token) => token.length > 0);
  }

  removeDocument(indexName: string, documentId: string): boolean {
    const index = this.indices.get(indexName);
    if (!index) return false;

    const document = index.documents.get(documentId);
    if (!document) return false;

    const tokens = this.tokenize(document.content);
    for (const token of tokens) {
      const docSet = index.invertedIndex.get(token);
      if (docSet) {
        docSet.delete(documentId);
        if (docSet.size === 0) {
          index.invertedIndex.delete(token);
        }
      }
    }

    index.documents.delete(documentId);
    index.metadata.docCount = index.documents.size;

    return true;
  }

  updateDocument(indexName: string, document: Document): boolean {
    const index = this.indices.get(indexName);
    if (!index) return false;

    this.removeDocument(indexName, document.id);
    return this.addDocument(indexName, document);
  }

  getDocuments(indexName: string, limit: number = 100): Document[] {
    const index = this.indices.get(indexName);
    if (!index) return [];

    return Array.from(index.documents.values()).slice(0, limit);
  }

  getIndexStats(indexName: string): Record<string, any> {
    const index = this.indices.get(indexName);
    if (!index) return {};

    return {
      name: index.name,
      type: index.type,
      documentCount: index.documents.size,
      tokenCount: index.invertedIndex.size,
      createdAt: index.metadata.createdAt,
    };
  }

  async clear(): Promise<void> {
    this.indices.clear();
  }
}

/**
 * QueryParser: Parse and normalize search queries
 */
export class QueryParser {
  private stopwords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
  ]);

  parse(queryText: string): ParsedQuery {
    const terms: string[] = [];
    const phrases: string[] = [];
    const operators: SearchOperator[] = [];
    const filters: Record<string, any> = {};

    const parts = queryText.split(/\s+/);
    let currentPhrase = '';
    let inPhrase = false;

    for (const part of parts) {
      if (part.startsWith('"')) {
        inPhrase = true;
        currentPhrase = part.substring(1);
      } else if (part.endsWith('"')) {
        currentPhrase += ' ' + part.substring(0, part.length - 1);
        phrases.push(currentPhrase.toLowerCase());
        inPhrase = false;
        currentPhrase = '';
      } else if (inPhrase) {
        currentPhrase += ' ' + part;
      } else if (
        part.toLowerCase() === 'and' ||
        part.toLowerCase() === 'or' ||
        part.toLowerCase() === 'not'
      ) {
        operators.push(part.toLowerCase() as SearchOperator);
      } else if (part.includes(':')) {
        const [key, value] = part.split(':');
        filters[key] = value;
      } else if (!this.stopwords.has(part.toLowerCase())) {
        terms.push(part.toLowerCase());
      }
    }

    return { terms, phrases, operators, filters };
  }

  normalizeQuery(queryText: string): string {
    return queryText
      .toLowerCase()
      .replace(/[^\w\s":-]/g, '')
      .trim();
  }

  async clear(): Promise<void> {
    this.stopwords.clear();
  }
}

/**
 * SearchEngine: Execute search queries
 */
export class SearchEngine {
  constructor(
    private indexBuilder: IndexBuilder,
    private queryParser: QueryParser
  ) {}

  search(indexName: string, query: SearchQuery): SearchResults {
    const startTime = Date.now();
    const index = this.indexBuilder.getIndex(indexName);

    if (!index) {
      return {
        query,
        results: [],
        total: 0,
        limit: query.limit || 10,
        offset: query.offset || 0,
        executionTime: Date.now() - startTime,
      };
    }

    const parsed = this.queryParser.parse(query.text);
    let matchingDocs = this.findMatchingDocuments(index, parsed);

    if (query.filters) {
      matchingDocs = matchingDocs.filter((doc) => this.matchesFilters(doc, query.filters!));
    }

    const results = matchingDocs.map((doc) => ({
      documentId: doc.id,
      score: this.calculateScore(doc, parsed),
      document: doc,
      highlights: this.generateHighlights(doc, parsed.terms),
    }));

    results.sort((a, b) => b.score - a.score);

    const limit = query.limit || 10;
    const offset = query.offset || 0;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      query,
      results: paginatedResults,
      total: results.length,
      limit,
      offset,
      executionTime: Date.now() - startTime,
    };
  }

  private findMatchingDocuments(index: SearchIndex, parsed: ParsedQuery): Document[] {
    const matchingDocIds = new Set<string>();

    for (const term of parsed.terms) {
      const docIds = index.invertedIndex.get(term);
      if (docIds) {
        for (const docId of docIds) {
          matchingDocIds.add(docId);
        }
      }
    }

    for (const phrase of parsed.phrases) {
      const phraseTokens = phrase.split(/\s+/);
      for (const [docId, doc] of index.documents) {
        if (doc.content.toLowerCase().includes(phrase)) {
          matchingDocIds.add(docId);
        }
      }
    }

    return Array.from(matchingDocIds)
      .map((docId) => index.documents.get(docId))
      .filter((doc) => doc !== undefined) as Document[];
  }

  private matchesFilters(doc: Document, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (doc.metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private calculateScore(doc: Document, parsed: ParsedQuery): number {
    let score = 0;

    for (const term of parsed.terms) {
      if (doc.content.toLowerCase().includes(term)) {
        score += 1;
      }
    }

    for (const phrase of parsed.phrases) {
      if (doc.content.toLowerCase().includes(phrase)) {
        score += 2;
      }
    }

    return score;
  }

  private generateHighlights(doc: Document, terms: string[]): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};

    for (const term of terms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = doc.content.match(regex);
      if (matches) {
        highlights[term] = matches;
      }
    }

    return highlights;
  }

  async clear(): Promise<void> {
    // Search engine doesn't own the index builder or query parser
  }
}

/**
 * SearchAuditor: Track search operations
 */
export class SearchAuditor {
  private logs: SearchAuditLog[] = [];

  logSearch(
    query: string,
    resultCount: number,
    executionTime: number,
    userId?: string
  ): SearchAuditLog {
    const log: SearchAuditLog = {
      id: `search_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      resultCount,
      executionTime,
      userId,
      timestamp: Date.now(),
    };

    this.logs.push(log);

    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-10000);
    }

    return log;
  }

  getLogs(limit: number = 100): SearchAuditLog[] {
    return this.logs.slice(-limit);
  }

  getLogsByUser(userId: string, limit: number = 100): SearchAuditLog[] {
    return this.logs.filter((log) => log.userId === userId).slice(-limit);
  }

  getSearchStats(): Record<string, any> {
    const totalSearches = this.logs.length;
    const avgExecutionTime =
      this.logs.reduce((sum, log) => sum + log.executionTime, 0) / totalSearches || 0;
    const avgResults =
      this.logs.reduce((sum, log) => sum + log.resultCount, 0) / totalSearches || 0;

    return {
      totalSearches,
      avgExecutionTime,
      avgResults,
      uniqueUsers: new Set(this.logs.map((l) => l.userId)).size,
    };
  }

  async clear(): Promise<void> {
    this.logs = [];
  }
}

/**
 * SearchHub: Unified search orchestration
 */
export class SearchHub {
  private indexBuilder: IndexBuilder;
  private queryParser: QueryParser;
  private searchEngine: SearchEngine;
  private auditor: SearchAuditor;

  constructor() {
    this.indexBuilder = new IndexBuilder();
    this.queryParser = new QueryParser();
    this.searchEngine = new SearchEngine(this.indexBuilder, this.queryParser);
    this.auditor = new SearchAuditor();
  }

  getIndexBuilder(): IndexBuilder {
    return this.indexBuilder;
  }

  getQueryParser(): QueryParser {
    return this.queryParser;
  }

  getSearchEngine(): SearchEngine {
    return this.searchEngine;
  }

  getAuditor(): SearchAuditor {
    return this.auditor;
  }

  createIndex(name: string, type: IndexType = 'fulltext'): SearchIndex {
    return this.indexBuilder.createIndex(name, type);
  }

  index(indexName: string, document: Document): boolean {
    return this.indexBuilder.addDocument(indexName, document);
  }

  search(indexName: string, query: SearchQuery, userId?: string): SearchResults {
    const results = this.searchEngine.search(indexName, query);
    this.auditor.logSearch(query.text, results.total, results.executionTime, userId);
    return results;
  }

  removeDocument(indexName: string, documentId: string): boolean {
    return this.indexBuilder.removeDocument(indexName, documentId);
  }

  updateDocument(indexName: string, document: Document): boolean {
    return this.indexBuilder.updateDocument(indexName, document);
  }

  getIndexStats(indexName: string): Record<string, any> {
    return this.indexBuilder.getIndexStats(indexName);
  }

  getSearchStats(): Record<string, any> {
    return this.auditor.getSearchStats();
  }

  async clear(): Promise<void> {
    await this.indexBuilder.clear();
    await this.queryParser.clear();
    await this.auditor.clear();
  }
}
