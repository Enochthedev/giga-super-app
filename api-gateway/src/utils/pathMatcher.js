/**
 * Advanced path matching utilities for service routing
 */

export class PathMatcher {
  constructor() {
    this.compiledPatterns = new Map();
  }

  /**
   * Compile a pattern into a regex for efficient matching
   * Supports wildcards (*) and parameter placeholders (:param)
   */
  compilePattern(pattern) {
    if (this.compiledPatterns.has(pattern)) {
      return this.compiledPatterns.get(pattern);
    }

    // Escape special regex characters except * and :
    let regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '(?<$1>[^/]+)');

    const compiled = {
      regex: new RegExp(`^${regexPattern}$`),
      hasParams: pattern.includes(':'),
      pattern,
    };

    this.compiledPatterns.set(pattern, compiled);
    return compiled;
  }

  /**
   * Match a path against a pattern and extract parameters
   */
  match(path, pattern) {
    const compiled = this.compilePattern(pattern);
    const match = path.match(compiled.regex);

    if (!match) {
      return null;
    }

    return {
      matched: true,
      params: match.groups || {},
      pattern: compiled.pattern,
    };
  }

  /**
   * Find the best matching pattern from a list
   * Returns the most specific match (fewer wildcards)
   */
  findBestMatch(path, patterns) {
    const matches = [];

    for (const pattern of patterns) {
      const match = this.match(path, pattern);
      if (match) {
        matches.push({
          ...match,
          specificity: this.calculateSpecificity(pattern),
        });
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // Sort by specificity (higher is more specific)
    matches.sort((a, b) => b.specificity - a.specificity);
    return matches[0];
  }

  /**
   * Calculate pattern specificity for ranking
   * More specific patterns have higher scores
   */
  calculateSpecificity(pattern) {
    let score = 0;

    // Base score for exact segments
    const segments = pattern.split('/').filter(s => s.length > 0);
    score += segments.length * 10;

    // Penalty for wildcards
    const wildcards = (pattern.match(/\*/g) || []).length;
    score -= wildcards * 5;

    // Penalty for parameters (less specific than exact matches)
    const params = (pattern.match(/:[a-zA-Z_][a-zA-Z0-9_]*/g) || []).length;
    score -= params * 2;

    return score;
  }
}

export const pathMatcher = new PathMatcher();
