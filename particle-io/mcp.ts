import type { VercelRequest, VercelResponse } from '@vercel/node';

const presets: Record<string, any> = {
  starryNight: { name: 'Starry Night', background: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)', particles: { count: 200, color: '#ffffff', size: [1, 3], speed: 0.3, type: 'star', twinkle: true } },
  ocean: { name: 'Calm Ocean', background: 'linear-gradient(to bottom, #1a3a52, #2d5a7b, #1e4d6b)', particles: { count: 80, color: '#87ceeb', size: [2, 6], speed: 0.8, type: 'wave' } },
  fireflies: { name: 'Fireflies', background: 'linear-gradient(to bottom, #1a1a2e, #16213e, #0f0f23)', particles: { count: 50, color: '#ffeb3b', size: [2, 5], speed: 0.5, type: 'glow', pulse: true } },
  sakura: { name: 'Cherry Blossoms', background: 'linear-gradient(to bottom, #fce4ec, #f8bbd9, #f48fb1)', particles: { count: 60, color: '#ff69b4', size: [8, 15], speed: 1.2, type: 'petal' } },
  snow: { name: 'Gentle Snow', background: 'linear-gradient(to bottom, #2c3e50, #4a6572, #232526)', particles: { count: 150, color: '#ffffff', size: [2, 5], speed: 1, type: 'snow' } },
  aurora: { name: 'Northern Lights', background: 'linear-gradient(to bottom, #0a0a1a, #1a1a3a, #0f0f2f)', particles: { count: 100, color: 'rainbow', size: [2, 4], speed: 0.4, type: 'aurora' } },
  rain: { name: 'Peaceful Rain', background: 'linear-gradient(to bottom, #373b44, #4286f4, #373b44)', particles: { count: 200, color: '#a8d8ea', size: [1, 3], speed: 8, type: 'rain' } },
  bubbles: { name: 'Floating Bubbles', background: 'linear-gradient(to bottom, #e0f7fa, #b2ebf2, #80deea)', particles: { count: 40, color: '#ffffff', size: [10, 30], speed: 0.6, type: 'bubble' } },
  galaxy: { name: 'Galaxy Spiral', background: 'radial-gradient(ellipse at center, #1a0a2e, #0d0015, #000000)', particles: { count: 300, color: 'multi', size: [1, 3], speed: 0.2, type: 'galaxy' } },
  spiral: { name: 'Spiral Bloom', background: 'radial-gradient(circle at center, #1b1f3b, #0f1226)', particles: { count: 220, color: '#f6d365', size: [1, 3], speed: 0.2, type: 'glow', pulse: true }, pattern: { type: 'spiral', turns: 3 } },
  ring: { name: 'Halo Ring', background: 'radial-gradient(circle at center, #0b132b, #1c2541)', particles: { count: 200, color: '#a1c4fd', size: [1, 3], speed: 0.2, type: 'star', twinkle: true }, pattern: { type: 'ring' } },
  heart: { name: 'Heart Bloom', background: 'linear-gradient(to bottom, #2b0f1f, #1a0b14)', particles: { count: 180, color: '#ff6b6b', size: [2, 4], speed: 0.2, type: 'glow', pulse: true }, pattern: { type: 'heart' } },
  wave: { name: 'Sine Wave', background: 'linear-gradient(to bottom, #0c2d48, #145374)', particles: { count: 160, color: '#7de2fc', size: [2, 4], speed: 0.2, type: 'wave' }, pattern: { type: 'wave', amplitude: 0.25, frequency: 2 } },
  mandala: { name: 'Mandala Rose', background: 'radial-gradient(circle at center, #2d1b3f, #120a1a)', particles: { count: 240, color: '#ffd86f', size: [1, 3], speed: 0.2, type: 'glow', pulse: true }, pattern: { type: 'mandala', petals: 8 } },
  fire: { name: 'Warm Fire', background: 'linear-gradient(to bottom, #1a0a00, #2d1810, #0f0500)', particles: { count: 120, color: '#ff6b35', size: [2, 6], speed: 2, type: 'fire' } },
  zen: { name: 'Zen Garden', background: 'linear-gradient(to bottom, #f5f5dc, #e8e4c9, #d4cfb4)', particles: { count: 30, color: '#8b7355', size: [3, 6], speed: 0.3, type: 'sand' } },
};

