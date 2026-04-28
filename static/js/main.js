// ═══════════════════════════════════════════════════════════════
//  IB Academy — main.js  (clean, no crashes)
// ═══════════════════════════════════════════════════════════════

// ── Page transition overlay ──────────────────────────────────────
document.addEventListener('click', function(e) {
  var a = e.target.closest('a[data-nav]');
  if (!a) return;
  var href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
  e.preventDefault();
  var ov = document.querySelector('.pg-overlay');
  if (ov) ov.style.opacity = '1';
  setTimeout(function() { window.location.href = href; }, 260);
});

document.querySelectorAll('form').forEach(function(f) {
  f.addEventListener('submit', function() {
    var ov = document.querySelector('.pg-overlay');
    if (ov) ov.style.opacity = '1';
  });
});

// ── Theme toggle ─────────────────────────────────────────────────
(function() {
  var root   = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  var sun    = document.querySelector('.theme-sun');
  var moon   = document.querySelector('.theme-moon');

  // ALWAYS default to dark — only switch if user explicitly toggled
  var saved = null;
  try { saved = localStorage.getItem('ib-theme'); } catch(e){}
  var theme = (saved === 'light' || saved === 'dark') ? saved : 'dark';

  root.setAttribute('data-theme', theme);
  updateBtn(theme);

  if (toggle) {
    toggle.addEventListener('click', function() {
      var current = root.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('ib-theme', next); } catch(e){}
      updateBtn(next);
    });
  }

  function updateBtn(t) {
    if (sun)  sun.style.display  = t === 'light' ? 'inline' : 'none';
    if (moon) moon.style.display = t === 'dark'  ? 'inline' : 'none';
  }
})();

// ── Glossary sidebar ─────────────────────────────────────────────
(function() {
  var sidebar  = document.getElementById('glossSidebar');
  var backdrop = document.getElementById('glossBackdrop');
  var termName = document.getElementById('glossTermName');
  var termDef  = document.getElementById('glossTermDef');

  function openGloss(term) {
    if (!sidebar) return;
    var def = (window.GLOSSARY || {})[term];
    termName.textContent = term;
    termDef.textContent  = def || 'See the full glossary for this term.';
    sidebar.classList.add('gs-open');
    if (backdrop) backdrop.classList.add('gs-open');
  }
  function closeGloss() {
    if (sidebar)  sidebar.classList.remove('gs-open');
    if (backdrop) backdrop.classList.remove('gs-open');
  }

  document.addEventListener('click', function(e) {
    var trigger = e.target.closest('.gloss-trigger');
    if (trigger) openGloss(trigger.dataset.term || trigger.textContent.trim());
  });
  var closeBtn = document.getElementById('glossClose');
  if (closeBtn)  closeBtn.addEventListener('click', closeGloss);
  if (backdrop)  backdrop.addEventListener('click', closeGloss);
})();

// ── Scroll: hide nav on scroll down ──────────────────────────────
(function() {
  var lastY = 0;
  var ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        var y   = window.scrollY;
        var nav = document.getElementById('siteNav');
        if (nav) {
          if (y > lastY && y > 80) nav.classList.add('nav-hidden');
          else nav.classList.remove('nav-hidden');
        }
        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

// ── Stagger feedback result rows ──────────────────────────────────
document.querySelectorAll('.srr, .sqr, .mrr, .rpb-row').forEach(function(el, i) {
  el.style.opacity   = '0';
  el.style.transform = 'translateY(8px)';
  setTimeout(function() {
    el.style.transition = 'opacity .32s ease, transform .32s ease';
    el.style.opacity    = '1';
    el.style.transform  = 'translateY(0)';
  }, 90 + i * 65);
});

// ── Scroll reveal for curriculum cards ───────────────────────────
(function() {
  if (!window.IntersectionObserver) {
    // Fallback: just show them all
    document.querySelectorAll('.rev-card').forEach(function(el) { el.classList.add('in-view'); });
    return;
  }
  var ro = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) { e.target.classList.add('in-view'); ro.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.rev-card').forEach(function(el, i) {
    el.style.setProperty('--ri', i);
    ro.observe(el);
  });
})();

// ── Mode card click (quiz intro) ──────────────────────────────────
document.querySelectorAll('.mode-card').forEach(function(card) {
  card.addEventListener('click', function() {
    document.querySelectorAll('.mode-card').forEach(function(c) { c.classList.remove('mc-active'); });
    this.classList.add('mc-active');
  });
});

