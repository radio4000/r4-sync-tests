#!/usr/bin/env bash
# Radio4000 performance harness — drives agent-browser through a fixed scenario
# and prints JSON. Run against any base URL to produce before/after numbers.
#
#   perf/measure.sh http://localhost:5173      # dev
#   perf/measure.sh https://radio4000.com      # prod (deployed from main)
#
# Scenario: homepage vitals, SPA navigation timing (cold + warm revisits),
# scroll jank on a heavy channel, placeholder flash, and per-load request counts.
# CHANNEL must be a real slug with many tracks. Numbers are noisy by a few ms —
# read trends, not last digits.
set -euo pipefail

BASE="${1:-http://localhost:5173}"
CHANNEL="${2:-oskar}"   # ~2580 tracks
AB=agent-browser

j(){ $AB eval "$1" 2>/dev/null; }     # eval JS, print result
wait_ms(){ $AB wait "$1" >/dev/null 2>&1; }

# --- helper scripts injected into the page -----------------------------------
SPA_NAV='(async (target) => {
  const a=document.createElement("a"); a.href=target; document.body.appendChild(a);
  let last=performance.now(); const obs=new MutationObserver(()=>last=performance.now());
  obs.observe(document.body,{childList:true,subtree:true,characterData:true});
  const t0=performance.now(); a.click();
  await new Promise(res=>{const iv=setInterval(()=>{const n=performance.now();
    if((n-last>300&&n-t0>80)||n-t0>9000){clearInterval(iv);obs.disconnect();res();}},25);});
  return {settleMs:Math.round(last-t0), tracksState:window.r5?.tracksCollection?._state?.size};
})(window.__t)'

SCROLL_JANK='(async () => {
  const el=document.querySelector("div.scroll-area")||document.scrollingElement;
  const longTasks=[]; const po=new PerformanceObserver(l=>{for(const e of l.getEntries())longTasks.push(e.duration);});
  try{po.observe({entryTypes:["longtask"]});}catch(e){}
  const frames=[]; let last=performance.now(); let raf;
  const loop=()=>{const n=performance.now();frames.push(n-last);last=n;raf=requestAnimationFrame(loop);};
  raf=requestAnimationFrame(loop);
  for(let i=0;i<60;i++){el.scrollTop+=400;await new Promise(r=>setTimeout(r,30));}
  await new Promise(r=>setTimeout(r,300)); cancelAnimationFrame(raf); po.disconnect();
  return {worstFrameMs:Math.round(Math.max(...frames)),
    medianFrameMs:Math.round(frames.slice().sort((a,b)=>a-b)[frames.length>>1]),
    jankFrames_gt50ms:frames.filter(f=>f>50).length,
    longTasks_count:longTasks.length,
    longTasksTotalMs:Math.round(longTasks.reduce((a,b)=>a+b,0))};
})()'

FLASH='(async () => {
  const t0=performance.now(); const out=[]; let prev="";
  for(let i=0;i<60;i++){const b=document.body.textContent;
    const k=JSON.stringify({unknown:b.includes("@unknown"),updatedUnknown:b.includes("Updated unknown"),noTracks:b.includes("No tracks yet")});
    if(k!==prev){out.push({t:Math.round(performance.now()-t0),...JSON.parse(k)});prev=k;}
    await new Promise(r=>setTimeout(r,50));}
  return out;
})()'

echo "{"
echo "  \"base\": \"$BASE\", \"channel\": \"$CHANNEL\","

# 1) homepage vitals
$AB open "$BASE/" >/dev/null 2>&1; wait_ms 2500
echo "  \"vitals\": $($AB vitals --json 2>/dev/null),"

# 2) SPA navigation timing (cold first visit + warm revisits)
echo -n "  \"nav\": {"
j "window.__t='/$CHANNEL'" >/dev/null
echo -n "\"home_to_channel_cold\": $(j "$SPA_NAV")," ; wait_ms 1200
j "window.__t='/channels'" >/dev/null
echo -n "\"channel_to_dir\": $(j "$SPA_NAV")," ; wait_ms 900
j "window.__t='/$CHANNEL'" >/dev/null
echo -n "\"dir_to_channel_warm\": $(j "$SPA_NAV")" ; wait_ms 900
echo "},"

# 3) scroll jank on heavy channel
$AB open "$BASE/$CHANNEL" >/dev/null 2>&1; wait_ms 1500
echo "  \"scrollJank\": $(j "$SCROLL_JANK"),"

# 4) placeholder flash on client load
$AB open "$BASE/$CHANNEL" >/dev/null 2>&1
echo "  \"placeholderFlash\": $(j "$FLASH"),"

# 5) per-load request counts (clean SPA home -> channel)
$AB open "$BASE/" >/dev/null 2>&1; wait_ms 2000
$AB network requests --clear >/dev/null 2>&1
j "window.__t='/$CHANNEL'" >/dev/null; j "$SPA_NAV" >/dev/null; wait_ms 1500
THUMBS=$($AB network requests 2>/dev/null | grep -c ytimg || true)
echo "  \"requestsPerLoad\": {"
echo "    \"thumbnails\": ${THUMBS:-0},"
echo -n "    \"data\": ["
$AB network requests 2>/dev/null | grep -iE 'rest/v1/' | grep ' GET ' \
  | sed -E 's/.*rest\/v1\///; s/\?.*$//' | sort | uniq -c \
  | awk 'NR>1{printf ","} {printf "{\"endpoint\":\"%s\",\"count\":%d}", $2, $1}'
echo "]"
echo "  }"
echo "}"
