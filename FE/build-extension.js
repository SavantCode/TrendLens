import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Chrome Extension Build Process...\n');

// Step 1: Clean dist directory
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
  console.log('✅ Cleaned dist directory');
}
fs.mkdirSync(distDir, { recursive: true });

// Step 2: Compile TypeScript files (background, content, utils)
try {
  console.log('📝 Compiling TypeScript files...');
  // This command will use your tsconfig.json to compile all specified TS files
  // into the 'dist' directory, maintaining their relative paths.
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation completed');
} catch (error) {
  console.error('❌ TypeScript compilation failed:', error.message);
  process.exit(1);
}

// Step 3: Build React popup with Vite
try {
  console.log('⚛️  Building React popup with Vite...');
  // Vite is configured to build directly into 'dist/popup' based on your build log.
  // So, we just run the build command. No need for manual file moving afterwards.
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✅ React popup built with Vite (outputted directly to dist/popup/)');
} catch (error) {
  console.error('❌ React popup build failed:', error.message);
  process.exit(1);
}

// Step 4: Copy manifest.json
console.log('📋 Copying manifest.json...');
fs.copyFileSync('manifest.json', path.join(distDir, 'manifest.json'));
console.log('✅ Copied manifest.json');

// Step 5: Copy content CSS files
console.log('🎨 Copying content CSS files...');
const contentDir = path.join(distDir, 'content');
if (!fs.existsSync(contentDir)) {
  fs.mkdirSync(contentDir, { recursive: true });
}
const overlayCssSrc = 'content/overlay.css';
const overlayCssDest = path.join(contentDir, 'overlay.css');
if (fs.existsSync(overlayCssSrc)) {
  fs.copyFileSync(overlayCssSrc, overlayCssDest);
  console.log(`✅ Copied ${overlayCssSrc}`);
} else {
  console.warn(`⚠️ Warning: ${overlayCssSrc} not found. Ensure it exists at the project root.`);
}

// NEW STEP: Copy JavaScript libraries (e.g., html2canvas)
// This is the crucial missing step from the previous version you provided.
console.log('📚 Copying JavaScript libraries...');
const libDir = path.join(distDir, 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}
const html2canvasSrc = 'lib/html2canvas.min.js'; // Assumes you place it here in your source 'lib' folder
const html2canvasDest = path.join(libDir, 'html2canvas.min.js');
if (fs.existsSync(html2canvasSrc)) {
  fs.copyFileSync(html2canvasSrc, html2canvasDest);
  console.log(`✅ Copied ${html2canvasSrc}`);
} else {
  console.warn(`⚠️ Warning: ${html2canvasSrc} not found. Please download html2canvas.min.js and place it in a 'lib/' folder at the project root.`);
}


// Step 6: Copy public assets (icons) - Renumbered from 6 to 7 due to new step
console.log('🖼️  Copying public assets (icons)...');
const iconsDir = path.join(distDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
const iconSizes = ['16', '32', '48', '128'];
iconSizes.forEach(size => {
  const iconSrc = `icons/icon${size}.png`; // Assumes icons are in a 'icons' folder at project root
  const iconDest = path.join(iconsDir, `icon${size}.png`);
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, iconDest);
    console.log(`✅ Copied ${iconSrc}`);
  } else {
    console.warn(`⚠️ Warning: ${iconSrc} not found. Please ensure icons are in a 'icons/' folder at the project root.`);
  }
});

// Step 7: Verify build output - Renumbered from 7 to 8
console.log('\n📁 Verifying build output...');
const expectedFiles = [
  'manifest.json',
  'background.js',
  'content/overlay.js',
  'content/overlay.css',
  'content/capture.js',
  'content/geminiAnalyzer.js',
  'utils/drawAnnotations.js',
  'lib/html2canvas.min.js' // Added html2canvas to expected files
];

// Add expected icon files to verification list
iconSizes.forEach(size => {
  expectedFiles.push(`icons/icon${size}.png`);
});

let missingFiles = [];
expectedFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
  }
});

// Check for Vite's bundled JS/CSS in popup folder based on your build log
const popupDistDir = path.join(distDir, 'popup');
const popupFiles = fs.readdirSync(popupDistDir);

const hasViteHtml = popupFiles.includes('index.html');
const hasViteJsBundle = popupFiles.includes('popup.js'); // Based on your build log
const hasViteCssBundle = popupFiles.includes('index.css'); // Based on your build log


if (!hasViteHtml) {
    missingFiles.push('Vite HTML bundle (index.html) in dist/popup/');
}
if (!hasViteJsBundle) {
    missingFiles.push('Vite JS bundle (popup.js) in dist/popup/');
}
if (!hasViteCssBundle) {
    missingFiles.push('Vite CSS bundle (index.css) in dist/popup/');
}


if (missingFiles.length > 0) {
  console.error('❌ Missing files in build output:', missingFiles);
  process.exit(1);
}

console.log('✅ All expected files present (including Vite bundles)');

// Step 7.5: Clean up unwanted files - Renumbered from 7.5 to 8.5
console.log('🧹 Cleaning up unwanted files...');
const unwantedFiles = ['.DS_Store', 'tsconfig.tsbuildinfo'];
function removeUnwantedFiles(dir) {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      removeUnwantedFiles(itemPath);
    } else if (unwantedFiles.includes(item)) {
      fs.unlinkSync(itemPath);
      console.log(`   Removed: ${path.relative(distDir, itemPath)}`);
    }
  });
}
removeUnwantedFiles(distDir);

// Step 8: Display final structure - Renumbered from 8 to 9
console.log('\n📂 Final extension structure:');
function displayStructure(dir, prefix = '') {
  const items = fs.readdirSync(dir);
  items.forEach((item, index) => {
    const itemPath = path.join(dir, item);
    const isLast = index === items.length - 1;
    const stat = fs.statSync(itemPath);
    const relativePath = path.relative(distDir, itemPath);
    
    if (stat.isDirectory()) {
      console.log(`${prefix}${isLast ? '└── ' : '├── '}${item}/`);
      displayStructure(itemPath, prefix + (isLast ? '    ' : '│   '));
    } else {
      console.log(`${prefix}${isLast ? '└── ' : '├── '}${item}`);
    }
  });
}

displayStructure(distDir);

console.log('\n🎉 Chrome Extension Build Complete!');
console.log('📁 Extension ready in dist/ folder');
console.log('🔧 Load the dist/ folder in Chrome as an unpacked extension');
console.log('   chrome://extensions → Developer mode → Load unpacked → Select dist/');
