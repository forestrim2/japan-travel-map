export function pushRecent(list, term, max = 5) { const t = String(term||'').trim(); if(!t) return list; const next = [t, ...list.filter(x=>x!==t)]; return next.slice(0,max);} 
