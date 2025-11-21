/**
 * Generar iconos PWA en múltiples tamaños usando Bootstrap Icons wallet
 */

const fs = require('fs');
const path = require('path');

function createWalletIcon(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d6efd;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0a58ca;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Fondo circular con gradiente -->
  <circle cx="256" cy="256" r="240" fill="url(#bgGradient${size})"/>

  <!-- Icono de wallet de Bootstrap Icons (bi-wallet2) -->
  <g transform="translate(106, 106) scale(18.75)">
    <path fill="#ffffff" fill-rule="evenodd" d="M12.136.326A1.5 1.5 0 0 1 14 1.78V3h.5A1.5 1.5 0 0 1 16 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 13.5v-9a1.5 1.5 0 0 1 1.432-1.499zM5.562 3H13V1.78a.5.5 0 0 0-.621-.484zM1.5 4a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5z"/>
  </g>
</svg>`;
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../frontend/public/icons');

console.log('🎨 Generando iconos PWA con Bootstrap Icons wallet...\n');

sizes.forEach(size => {
  const svgContent = createWalletIcon(size);
  const outputPath = path.join(iconsDir, `icon-${size}x${size}.svg`);

  fs.writeFileSync(outputPath, svgContent);
  console.log(`✓ Creado: icon-${size}x${size}.svg`);
});

console.log('\n✅ ¡Todos los iconos PWA generados correctamente!');
console.log('📱 Los navegadores modernos soportan SVG perfectamente.');
