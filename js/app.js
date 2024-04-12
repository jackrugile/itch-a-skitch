let domDownload = document.querySelector(".download"),
  domNewSkitch = document.querySelector(".new-skitch"),
  domLoader = document.querySelector(".loader"),
  domDirectionsTitle = document.querySelector(".directions-title"),
  domDirectionsOverlay = document.querySelector(".directions-overlay"),
  domCanvas = document.querySelector("canvas"),
  ctx = domCanvas.getContext("2d"),
  width = (domCanvas.width = 800),
  height = (domCanvas.height = 600),
  direction = {
    up: false,
    right: false,
    down: false,
    left: false,
  },
  colors = {
    background: "hsl(7, 55%, 55%)",
    screen: "hsl(20, 17%, 85%)",
    knobInner: "hsl(7, 35%, 95%)",
    knobOuter: "hsl(7, 45%, 45%)",
    path: "hsla(35, 10%, 18%, .6)",
    shadow: "hsla(0, 0%, 100%, 0.75)",
  },
  screen = {
    x: 75,
    y: 75,
    width: width - 150,
    height: height - 225,
  },
  cursor = new Cursor(),
  knobLeft = new Knob({
    type: "horizontal",
    x: 75 + 38,
    y: height - 75,
  }),
  knobRight = new Knob({
    type: "vertical",
    x: width - 75 - 38,
    y: height - 75,
  }),
  path = [],
  ableTo = {
    undo: false,
    download: false,
    newSkitch: false,
  },
  redrawFlag = false,
  eraseTimeout = null,
  oldTime = null,
  currTime = null,
  deltaTime = null,
  raf = null,
  loading = false,
  hasInteracted = false;

function random(min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }

  return Math.random() * (max - min) + min;
}

/*=========================================================================*/
/* Initialize */
/*=========================================================================*/

function init() {
  oldTime = Date.now();
  currTime = Date.now();
  deltaTime = 0;

  cursor.reset();

  path.push([cursor.x, cursor.y]);

  ctx.lineCap = "round";
  redrawFlag = true;
  loop();
}

/*=========================================================================*/
/* Cursor Constructor */
/*=========================================================================*/

function Cursor() {}

Cursor.prototype.reset = function () {
  this.x = width / 2;
  this.y = screen.y + screen.height / 2;
  this.ox = this.x;
  this.oy = this.y;
  this.vx = 0;
  this.vy = 0;
  this.vMax = 0.1;
  this.moving = false;
  this.omoving = this.moving;
};

/*=========================================================================*/
/* Cursor Update */
/*=========================================================================*/

Cursor.prototype.update = function () {
  this.ox = this.x;
  this.oy = this.y;

  if (direction.up) {
    this.vy = -this.vMax;
  }
  if (direction.right) {
    this.vx = this.vMax;
  }
  if (direction.down) {
    this.vy = this.vMax;
  }
  if (direction.left) {
    this.vx = -this.vMax;
  }

  this.x += this.vx * deltaTime;
  this.y += this.vy * deltaTime;

  if (!direction.up && !direction.down) {
    this.vy = 0;
  }
  if (!direction.left && !direction.right) {
    this.vx = 0;
  }

  if (this.x > screen.x + screen.width - 1) {
    this.x = screen.x + screen.width - 1;
  }
  if (this.x < screen.x + 1) {
    this.x = screen.x + 1;
  }
  if (this.y > screen.y + screen.height - 1) {
    this.y = screen.y + screen.height - 1;
  }
  if (this.y < screen.y + 1) {
    this.y = screen.y + 1;
  }

  this.omoving = this.moving;
  if (this.x != this.ox || this.y != this.oy) {
    this.moving = true;
  } else {
    this.moving = false;
  }

  if (this.moving) {
    path.push([this.x, this.y]);
  }
};

/*=========================================================================*/
/* Knob Constructor */
/*=========================================================================*/

