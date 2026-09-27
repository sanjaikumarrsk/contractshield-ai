import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(projectRoot, 'dist', 'index.html');
const fallbackPath = resolve(projectRoot, 'dist', '404.html');

await access(indexPath, constants.R_OK);
await copyFile(indexPath, fallbackPath);
