const fs = require('fs');
const path = require('path');

const dirs = [
  'd:/bysj/tob-contract-evidence-system/frontend/src/pages',
  'd:/bysj/tob-contract-evidence-system/frontend/src/components'
];

const replacements = [
  // Page Background
  {
    regex: /background:\s*"linear-gradient\(135deg,\s*#050816\s*0%,\s*#0b1230\s*45%,\s*#071a3a\s*100%\)"/g,
    replace: 'background: "linear-gradient(135deg, #f0f4f8 0%, #e0eaf5 45%, #d1e0f0 100%)"'
  },
  {
    regex: /background:\s*"linear-gradient\(135deg,\s*#0f172a\s*0%,\s*#1d4ed8\s*100%\)"/g,
    replace: 'background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)"'
  },
  // Grid Background
  {
    regex: /linear-gradient\(rgba\(99,102,241,0\.0[79]\)\s*1px,\s*transparent\s*1px\)/g,
    replace: 'linear-gradient(rgba(37,99,235,0.08) 1px, transparent 1px)'
  },
  // Card Backgrounds
  {
    regex: /background:\s*"rgba\(15,\s*23,\s*42,\s*0\.\d+\)"/g,
    replace: 'background: "rgba(255, 255, 255, 0.85)"'
  },
  {
    regex: /background:\s*"rgba\(30,\s*41,\s*59,\s*0\.\d+\)"/g,
    replace: 'background: "rgba(241, 245, 249, 0.8)"'
  },
  {
    regex: /background:\s*"rgba\(30,\s*41,\s*59,\s*0\.42\)"/g,
    replace: 'background: "rgba(241, 245, 249, 0.85)"'
  },
  // Text Colors
  {
    regex: /color:\s*"#f8fafc"/g,
    replace: 'color: "#1e293b"'
  },
  {
    regex: /color:\s*"#fff"/g,
    replace: 'color: "#1e293b"'
  },
  {
    regex: /color:\s*"#ffffff"/g,
    replace: 'color: "#1e293b"'
  },
  {
    regex: /color:\s*"#cbd5e1"/g,
    replace: 'color: "#475569"'
  },
  {
    regex: /color:\s*['"]#94a3b8['"]/g,
    replace: 'color: "#64748b"'
  },
  {
    regex: /color:\s*"rgba\(255,255,255,0\.8\)"/g,
    replace: 'color: "rgba(15,23,42,0.8)"'
  },
  {
    regex: /color:\s*"#bfdbfe"/g,
    replace: 'color: "#1e40af"'
  },
  {
    regex: /color:\s*"#e2e8f0"/g,
    replace: 'color: "#334155"'
  },
  // Borders
  {
    regex: /border:\s*"1px\s*solid\s*rgba\(148,\s*163,\s*184,\s*0\.2\)"/g,
    replace: 'border: "1px solid rgba(203, 213, 225, 0.6)"'
  },
  {
    regex: /border:\s*"1px\s*solid\s*rgba\(148,\s*163,\s*184,\s*0\.1\)"/g,
    replace: 'border: "1px solid rgba(203, 213, 225, 0.4)"'
  },
  {
    regex: /borderColor:\s*['"]#0f172a['"]/g,
    replace: 'borderColor: "#ffffff"'
  },
  // Echarts specific
  {
    regex: /textStyle:\s*\{\s*color:\s*'#f8fafc'\s*\}/g,
    replace: "textStyle: { color: '#1e293b' }"
  },
  // Dashboard Header Gradient
  {
    regex: /background:\s*"linear-gradient\(135deg,\s*#0f172a\s*0%,\s*#1e3a8a\s*50%,\s*#1d4ed8\s*100%\)"/g,
    replace: 'background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)"'
  },
  // AdminNavbar
  {
    regex: /background:\s*"linear-gradient\(90deg,\s*#0f172a\s*0%,\s*#1e3a8a\s*100%\)"/g,
    replace: 'background: "linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)"'
  },
  // Auditor banner background
  {
    regex: /background:\s*"linear-gradient\(135deg,\s*rgba\(30,\s*41,\s*59,\s*0\.92\)\s*0%,\s*rgba\(30,\s*64,\s*175,\s*0\.78\)\s*100%\)"/g,
    replace: 'background: "linear-gradient(135deg, rgba(219, 234, 254, 0.92) 0%, rgba(191, 219, 254, 0.78) 100%)"'
  },
  {
    regex: /color:\s*"#93c5fd"/g,
    replace: 'color: "#1d4ed8"'
  }
];

dirs.forEach(directory => {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const fullPath = path.join(directory, file);
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const r of replacements) {
        content = content.replace(r.regex, r.replace);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
      }
    }
  }
});