function Knob(config) {
  this.type = config.type;
  this.x = config.x;
  this.y = config.y;
  this.radius = 38;
  this.rotation = -Math.PI / 2;
  this.speed = 0.003;
}

Knob.prototype.reset = function () {
  this.rotation = -Math.PI / 2;
};

/*=========================================================================*/
/* Knob Update */
/*=========================================================================*/

Knob.prototype.update = function () {
  if (this.type == "horizontal") {
    if (direction.right && cursor.x < screen.x + screen.width - 1) {
      this.rotation += this.speed * deltaTime;
    }
    if (direction.left && cursor.x > screen.x + 1) {
      this.rotation -= this.speed * deltaTime;
    }
  } else {
    if (direction.up && cursor.y > screen.y + 1) {
      this.rotation += this.speed * deltaTime;
    }
    if (direction.down && cursor.y < screen.y + screen.height - 1) {
      this.rotation -= this.speed * deltaTime;
    }
  }
};

/*=========================================================================*/
/* Knob Render */
/*=========================================================================*/

Knob.prototype.render = function () {
  ctx.save();

  ctx.beginPath();
  ctx.rect(
    this.x - this.radius - 5,
    this.y - this.radius - 5,
    this.radius * 2 + 10,
    this.radius * 2 + 10
  );
  ctx.fillStyle = colors.background;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2, false);
  ctx.fillStyle = colors.knobOuter;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
  ctx.fillStyle = colors.knobInner;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(this.x, this.y);
  ctx.lineTo(
    this.x + Math.cos(this.rotation) * this.radius,
    this.y + Math.sin(this.rotation) * this.radius
  );
  ctx.lineWidth = 4;
  ctx.strokeStyle = colors.knobOuter;
  ctx.stroke();

  ctx.restore();
};

/*=========================================================================*/
/* Render Background */
/*=========================================================================*/

