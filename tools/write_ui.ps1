$file = "src/core/ui.js"
$content = @";/* BandUI - Bouton Unbanded + panneau de gestion injectés dans BAND. */
class BandUI {
  constructor(pm, adapter) {
    this.pm = pm;
    this.adapter = adapter;
    this.panel = null;
    this.btn = null;
    this.visible = false;
  }
  inject() {
    window.UnbandedUI = this;
    window.BandTamperUI = this;
    this._hookCommandInput();
    if (!document.body) return;
    this._injectSettings();
    this._injectFab();
    if (this.adapter.isDemo()) {
      this._injectDemoBanner();
      return;
    }
    this._injectButton();
    this._injectPanel();
  }
  ensureInjected() {
    try {
      if (!document.body) return;
      if (!this.settingsEl || !document.body.contains(this.settingsEl)) this._injectSettings();
      if (!this.fab || !document.body.contains(this.fab)) this._injectFab();
      if (this.adapter.isDemo()) {
        if (!this.banner || !document.body.contains(this.banner)) this._injectDemoBanner();
        return;
      }
      if (!this.btn || !document.body.contains(this.btn)) this._injectButton();
      if (!this.panel || !document.body.contains(this.panel)) this._injectPanel();
    } catch (e) { this.adapter.log("ensureInjected :", e); }
  }
  _injectButton() {
    this.btn = document.createElement("button");
    this.btn.id = "bt-band-plugins";
    this.btn.type = "button";
    this.btn.textContent = "Unbanded";
    this.btn.title = "Unbanded — paramètres des plugins (/help, /plugins, /settings)";
    this.btn.setAttribute("data-bt-root", "1");
    this.btn.style.cssText = "background:none;border:none;padding:0 4px;cursor:pointer;font:inherit;font-weight:bold;color:inherit;display:inline-flex;align-items:center;gap:4px;";
    const dot = document.createElement("span");
    dot.textContent = "●";
    dot.style.cssText = "color:#6c5ce7;font-size:8px;line-height:1;";
    this.btn.appendChild(dot);
    this._injectSettingsMenu();
    this.btn.onclick = () => {
      const sub = document.getElementById("bt-settings-menu-sub");
      if (sub) {
        sub.style.display = sub.style.display === "block" ? "none" : "block";
        if (sub.style.display === "none") {
          sub.style.display = "block";
          const first = sub.querySelector('[data-action="about"]');
          if (first) first.focus();
        }
      } else {
        this.openSettings("general");
      }
    };
    const listItem = () => {
      const item = document.createElement("li");
      item.className = "widgetItem";
      item.id = "bt-header-item";
      item.setAttribute("data-bt-root", "1");
      item.appendChild(this.btn);
      return item;
    };
    const feedLink = document.querySelector('#header .headerWidgetArea ul.widgetList ul li a[title="Feed"]');
    if (feedLink) {
      const ul = feedLink.closest("ul");
      if (ul) {
        const li = listItem();
        ul.insertBefore(li, feedLink.parentNode);
        this._injectSettingsMenu(li);
        return;
      }
    }
    const list = document.querySelector("#header .headerWidgetArea ul.widgetList, #header ul.widgetList");
    if (list) {
      const li = listItem();
      list.insertBefore(li, list.firstElementChild);
      this._injectSettingsMenu(li);
      return;
    }
    const header = document.querySelector("#header, .headerWrap, header");
    if (header) {
      header.appendChild(this.btn);
      this._injectSettingsMenu(header);
      return;
    }
    const target = document.querySelector(".sidebar, .nav, .top-bar");
    if (target) {
      target.appendChild(this.btn);
      this._injectSettingsMenu(target);
      return;
    }
    Object.assign(this.btn.style, {
      position: "fixed", bottom: "76px", right: "18px", padding: "8px 12px",
      background: "#6c5ce7", color: "#fff", borderRadius: "6px",
      zIndex: "10000", boxShadow: "0 2px 6px rgba(0,0,0,.3)"
    });
    document.body.appendChild(this.btn);
    this._injectSettingsMenu(document.body);
  }