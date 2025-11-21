/**
 * Generador de Icono de Wallet para APP Presupuesto
 * Crea un logo moderno de wallet y todos los tamaños de iconos PWA
 */

const fs = require('fs');
const path = require('path');

// Función para crear SVG del logo de wallet
function createWalletSVG(size = 512) {
  const walletColor = '#0d6efd'; // Color azul del tema
  const accentColor = '#198754'; // Color verde para acento (dinero)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="walletGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${walletColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0a58ca;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${accentColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#146c43;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Fondo circular -->
  <circle cx="256" cy="256" r="240" fill="url(#walletGradient)"/>

  <!-- Cuerpo de la billetera -->
  <rect x="96" y="180" width="320" height="220" rx="20" fill="#ffffff" opacity="0.95"/>

  <!-- Bolsillo superior de la billetera -->
  <path d="M 96 240 L 96 200 Q 96 180 116 180 L 396 180 Q 416 180 416 200 L 416 240 Z"
        fill="url(#cardGradient)" opacity="0.9"/>

  <!-- Tarjeta saliendo de la billetera -->
  <rect x="140" y="140" width="240" height="140" rx="12" fill="url(#cardGradient)"/>

  <!-- Chip de la tarjeta -->
  <rect x="170" y="170" width="50" height="40" rx="6" fill="#ffd700" opacity="0.8"/>

  <!-- Líneas de la tarjeta (simula banda magnética o detalles) -->
  <line x1="180" y1="230" x2="360" y2="230" stroke="#ffffff" stroke-width="4" opacity="0.6"/>
  <line x1="180" y1="250" x2="300" y2="250" stroke="#ffffff" stroke-width="4" opacity="0.6"/>

  <!-- Símbolo de dinero en la billetera -->
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="80" font-weight="bold"
        text-anchor="middle" fill="${walletColor}">$</text>

  <!-- Detalles decorativos - círculos pequeños en esquinas -->
  <circle cx="130" cy="365" r="8" fill="${accentColor}" opacity="0.6"/>
  <circle cx="382" cy="365" r="8" fill="${accentColor}" opacity="0.6"/>
</svg>`;
}

// Función para crear PNG desde SVG usando canvas (requiere node-canvas)
async function createPNGFromSVG(svgContent, outputPath, size) {
  // Para simplificar, guardaremos el SVG y usaremos sharp si está disponible
  try {
    const sharp = require('sharp');
    const svgBuffer = Buffer.from(svgContent);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Creado: ${path.basename(outputPath)} (${size}x${size})`);
  } catch (error) {
    // Si sharp no está disponible, guardar como SVG
    console.log(`⚠ Sharp no disponible, guardando SVG: ${outputPath}`);
    fs.writeFileSync(outputPath.replace('.png', '.svg'), svgContent);
  }
}

// Tamaños de iconos PWA requeridos
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateAllIcons() {
  const publicDir = path.join(__dirname, '../frontend/public');
  const iconsDir = path.join(publicDir, 'icons');

  // Crear directorio de iconos si no existe
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('🎨 Generando iconos de wallet para APP Presupuesto...\n');

  // Generar SVG principal
  const svgContent = createWalletSVG(512);
  const svgPath = path.join(publicDir, 'wallet-icon.svg');
  fs.writeFileSync(svgPath, svgContent);
  console.log(`✓ SVG principal creado: wallet-icon.svg\n`);

  // Intentar generar PNGs
  console.log('Generando iconos PNG en múltiples tamaños...\n');

  for (const size of iconSizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await createPNGFromSVG(svgContent, outputPath, size);
  }

  // Crear favicon.ico (usaremos el de 32x32)
  const faviconPath = path.join(publicDir, 'favicon.svg');
  const faviconSVG = createWalletSVG(32);
  fs.writeFileSync(faviconPath, faviconSVG);
  console.log(`\n✓ Favicon SVG creado: favicon.svg`);

  console.log('\n✅ ¡Generación de iconos completada!');
  console.log('\n📝 Notas:');
  console.log('   - Si sharp está instalado, se generaron PNGs');
  console.log('   - Si no, se generaron SVGs (navegadores modernos los soportan)');
  console.log('   - Ejecuta "npm install sharp" en frontend/ para generar PNGs\n');
}

// Ejecutar generación
generateAllIcons().catch(console.error);
