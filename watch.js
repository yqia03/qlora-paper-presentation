(() => {
  const watch = document.getElementById('watch');
  const video = watch.querySelector('video');
  const elapsed = watch.querySelector('#elapsed');
  const duration = watch.querySelector('#duration');
  const chapterName = watch.querySelector('#watch-chapter');
  const moments = [...watch.querySelectorAll('.watch-moment')];
  const figures = [...watch.querySelectorAll('#watch-figures figure')];
  const tableFigure = watch.querySelector('[data-return-to-mean]');
  const tableFocus = watch.querySelector('#watch-table-focus');
  const tabs = [...watch.querySelectorAll('[role=tab]')];
  const transcript = watch.querySelector('#transcript-panel');
  const captionBox = watch.querySelector('#captions');
  const followButton = watch.querySelector('#watch-follow');
  const pictureHolds = JSON.parse(document.body.dataset.pictureHolds);
  const chapters = [
    [0, 'Can the weights fit?'], [80, 'Follow one input twice'], [150, 'Choose an NF4 level'],
    [230, 'Count the scales'], [275, 'Follow one optimizer page'], [320, 'Read one column at a time'],
    [365.3, 'What does Table 3 show?'],
  ];

  function formatTime(time) {
    const seconds = Math.floor(time);
    return [Math.floor(seconds / 60), seconds % 60].map(part => String(part).padStart(2, '0')).join(':');
  }

  // The finished film holds a few frames longer to accommodate the narration.
  function pictureTime(time) {
    for (const [start, extra] of pictureHolds) {
      if (time <= start) break;
      time = Math.max(start, time - extra);
    }
    return time;
  }

  const fragment = document.createDocumentFragment();
  const captionButtons = captions.map((cue, index) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'caption-pair';
    row.dataset.cue = index;
    const stamp = document.createElement('time');
    stamp.dateTime = `PT${cue.start}S`;
    stamp.textContent = formatTime(cue.start);
    const english = document.createElement('span');
    english.lang = 'en';
    english.textContent = cue.en;
    const chinese = document.createElement('span');
    chinese.lang = 'zh-Hans';
    chinese.textContent = cue.zh;
    row.append(stamp, english, chinese);
    fragment.append(row);
    return row;
  });
  captionBox.append(fragment);

  let activeIndex = -1;
  let following = true;
  let pendingSeek;

  function setFollowing(value) {
    following = value;
    followButton.setAttribute('aria-pressed', String(value));
  }

  function scrollToCaption(index) {
    const row = captionButtons[index];
    if (!row || transcript.hidden || !following) return;
    const bounds = captionBox.getBoundingClientRect();
    const line = row.getBoundingClientRect();
    if (line.top < bounds.top || line.bottom > bounds.bottom) {
      captionBox.scrollTop += line.top - bounds.top - (bounds.height - line.height) / 2;
    }
  }

  function scrollToPlayback() {
    const next = captions.findIndex(cue => cue.end > video.currentTime);
    scrollToCaption(next < 0 ? captions.length - 1 : next);
  }

  function sync() {
    const time = video.currentTime;
    const picture = pictureTime(time);
    elapsed.textContent = formatTime(time);
    if (Number.isFinite(video.duration)) duration.textContent = formatTime(video.duration);
    chapterName.textContent = chapters.findLast(([start]) => picture >= start)[1];
    for (const moment of moments) {
      const selected = time >= Number(moment.dataset.seek) && (!moment.dataset.until || time < Number(moment.dataset.until));
      if (selected) moment.setAttribute('aria-current', 'time');
      else moment.removeAttribute('aria-current');
    }
    for (const figure of figures) {
      figure.hidden = picture < Number(figure.dataset.start) || (figure.dataset.end && picture >= Number(figure.dataset.end));
      if (!figure.hidden) {
        for (const value of figure.querySelectorAll('[data-from]')) value.hidden = picture < Number(value.dataset.from);
      }
    }
    if (!tableFigure.hidden) {
      const focus = picture < 390.2 || picture >= Number(tableFigure.dataset.returnToMean) ? 'mean' : picture < 415.3 ? '7B' : '65B';
      tableFigure.dataset.focus = focus;
      tableFocus.textContent = {
        mean: 'Mean (8) averages 5-shot MMLU accuracy over four model sizes and two finetuning datasets.',
        '7B': 'Compare BF16, Float4, and NF4 with double quantization for the 7B model trained on FLAN v2.',
        '65B': 'Compare the same three weight formats for the 65B model trained on FLAN v2.',
      }[focus];
    }
    const index = captions.findIndex(cue => cue.start <= time && time < cue.end);
    if (activeIndex !== index) {
      captionButtons[activeIndex]?.classList.remove('current');
      captionButtons[activeIndex]?.removeAttribute('aria-current');
      activeIndex = index;
      if (index >= 0) {
        captionButtons[index].classList.add('current');
        captionButtons[index].setAttribute('aria-current', 'time');
        scrollToCaption(index);
      }
    }
  }

  function seek(time) {
    if (video.readyState === HTMLMediaElement.HAVE_NOTHING) {
      pendingSeek = time;
      if (video.networkState !== HTMLMediaElement.NETWORK_LOADING) video.load();
      return;
    }
    video.currentTime = time;
    sync();
  }

  for (const moment of moments) {
    moment.addEventListener('click', () => {
      seek(Number(moment.dataset.seek));
      if (matchMedia('(max-width: 830px)').matches && video.getBoundingClientRect().top < 0) {
        video.scrollIntoView({ block: 'start' });
      }
    });
  }

  captionBox.addEventListener('click', event => {
    const row = event.target.closest('button[data-cue]');
    if (row) seek(captions[Number(row.dataset.cue)].start);
  });
  for (const event of ['wheel', 'touchmove']) {
    captionBox.addEventListener(event, () => setFollowing(false), { passive: true });
  }
  captionBox.addEventListener('keydown', event => {
    if (['Tab', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) setFollowing(false);
  });
  followButton.addEventListener('click', () => {
    setFollowing(!following);
    if (following) scrollToPlayback();
  });

  function selectTab(tab) {
    for (const item of tabs) {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    }
    if (!transcript.hidden) scrollToPlayback();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectTab(tabs[next]);
      tabs[next].focus();
    });
  });

  const levels = [-1, -.696, -.525, -.395, -.284, -.185, -.091, 0, .080, .1609302, .246, .338, .441, .563, .723, 1];
  function markLevels(selector, min, max) {
    const axis = watch.querySelector(selector);
    for (const level of levels.filter(level => min <= level && level <= max)) {
      const tick = document.createElement('i');
      tick.setAttribute('aria-hidden', 'true');
      tick.style.left = `${(level - min) / (max - min) * 100}%`;
      axis.append(tick);
    }
  }
  markLevels('.mini-axis', -1, 1);
  markLevels('.full-scale', -1, 1);
  markLevels('.zoom-scale', 0, .25);
  video.addEventListener('loadedmetadata', () => {
    if (pendingSeek !== undefined) {
      video.currentTime = pendingSeek;
      pendingSeek = undefined;
    }
    sync();
  });
  for (const event of ['timeupdate', 'seeking', 'seeked', 'durationchange', 'ended']) video.addEventListener(event, sync);
  sync();
})();