function renderBackground() {
  ctx.save();
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/*=========================================================================*/
/* Render Screen */
/*=========================================================================*/

function renderScreen() {
  ctx.save();
  ctx.fillStyle = colors.screen;
  ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
  ctx.restore();
}

/*=========================================================================*/
/* Render Segments and Paths */
/*=========================================================================*/

function renderSegment(x1, y1, x2, y2) {
  ctx.save();
  if (random(0, 1) > 0.75 / deltaTime) {
    ctx.shadowBlur = 4;
    ctx.shadowColor = colors.shadow;
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = colors.path;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  if (random(0, 1) > 0.5 / deltaTime) {
    ctx.fillStyle = `hsl(0, 0%, ${random(40, 100)}%)`;
    ctx.fillRect(
      x1 + random(-2, 2),
      y1 + random(-2, 2),
      random(0.5, 1),
      random(0.5, 1)
    );
  }
  ctx.restore();
}

function renderPartialPath() {
  ctx.save();
  ctx.beginPath();
  ctx.rect(screen.x, screen.y, screen.width, screen.height);
  ctx.clip();
  renderSegment(cursor.ox, cursor.oy, cursor.x, cursor.y);
  ctx.restore();
}

function renderFullPath() {
  ctx.save();
  ctx.beginPath();
  ctx.rect(screen.x, screen.y, screen.width, screen.height);
  ctx.clip();
  const length = path.length;
  for (let i = 0; i < length - 1; i++) {
    renderSegment(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]);
  }
  ctx.restore();
}

/*=========================================================================*/
/* Download */
/*=========================================================================*/

function download() {
  if (ableTo.download) {
    const dataUrl = getDataUrl();
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `itch-a-skitch-${Date.now()}.png`;
    a.click();
    domDownload.blur();
  }
}

function enableDownload() {
  ableTo.download = true;
  domDownload.classList.remove("disabled");
}

function disableDownload() {
  ableTo.download = false;
  domDownload.classList.add("disabled");
}

domDownload.addEventListener("click", download);

/*=========================================================================*/
/* New Skitch */
/*=========================================================================*/

function newSkitch() {
  if (ableTo.newSkitch) {
    for (let prop in direction) {
      direction[prop] = false;
    }
    if (
      window.confirm("Are you sure you want to erase and create a new skitch?")
    ) {
      toggleLoading();
      window.clearTimeout(eraseTimeout);
      eraseTimeout = window.setTimeout(function () {
        path.length = 0;
        redrawFlag = true;
        disableDownload();
        disableNewSkitch();
        toggleLoading();
        hasInteracted = false;
        domNewSkitch.blur();
      }, 700);
    }
  }
}

function enableNewSkitch() {
  ableTo.newSkitch = true;
  domNewSkitch.classList.remove("disabled");
}

function disableNewSkitch() {
  ableTo.newSkitch = false;
  domNewSkitch.classList.add("disabled");
}

domNewSkitch.addEventListener("click", newSkitch);

/*=========================================================================*/
/* Get Data URL */
/*=========================================================================*/

function getDataUrl() {
  const knobLeftRotation = knobLeft.rotation;
  const knobRightRotation = knobRight.rotation;
  knobLeft.rotation = knobRight.rotation = -Math.PI / 2;
  knobLeft.render();
  knobRight.render();
  const dataUrl = domCanvas.toDataURL();
  knobLeft.rotation = knobLeftRotation;
  knobRight.rotation = knobRightRotation;
  knobLeft.render();
  knobRight.render();
  return dataUrl;
}

/*=========================================================================*/
/* Toggle Loading */
/*=========================================================================*/

function toggleLoading() {
  if (loading) {
    loading = false;
    domLoader.classList.remove("loading");
  } else {
    loading = true;
    domLoader.classList.add("loading");
  }
}

/*=========================================================================*/
/* Key Controls */
/*=========================================================================*/

window.addEventListener("keydown", function (e) {
  const key = e.keyCode;
  if ([37, 38, 39, 40, 65, 68, 83, 87].includes(key)) {
    e.preventDefault();
    if (!hasInteracted) {
      domDirectionsTitle.classList.remove("hidden");
      domDirectionsOverlay.classList.add("hidden");
      enableDownload();
      enableNewSkitch();
      hasInteracted = true;
    }
  }
  if (key == 38 || key == 87) {
    direction.up = true;
  }
  if (key == 39 || key == 68) {
    direction.right = true;
  }
  if (key == 40 || key == 83) {
    direction.down = true;
  }
  if (key == 37 || key == 65) {
    direction.left = true;
  }
});

window.addEventListener("keyup", function (e) {
  const key = e.keyCode;
  if ([37, 38, 39, 40, 65, 68, 83, 87].includes(key)) {
    e.preventDefault();
  }
  if (key == 38 || key == 87) {
    direction.up = false;
  }
  if (key == 39 || key == 68) {
    direction.right = false;
  }
  if (key == 40 || key == 83) {
    direction.down = false;
  }
  if (key == 37 || key == 65) {
    direction.left = false;
  }
});

/*=========================================================================*/
/* Page Visibility */
/*=========================================================================*/

document.addEventListener("visibilitychange", () => {
  for (const prop in direction) {
    direction[prop] = false;
  }

  oldTime = Date.now();
  currTime = Date.now();
  deltaTime = 0;

  window.cancelAnimationFrame(raf);

  if (document.visibilityState === "visible") {
    loop();
  }
});

/*=========================================================================*/
/* Loop */
/*=========================================================================*/

function loop() {
  oldTime = currTime;
  currTime = Date.now();
  deltaTime = currTime - oldTime;

  cursor.update();
  knobLeft.update();
  knobRight.update();

  if (cursor.moving) {
    renderPartialPath();
    knobLeft.render();
    knobRight.render();
  }

  if (redrawFlag) {
    renderBackground();
    renderScreen();
    renderFullPath();
    knobLeft.render();
    knobRight.render();
    redrawFlag = false;
  }

  raf = window.requestAnimationFrame(loop);
}

init();