const WIDGET_URI = 'ui://widget/particles.html';

const tools = [
  { 
    name: 'create_particles', 
    description: 'Create a soothing particle animation. Try: starry night, ocean, fireflies, cherry blossoms, snow, aurora, rain, bubbles, galaxy, spiral, ring, heart, wave, mandala, fire, zen',
    inputSchema: { type: 'object', properties: { prompt: { type: 'string', description: 'Describe the particle scene' } }, required: ['prompt'] },
    _meta: { 'openai/outputTemplate': WIDGET_URI }
  },
  { 
    name: 'list_presets', 
    description: 'Show all available particle presets',
    inputSchema: { type: 'object', properties: {} } 
  },
  { 
    name: 'quick_preset', 
    description: 'Show a preset particle animation',
    inputSchema: { type: 'object', properties: { preset: { type: 'string', enum: Object.keys(presets) } }, required: ['preset'] },
    _meta: { 'openai/outputTemplate': WIDGET_URI }
  },
];

function matchPreset(prompt: string): any {
  const p = prompt.toLowerCase();
  if (p.includes('star') || p.includes('night')) return { ...presets.starryNight };
  if (p.includes('ocean') || p.includes('sea')) return { ...presets.ocean };
  if (p.includes('firefl') || p.includes('glow')) return { ...presets.fireflies };
  if (p.includes('cherry') || p.includes('sakura') || p.includes('blossom')) return { ...presets.sakura };
  if (p.includes('snow')) return { ...presets.snow };
  if (p.includes('aurora') || p.includes('northern')) return { ...presets.aurora };
  if (p.includes('rain')) return { ...presets.rain };
  if (p.includes('bubble')) return { ...presets.bubbles };
  if (p.includes('galaxy') || p.includes('space')) return { ...presets.galaxy };
  if (p.includes('spiral')) return { ...presets.spiral };
  if (p.includes('ring') || p.includes('halo')) return { ...presets.ring };
  if (p.includes('heart')) return { ...presets.heart };
  if (p.includes('wave')) return { ...presets.wave };
  if (p.includes('mandala') || p.includes('rose') || p.includes('flower')) return { ...presets.mandala };
  if (p.includes('fire') || p.includes('flame')) return { ...presets.fire };
  if (p.includes('zen') || p.includes('sand')) return { ...presets.zen };
  return { ...presets.starryNight };
}

const widgetHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 400px; overflow: hidden; }
    body { font-family: system-ui, sans-serif; background: #1a1a2e; border-radius: 12px; }
    .container { width: 100%; height: 400px; position: relative; border-radius: 12px; overflow: hidden; }
    #hud { position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.4); color: white; padding: 10px 14px; border-radius: 10px; backdrop-filter: blur(6px); z-index: 10; }
    #hud .title { font-size: 18px; font-weight: 700; }
    #hud .info { opacity: 0.85; font-size: 12px; margin-top: 4px; }
    canvas { display: block; width: 100%; height: 100%; border-radius: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <canvas id="c"></canvas>
    <div id="hud"><div class="title" id="title">Loading…</div><div class="info" id="info"></div></div>
  </div>
  <script>
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d");
    let particles = [];
    let config = null;
    let started = false;

    // Debug: log what we receive
    console.log('Widget loaded, window.openai:', window.openai);

    function resize() {
      const W = document.querySelector('.container')?.clientWidth || 600;
      canvas.width = W * (window.devicePixelRatio || 1);
      canvas.height = 400 * (window.devicePixelRatio || 1);
      canvas.style.width = W + 'px';
      canvas.style.height = '400px';
      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    }
    window.addEventListener("resize", resize);
    resize();

    function generatePatternPoints(pattern, count, width, height) {
      const points = [];
      const minDim = Math.min(width, height);
      const cx = width / 2;
      const cy = height / 2;
      const type = pattern?.type;
      const turns = pattern?.turns ?? 3;
      const amplitude = pattern?.amplitude ?? 0.25;
      const frequency = pattern?.frequency ?? 2;
      const petals = pattern?.petals ?? 6;
      const bands = pattern?.bands ?? 6;
      const rows = Math.max(1, Math.ceil(count / bands));

      for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, count - 1);
        let x = cx;
        let y = cy;
        if (type === 'spiral') {
          const angle = t * Math.PI * 2 * turns;
          const radius = minDim * 0.4 * t;
          x = cx + Math.cos(angle) * radius;
          y = cy + Math.sin(angle) * radius;
        } else if (type === 'ring') {
          const angle = t * Math.PI * 2;
          const radius = minDim * 0.35 + (Math.random() - 0.5) * minDim * 0.02;
          x = cx + Math.cos(angle) * radius;
          y = cy + Math.sin(angle) * radius;
        } else if (type === 'heart') {
          const angle = t * Math.PI * 2;
          const sx = 16 * Math.pow(Math.sin(angle), 3);
          const sy = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
          const scale = minDim * 0.02;
          x = cx + sx * scale;
          y = cy - sy * scale;
        } else if (type === 'wave') {
          x = t * width;
          y = cy + Math.sin(t * Math.PI * 2 * frequency) * (height * amplitude);
        } else if (type === 'mandala') {
          const angle = t * Math.PI * 2;
          const radius = minDim * 0.35 * Math.cos(petals * angle);
          x = cx + Math.cos(angle) * radius;
          y = cy + Math.sin(angle) * radius;
        } else if (type === 'curtain') {
          const band = i % bands;
          const row = Math.floor(i / bands);
          x = (band / Math.max(1, bands - 1)) * width;
          y = (row / rows) * height;
          x += (Math.random() - 0.5) * minDim * 0.02;
          y += (Math.random() - 0.5) * minDim * 0.02;
        }
        points.push({ x, y });
      }

      return points;
    }

    function initParticles() {
      const W = document.querySelector('.container')?.clientWidth || 600;
      const H = 400;
      const p = config?.particles || { count: 100, size: [2,4], speed: 1 };
      const count = p.count || 100;
      const sizeRange = p.size || [2, 5];
      const speed = p.speed || 1;
      particles = [];
      const patternPoints = config?.pattern?.type
        ? generatePatternPoints(config.pattern, count, W, H)
        : null;
      for (let i = 0; i < count; i++) {
        const point = patternPoints ? patternPoints[i % patternPoints.length] : null;
        const baseX = point ? point.x : Math.random() * W;
        const baseY = point ? point.y : Math.random() * H;
        particles.push({
          x: baseX,
          y: baseY,
          baseX: point ? baseX : null,
          baseY: point ? baseY : null,
          driftX: 0.8 + Math.random() * 1.6,
          driftY: 0.8 + Math.random() * 1.6,
          r: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
          vy: speed * (0.5 + Math.random()),
          vx: (Math.random() - 0.5) * speed,
          o: 0.3 + Math.random() * 0.7,
          ph: Math.random() * Math.PI * 2
        });
      }
    }

    function getColor(p) {
      const color = config?.particles?.color || '#ffffff';
      if (color === 'rainbow') return 'hsl(' + ((Date.now()/50 + p.ph*100) % 360) + ', 80%, 60%)';
      if (color === 'multi') return ['#ff6b6b','#4ecdc4','#45b7d1','#96ceb4','#ffeaa7'][Math.floor(p.ph * 5) % 5];
      return color;
    }

    function tick() {
      if (!config) { requestAnimationFrame(tick); return; }
      const W = document.querySelector('.container')?.clientWidth || 600;
      const H = 400;
      ctx.clearRect(0, 0, W, H);
      const t = config?.particles?.type || 'float';
      const speed = config?.particles?.speed || 1;
      const patternType = config?.pattern?.type;

      for (const p of particles) {
        if (patternType && typeof p.baseX === 'number' && typeof p.baseY === 'number') {
          const t0 = Date.now() / 1000;
          const sway = patternType === 'curtain' ? 2.5 : 1.5;
          p.x = p.baseX + Math.sin(t0 + p.ph) * (p.driftX || 1.5) * sway;
          p.y = p.baseY + Math.cos(t0 * 0.9 + p.ph) * (p.driftY || 1.5);
          if (config?.particles?.twinkle) p.o = 0.3 + Math.abs(Math.sin(Date.now()/1000 + p.ph)) * 0.7;
          if (config?.particles?.pulse) p.o = 0.2 + Math.abs(Math.sin(Date.now()/500 + p.ph)) * 0.8;
        } else {
        if (t === 'star') { p.x += p.vx * 0.1; p.y += p.vy * 0.1; if (config?.particles?.twinkle) p.o = 0.3 + Math.abs(Math.sin(Date.now()/1000 + p.ph)) * 0.7; }
        else if (t === 'snow') { p.x += Math.sin(Date.now()/2000 + p.ph) * 0.5; p.y += speed * 0.5; if (p.y > H) { p.y = -10; p.x = Math.random() * W; } }
        else if (t === 'rain') { p.y += speed; if (p.y > H) { p.y = -10; p.x = Math.random() * W; } }
        else if (t === 'bubble') { p.x += Math.sin(Date.now()/1500 + p.ph) * 0.5; p.y -= speed * 0.3; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; } }
        else if (t === 'petal') { p.x += Math.sin(Date.now()/1000 + p.ph); p.y += speed; if (p.y > H) { p.y = -10; p.x = Math.random() * W; } }
        else if (t === 'glow') { p.x += Math.sin(Date.now()/2000 + p.ph) * 0.5; p.y += Math.cos(Date.now()/2000 + p.ph) * 0.5; if (config?.particles?.pulse) p.o = 0.2 + Math.abs(Math.sin(Date.now()/500 + p.ph)) * 0.8; }
        else if (t === 'wave') { p.x += speed; p.y += Math.sin(Date.now()/1000 + p.ph) * 0.5; if (p.x > W) p.x = -10; }
        else if (t === 'aurora') { p.x += Math.sin(Date.now()/3000 + p.ph) * 2; p.y += Math.cos(Date.now()/4000 + p.ph) * 0.5; p.o = 0.3 + Math.abs(Math.sin(Date.now()/2000 + p.ph)) * 0.5; }
        else if (t === 'galaxy') { const cx = W/2, cy = H/2, a = Math.atan2(p.y-cy, p.x-cx) + speed * 0.01, d = Math.sqrt((p.x-cx)**2 + (p.y-cy)**2); p.x = cx + Math.cos(a) * d; p.y = cy + Math.sin(a) * d; }
        else if (t === 'fire') { p.y -= speed * (0.5 + Math.random() * 0.5); p.x += Math.sin(Date.now()/500 + p.ph) * 0.5; p.o -= 0.01; if (p.o <= 0 || p.y < 0) { p.y = H; p.x = W/2 + (Math.random()-0.5)*100; p.o = 0.8; } }
        else { p.x += p.vx; p.y += p.vy; }

        if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        if (!['snow','rain','bubble','petal','fire'].includes(t)) { if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10; }

        }

        ctx.globalAlpha = p.o;
        const color = getColor(p);
        if (t === 'rain') { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.r * 3); ctx.strokeStyle = color; ctx.stroke(); }
        else if (t === 'bubble') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.stroke(); }
        else if (['glow','aurora','fire'].includes(t)) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3); g.addColorStop(0, color); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = color; if (t === 'star') { ctx.shadowColor = color; ctx.shadowBlur = p.r * 2; } ctx.fill(); ctx.shadowBlur = 0; }
      }
      requestAnimationFrame(tick);
    }

    function start(data) {
      if (started) return;
      console.log('start() called with:', data);
      
      // Handle both wrapped { config: ... } and direct config
      config = data?.config || data;
      if (!config?.particles) {
        // Maybe it's the whole toolOutput object
        if (data?.name && data?.particles) {
          config = data;
        } else {
          console.log('No valid config found in:', data);
          return;
        }
      }
      started = true;
      console.log('Starting with config:', config);
      document.body.style.background = config.background || '#1a1a2e';
      document.getElementById("title").textContent = config.name || "Particles";
      document.getElementById("info").textContent = (config.particles?.count || 100) + " particles";
      initParticles();
    }

    // Listen for postMessage from parent (ChatGPT)
    window.addEventListener('message', (event) => {
      console.log('Received message:', event.data);
      if (event.data?.toolOutput) {
        start(event.data.toolOutput);
      } else if (event.data?.type === 'tool-output') {
        start(event.data.payload);
      } else if (event.data?.particles) {
        start(event.data);
      }
    });

    // Try to get data immediately
    if (window.openai?.toolOutput) {
      console.log('Found window.openai.toolOutput:', window.openai.toolOutput);
      start(window.openai.toolOutput);
    }

    // Poll for data (in case it's not ready yet)
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const data = window.openai?.toolOutput;
      if (data && !started) {
        console.log('Poll found data:', data);
        start(data);
        clearInterval(poll);
      }
      if (attempts > 100) {
        console.log('Polling timed out. window.openai:', window.openai);
        clearInterval(poll);
      }
    }, 100);

    // Start animation loop
    tick();
  </script>
