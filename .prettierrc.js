export default {
  // Basic formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  quoteProps: 'as-needed',

  // Indentation
  tabWidth: 2,
  useTabs: false,

  // Line length
  printWidth: 100,

  // Brackets and spacing
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',

  // End of line
  endOfLine: 'lf',

  // Embedded languages
  embeddedLanguageFormatting: 'auto',

  // HTML/JSX specific (for documentation)
  htmlWhitespaceSensitivity: 'css',

  // Prose wrapping (for markdown)
  proseWrap: 'preserve',

  // File-specific overrides
  overrides: [
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2,
      },
    },
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      files: '*.yml',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      files: '*.yaml',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      files: 'supabase/functions/**/*.ts',
      options: {
        printWidth: 90, // Slightly shorter for edge functions
        singleQuote: true,
        semi: true,
      },
    },
  ],
};
