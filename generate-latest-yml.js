const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const packageJson = require('./package.json');

// Get the version from package.json
const version = packageJson.version;
const outputDir = path.join(__dirname, 'out', 'make', 'squirrel.windows', 'x64');

// Find the installer file
let installerFile = null;
try {
  const files = fs.readdirSync(outputDir);
  installerFile = files.find(file => 
    file.toLowerCase().includes('setup.exe') && 
    file.toLowerCase().includes(version.toLowerCase())
  );
} catch (err) {
  console.error('Error finding installer directory:', err);
  process.exit(1);
}

if (!installerFile) {
  console.error(`Could not find installer file for version ${version}. Make sure you've built the app first.`);
  process.exit(1);
}

const fileName = installerFile; // Use the actual filename
const filePath = path.join(outputDir, fileName);

console.log(`Found installer: ${filePath}`);

// Calculate SHA512 hash of the file
const fileBuffer = fs.readFileSync(filePath);
const hashSum = crypto.createHash('sha512');
hashSum.update(fileBuffer);
const sha512 = hashSum.digest('hex').toLowerCase(); // Ensure lowercase

// Get file size
const stats = fs.statSync(filePath);
const fileSize = stats.size;

// Create latest.yml content
const latestYml = `version: ${version}
files:
  - url: ${fileName}
    sha512: ${sha512}
    size: ${fileSize}
path: ${fileName}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'`;

// Write to latest.yml
fs.writeFileSync('latest.yml', latestYml);
console.log(`latest.yml generated for ${version}`);
console.log(`SHA512 hash: ${sha512}`);
console.log(`File size: ${fileSize}`);