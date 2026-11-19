/* Estado de la demostración. Se conserva en localStorage del navegador. */
(function () {
  const NK = window.NK;
  const KEY = 'nutrikowi-plataforma-demo-v3';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.v === 3) return s;
      }
    } catch (e) { /* almacenamiento no disponible: se usa memoria */ }
    return NK.seedState();
  }

  const store = {
    state: load(),
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { /* sin persistencia */ }
      document.dispatchEvent(new CustomEvent('nk:change'));
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
      this.state = NK.seedState();
      this.save();
    },
    unit(id) { return this.state.units.find((u) => u.id === id); },
    item(code) { return this.state.inventory.find((i) => i.code === code); },
    order(folio) { return this.state.orders.find((o) => o.folio === folio); },
    request(folio) { return this.state.requests.find((r) => r.folio === folio); },
    tech(id) { return NK.TECHS.find((t) => t.id === id); },
    log(icon, tone, text) {
      this.state.activity.unshift({ at: new Date().toISOString(), icon, tone, text });
      this.state.activity = this.state.activity.slice(0, 30);
    },
    nextFolio(kind) {
      const now = new Date();
      const yymm = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0');
      const n = this.state.seq[kind]++;
      return `${kind === 'ot' ? 'OT' : 'SM'}-${yymm}-${String(n).padStart(3, '0')}`;
    },
  };
  NK.store = store;
})();
