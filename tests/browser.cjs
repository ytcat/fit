// npm install --no-save playwright@1.51.1 && npx playwright install chromium --only-shell
// Optional: BROWSER_EXECUTABLE=/path/to/chromium node tests/browser.cjs
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const server=http.createServer((req,res)=>{
  let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
  const type={'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html'};
  try {res.setHeader('Content-Type',type[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}
  catch {res.statusCode=404;res.end();}
}).listen(0,'127.0.0.1');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,
    args:['--no-sandbox','--enable-unsafe-swiftshader']});
  try {
    for(const [width,height] of [[1100,950],[393,852]]) {
      const page=await browser.newPage({viewport:{width,height}}),errors=[];
      page.setDefaultTimeout(10000);
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.waitForFunction(()=>window.app?.engine?.coach);
      await page.evaluate(()=>{app.engine.isPlaying=false;app.engine.animTime=0;app.engine.coach.update(0,'jab','one_two')});
      await page.screenshot({path:`/tmp/lion-coach-${width}.png`});
      for(const view of ['camFront','camSide','camBack']) {
        await page.evaluate(id=>document.getElementById(id).click(),view);
        for(const technique of ['jab','cross','hook','uppercut','slip','rear_hook','rear_uppercut','roll','step','combo']) {
          await page.evaluate(t=>document.querySelector(`[data-technique="${t}"]`).click(),technique);
          await page.evaluate(()=>{app.engine.isPlaying=false;app.engine.animTime=.57;app.engine.coach.update(.57,app.engine.technique,app.engine.currentAnim)});
        }
      }
      console.log('Finished motion checks',width);
      await page.evaluate(()=>document.getElementById('camSide').click());
      await page.screenshot({path:`/tmp/lion-coach-side-${width}.png`});
      await page.evaluate(()=>{document.getElementById('defaultCoach').click();app.engine.isPlaying=true;});
      await page.evaluate(()=>document.getElementById('motionPause').click());
      const before=await page.evaluate(()=>app.engine.animTime);await page.waitForTimeout(100);
      assert.equal(await page.evaluate(()=>app.engine.animTime),before,'motion freeze');
      await page.evaluate(()=>document.getElementById('langHE').click());assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
      await page.evaluate(()=>{document.getElementById('langRU').click();document.getElementById('langEN').click()});
      assert.deepEqual(errors,[]);
      console.log('PASS browser',width+'x'+height,'all techniques and camera views, motion freeze, three languages');
      await page.close();
    }
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exit(1)});
