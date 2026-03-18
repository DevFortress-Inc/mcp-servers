import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { z } from "zod";

const WIDGET_URI = "ui://widget/crypto.html";

const WIDGET_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Crypto Market Monitor</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0f1117;color:#e2e8f0;font-family:system-ui,sans-serif;padding:16px}
.header{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.header h2{font-size:1.1rem;font-weight:700;color:#fff;flex:1}
.controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.si{background:#1e2535;border:1px solid #2d3748;border-radius:8px;color:#e2e8f0;padding:6px 12px;font-size:.85rem;width:160px}
.si:focus{outline:none;border-color:#667eea}
.tb{background:#1e2535;border:1px solid #2d3748;border-radius:8px;color:#a0aec0;padding:6px 14px;font-size:.82rem;cursor:pointer}
.tb.on{background:#667eea;color:#fff;border-color:#667eea}
.tv{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:.85rem}
thead th{text-align:left;padding:10px 12px;color:#718096;font-weight:600;border-bottom:1px solid #2d3748;font-size:.75rem;text-transform:uppercase;cursor:pointer}
thead th:hover{color:#cbd5e0}
tbody tr{border-bottom:1px solid #1a2035;cursor:pointer}
tbody tr:hover{background:#1e2535}
td{padding:10px 12px}
.cc{display:flex;align-items:center;gap:10px}
.ci{width:26px;height:26px;border-radius:50%;flex-shrink:0}
.cn{font-weight:600;color:#fff}
.cs{color:#718096;font-size:.75rem}
.mc,.vc{color:#a0aec0}
.bu{background:#1a3a2a;color:#48bb78;border-radius:6px;padding:2px 8px;font-size:.78rem;font-weight:700}
.bd{background:#3a1a1a;color:#fc8181;border-radius:6px;padding:2px 8px;font-size:.78rem;font-weight:700}
.cv{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
.card{background:#1e2535;border:1px solid #2d3748;border-radius:14px;padding:16px;cursor:pointer}
.card:hover{border-color:#667eea}
.ct{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.cardname{font-weight:700;font-size:.92rem;color:#fff}
.cardsym{font-size:.72rem;color:#718096}
.cardprice{font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:5px}
.pos{color:#48bb78;font-weight:600}.neg{color:#fc8181;font-weight:600}
.ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100;align-items:center;justify-content:center}
.ov.open{display:flex}
.op{background:#1a2035;border:1px solid #2d3748;border-radius:18px;padding:28px;width:min(420px,92vw);max-height:90vh;overflow-y:auto}
.oh{display:flex;align-items:center;gap:12px;margin-bottom:22px}
.oh h3{font-size:1.2rem;font-weight:700;color:#fff;flex:1}
.xb{background:#2d3748;border:none;color:#a0aec0;width:32px;height:32px;border-radius:50%;font-size:1rem;cursor:pointer}
.sg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sb{background:#0f1117;border-radius:12px;padding:14px}
.sl{font-size:.7rem;color:#718096;text-transform:uppercase;margin-bottom:5px}
.sv{font-size:1rem;font-weight:700;color:#e2e8f0}
.empty{text-align:center;padding:50px;color:#718096}
.rk{background:#2d3748;color:#a0aec0;border-radius:6px;padding:1px 7px;font-size:.75rem;font-weight:600}
.retry{text-align:center;padding:30px;color:#718096;font-size:.85rem}
</style>
</head>
<body>
<div class="header">
  <h2>Crypto Market Monitor</h2>
  <div class="controls">
    <input class="si" id="si" type="text" placeholder="Search coin..."/>
    <button class="tb on" id="bT" onclick="setView('table')">Table</button>
    <button class="tb" id="bC" onclick="setView('cards')">Cards</button>
  </div>
</div>
<div id="TV" class="tv">
  <table>
    <thead><tr>
      <th onclick="srt('rank')">#</th>
      <th onclick="srt('name')">Name</th>
      <th onclick="srt('price')">Price</th>
      <th onclick="srt('change_24h')">24h %</th>
      <th onclick="srt('market_cap')">Market Cap</th>
      <th onclick="srt('volume_24h')">Volume 24h</th>
    </tr></thead>
    <tbody id="TB"><tr><td colspan="6" class="empty">Loading...</td></tr></tbody>
  </table>
</div>
<div id="CV" class="cv" style="display:none"></div>
<div class="ov" id="OV">
  <div class="op">
    <div class="oh">
      <img id="DI" class="ci" style="width:36px;height:36px;display:none" src=""/>
      <h3 id="DT"></h3>
      <button class="xb" onclick="closeDet()">x</button>
    </div>
    <div class="sg" id="DS"></div>
  </div>
</div>
<script>
var coins=[],view='table',sk='rank',sd=1,q='',retryTimer=null;

function load(){
  try{
    var o=window.openai&&window.openai.toolOutput;
    if(o&&o.coins&&Array.isArray(o.coins)&&o.coins.length){coins=o.coins;render();return;}
  }catch(e){}
  fetchData();
}

function fetchData(){
  if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}
  fetch('/api/coins')
    .then(function(r){return r.json();})
    .then(function(d){
      if(Array.isArray(d)&&d.length){
        coins=d;
        render();
      } else {
        // Rate limit or error — show message and retry in 65s
        document.getElementById('TB').innerHTML='<tr><td colspan="6" class="retry">CoinGecko rate limit reached.<br>Auto-retry in 65 seconds...</td></tr>';
        document.getElementById('CV').innerHTML='<div class="retry">CoinGecko rate limit reached. Auto-retry in 65 seconds...</div>';
        retryTimer=setTimeout(fetchData,65000);
      }
    })
    .catch(function(e){
      document.getElementById('TB').innerHTML='<tr><td colspan="6" class="empty">Error: '+e.message+'</td></tr>';
      retryTimer=setTimeout(fetchData,65000);
    });
}

window.addEventListener('openai:set_globals',function(e){
  try{
    var c=e.detail.globals.toolOutput.coins;
    if(c&&Array.isArray(c)&&c.length){coins=c;render();}
  }catch(x){}
});

document.getElementById('si').addEventListener('input',function(e){q=e.target.value.toLowerCase();render();});

function setView(v){
  view=v;
  document.getElementById('TV').style.display=v==='table'?'':'none';
  document.getElementById('CV').style.display=v==='cards'?'':'none';
  document.getElementById('bT').className='tb'+(v==='table'?' on':'');
  document.getElementById('bC').className='tb'+(v==='cards'?' on':'');
  render();
}

function srt(k){if(sk===k)sd*=-1;else{sk=k;sd=k==='rank'?1:-1;}render();}

function f(n,d){d=d==null?2:d;return n==null?'--':n.toLocaleString('en-US',{maximumFractionDigits:d});}
function fu(n){if(n==null)return'--';if(n>=1e12)return'$'+f(n/1e12)+'T';if(n>=1e9)return'$'+f(n/1e9)+'B';if(n>=1e6)return'$'+f(n/1e6)+'M';return'$'+f(n);}
function fp(n){if(n==null)return'--';return n>=1?'$'+f(n,2):'$'+n.toPrecision(4);}
function badge(v){if(v==null)return'--';return '<span class="'+(v>=0?'bu':'bd')+'">'+(v>=0?'+':'')+f(v)+'%</span>';}

function filtered(){
  return coins
    .filter(function(c){return!q||c.name.toLowerCase().indexOf(q)>=0||c.symbol.toLowerCase().indexOf(q)>=0;})
    .sort(function(a,b){var va=a[sk]||0,vb=b[sk]||0;return typeof va==='string'?va.localeCompare(vb)*sd:sd===1?va-vb:vb-va;});
}

function img(c){
  if(!c.image)return'';
  return '<img class="ci" src="'+c.image+'" onerror="this.remove()">';
}

function render(){
  var cs=filtered();
  if(view==='table'){
    var tb=document.getElementById('TB');
    if(!cs.length){tb.innerHTML='<tr><td colspan="6" class="empty">No coins found</td></tr>';return;}
    tb.innerHTML=cs.map(function(c,i){
      return '<tr onclick="openDet('+i+')">'
        +'<td><span class="rk">#'+(c.rank||'?')+'</span></td>'
        +'<td><div class="cc">'+img(c)+'<div><div class="cn">'+c.name+'</div><div class="cs">'+c.symbol.toUpperCase()+'</div></div></div></td>'
        +'<td style="font-weight:600">'+fp(c.price)+'</td>'
        +'<td>'+badge(c.change_24h)+'</td>'
        +'<td class="mc">'+fu(c.market_cap)+'</td>'
        +'<td class="vc">'+fu(c.volume_24h)+'</td>'
        +'</tr>';
    }).join('');
  } else {
    var cv=document.getElementById('CV');
    if(!cs.length){cv.innerHTML='<div class="empty">No coins found</div>';return;}
    cv.innerHTML=cs.map(function(c,i){
      var cl=(c.change_24h||0)>=0?'pos':'neg';
      return '<div class="card" onclick="openDet('+i+')">'
        +'<div class="ct">'+img(c)+'<div><div class="cardname">'+c.name+'</div><div class="cardsym">'+c.symbol.toUpperCase()+'</div></div></div>'
        +'<div class="cardprice">'+fp(c.price)+'</div>'
        +'<div class="'+cl+'">'+(c.change_24h!=null?(c.change_24h>=0?'+':'')+f(c.change_24h)+'% 24h':'--')+'</div>'
        +'</div>';
    }).join('');
  }
}

var filteredCache=[];
function openDet(i){
  filteredCache=filtered();
  var c=filteredCache[i];
  if(!c)return;
  document.getElementById('DT').textContent=c.name+' ('+c.symbol.toUpperCase()+')';
  var di=document.getElementById('DI');
  if(c.image){di.src=c.image;di.style.display='';}else{di.style.display='none';}
  function sb(l,v){return '<div class="sb"><div class="sl">'+l+'</div><div class="sv">'+v+'</div></div>';}
  function sbc(l,v){var cl=v!=null?(v>=0?' pos':' neg'):'';var d=v!=null?(v>=0?'+':'')+f(v)+'%':'--';return '<div class="sb"><div class="sl">'+l+'</div><div class="sv'+cl+'">'+d+'</div></div>';}
  document.getElementById('DS').innerHTML=
    sb('Price',fp(c.price))+sb('Market Cap',fu(c.market_cap))+
    sb('Volume 24h',fu(c.volume_24h))+sb('Rank','#'+(c.rank||'?'))+
    sb('24h High',fp(c.high_24h))+sb('24h Low',fp(c.low_24h))+
    sbc('Change 24h',c.change_24h)+sbc('Change 7d',c.change_7d)+
    sb('Supply',c.circulating_supply?f(c.circulating_supply,0)+' '+c.symbol.toUpperCase():'--');
  document.getElementById('OV').classList.add('open');
}
document.getElementById('OV').addEventListener('click',function(e){if(e.target===this)closeDet();});
function closeDet(){document.getElementById('OV').classList.remove('open');}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',load);}else{load();}
</script>
</body>
</html>`;

async function fetchCoins(limit) {
  limit = limit || 20;
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page="+limit+"&page=1&price_change_percentage=7d",
    { signal: AbortSignal.timeout(7000) }
  );
  if (!res.ok) throw new Error("CoinGecko rate limit - try again in 60s");
  const raw = await res.json();
  return raw.map(function(c) {
    return {
      name: c.name, symbol: c.symbol, price: c.current_price,
      market_cap: c.market_cap, volume_24h: c.total_volume,
      change_24h: c.price_change_percentage_24h,
      change_7d: c.price_change_percentage_7d_in_currency,
      high_24h: c.high_24h, low_24h: c.low_24h,
      circulating_supply: c.circulating_supply,
      image: c.image, rank: c.market_cap_rank,
    };
  });
}

var cache = null;
var cacheTime = 0;
async function fetchCoinsCached(limit) {
  var now = Date.now();
  if (cache && (now - cacheTime) < 60000) return cache.slice(0, limit);
  var coins = await fetchCoins(limit);
  cache = coins;
  cacheTime = now;
  return coins;
}

function reply(coins, text) {
  return {
    content: [
      { type: "resource", resource: { uri: WIDGET_URI, mimeType: "text/html+skybridge", text: WIDGET_HTML, _meta: { "openai/widgetPrefersBorder": true } } },
      { type: "text", text: text },
    ],
    structuredContent: { coins: coins },
  };
}

function createCryptoServer() {
  const server = new McpServer({ name: "crypto-market-monitor", version: "3.0.0" });

  server.registerResource("crypto-widget", WIDGET_URI, {}, async () => ({
    contents: [{ uri: WIDGET_URI, mimeType: "text/html+skybridge", text: WIDGET_HTML, _meta: { "openai/widgetPrefersBorder": true } }],
  }));

  server.registerTool("get_market_overview", {
    title: "Get Crypto Market Overview",
    description: "Use this when the user asks about crypto prices, top coins, market cap rankings, or wants a market overview.",
    inputSchema: { limit: z.number().min(5).max(50).default(20) },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "openai/widgetAccessible": true },
  }, async function(args) {
    try {
      const coins = await fetchCoinsCached(args.limit || 20);
      return reply(coins, "Showing top " + coins.length + " cryptocurrencies.");
    } catch(e) {
      return { content: [{ type: "text", text: "Error: " + e.message }], structuredContent: { coins: [] } };
    }
  });

  server.registerTool("search_coin", {
    title: "Search Crypto Coin",
    description: "Use this when the user asks about a specific cryptocurrency by name or symbol, e.g. 'tell me about Bitcoin', 'show ETH', 'what is Solana doing'.",
    inputSchema: { query: z.string().min(1) },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "openai/widgetAccessible": true },
  }, async function(args) {
    try {
      const sr = await fetch("https://api.coingecko.com/api/v3/search?query=" + encodeURIComponent(args.query), { signal: AbortSignal.timeout(5000) });
      const top = ((await sr.json()).coins || []).slice(0, 5);
      if (!top.length) return { content: [{ type: "text", text: 'No coin found for "' + args.query + '".' }], structuredContent: { coins: [] } };
      const ids = top.map(function(c) { return c.id; }).join(",");
      const mr = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" + ids + "&price_change_percentage=7d", { signal: AbortSignal.timeout(7000) });
      const coins = (await mr.json()).map(function(c) {
        return { name:c.name, symbol:c.symbol, price:c.current_price, market_cap:c.market_cap, volume_24h:c.total_volume, change_24h:c.price_change_percentage_24h, change_7d:c.price_change_percentage_7d_in_currency, high_24h:c.high_24h, low_24h:c.low_24h, circulating_supply:c.circulating_supply, image:c.image, rank:c.market_cap_rank };
      });
      return reply(coins, "Found " + coins.length + ' result(s) for "' + args.query + '".');
    } catch(e) {
      return { content: [{ type: "text", text: "Error: " + e.message }], structuredContent: { coins: [] } };
    }
  });

  return server;
}

const PORT = Number(process.env.PORT || 3001);
const httpServer = createServer(async function(req, res) {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method === "GET" && url.pathname === "/") { res.writeHead(200, {"content-type":"text/plain"}); res.end("Crypto MCP OK"); return; }
  if (req.method === "GET" && url.pathname === "/widget") { res.writeHead(200, {"content-type":"text/html"}); res.end(WIDGET_HTML); return; }

  if (req.method === "GET" && url.pathname === "/api/coins") {
    try {
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const coins = await fetchCoinsCached(Math.min(limit, 50));
      res.writeHead(200, {"content-type":"application/json"});
      res.end(JSON.stringify(coins));
    } catch(e) {
      res.writeHead(500, {"content-type":"application/json"});
      res.end(JSON.stringify({error: e.message}));
    }
    return;
  }

  if (url.pathname === "/mcp") {
    const server = createCryptoServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", function() { transport.close(); server.close(); });
    try { await server.connect(transport); await transport.handleRequest(req, res); }
    catch(err) { console.error(err); if (!res.headersSent) res.writeHead(500).end("Error"); }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(PORT, "0.0.0.0", function() {
  console.log("===========================================");
  console.log("Crypto MCP on port " + PORT);
  console.log("Widget: http://localhost:" + PORT + "/widget");
  console.log("API:    http://localhost:" + PORT + "/api/coins");
  console.log("MCP:    http://localhost:" + PORT + "/mcp");
  console.log("===========================================");
});
