const video = document.querySelector("video");
const player = document.querySelector("#player");

for (const button of document.querySelectorAll("[data-seek]")) {
  button.addEventListener("click", () => {
    video.currentTime = Number(button.dataset.seek);
    syncReading();
    player.scrollIntoView({ block: "start" });
    video.focus({ preventScroll: true });
  });
}

const captionBox = document.querySelector("#captions");
const template = document.querySelector("#caption-pair");
const captionPairs = captions.map(cue => {
  const pair = template.content.firstElementChild.cloneNode(true);
  pair.querySelector("[lang=en]").textContent = cue.en;
  pair.querySelector("[lang=zh-Hans]").textContent = cue.zh;
  captionBox.append(pair);
  return pair;
});
let activeCaption;
const elapsed = document.querySelector("#elapsed");
const duration = document.querySelector("#duration");
const returnToMean = Number(document.querySelector("[data-return-to-mean]").dataset.returnToMean);

function formatTime(time) {
  if (!Number.isFinite(time)) return "--:--";
  const seconds = Math.floor(time);
  return [Math.floor(seconds / 60), seconds % 60]
    .map(part => String(part).padStart(2, "0")).join(":");
}

// Each extra interval keeps its original video frame on screen.
const pictureHolds = JSON.parse(document.body.dataset.pictureHolds);
function pictureTime(filmTime) {
  let second = filmTime;
  for (const [start, extra] of pictureHolds) {
    if (second <= start) break;
    second = Math.max(start, second - extra);
  }
  return second;
}

function syncReading() {
  const time = video.currentTime;
  const picture = pictureTime(time);
  elapsed.textContent = formatTime(time);
  duration.textContent = formatTime(video.duration);
  for (const figure of document.querySelectorAll("figure[data-start]")) {
    figure.hidden = picture < Number(figure.dataset.start) ||
      (figure.dataset.end !== undefined && picture >= Number(figure.dataset.end));
    if (!figure.hidden) {
      for (const value of figure.querySelectorAll("[data-from]")) {
        value.hidden = picture < Number(value.dataset.from);
      }
    }
  }
  const focus = picture < 390.2 || picture >= returnToMean ? "mean" : picture < 415.3 ? "7B" : "65B";
  for (const row of document.querySelectorAll("[data-focus]")) {
    row.classList.toggle("reading", row.dataset.focus === focus);
  }
  captionBox.hidden = !captions.length || time < captions[0].start || time >= captions.at(-1).end;
  const index = captions.findIndex(cue => cue.start <= time && time < cue.end);
  const nextCaption = captionPairs[index];
  if (nextCaption !== activeCaption) {
    activeCaption?.classList.remove("current");
    nextCaption?.classList.add("current");
    activeCaption = nextCaption;
  }
}

for (const event of ["loadedmetadata", "durationchange", "timeupdate", "seeking", "seeked", "ended"]) {
  video.addEventListener(event, syncReading);
}
syncReading();

const levels = [-1, -.696, -.525, -.395, -.284, -.185, -.091, 0, .080, .1609302, .246, .338, .441, .563, .723, 1];
function markLevels(selector, min, max) {
  const axis = document.querySelector(selector);
  for (const level of levels.filter(value => value >= min && value <= max)) {
    const tick = document.createElement("i");
    tick.className = "tick";
    tick.style.left = ((level - min) / (max - min) * 100) + "%";
    axis.append(tick);
  }
}
markLevels(".full-scale", -1, 1);
markLevels(".zoom-scale", 0, .25);