// ── IPO card 3-D tilt ─────────────────────────────────────────────
document.querySelectorAll('.ipo-card').forEach(function(card) {
  card.addEventListener('mousemove', function(e) {
    var r = card.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width  - 0.5;
    var y = (e.clientY - r.top)  / r.height - 0.5;
    card.style.transform = 'perspective(600px) rotateY(' + (x*8) + 'deg) rotateX(' + (-y*8) + 'deg) translateY(-3px)';
  });
  card.addEventListener('mouseleave', function() { card.style.transform = ''; });
});

// ── Glossary search ───────────────────────────────────────────────
var glossSearch = document.getElementById('glossSearch');
if (glossSearch) {
  glossSearch.addEventListener('input', function() {
    var q = this.value.toLowerCase();
    document.querySelectorAll('.gp-card').forEach(function(card) {
      var match = card.dataset.term.includes(q) || card.querySelector('.gpc-def').textContent.toLowerCase().includes(q);
      card.style.display = match ? '' : 'none';
    });
  });
}

// ── Drag & drop: sort (buy/sell zones) ───────────────────────────
(function() {
  var pool = document.getElementById('dndPool');
  if (!pool) return;

  var dragId = null;

  // Restore previous answers from hidden inputs
  document.querySelectorAll('.dnd-item').forEach(function(item) {
    var id = item.dataset.id;
    var hi = document.getElementById('hi-' + id);
    if (!hi) return;
    if (hi.value === 'buy') {
      var z = document.getElementById('zone-buy-items');
      if (z) z.appendChild(item);
    } else if (hi.value === 'sell') {
      var z = document.getElementById('zone-sell-items');
      if (z) z.appendChild(item);
    }
  });
  updateSortSubmit();

  document.querySelectorAll('.dnd-item').forEach(function(item) {
    item.addEventListener('dragstart', function(e) {
      dragId = item.dataset.id;
      item.classList.add('dnd-dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', function() {
      item.classList.remove('dnd-dragging');
      dragId = null;
      updateSortSubmit();
    });
  });

  ['zone-buy','zone-sell', 'dndPool'].forEach(function(zid) {
    var zone = document.getElementById(zid);
    if (!zone) return;
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('dz-over'); });
    zone.addEventListener('dragleave', function() { zone.classList.remove('dz-over'); });
    zone.addEventListener('drop', function(e) {
      e.preventDefault();
      zone.classList.remove('dz-over');
      if (!dragId) return;
      var item   = document.getElementById('di-' + dragId);
      var side   = zone.dataset.side || '';
      var target = zone.querySelector('.dz-items') || zone;
      target.appendChild(item);
      var hi = document.getElementById('hi-' + dragId);
      if (hi) hi.value = side;
      updateSortSubmit();
    });
  });

  function updateSortSubmit() {
    var items = document.querySelectorAll('.dnd-item');
    var allPlaced = true;
    items.forEach(function(item) {
      var hi = document.getElementById('hi-' + item.dataset.id);
      if (!hi || (hi.value !== 'buy' && hi.value !== 'sell')) allPlaced = false;
    });
    var btn = document.getElementById('sortSubmit');
    if (btn) btn.disabled = !allPlaced;
    // placeholder visibility
    ['zone-buy','zone-sell'].forEach(function(zid) {
      var z  = document.getElementById(zid);
      if (!z) return;
      var ph = z.querySelector('.dz-placeholder');
      var zi = z.querySelector('.dz-items');
      if (ph && zi) ph.style.display = zi.children.length > 0 ? 'none' : 'block';
    });
  }
})();

