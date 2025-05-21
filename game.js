// --- FULL game.js WITH MOVING PLATFORM + MOBILE SWIPE SUPPORT ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restartBtn');
const mainMenu = document.getElementById('mainMenu');
const startBtn = document.getElementById('startBtn');
const levelCompleteOverlay = document.getElementById('levelCompleteOverlay');
const levelCompleteText = document.getElementById('levelCompleteText');
const nextLevelBtn = document.getElementById('nextLevelBtn');

let gameState = 'menu';
let animationFrameId = null;

const mario = {
  x: 50, y: 300, width: 40, height: 40,
  dy: 0, speed: 3.2, gravity: 1,
  jumpPower: -20, grounded: false,
  jumps: 0, maxJumps: 2
};

let score = 0;
let gameOver = false;
let gameWon = false;
let timer = 60;
let showMessage = false;
let messageTimer = 0;
let currentLevelIndex = 0;
let platforms = [], coins = [], enemies = [], flag = {};

const levels = [
  {
    platforms: [
      { x: 0, y: canvas.height - 10, width: canvas.width, height: 10 },
      { x: 200, y: 320, width: 150, height: 10 },
      { x: 370, y: 270, width: 150, height: 10 },
      { x: 540, y: 220, width: 150, height: 10 }
    ],
    coins: [
      { x: 230, y: 290, width: 20, height: 20 },
      { x: 400, y: 240, width: 20, height: 20 },
      { x: 570, y: 190, width: 20, height: 20 }
    ],
    enemies: [
      { x: 210, platformIndex: 1, speed: 0.9, direction: 1 },
      { x: 390, platformIndex: 2, speed: 0.9, direction: -1 }
    ],
    flag: { x: 700, y: canvas.height - 70, width: 40, height: 60 }
  },
  {
    platforms: [
      { x: 0, y: canvas.height - 10, width: canvas.width, height: 10 },
      { x: 100, y: 320, width: 100, height: 10 },
      { x: 250, y: 260, width: 100, height: 10 },
      { x: 400, y: 200, width: 100, height: 10 }
    ],
    coins: [
      { x: 130, y: 290, width: 20, height: 20 },
      { x: 280, y: 230, width: 20, height: 20 },
      { x: 430, y: 170, width: 20, height: 20 }
    ],
    enemies: [
      { x: 110, platformIndex: 1, speed: 1.0, direction: 1 },
      { x: 260, platformIndex: 2, speed: 1.0, direction: -1 }
    ],
    flag: { x: 680, y: 80, width: 40, height: 60 }
  },
  {
    platforms: [
      { x: 0, y: canvas.height - 10, width: canvas.width, height: 10 },
      { x: 150, y: 300, width: 100, height: 10 },
      { x: 300, y: 240, width: 100, height: 10 },
      { x: 500, y: 180, width: 100, height: 10, moving: true, direction: 1, range: 80, speed: 1 }
    ],
    coins: [
      { x: 160, y: 270, width: 20, height: 20 },
      { x: 310, y: 210, width: 20, height: 20 },
      { x: 510, y: 150, width: 20, height: 20 }
    ],
    enemies: [
      { x: 160, platformIndex: 1, speed: 1.0, direction: 1 },
      { x: 510, platformIndex: 3, speed: 1.0, direction: -1 }
    ],
    flag: { x: 700, y: 120, width: 40, height: 60 }
  }
];

function loadLevel(index) {
  const level = levels[index];
  platforms = level.platforms.map(p => ({ ...p, originalX: p.x }));
  coins = level.coins.map(c => ({ ...c, collected: false }));
  flag = { ...level.flag };
  enemies = level.enemies.map(e => {
    const p = platforms[e.platformIndex];
    return {
      x: e.x, y: p.y - 40, width: 40, height: 40,
      speed: e.speed, direction: e.direction,
      platform: p, startDelay: 30
    };
  });
  mario.x = 50;
  mario.y = 300;
  mario.dy = 0;
  mario.jumps = 0;
  timer = 60;
  showMessage = false;
  messageTimer = 0;
  gameOver = false;
  gameWon = false;
}

