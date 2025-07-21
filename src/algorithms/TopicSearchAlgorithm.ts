import { Topic } from '../models/Topic';
import { ISearchAlgorithm, SearchResult } from './IAlgorithm';

/**
 * Advanced search algorithm for topics with relevance scoring
 */
export class TopicSearchAlgorithm implements ISearchAlgorithm {
  
  /**
   * Basic search without relevance scoring
   */
  public async search(query: string, topics: Topic[]): Promise<Topic[]> {
    const results = await this.searchWithRelevance(query, topics);
    return results.map(result => result.topic);
  }

  /**
   * Advanced search with relevance scoring
   */
  public async searchWithRelevance(query: string, topics: Topic[]): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const searchTerms = this.preprocessQuery(query);
    const results: SearchResult[] = [];

    for (const topic of topics) {
      const relevance = this.calculateRelevance(searchTerms, topic);
      
      if (relevance.score > 0) {
        results.push({
          topic,
          relevance: relevance.score,
          matchedFields: relevance.matchedFields,
          snippet: this.generateSnippet(topic, searchTerms)
        });
      }
    }

    // Sort by relevance score (descending)
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Fuzzy search with typo tolerance
   */
  public async fuzzySearch(query: string, topics: Topic[], threshold: number = 0.7): Promise<SearchResult[]> {
    const searchTerms = this.preprocessQuery(query);
    const results: SearchResult[] = [];

    for (const topic of topics) {
      const relevance = this.calculateFuzzyRelevance(searchTerms, topic, threshold);
      
      if (relevance.score > 0) {
        results.push({
          topic,
          relevance: relevance.score,
          matchedFields: relevance.matchedFields,
          snippet: this.generateSnippet(topic, searchTerms)
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Search with filters
   */
  public async searchWithFilters(
    query: string,
    topics: Topic[],
    filters: {
      minRelevance?: number;
      maxResults?: number;
      includeContent?: boolean;
      includeName?: boolean;
      caseSensitive?: boolean;
    }
  ): Promise<SearchResult[]> {
    const {
      minRelevance = 0.1,
      maxResults = 100,
      includeContent = true,
      includeName = true,
      caseSensitive = false
    } = filters;

    let results = await this.searchWithRelevance(query, topics);

    // Apply filters
    results = results.filter(result => result.relevance >= minRelevance);

    // Limit results
    if (maxResults > 0) {
      results = results.slice(0, maxResults);
    }

    return results;
  }

  /**
   * Search by category/tag (if topics had categories)
   */
  public async searchByCategory(category: string, topics: Topic[]): Promise<Topic[]> {
    // This is a placeholder for category-based search
    // In a real implementation, topics would have categories/tags
    return topics.filter(topic => 
      topic.name.toLowerCase().includes(category.toLowerCase()) ||
      topic.content.toLowerCase().includes(category.toLowerCase())
    );
  }

  /**
   * Get search suggestions based on partial query
   */
  public async getSearchSuggestions(partialQuery: string, topics: Topic[], limit: number = 5): Promise<string[]> {
    if (!partialQuery.trim()) {
      return [];
    }

    const suggestions = new Set<string>();
    const query = partialQuery.toLowerCase();

    for (const topic of topics) {
      // Extract words from topic name and content
      const words = this.extractWords(topic.name + ' ' + topic.content);
      
      for (const word of words) {
        if (word.toLowerCase().startsWith(query) && word.length > partialQuery.length) {
          suggestions.add(word);
        }
      }

      if (suggestions.size >= limit) {
        break;
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Highlight search terms in text
   */
  public highlightSearchTerms(text: string, searchTerms: string[]): string {
    let highlightedText = text;
    
    for (const term of searchTerms) {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    }

    return highlightedText;
  }

  /**
   * Private helper methods
   */

  private preprocessQuery(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 0)
      .filter(term => !this.isStopWord(term));
  }

  private calculateRelevance(searchTerms: string[], topic: Topic): {
    score: number;
    matchedFields: string[];
  } {
    let score = 0;
    const matchedFields: string[] = [];

    const nameWords = this.extractWords(topic.name);
    const contentWords = this.extractWords(topic.content);

    for (const term of searchTerms) {
      // Exact match in name (highest weight)
      if (topic.name.toLowerCase().includes(term)) {
        score += 10;
        if (!matchedFields.includes('name')) {
          matchedFields.push('name');
        }
      }

      // Word match in name
      if (nameWords.some(word => word.toLowerCase() === term)) {
        score += 8;
        if (!matchedFields.includes('name')) {
          matchedFields.push('name');
        }
      }

      // Partial match in name
      if (nameWords.some(word => word.toLowerCase().includes(term))) {
        score += 5;
        if (!matchedFields.includes('name')) {
          matchedFields.push('name');
        }
      }

      // Exact match in content
      if (topic.content.toLowerCase().includes(term)) {
        score += 3;
        if (!matchedFields.includes('content')) {
          matchedFields.push('content');
        }
      }

      // Word match in content
      if (contentWords.some(word => word.toLowerCase() === term)) {
        score += 2;
        if (!matchedFields.includes('content')) {
          matchedFields.push('content');
        }
      }

      // Partial match in content
      if (contentWords.some(word => word.toLowerCase().includes(term))) {
        score += 1;
        if (!matchedFields.includes('content')) {
          matchedFields.push('content');
        }
      }
    }

    // Normalize score based on content length and number of search terms
    const normalizedScore = score / (searchTerms.length * Math.log(topic.content.length + 1));

    return {
      score: normalizedScore,
      matchedFields
    };
  }

  private calculateFuzzyRelevance(searchTerms: string[], topic: Topic, threshold: number): {
    score: number;
    matchedFields: string[];
  } {
    let score = 0;
    const matchedFields: string[] = [];

    const nameWords = this.extractWords(topic.name);
    const contentWords = this.extractWords(topic.content);

    for (const term of searchTerms) {
      // Check fuzzy matches in name
      for (const word of nameWords) {
        const similarity = this.calculateStringSimilarity(term, word.toLowerCase());
        if (similarity >= threshold) {
          score += similarity * 8;
          if (!matchedFields.includes('name')) {
            matchedFields.push('name');
          }
        }
      }

      // Check fuzzy matches in content
      for (const word of contentWords) {
        const similarity = this.calculateStringSimilarity(term, word.toLowerCase());
        if (similarity >= threshold) {
          score += similarity * 2;
          if (!matchedFields.includes('content')) {
            matchedFields.push('content');
          }
        }
      }
    }

    const normalizedScore = score / (searchTerms.length * Math.log(topic.content.length + 1));

    return {
      score: normalizedScore,
      matchedFields
    };
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 1;
    
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private generateSnippet(topic: Topic, searchTerms: string[]): string {
    const content = topic.content;
    const maxSnippetLength = 200;

    // Find the first occurrence of any search term
    let bestPosition = 0;
    let bestScore = 0;

    for (let i = 0; i < content.length - maxSnippetLength; i++) {
      const snippet = content.substring(i, i + maxSnippetLength);
      let score = 0;

      for (const term of searchTerms) {
        const occurrences = (snippet.toLowerCase().match(new RegExp(term, 'g')) || []).length;
        score += occurrences;
      }

      if (score > bestScore) {
        bestScore = score;
        bestPosition = i;
      }
    }

    let snippet = content.substring(bestPosition, bestPosition + maxSnippetLength);
    
    // Try to start and end at word boundaries
    if (bestPosition > 0) {
      const spaceIndex = snippet.indexOf(' ');
      if (spaceIndex > 0 && spaceIndex < 50) {
        snippet = snippet.substring(spaceIndex + 1);
      }
    }

    const lastSpaceIndex = snippet.lastIndexOf(' ');
    if (lastSpaceIndex > maxSnippetLength - 50) {
      snippet = snippet.substring(0, lastSpaceIndex);
    }

    return snippet.trim() + (bestPosition + snippet.length < content.length ? '...' : '');
  }

  private extractWords(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
      'had', 'what', 'said', 'each', 'which', 'their', 'time', 'if'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

