export class TemplateEngine {
  /**
   * Renders a template by replacing {{variable}} placeholders with actual values
   */
  static renderTemplate(template: string, variables: Record<string, any>): string {
    if (!template) return '';

    let rendered = template;

    // Replace all {{variable}} patterns
    Object.entries(variables || {}).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    });

    // Clean up any remaining unreplaced variables
    rendered = rendered.replace(/{{\\s*[^}]+\\s*}}/g, '');

    return rendered;
  }

  /**
   * Extracts all variable names from a template
   */
  static extractVariables(template: string): string[] {
    if (!template) return [];

    const matches = template.match(/{{\\s*([^}]+)\\s*}}/g) || [];
    return matches
      .map(match => match.replace(/{{\\s*([^}]+)\\s*}}/, '$1').trim())
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
  }

  /**
   * Validates that a template contains all required variables
   */
  static validateTemplate(template: string, requiredVariables: string[]): boolean {
    if (!template || !requiredVariables.length) return true;

    const templateVariables = this.extractVariables(template);
    return requiredVariables.every(variable => templateVariables.includes(variable));
  }

  /**
   * Validates template syntax (basic check for balanced braces)
   */
  static validateSyntax(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template) {
      return { valid: true, errors };
    }

    // Check for balanced braces
    let braceCount = 0;
    for (let i = 0; i < template.length; i++) {
      if (template[i] === '{' && template[i + 1] === '{') {
        braceCount++;
        i++; // Skip next brace
      } else if (template[i] === '}' && template[i + 1] === '}') {
        braceCount--;
        i++; // Skip next brace
      }
    }

    if (braceCount !== 0) {
      errors.push('Unbalanced template braces');
    }

    // Check for empty variables
    const emptyVariables = template.match(/{{\\s*}}/g);
    if (emptyVariables) {
      errors.push('Empty variable placeholders found');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generates a preview of the template with sample data
   */
  static generatePreview(template: string, sampleVariables?: Record<string, any>): string {
    const variables = this.extractVariables(template);
    const previewData: Record<string, any> = {};

    // Use provided sample data or generate defaults
    variables.forEach(variable => {
      if (sampleVariables && sampleVariables[variable] !== undefined) {
        previewData[variable] = sampleVariables[variable];
      } else {
        // Generate sample data based on variable name
        previewData[variable] = this.generateSampleValue(variable);
      }
    });

    return this.renderTemplate(template, previewData);
  }

  /**
   * Generates sample values for common variable names
   */
  private static generateSampleValue(variableName: string): string {
    const lowerName = variableName.toLowerCase();

    if (lowerName.includes('name')) return 'John Doe';
    if (lowerName.includes('email')) return 'john@example.com';
    if (lowerName.includes('phone')) return '+1234567890';
    if (lowerName.includes('date')) return new Date().toLocaleDateString();
    if (lowerName.includes('time')) return new Date().toLocaleTimeString();
    if (lowerName.includes('amount') || lowerName.includes('price')) return '$99.99';
    if (lowerName.includes('number') || lowerName.includes('id')) return '12345';
    if (lowerName.includes('url') || lowerName.includes('link')) return 'https://example.com';

    return `[${variableName}]`;
  }
}
