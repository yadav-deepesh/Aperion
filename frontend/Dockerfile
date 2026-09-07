FROM nginx:alpine
# Vanilla HTML/CSS/JS — Day 1 skeleton per Six_Day_Build_Plan.md:60
RUN mkdir -p /usr/share/nginx/html/js/modules /usr/share/nginx/html/css
# Minimal index.html with Leaflet via CDN + Gantt stub
RUN printf '%s\n' \
  '<!doctype html><html><head><meta charset="utf-8"><title>Aperion</title>' \
  '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>' \
  '<link rel="stylesheet" href="css/style.css"/>' \
  '<style>body{font-family:system-ui;margin:0} #map{height:300px} #gantt{height:200px;border:1px solid #ddd;margin:10px} .bar{fill:#16a34a}</style>' \
  '</head><body>' \
  '<h1 style="padding:10px">Aperion — Shadnagar GSaaS</h1>' \
  '<div id="map"></div><div id="gantt"></div><div id="status" style="padding:10px"></div>' \
  '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>' \
  '<script src="js/app.js"></script>' \
  '</body></html>' > /usr/share/nginx/html/index.html
RUN printf '%s\n' 'body{margin:0} h1{font-size:18px}' > /usr/share/nginx/html/css/style.css
RUN printf '%s\n' \
  '// Day 1 skeleton: fetch schedule and draw one bar' \
  'async function init(){' \
  ' const map=L.map("map").setView([17.03,78.18],11);' \
  ' L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);' \
  ' L.circle([17.03,78.18],{radius:2700,color:"green",fillOpacity:0.1}).addTo(map);' \
  ' try{ const r=await fetch("http://localhost:8080/schedule"); const j=await r.json();' \
  ' document.getElementById("status").textContent="schedule: "+JSON.stringify(j).slice(0,200);' \
  ' const g=document.getElementById("gantt"); g.innerHTML="<svg width=\"800\" height=\"40\"><rect x=\"10\" y=\"10\" width=\"200\" height=\"20\" class=\"bar\"/></svg> (stub bar)";' \
  ' }catch(e){ document.getElementById("status").textContent="orchestrator not ready: "+e }' \
  '}' \
  'init();' > /usr/share/nginx/html/js/app.js
RUN printf '%s\n' '// gantt module stub' > /usr/share/nginx/html/js/modules/gantt.js
EXPOSE 80
HEALTHCHECK --interval=5s --timeout=3s --retries=5 --start-period=5s CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
