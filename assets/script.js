(function(){
  const root = document.documentElement;
  const key = "theme";
  const btn = document.getElementById("themeToggle");

  function setTheme(t){
    if(t === "light"){
      root.setAttribute("data-theme","light");
    }else{
      root.removeAttribute("data-theme");
    }
    localStorage.setItem(key, t);
    if(btn) btn.setAttribute("aria-label", t === "light" ? "Switch to dark theme" : "Switch to light theme");
    if(btn) btn.textContent = t === "light" ? "🌙 Dark" : "☀️ Light";
  }

  // initial: stored -> system -> dark
  const stored = localStorage.getItem(key);
  if(stored){
    setTheme(stored);
  }else{
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    setTheme(prefersLight ? "light" : "dark");
  }

  if(btn){
    btn.addEventListener("click", () => {
      const current = localStorage.getItem(key) || "dark";
      setTheme(current === "light" ? "dark" : "light");
    });
  }

  const year = document.getElementById("year");
  if(year) year.textContent = new Date().getFullYear();

  const updated = document.getElementById("updated");
  if(updated){
    updated.textContent = new Date().toISOString().slice(0,10);
  }
})();
