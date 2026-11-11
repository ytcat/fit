// Rasterises GameAccessories.icon() thumbnails for every accessory: node qa/gotr-0002/icons.cjs out.png
const {chromium}=require('playwright'),A=require('../../game-accessories.js');
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});const p=await b.newPage({viewport:{width:600,height:140}});
await p.setContent('<body style="margin:0;background:#1a2230;display:flex;gap:16px;padding:20px">'+A.catalog.map(c=>'<figure style="margin:0;color:#ddd;font:11px sans-serif;text-align:center"><img width="80" height="80" src="'+A.icon(c)+'"><figcaption>'+c.names.en+'</figcaption></figure>').join('')+'</body>');
await p.screenshot({path:process.argv[2]||'icons.png'});await b.close();})();
