// 프로젝트 갤럭시 세 화면 시험: node survival/test/galaxy_views.js (375x667 · 390x844 · 360x640 — 가로 넘침 · 아래 잘림 · 누름 크기 · 스크린샷은 $TEMP/gxs)
const path=require('path');
const { session, open, measure, VPS } = require('./board_ui_lib.js');
const SH=process.env.TEMP+'/gxs'; require('fs').mkdirSync(SH,{recursive:true});
session('갤럭시 3화면', async ({browser, base, ok}) => {
  for (const vp of VPS) {
    const { page, errs, close } = await open(browser, base, 'galaxy', 'seed=5&me=0&n=5', vp);
    const tag=`${vp.w}x${vp.h}`; const seen=new Set();
    for (let k=0;k<80;k++){
      const s = await page.evaluate(()=>{const h=window.__h,V=h.view();return {over:!!V.over,mine:V.needs.includes(h.ME),phase:V.phase,round:V.round,ow:V.ow}});
      const m = await measure(page);
      ok(!m.docx&&!m.sx&&!m.outR&&!m.outL, `${tag} #${k} 가로 넘침 ${m.who}`);
      ok(m.sy<=2&&m.outB<=2, `${tag} #${k} 아래 잘림 sy ${m.sy} outB ${m.outB} ${m.who} stage ${m.stageH} ${s.phase}`);
      ok(!m.bad, `${tag} 이상한 글`);
      const sz = await page.evaluate(()=>[...document.querySelectorAll('.gx-s.go, [data-a]:not([disabled]), .gx-q')].map(e=>{const b=e.getBoundingClientRect();return [e.className||e.dataset.a, Math.round(b.width), Math.round(b.height)]}).filter(x=>x[1]<30||x[2]<30));
      ok(!sz.length, `${tag} #${k} 작은 누름 ${JSON.stringify(sz.slice(0,3))}`);
      const key=s.phase+(s.mine?'-me':'')+(s.round>8?'-late':'');
      if(!seen.has(key)){seen.add(key); await page.screenshot({path:path.join(SH,`gx-${tag}-${key}.png`)});}
      if(s.over)break;
      if(!s.mine){ const a=await page.evaluate(()=>window.__h.next()); if(!a){ok(false,`${tag} 멈춤 ${s.phase}`);break;} continue; }
      if(s.phase==='obs'){ if(s.round%3===0){ if(s.ow<0) await page.locator('.gx-s.go').nth(3).click(); await page.locator('[data-q]').nth(2).click(); await page.screenshot({path:path.join(SH,`gx-${tag}-obs-sel.png`)}); await page.locator('[data-a=obs]').click(); } else await page.locator('[data-a=skip]').click(); }
      else if(s.phase==='pick'){ await page.locator('.gx-s.go').nth(5).click(); if(!seen.has('picksel')){seen.add('picksel'); await page.screenshot({path:path.join(SH,`gx-${tag}-pick-sel.png`)});} await page.locator('[data-a=go]').click(); }
    }
    ok(errs.length===0, `${tag} 오류 ${errs.join('|')}`);
    await close();
  }
});
