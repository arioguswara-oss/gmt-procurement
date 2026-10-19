'use strict';

const fs = require('fs');
const path = require('path');

process.chdir(__dirname);
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const entry = path.join(__dirname, 'apps', 'api', 'dist', 'main.js');
if (!fs.existsSync(entry)) {
  console.error('[GMT Procurement] API build belum ada:', entry);
  console.error('Jalankan: npm run build:api');
  process.exit(1);
}

require(entry);
