// BIGOLI VICTORIA — digital signage + graphics.
// Menu screens use the real Bigoli menu panels cropped from assets/Bigoli file.pdf
// (page "Our Menu") and the "Pick a pasta shape" board. The order-status screen
// and wayfinding signs are drawn on canvas in the Bigoli palette.
import * as THREE from 'three';

const RED = '#cc1305', GREEN = '#376a4a', CREAM = '#e2ddc9', INK = '#16181a';
const FONT = "'Oswald', 'Arial Narrow', Impact, sans-serif";

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const paint = () => {
    const g = c.getContext('2d');
    g.globalAlpha = 1; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.clearRect(0, 0, w, h);
    draw(g, w, h); t.needsUpdate = true;
  };
  paint(); t.userData.repaint = paint;
  if (document.fonts) document.fonts.load(`600 40px Oswald`).then(paint).catch(() => {});
  return t;
}

// A lit display: dark glass with the image as emissive content
export function screenMaterial(map, intensity = 1.0) {
  return new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: intensity, roughness: 0.18, metalness: 0.0 });
}

export function buildSignage(loadTex) {
  const menus = ['menu_1.jpg', 'menu_2.jpg', 'menu_3.jpg', 'menu_4.jpg', 'menu_shapes.jpg'].map(f => loadTex('textures/' + f));
  const logo = new Image(); logo.src = 'textures/logo_red.jpg';
  const wordmark = new Image(); wordmark.src = 'textures/wordmark.jpg';   // full BIGOLI · FRESH PASTA lockup

  const orderStatus = canvasTexture(1920, 1080, (g, w, h) => {
    g.fillStyle = '#101214'; g.fillRect(0, 0, w, h);
    g.fillStyle = RED; g.fillRect(0, 0, w, 150);
    if (wordmark.complete && wordmark.naturalWidth) g.drawImage(wordmark, 0, 0, 512, 225, 40, 12, 287, 126);   // whole wordmark, nothing cropped
    g.fillStyle = '#fff'; g.font = `600 64px ${FONT}`; g.textBaseline = 'middle';
    g.fillText('ORDER STATUS', 380, 78);
    g.font = `500 38px ${FONT}`; g.textAlign = 'right'; g.fillText('12:41', w - 50, 78); g.textAlign = 'left';
    // two lists, one row per order: "ORDER 05 — PREPARING" / "ORDER 07 — READY FOR COLLECTION"
    const colW = (w - 150) / 2;
    const col = (x, title, bg, fg, items, status, ready) => {
      g.fillStyle = bg; g.fillRect(x, 200, colW, h - 250);
      g.fillStyle = fg; g.font = `600 64px ${FONT}`; g.fillText(title, x + 50, 275);
      g.fillRect(x + 50, 330, colW - 100, 4);
      items.forEach((n, i) => {
        const y = 430 + i * 190;
        g.fillStyle = fg; g.font = `600 120px ${FONT}`; g.fillText(`ORDER ${n}`, x + 50, y);
        g.globalAlpha = 0.8; g.font = `500 44px ${FONT}`; g.fillText(status, x + 50, y + 88); g.globalAlpha = 1;
      });
    };
    col(50, 'PREPARING', '#23272b', '#f2efe6', ['05', '06', '08'], 'PREPARING', false);
    col(100 + colW, 'READY FOR COLLECTION', GREEN, '#ffffff', ['07', '03'], 'READY FOR COLLECTION', true);
    g.fillStyle = '#8b9096'; g.font = `400 28px ${FONT}`; g.fillText('Straight up. Fresh pasta. Made with flavour. Always.', 50, h - 24);
  });
  wordmark.addEventListener('load', () => orderStatus.userData.repaint());

  const lightbox = (text, bg, fg, w = 1200, h = 300, sub) => canvasTexture(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 ${sub ? h * 0.42 : h * 0.55}px ${FONT}`; g.fillText(text, w / 2, sub ? h * 0.4 : h / 2 + 4);
    if (sub) { g.globalAlpha = 0.85; g.font = `400 ${h * 0.17}px ${FONT}`; g.fillText(sub, w / 2, h * 0.8); }
  });
  const orderHere = lightbox('ORDER HERE', RED, '#fff', 1200, 300, 'PICK YOUR SHAPE · PICK YOUR SAUCE');
  const collectHere = lightbox('COLLECT HERE', GREEN, '#fff', 1200, 300, 'WATCH THE SCREEN FOR YOUR NUMBER');
  const entrance = lightbox('ENTRANCE', 'rgba(0,0,0,0)', '#ffffff', 800, 160);
  const exit = lightbox('EXIT', 'rgba(0,0,0,0)', '#ffffff', 800, 160);
  const pastaLab = lightbox('FRESH PASTA MADE HERE DAILY', 'rgba(0,0,0,0)', '#ffffff', 2000, 160);
  for (const t of [entrance, exit, pastaLab]) t.premultiplyAlpha = false;
  const deliveryHere = lightbox('DELIVERY PICK-UP', '#2b5fa8', '#fff', 1200, 300, 'UBER EATS · DELIVEROO · JUST EAT RIDERS');
  const waste = lightbox('TRAYS · RECYCLING · WASTE', INK, '#fff', 1600, 240, 'THANK YOU — GRAZIE!');
  const doorSigns = { ENTRANCE: entrance, EXIT: exit };
  const doorSign = (text) => {
    if (!doorSigns[text]) { const t = lightbox(text, 'rgba(0,0,0,0)', '#ffffff', 1000, 160); t.premultiplyAlpha = false; doorSigns[text] = t; }
    return doorSigns[text];
  };
  return { menus, orderStatus, orderHere, collectHere, deliveryHere, waste, entrance, exit, pastaLab, doorSign };
}
