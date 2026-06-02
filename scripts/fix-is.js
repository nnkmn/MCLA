const fs = require('fs');
const path = require('path');

/**
 * 修复 electron-vite 编译后代码中 is.dev 的问题
 * 将 const is = { dev: !electron.app.isPackaged } 
 * 改为安全的 getter 形式
 */

const files = [
  path.join(__dirname, '../out/main/index.js'),
  path.join(__dirname, '../out/preload/index.js')
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`Skipping (not found): ${file}`);
    return;
  }

  let content = fs.readFileSync(file, 'utf8');
  
  // 匹配 const is = { dev: !electron.app.isPackaged }
  // 允许空格和换行的变化
  const pattern = /(const is\s*=\s*\{[^}]*dev:\s*!electron\.app\.isPackaged[^}]*\})/;
  
  if (pattern.test(content)) {
    const replacement = `const is = {
  get dev() {
    return electron?.app?.isPackaged === false;
  }
}`;
    
    content = content.replace(pattern, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`Pattern not found (already fixed?): ${file}`);
  }
});

console.log('postbuild fix complete');
