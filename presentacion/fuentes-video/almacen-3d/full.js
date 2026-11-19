const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('http://localhost:8770/index.html'); await p.waitForFunction(()=>window.listo, null, {timeout: 60000});
  const FPS = 30, N = Math.round(45 * FPS);
  const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','slow','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart', process.argv[2]]);
  for (let i = 0; i < N; i++) {
    await p.evaluate(t => window.render(t), i / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log('frame', i, '/', N, new Date().toISOString());
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('listo');
})();
