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

  // 3D Hardware Accelerated Tilt Engine for Professional Depth
  const tiltElements = document.querySelectorAll('.tilt-3d');
  tiltElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      // Calculate cursor position relative to element center
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Calculate tilt degrees (Max 4 degrees for subtle luxury effect)
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;
      
      el.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
    });
    
    el.addEventListener('mouseleave', () => {
      // Reset smoothly
      el.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      el.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)';
    });
    
    el.addEventListener('mouseenter', () => {
      // Snap to mouse instantly to avoid sluggish trailing
      el.style.transition = 'none';
    });
  });
})();
