import fs from 'node:fs'
import path from 'node:path'

// 4399 版固定 1280×720 设计稿：game.html 是原游戏，index.html 只负责等比缩放。
// 这样窗口缩放/浏览器缩放时，UI 的相对位置与尺寸保持不变，不会重新排版。
const dir = path.resolve('dist-4399')
const source = path.join(dir, 'index.html')
const game = path.join(dir, 'game.html')

const original = fs.readFileSync(source, 'utf8')
fs.writeFileSync(game, original, 'utf8')

const wrapper = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#0d1717" />
  <title>成王之路：元素远征</title>
  <link rel="icon" type="image/svg+xml" href="./icon.svg" />
  <style>
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #0d1717; }
    #stage { position: fixed; inset: 0; overflow: hidden; }
    #game { position: absolute; left: 50%; top: 50%; width: 1280px; height: 720px; display: block; border: 0; background: #142123; transform-origin: center center; }
  </style>
</head>
<body>
  <div id="stage">
    <iframe id="game" src="./game.html" title="成王之路：元素远征" allow="autoplay; fullscreen" allowfullscreen></iframe>
  </div>
  <!-- 4399 广告 SDK；如商务提供带参数的完整地址，替换此处 src。 -->
  <script src="https://h.api.4399.com/h5mini-2.0/h5api-interface.php"></script>
  <script>
    (function () {
      var frame = document.getElementById('game');
      var DESIGN_W = 1280;
      var DESIGN_H = 720;
      function fit() {
        var scale = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
        frame.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
      }
      function focusGame() {
        try { frame.contentWindow.focus(); } catch (e) { /* ignore */ }
      }
      window.addEventListener('resize', fit);
      window.addEventListener('orientationchange', fit);
      window.addEventListener('pointerdown', focusGame);
      window.addEventListener('keydown', focusGame);
      frame.addEventListener('load', focusGame);

      // 游戏在内层 iframe 里，广告 SDK 必须在外层加载；这里做一次消息桥接。
      window.addEventListener('message', function (event) {
        if (!frame.contentWindow || event.source !== frame.contentWindow) return;
        var data = event.data || {};
        if (!data || data.source !== 'cwzl-game') return;
        if (data.type === 'rewarded-ad') {
          var reply = function (code, message) {
            try {
              event.source.postMessage({ source: 'cwzl-host', type: 'rewarded-ad-result', code: code, message: message }, '*');
            } catch (e) { /* ignore */ }
          };
          if (window.h5api && typeof window.h5api.playAd === 'function') {
            try {
              window.h5api.playAd(function (obj) {
                reply(obj && obj.code, obj && obj.message);
              });
            } catch (err) {
              reply(-1, String(err));
            }
          } else {
            reply(-1, '广告接口未加载');
          }
        } else if (data.type === 'interstitial-ad') {
          if (window.h5api && typeof window.h5api.playInterstitialAd === 'function') {
            try { window.h5api.playInterstitialAd(); } catch (e) { /* ignore */ }
          }
        }
      });

      fit();
    })();
  </script>
</body>
</html>
`

fs.writeFileSync(source, wrapper, 'utf8')
console.log('4399 fixed-stage wrapper written')