function update() {
  if (gameState !== 'playing') return;

  for (let p of platforms) {
    if (p.moving) {
      p.x += p.speed * p.direction;
      if (p.x > p.originalX + p.range || p.x < p.originalX - p.range) {
        p.direction *= -1;
      }
    }
  }

  mario.grounded = false;
  if (keys['ArrowRight'] || keys['KeyD']) mario.x += mario.speed;
  if (keys['ArrowLeft'] || keys['KeyA']) mario.x -= mario.speed;

  mario.dy += mario.gravity;
  for (let p of platforms) {
    if (checkCollision(mario, p)) {
      mario.y = p.y - mario.height;
      mario.dy = 0;
      mario.grounded = true;
      mario.jumps = 0;
    }
  }

  mario.y += mario.dy;
  if (mario.x < 0) mario.x = 0;
  if (mario.x + mario.width > canvas.width) mario.x = canvas.width - mario.width;
  if (mario.y + mario.height > canvas.height) {
    gameOver = true;
    gameOverSound.play();
  }

  for (let c of coins) {
    if (!c.collected && isColliding(mario, c)) {
      c.collected = true;
      score++;
      coinSound.play();
    }
  }

  for (let e of enemies) {
    if (e.startDelay > 0) e.startDelay--;
    else {
      e.x += e.speed * e.direction;
      if (e.x <= e.platform.x || e.x + e.width >= e.platform.x + e.platform.width) e.direction *= -1;
    }

    if (isColliding(mario, e)) {
      const stomp = mario.dy > 0 && (mario.y + mario.height - e.y) < 15;
      if (stomp) {
        mario.dy = mario.jumpPower / 2;
        e.x = -1000;
        score++;
      } else {
        gameOver = true;
        gameOverSound.play();
      }
    }
  }

  if (isColliding(mario, flag)) {
    if (coins.every(c => c.collected)) {
      if (currentLevelIndex + 1 < levels.length) {
        levelCompleteText.textContent = `Level ${currentLevelIndex + 1} Complete!`;
        levelCompleteOverlay.style.display = 'flex';
        gameState = 'paused';
        return;
      } else gameWon = true;
    } else {
      showMessage = true;
      messageTimer = 120;
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'green';
  platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
  coins.forEach(c => {
    if (!c.collected) ctx.drawImage(coinImg, c.x, c.y, c.width, c.height);
  });
  enemies.forEach(e => ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height));
  ctx.drawImage(flagImg, flag.x, flag.y, flag.width, flag.height);
  ctx.drawImage(marioImg, mario.x, mario.y, mario.width, mario.height);
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.fillText(`Time: ${timer}`, 700, 30);

  if (showMessage && messageTimer > 0) {
    ctx.font = '16px Arial';
    ctx.fillStyle = 'red';
    ctx.fillText("Collect all coins to win!", canvas.width / 2 - 80, 60);
    messageTimer--;
    if (messageTimer === 0) showMessage = false;
  }

  animationFrameId = requestAnimationFrame(update);
}

setInterval(() => {
  if (gameState === 'playing' && !gameOver && !gameWon && timer > 0) {
    timer--;
    if (timer === 0) {
      gameOver = true;
      gameOverSound.play();
    }
  }
}, 1000);

function isColliding(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

function checkCollision(player, platform) {
  return player.x < platform.x + platform.width &&
         player.x + player.width > platform.x &&
         player.y + player.height <= platform.y + 5 &&
         player.y + player.height + player.dy >= platform.y;
}

const marioImg = new Image(); marioImg.src = 'assets/mario.png';
const coinImg = new Image(); coinImg.src = 'assets/coin.png';
const enemyImg = new Image(); enemyImg.src = 'assets/enemy.png';
const flagImg = new Image(); flagImg.src = 'assets/flag.png';
const jumpSound = new Audio('assets/jump.wav');
const coinSound = new Audio('assets/coin.wav');
const gameOverSound = new Audio('assets/gameover.wav');

let keys = {};
let jumpPressed = false;

document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !jumpPressed) {
    jumpPressed = true;
    if (mario.jumps < mario.maxJumps) {
      mario.dy = mario.jumpPower;
      mario.jumps++;
      jumpSound.play();
    }
  }
  if (e.code === 'KeyR') {
    if (gameOver) restartLevel();
    else if (gameWon) location.reload();
  }
});

document.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (["Space", "ArrowUp", "KeyW"].includes(e.code)) jumpPressed = false;
});

restartBtn.addEventListener('click', () => {
  if (gameOver) restartLevel();
  else if (gameWon) location.reload();
});

startBtn.addEventListener('click', () => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  gameState = 'playing';
  mainMenu.style.display = 'none';
  loadLevel(currentLevelIndex);
  update();
});

nextLevelBtn.addEventListener('click', () => {
  currentLevelIndex++;
  levelCompleteOverlay.style.display = 'none';
  gameState = 'playing';
  loadLevel(currentLevelIndex);
  update();
});

function restartLevel() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  loadLevel(currentLevelIndex);
  update();
}

// --- Mobile Swipe Support ---
let touchStartX = 0, touchStartY = 0, touchEndX = 0, touchEndY = 0;

function handleSwipe() {
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  const minSwipeDistance = 30;

  if (absDx > absDy && absDx > minSwipeDistance) {
    if (dx > 0) keys['ArrowRight'] = true;
    else keys['ArrowLeft'] = true;
    setTimeout(() => {
      keys['ArrowRight'] = false;
      keys['ArrowLeft'] = false;
    }, 200);
  } else if (dy < -minSwipeDistance) {
    if (!jumpPressed && mario.jumps < mario.maxJumps) {
      mario.dy = mario.jumpPower;
      mario.jumps++;
      jumpSound.play();
      jumpPressed = true;
      setTimeout(() => jumpPressed = false, 150);
    }
  }
}

document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].clientX;
  touchEndY = e.changedTouches[0].clientY;
  handleSwipe();
}, { passive: false });
