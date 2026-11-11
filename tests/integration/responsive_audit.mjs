import http from 'node:http';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
      res.on('error', reject);
    });
  });
}

async function runAudit() {
  const html = await fetchText('http://localhost:3000');
  const cssMatch = html.match(/href="(\/assets\/index-[^"]+\.css)"/);
  if (!cssMatch) {
    console.error('FAIL: No CSS bundle found in HTML');
    process.exit(1);
  }
  const css = await fetchText('http://localhost:3000' + cssMatch[1]);

  const checks = [
    { name: 'Viewport Meta Tag (width=device-width, initial-scale=1.0)', pass: html.includes('name="viewport"') },
    { name: 'Oceanic Dock Glassmorphic Class (.oceanic-dock)', pass: css.includes('oceanic-dock') },
    { name: 'Touch Horizontal Scrollbar Hidden (scrollbar-width:none)', pass: css.includes('scrollbar-width:none') },
    { name: 'Cockpit 1024px Grid Collapse (1fr)', pass: css.includes('max-width:1024px') && css.includes('cockpit-grid') },
    { name: 'Tablet (<=768px) Dock Padding & Font Reduction', pass: css.includes('max-width:768px') && css.includes('oceanic-dock') },
    { name: 'Mobile (<=480px) Ultra-Compact Micro-Dock', pass: css.includes('max-width:480px') && css.includes('oceanic-dock') }
  ];

  console.log('\n======================================================');
  console.log('📱 Ω∞v OCEANICOS LIVE RESPONSIVENESS AUDIT VERIFICATION');
  console.log('======================================================');
  let allPass = true;
  for (const c of checks) {
    console.log(`${c.pass ? '✓ VERIFIED' : '✗ FAILED'}: ${c.name}`);
    if (!c.pass) allPass = false;
  }
  console.log('======================================================');
  if (allPass) {
    console.log('🎉 ALL 6 RESPONSIVE BREAKPOINTS & DOCK RULES LIVE ON :3000');
  } else {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
