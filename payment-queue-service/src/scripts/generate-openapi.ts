import fs from 'fs';
import path from 'path';
import { swaggerSpec } from '../config/swagger';

const outputPath = path.join(process.cwd(), 'openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log(`OpenAPI spec generated at ${outputPath}`);