// ── Drag & drop: reorder (seq / deal) ─────────────────────────────
['seqPool','dealPool'].forEach(function(poolId) {
  var pool = document.getElementById(poolId);
  if (!pool) return;
  var hiPrefix  = poolId === 'seqPool' ? 'seq-hi-' : 'deal-hi-';
  var submitId  = poolId === 'seqPool' ? 'seqSubmit' : 'dealSubmit';
  var dragged   = null;

  pool.addEventListener('dragstart', function(e) {
    dragged = e.target.closest('.dno-card');
    if (dragged) { dragged.classList.add('dnd-dragging'); e.dataTransfer.effectAllowed = 'move'; }
  });
  pool.addEventListener('dragend', function() {
    if (dragged) dragged.classList.remove('dnd-dragging');
    dragged = null;
    updateOrder();
  });
  pool.addEventListener('dragover', function(e) {
    e.preventDefault();
    if (!dragged) return;
    var after = getAfter(pool, e.clientY);
    if (after) pool.insertBefore(dragged, after);
    else pool.appendChild(dragged);
  });

  function getAfter(container, y) {
    var els = Array.from(container.querySelectorAll('.dno-card:not(.dnd-dragging)'));
    var best = { offset: Number.NEGATIVE_INFINITY, el: null };
    els.forEach(function(child) {
      var box    = child.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > best.offset) best = { offset: offset, el: child };
    });
    return best.el;
  }

  function updateOrder() {
    var cards = pool.querySelectorAll('.dno-card');
    cards.forEach(function(card, i) {
      var id    = card.dataset.id;
      var pos   = i + 1;
      var posEl = document.getElementById('pos-' + id);
      var hi    = document.getElementById(hiPrefix + id);
      if (posEl) { posEl.textContent = pos; posEl.classList.add('pos-set'); }
      if (hi)    hi.value = pos;
    });
    var btn = document.getElementById(submitId);
    if (btn) btn.disabled = false;
  }
});

// ── Sort choice radio highlight (learn page) ──────────────────────
document.querySelectorAll('.sb-lbl input').forEach(function(inp) {
  inp.addEventListener('change', function() {
    var row = this.closest('.sort-row');
    if (!row) return;
    row.querySelectorAll('.sb-lbl').forEach(function(l) { l.classList.remove('sbl-buy-on','sbl-sell-on'); });
    this.closest('.sb-lbl').classList.add(this.value === 'buy' ? 'sbl-buy-on' : 'sbl-sell-on');
  });
  if (inp.checked) {
    inp.closest('.sb-lbl').classList.add(inp.value === 'buy' ? 'sbl-buy-on' : 'sbl-sell-on');
  }
});

// ── Seq select: no duplicate positions ───────────────────────────
document.querySelectorAll('.seq-sel').forEach(function(sel) {
  sel.addEventListener('change', function() {
    var v = this.value;
    document.querySelectorAll('.seq-sel').forEach(function(other) {
      if (other !== sel && other.value === v) other.value = '';
    });
  });
});

// ── Notes widget (learn page) ─────────────────────────────────────
(function() {
  var toggle    = document.getElementById('notesToggle');
  var panel     = document.getElementById('notesPanel');
  var area      = document.getElementById('notesArea');
  var saveBtn   = document.getElementById('notesSave');
  var statusEl  = document.getElementById('noteStatus');
  var label     = document.getElementById('ntLabel');
  if (!toggle) return;

  if (area && area.value.trim()) { if (label) label.textContent = 'Notes ●'; }

  toggle.addEventListener('click', function() {
    var open = panel.style.display === 'none' || panel.style.display === '';
    panel.style.display = open ? 'block' : 'none';
    toggle.classList.toggle('nt-open', open);
  });
  panel.style.display = 'none'; // start closed

  function saveNote() {
    if (!area) return;
    var lessonNum = window.LESSON_NUM || 0;
    fetch('/api/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson: lessonNum, text: area.value })
    }).then(function() {
      if (statusEl) { statusEl.textContent = '✓ Saved'; statusEl.style.color = '#34D399'; }
      if (label)    label.textContent = 'Notes ●';
      setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 2500);
    }).catch(function() {});
  }

  if (saveBtn) saveBtn.addEventListener('click', saveNote);

  var saveTimeout;
  if (area) {
    area.addEventListener('input', function() {
      if (statusEl) { statusEl.textContent = 'Unsaved…'; statusEl.style.color = 'rgba(255,255,255,.3)'; }
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveNote, 1500);
    });
  }
})();

// ── Home: counter animation ───────────────────────────────────────
document.querySelectorAll('.hs-num').forEach(function(el) {
  var target = parseInt(el.dataset.to, 10) || 0;
  var n = 0;
  var iv = setInterval(function() {
    n = Math.min(n + target / 35, target);
    el.textContent = Math.round(n);
    if (n >= target) clearInterval(iv);
  }, 28);
});
