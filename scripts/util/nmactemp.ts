import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function createTempFile(content = '') {
  // 1. Get the OS-specific temporary folder path
  const tempDir = tmpdir(); 
  
  // 2. Generate a secure, unique filename (similar to mktemp XXXXXX)
  const uniqueName = `tmp-${randomBytes(6).toString('hex')}.log`;
  const fullPath = join(tempDir, uniqueName);

  // 3. Write the file to disk
  await writeFile(fullPath, content, 'utf8');
  
  return fullPath;
}

// Usage
const myTempFile = await createTempFile('');
console.log(`${myTempFile}`);

