const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function getDirectorySize(directory) {
  let totalSize = 0;
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      totalSize += getDirectorySize(filePath);
    } else {
      totalSize += stats.size;
    }
  }
  
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

console.log('Analyzing dependencies...');

exec('npm list --prod --json', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  
  const dependencies = JSON.parse(stdout).dependencies;
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  
  const dependencySizes = Object.keys(dependencies).map(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    const size = getDirectorySize(depPath);
    return { name: dep, size };
  });
  
  dependencySizes.sort((a, b) => b.size - a.size);
  
  console.log('Dependency sizes:');
  dependencySizes.forEach(dep => {
    console.log(`${dep.name}: ${formatBytes(dep.size)}`);
  });
  
  const totalSize = dependencySizes.reduce((acc, dep) => acc + dep.size, 0);
  console.log(`\nTotal size of dependencies: ${formatBytes(totalSize)}`);
});