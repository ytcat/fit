const {chromium}=require('playwright'),fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});const p=await b.newPage({viewport:{width:760,height:300},deviceScaleFactor:2});
const svg=fs.readFileSync(process.argv[2],'utf8');const uri='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
await p.setContent(`<body style="margin:0;background:#0a0e14;display:flex;gap:28px;align-items:center;padding:20px;font-family:system-ui;color:#9aa7bb">
${[256,128,64,40,32,16].map(s=>`<div style="text-align:center"><img src="${uri}" width="${s}" height="${s}"><div style="font-size:11px">${s}px</div></div>`).join('')}
<div style="background:#f3f6fb;padding:8px;border-radius:10px"><img src="${uri}" width="64" height="64"></div></body>`);
await p.waitForTimeout(300);await p.screenshot({path:process.argv[3]});await b.close();})();