</body>
</html>`;

// Tool handlers - return ONLY structuredContent for UI tools
function handleTool(name: string, args: any): any {
  if (name === 'create_particles') {
    const cfg = matchPreset(args.prompt || '');
    return {
      content: [{ type: 'text', text: `✨ ${cfg.name}` }],
      structuredContent: cfg,
      _meta: { 'openai/outputTemplate': WIDGET_URI }
    };
  }
  
  if (name === 'list_presets') {
    const list = Object.entries(presets).map(([k, v]: [string, any]) => `• ${k}: ${v.name}`).join('\n');
    return { 
      content: [{ type: 'text', text: `✨ Available Presets:\n\n${list}\n\nUse quick_preset to show one!` }] 
    };
  }
  
  if (name === 'quick_preset') {
    const cfg = presets[args.preset] || presets.starryNight;
    return {
      content: [{ type: 'text', text: `✨ ${cfg.name}` }],
      structuredContent: cfg,
      _meta: { 'openai/outputTemplate': WIDGET_URI }
    };
  }
  
  return { content: [{ type: 'text', text: 'Unknown tool' }], isError: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { method, id, params } = req.body;
  
  if (method === 'initialize') {
    return res.json({ 
      jsonrpc: '2.0', id, 
      result: { 
        protocolVersion: '2024-11-05', 
        capabilities: { tools: {}, resources: {} }, 
        serverInfo: { name: 'particle-presentations', version: '1.0.0' } 
      } 
    });
  }
  
  if (method === 'tools/list') {
    return res.json({ jsonrpc: '2.0', id, result: { tools } });
  }
  
  if (method === 'tools/call') {
    return res.json({ jsonrpc: '2.0', id, result: handleTool(params.name, params.arguments || {}) });
  }
  
  if (method === 'resources/list') {
    return res.json({ 
      jsonrpc: '2.0', id, 
      result: { 
        resources: [{
          uri: WIDGET_URI,
          name: 'Particle Animation Widget',
          mimeType: 'text/html+skybridge',
          _meta: {
            'openai/widgetDescription': 'Soothing particle animation',
            'openai/widgetDomain': 'particel-io-vdbc.vercel.app',
            'openai/widgetCSP': { connect_domains: [], resource_domains: [] },
            'openai/widgetPrefersBorder': true
          }
        }]
      } 
    });
  }
  
  if (method === 'resources/read') {
    return res.json({ 
      jsonrpc: '2.0', id, 
      result: { 
        contents: [{
          uri: WIDGET_URI,
          mimeType: 'text/html+skybridge',
          text: widgetHtml,
          _meta: {
            'openai/widgetDescription': 'Soothing particle animation',
            'openai/widgetDomain': 'particel-io-vdbc.vercel.app',
            'openai/widgetCSP': { connect_domains: [], resource_domains: [] },
            'openai/widgetPrefersBorder': true
          }
        }]
      } 
    });
  }
  
  return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
}
