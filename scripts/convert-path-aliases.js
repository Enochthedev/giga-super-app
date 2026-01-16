#!/usr/bin/env node

/**
 * Convert @/ path aliases to relative imports
 * Usage: node scripts/convert-path-aliases.js <service-name>
 */

const fs = require('fs');
const path = require('path');

const serviceName = process.argv[2];

if (!serviceName) {
  console.error('Usage: node scripts/convert-path-aliases.js <service-name>');
  process.exit(1);
}

const serviceDir = path.join(process.cwd(), serviceName, 'src');

if (!fs.existsSync(serviceDir)) {
  console.error(`Service directory not found: ${serviceDir}`);
  process.exit(1);
}

function getAllTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function convertImports(filePath, srcDir) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileDir = path.dirname(filePath);

  // Match imports like: from '@/something' or from "@/something"
  const importRegex = /from ['"]@\/([^'"]+)['"]/g;

  let match;
  let modified = false;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const absoluteImportPath = path.join(srcDir, importPath);

    // Calculate relative path from current file to the import
    let relativePath = path.relative(fileDir, absoluteImportPath);

    // Ensure it starts with ./ or ../
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }

    // Replace backslashes with forward slashes (for Windows)
    relativePath = relativePath.replace(/\\/g, '/');

    console.log(`  ${match[0]} -> from '${relativePath}'`);
    modified = true;
  }

  if (modified) {
    // Do the actual replacement
    content = content.replace(importRegex, (match, importPath) => {
      const absoluteImportPath = path.join(srcDir, importPath);
      let relativePath = path.relative(fileDir, absoluteImportPath);

      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }

      relativePath = relativePath.replace(/\\/g, '/');

      return `from '${relativePath}'`;
    });

    fs.writeFileSync(filePath, content);
    return true;
  }

  return false;
}

console.log(`Converting @/ imports in ${serviceName}...`);
console.log('');

const files = getAllTsFiles(serviceDir);
let modifiedCount = 0;

for (const file of files) {
  const relativePath = path.relative(process.cwd(), file);
  const hasAliases = fs.readFileSync(file, 'utf8').includes("from '@/");

  if (hasAliases) {
    console.log(`Processing: ${relativePath}`);
    if (convertImports(file, serviceDir)) {
      modifiedCount++;
    }
    console.log('');
  }
}

console.log(`Done! Modified ${modifiedCount} files.`);
