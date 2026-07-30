import fs from 'node:fs';
import path from 'node:path';
import spec from '../swagger';

fs.writeFileSync(path.join(__dirname, '../openapi.json'), JSON.stringify(spec, null, 2));
console.log(`Wrote openapi.json to ${path.join(__dirname, '../openapi.json')}`);