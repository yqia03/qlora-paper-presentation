// Native anchors work with JavaScript disabled. Keep the contents compact on small screens.
(() => {
  const contents = document.getElementById('reader-contents');
  const narrow = window.matchMedia('(max-width: 799px)');
  const appendix = contents.querySelector('.reader-appendices');
  const links = [...contents.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));

  function adaptContents() {
    contents.open = !narrow.matches;
  }
  adaptContents();
  narrow.addEventListener('change', adaptContents);

  contents.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || !narrow.matches) return;
    contents.open = false;
  });

  // Track the section crossing the top of the reading area even on jumps
  // between long sections or when the user follows a bibliography link.
  let current = -1;
  let scheduled = false;
  function updateSection() {
    scheduled = false;
    const line = narrow.matches ? 90 : 70;
    let index = -1;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i] && sections[i].getBoundingClientRect().top <= line) index = i;
    }
    if (index === current) return;
    if (current >= 0) links[current].removeAttribute('aria-current');
    current = index;
    if (index >= 0) {
      links[index].setAttribute('aria-current', 'location');
      if (appendix.contains(links[index])) appendix.open = true;
    }
  }
  function schedule() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateSection);
    }
  }
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  updateSection();
})();
