/**
 * GALACTIC SPACE SHOOTER - Core Game Engine
 * Pure Vanilla JavaScript & HTML5 Canvas with Synthesized Web Audio
 */

(function () {
  'use strict';

  // --- Canvas Setup ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  let width = 800;
  let height = 600;

  function resizeCanvas() {
    width = 800;
    height = 600;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // --- Synthesized Web Audio Engine (Zero External MP3s) ---
  let audioCtx = null;
  let isMuted = false;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, startVol = 0.2, endFreq = null) {
    if (isMuted || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), audioCtx.currentTime + duration);
      }
      gain.gain.setValueAtTime(startVol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio fallback
    }
  }

  function playSound(type) {
    if (isMuted) return;
    initAudio();
    if (type === 'laser') {
      playTone(850, 'sawtooth', 0.1, 0.15, 240);
    } else if (type === 'enemyLaser') {
      playTone(450, 'square', 0.12, 0.1, 150);
    } else if (type === 'hit') {
      playTone(180, 'square', 0.15, 0.2, 60);
    } else if (type === 'explosion') {
      playTone(140, 'sawtooth', 0.35, 0.3, 30);
      setTimeout(() => playTone(80, 'square', 0.4, 0.25, 20), 40);
    } else if (type === 'powerup') {
      playTone(523, 'triangle', 0.08, 0.2);
      setTimeout(() => playTone(659, 'triangle', 0.08, 0.2), 70);
      setTimeout(() => playTone(784, 'triangle', 0.08, 0.2), 140);
      setTimeout(() => playTone(1046, 'triangle', 0.18, 0.25), 210);
    } else if (type === 'bomb') {
      playTone(200, 'sawtooth', 0.6, 0.4, 25);
    } else if (type === 'gameover') {
      playTone(320, 'sawtooth', 0.25, 0.3, 180);
      setTimeout(() => playTone(220, 'sawtooth', 0.3, 0.3, 110), 220);
      setTimeout(() => playTone(130, 'sawtooth', 0.6, 0.35, 40), 480);
    }
  }

  // --- Game State ---
  let isRunning = false;
  let isPaused = false;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('galactic_shooter_highscore') || '0', 10);
  let lives = 3;
  let sector = 1;

  // Powerup timers
  let tripleShotTimer = 0;
  let hasShield = false;
  let screenShake = 0;

  // UI Elements
  const scoreVal = document.getElementById('scoreVal');
  const highVal = document.getElementById('highVal');
  const livesVal = document.getElementById('livesVal');
  const sectorVal = document.getElementById('sectorVal');

  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalScoreEl = document.getElementById('finalScore');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const muteBtn = document.getElementById('muteBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  if (highVal) highVal.textContent = highScore;

  // Initialize Pause Button State (Disabled before game begins)
  if (pauseBtn) {
    pauseBtn.disabled = true;
    pauseBtn.style.opacity = '0.4';
    pauseBtn.style.pointerEvents = 'none';
  }

  // --- Parallax Starfield ---
  const stars = [];
  const NUM_STARS = 110;
  for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.2 ? 2.5 : Math.random() < 0.5 ? 1.5 : 1,
      speed: Math.random() * 2 + 0.6,
      opacity: Math.random() * 0.7 + 0.3,
    });
  }

  // --- Player Ship Object ---
  const player = {
    x: width / 2,
    y: height - 80,
    w: 44,
    h: 52,
    speed: 7,
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false,
    isFiring: true,
    fireCooldown: 0,
    fireRate: 12, // frames between shots
  };

  // --- Entity Containers ---
  let lasers = [];
  let enemyLasers = [];
  let enemies = [];
  let powerups = [];
  let particles = [];
  let floatingTexts = [];

  let enemySpawnTimer = 0;
  let boss = null;
  let nextBossScore = 1200;

  // --- Input Listeners ---
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') player.moveLeft = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') player.moveRight = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') player.moveUp = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') player.moveDown = true;
    if (e.code === 'Space') player.isFiring = true;
    if (e.code === 'KeyP') togglePause();
    if (e.code === 'KeyR' && !isRunning) startGame();
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') player.moveLeft = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') player.moveRight = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') player.moveUp = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') player.moveDown = false;
    if (e.code === 'Space') player.isFiring = true; // Auto-fire remains comfortable
  });

  // Pointer / Mouse Glide Support
  canvas.addEventListener('pointermove', (e) => {
    if (!isRunning || isPaused) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    player.x = (e.clientX - rect.left) * scaleX;
    player.y = (e.clientY - rect.top) * scaleY;
    clampPlayer();
  });

  function clampPlayer() {
    player.x = Math.max(player.w / 2, Math.min(width - player.w / 2, player.x));
    player.y = Math.max(player.h / 2 + 50, Math.min(height - player.h / 2, player.y));
  }

  // Mobile On-Screen Touch Buttons
  const touchLeft = document.getElementById('touchLeft');
  const touchRight = document.getElementById('touchRight');
  const touchUp = document.getElementById('touchUp');
  const touchDown = document.getElementById('touchDown');
  const touchFire = document.getElementById('touchFire');

  function bindTouch(el, onDown, onUp) {
    if (!el) return;
    const downHandler = (e) => { e.preventDefault(); onDown(); };
    const upHandler = (e) => { e.preventDefault(); onUp(); };
    el.addEventListener('pointerdown', downHandler);
    el.addEventListener('pointerup', upHandler);
    el.addEventListener('pointerleave', upHandler);
  }

  bindTouch(touchLeft, () => { player.moveLeft = true; }, () => { player.moveLeft = false; });
  bindTouch(touchRight, () => { player.moveRight = true; }, () => { player.moveRight = false; });
  bindTouch(touchUp, () => { player.moveUp = true; }, () => { player.moveUp = false; });
  bindTouch(touchDown, () => { player.moveDown = true; }, () => { player.moveDown = false; });
  bindTouch(touchFire, () => { firePlayerLasers(true); }, () => {});

  // --- Core Lifecycle ---
  function startGame() {
    initAudio();
    isRunning = true;
    isPaused = false;
    score = 0;
    lives = 3;
    sector = 1;
    tripleShotTimer = 0;
    hasShield = false;
    screenShake = 0;
    enemySpawnTimer = 0;
    boss = null;
    nextBossScore = 1200;

    player.x = width / 2;
    player.y = height - 80;
    player.moveLeft = false;
    player.moveRight = false;
    player.moveUp = false;
    player.moveDown = false;

    lasers = [];
    enemyLasers = [];
    enemies = [];
    powerups = [];
    particles = [];
    floatingTexts = [];

    // Enable Pause Button during active flight
    if (pauseBtn) {
      pauseBtn.disabled = false;
      pauseBtn.innerHTML = '⏸️ Pause';
      pauseBtn.style.opacity = '1';
      pauseBtn.style.pointerEvents = 'auto';
    }

    updateHUD();
    startOverlay?.classList.add('hidden');
    gameOverOverlay?.classList.add('hidden');
  }

  function gameOver() {
    isRunning = false;
    isPaused = false;
    playSound('gameover');

    // Disable Pause Button on Game Over
    if (pauseBtn) {
      pauseBtn.disabled = true;
      pauseBtn.innerHTML = '⏸️ Pause';
      pauseBtn.style.opacity = '0.4';
      pauseBtn.style.pointerEvents = 'none';
    }

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('galactic_shooter_highscore', highScore.toString());
      if (highVal) highVal.textContent = highScore;
    }
    if (finalScoreEl) finalScoreEl.textContent = score;
    gameOverOverlay?.classList.remove('hidden');
  }

  function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;
    if (pauseBtn) {
      pauseBtn.innerHTML = isPaused ? '▶️ Resume' : '⏸️ Pause';
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (muteBtn) {
      muteBtn.innerHTML = isMuted ? '🔇 Muted' : '🔊 Sound';
    }
  }

  function updateHUD() {
    if (scoreVal) scoreVal.textContent = score;
    if (sectorVal) sectorVal.textContent = `Sector ${sector}`;
    if (livesVal) {
      let hearts = '';
      for (let i = 0; i < lives; i++) hearts += '🚀';
      if (hasShield) hearts += ' 🛡️';
      if (tripleShotTimer > 0) hearts += ' ⚡';
      livesVal.textContent = hearts || '💥 Hull Destroyed';
    }
  }

  // --- Combat Mechanics ---
  function firePlayerLasers(forced = false) {
    if (!forced && player.fireCooldown > 0) return;

    playSound('laser');
    if (tripleShotTimer > 0) {
      // 3-way spread shot
      lasers.push({ x: player.x, y: player.y - 25, vx: 0, vy: -12, w: 4, h: 14, color: '#38bdf8' });
      lasers.push({ x: player.x - 12, y: player.y - 20, vx: -2.2, vy: -11, w: 4, h: 14, color: '#38bdf8' });
      lasers.push({ x: player.x + 12, y: player.y - 20, vx: 2.2, vy: -11, w: 4, h: 14, color: '#38bdf8' });
    } else {
      // Twin pulse lasers
      lasers.push({ x: player.x - 12, y: player.y - 20, vx: 0, vy: -12, w: 4, h: 14, color: '#38bdf8' });
      lasers.push({ x: player.x + 12, y: player.y - 20, vx: 0, vy: -12, w: 4, h: 14, color: '#38bdf8' });
    }
    player.fireCooldown = player.fireRate;
  }

  // --- Entity Spawning ---
  function spawnEnemy() {
    if (boss) return; // Don't spawn swarms during boss fight

    // Check boss encounter trigger
    if (score >= nextBossScore) {
      spawnBoss();
      return;
    }

    const rand = Math.random();
    if (rand < 0.45) {
      // Scout drone (fast, zig-zag)
      enemies.push({
        type: 'scout',
        x: Math.random() * (width - 80) + 40,
        y: -30,
        w: 32,
        h: 32,
        hp: 1,
        maxHp: 1,
        vx: (Math.random() - 0.5) * 3,
        vy: 2.8 + Math.random() * 1.5,
        color: '#f43f5e',
        scoreVal: 50,
      });
    } else if (rand < 0.75) {
      // Asteroid (durable, rotating)
      const size = Math.random() * 20 + 24;
      enemies.push({
        type: 'asteroid',
        x: Math.random() * (width - 100) + 50,
        y: -40,
        w: size,
        h: size,
        hp: 2,
        maxHp: 2,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 1.8 + Math.random() * 1.2,
        rot: 0,
        rotSpeed: (Math.random() - 0.5) * 0.05,
        color: '#94a3b8',
        scoreVal: 30,
      });
    } else {
      // Cruiser (heavy, shoots back)
      enemies.push({
        type: 'cruiser',
        x: Math.random() * (width - 120) + 60,
        y: -50,
        w: 48,
        h: 56,
        hp: 4,
        maxHp: 4,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1.4,
        shootCooldown: 60,
        color: '#a855f7',
        scoreVal: 150,
      });
    }
  }

  function spawnBoss() {
    boss = {
      x: width / 2,
      y: -100,
      targetY: 90,
      w: 120,
      h: 80,
      hp: 35 + (sector * 10),
      maxHp: 35 + (sector * 10),
      vx: 2.2,
      shootTimer: 45,
      color: '#ef4444',
      scoreVal: 800,
    };
    floatingTexts.push({ x: width / 2, y: 180, text: '⚠️ WARNING: MOTHERSHIP DETECTED! ⚠️', color: '#ef4444', life: 100 });
  }

  function spawnPowerup(x, y) {
    const r = Math.random();
    let type = 'blaster'; // 45% triple blaster
    let color = '#38bdf8';
    let icon = '⚡';

    if (r < 0.3) {
      type = 'shield';
      color = '#a855f7';
      icon = '🛡️';
    } else if (r < 0.5) {
      type = 'bomb';
      color = '#ef4444';
      icon = '💣';
    } else if (r < 0.65) {
      type = 'repair';
      color = '#10b981';
      icon = '🔧';
    }

    powerups.push({ x, y, vy: 1.8, type, color, icon, radius: 16 });
  }

  function triggerEMP() {
    playSound('bomb');
    screenShake = 18;
    // Obliterate all regular enemies on screen
    enemies.forEach((e) => {
      score += e.scoreVal;
      spawnExplosion(e.x, e.y, e.color, 20);
    });
    enemies = [];
    enemyLasers = [];
    if (boss) {
      boss.hp -= 10;
      spawnExplosion(boss.x, boss.y, '#ef4444', 30);
    }
    floatingTexts.push({ x: width / 2, y: height / 2, text: '💥 EMP BLAST DETONATED!', color: '#38bdf8', life: 60 });
    updateHUD();
  }

  function spawnExplosion(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3.5 + 1.5,
        color: color,
        life: 1,
        decay: Math.random() * 0.03 + 0.02,
      });
    }
  }

  // --- Main Update Loop ---
  function update() {
    if (!isRunning || isPaused) return;

    // Screen Shake Decay
    if (screenShake > 0) screenShake--;

    // Starfield Movement
    for (const star of stars) {
      star.y += star.speed;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
    }

    // Player Movement
    if (player.moveLeft) player.x -= player.speed;
    if (player.moveRight) player.x += player.speed;
    if (player.moveUp) player.y -= player.speed;
    if (player.moveDown) player.y += player.speed;
    clampPlayer();

    // Player Shooting (Continuous Fire)
    if (player.isFiring) {
      firePlayerLasers();
    }
    if (player.fireCooldown > 0) player.fireCooldown--;
    if (tripleShotTimer > 0) {
      tripleShotTimer--;
      if (tripleShotTimer === 0) updateHUD();
    }

    // Update Player Lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
      const l = lasers[i];
      l.x += l.vx;
      l.y += l.vy;
      if (l.y < -20 || l.x < -20 || l.x > width + 20) {
        lasers.splice(i, 1);
      }
    }

    // Update Enemy Lasers
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
      const el = enemyLasers[i];
      el.y += el.vy;

      // Player Collision Check
      const dist = Math.hypot(el.x - player.x, el.y - player.y);
      if (dist < 22) {
        enemyLasers.splice(i, 1);
        playerHit();
        continue;
      }

      if (el.y > height + 20) {
        enemyLasers.splice(i, 1);
      }
    }

    // Spawn Normal Enemies
    enemySpawnTimer++;
    if (enemySpawnTimer > Math.max(30, 75 - sector * 5)) {
      spawnEnemy();
      enemySpawnTimer = 0;
    }

    // Update Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.x += e.vx;
      e.y += e.vy;

      if (e.type === 'asteroid' && e.rot !== undefined) {
        e.rot += e.rotSpeed;
      }

      // Cruiser Shoots Lasers Downward
      if (e.type === 'cruiser') {
        e.shootCooldown--;
        if (e.shootCooldown <= 0) {
          playSound('enemyLaser');
          enemyLasers.push({ x: e.x - 14, y: e.y + e.h / 2, vy: 5, color: '#ef4444' });
          enemyLasers.push({ x: e.x + 14, y: e.y + e.h / 2, vy: 5, color: '#ef4444' });
          e.shootCooldown = 90;
        }
      }

      // Check collision with Player Lasers
      for (let j = lasers.length - 1; j >= 0; j--) {
        const l = lasers[j];
        if (
          l.x > e.x - e.w / 2 &&
          l.x < e.x + e.w / 2 &&
          l.y > e.y - e.h / 2 &&
          l.y < e.y + e.h / 2
        ) {
          lasers.splice(j, 1);
          e.hp--;
          spawnExplosion(l.x, l.y, l.color, 4);

          if (e.hp <= 0) {
            score += e.scoreVal;
            playSound('explosion');
            spawnExplosion(e.x, e.y, e.color, 16);

            // Chance to drop power-up (22%)
            if (Math.random() < 0.22) {
              spawnPowerup(e.x, e.y);
            }

            enemies.splice(i, 1);
            updateHUD();
            break;
          }
        }
      }

      // Check collision with Player Ship
      const playerDist = Math.hypot(e.x - player.x, e.y - player.y);
      if (playerDist < (e.w / 2 + 18)) {
        enemies.splice(i, 1);
        spawnExplosion(e.x, e.y, '#f43f5e', 20);
        playerHit();
        continue;
      }

      // Despawn off bottom screen
      if (e.y > height + 60) {
        enemies.splice(i, 1);
      }
    }

    // Update Boss Battles
    if (boss) {
      if (boss.y < boss.targetY) {
        boss.y += 1.5;
      } else {
        boss.x += boss.vx;
        if (boss.x < 100 || boss.x > width - 100) {
          boss.vx *= -1;
        }

        // Boss Weapon Fire
        boss.shootTimer--;
        if (boss.shootTimer <= 0) {
          playSound('enemyLaser');
          enemyLasers.push({ x: boss.x - 35, y: boss.y + 30, vy: 5.5, color: '#ef4444' });
          enemyLasers.push({ x: boss.x, y: boss.y + 35, vy: 6, color: '#ef4444' });
          enemyLasers.push({ x: boss.x + 35, y: boss.y + 30, vy: 5.5, color: '#ef4444' });
          boss.shootTimer = 45;
        }
      }

      // Boss Hit by Lasers
      for (let j = lasers.length - 1; j >= 0; j--) {
        const l = lasers[j];
        if (
          l.x > boss.x - boss.w / 2 &&
          l.x < boss.x + boss.w / 2 &&
          l.y > boss.y - boss.h / 2 &&
          l.y < boss.y + boss.h / 2
        ) {
          lasers.splice(j, 1);
          boss.hp--;
          spawnExplosion(l.x, l.y, '#38bdf8', 3);

          if (boss.hp <= 0) {
            score += boss.scoreVal;
            sector++;
            nextBossScore = score + 1800;
            playSound('bomb');
            screenShake = 25;
            spawnExplosion(boss.x, boss.y, '#ef4444', 45);
            spawnPowerup(boss.x, boss.y);
            floatingTexts.push({ x: width / 2, y: height / 2, text: `🎉 SECTOR ${sector - 1} CLEARED!`, color: '#10b981', life: 90 });
            boss = null;
            updateHUD();
            break;
          }
        }
      }
    }

    // Update Powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.vy;

      // Pickup Collision
      const dist = Math.hypot(p.x - player.x, p.y - player.y);
      if (dist < p.radius + 22) {
        playSound('powerup');
        if (p.type === 'blaster') {
          tripleShotTimer = 480; // 8 seconds of spread shot
          floatingTexts.push({ x: player.x, y: player.y - 30, text: '⚡ TRIPLE BLASTER!', color: '#38bdf8', life: 45 });
        } else if (p.type === 'shield') {
          hasShield = true;
          floatingTexts.push({ x: player.x, y: player.y - 30, text: '🛡️ SHIELD ONLINE!', color: '#a855f7', life: 45 });
        } else if (p.type === 'bomb') {
          triggerEMP();
        } else if (p.type === 'repair') {
          lives = Math.min(5, lives + 1);
          floatingTexts.push({ x: player.x, y: player.y - 30, text: '🔧 HULL REPAIRED +1', color: '#10b981', life: 45 });
        }

        powerups.splice(i, 1);
        updateHUD();
        continue;
      }

      if (p.y > height + 40) {
        powerups.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= pt.decay;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    // Update Floating Text Notifications
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 0.6;
      ft.life--;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  function playerHit() {
    if (hasShield) {
      hasShield = false;
      playSound('hit');
      spawnExplosion(player.x, player.y, '#a855f7', 15);
      floatingTexts.push({ x: player.x, y: player.y - 20, text: '🛡️ SHIELD BROKEN!', color: '#a855f7', life: 40 });
      updateHUD();
      return;
    }

    lives--;
    playSound('hit');
    screenShake = 12;
    spawnExplosion(player.x, player.y, '#f43f5e', 22);
    updateHUD();

    if (lives <= 0) {
      gameOver();
    }
  }

  // --- Rendering Pipeline ---
  function draw() {
    ctx.save();

    // Apply Screen Shake
    if (screenShake > 0) {
      const rx = (Math.random() - 0.5) * screenShake;
      const ry = (Math.random() - 0.5) * screenShake;
      ctx.translate(rx, ry);
    }

    // Background Canvas Fill
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, width, height);

    // Stars
    for (const star of stars) {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // Player Lasers
    for (const l of lasers) {
      ctx.fillStyle = l.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = l.color;
      ctx.fillRect(l.x - l.w / 2, l.y, l.w, l.h);
      ctx.shadowBlur = 0;
    }

    // Enemy Lasers
    for (const el of enemyLasers) {
      ctx.fillStyle = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ef4444';
      ctx.fillRect(el.x - 2, el.y, 4, 12);
      ctx.shadowBlur = 0;
    }

    // Powerups
    for (const p of powerups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.shadowBlur = 15;
      ctx.shadowColor = p.color;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, 0, 0);
      ctx.restore();
    }

    // Enemies
    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.type === 'scout') {
        // Fast triangle scout
        ctx.fillStyle = e.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = e.color;
        ctx.beginPath();
        ctx.moveTo(0, e.h / 2);
        ctx.lineTo(-e.w / 2, -e.h / 2);
        ctx.lineTo(e.w / 2, -e.h / 2);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'asteroid') {
        // Rotating asteroid polygon
        if (e.rot !== undefined) ctx.rotate(e.rot);
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const pts = 7;
        const rad = e.w / 2;
        for (let k = 0; k < pts; k++) {
          const a = (k / pts) * Math.PI * 2;
          const r = rad * (k % 2 === 0 ? 1 : 0.75);
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (e.type === 'cruiser') {
        // Heavy Cruiser
        ctx.fillStyle = '#7c3aed';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(0, e.h / 2);
        ctx.lineTo(-e.w / 2, -e.h / 4);
        ctx.lineTo(-e.w / 3, -e.h / 2);
        ctx.lineTo(e.w / 3, -e.h / 2);
        ctx.lineTo(e.w / 2, -e.h / 4);
        ctx.closePath();
        ctx.fill();

        // Health Bar for Cruiser
        const barW = 32;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-barW / 2, -e.h / 2 - 8, barW, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-barW / 2, -e.h / 2 - 8, barW * (e.hp / e.maxHp), 4);
      }
      ctx.restore();
    }

    // Boss Alien Mothership
    if (boss) {
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.fillStyle = '#b91c1c';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(0, 0, boss.w / 2, boss.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cockpit Dome
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, 10, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Health Bar
      const bW = 100;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-bW / 2, -boss.h / 2 - 14, bW, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-bW / 2, -boss.h / 2 - 14, bW * (boss.hp / boss.maxHp), 6);
      ctx.restore();
    }

    // Particles
    for (const pt of particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Player Starship
    if (isRunning) {
      ctx.save();
      ctx.translate(player.x, player.y);

      // Engine Thruster Flares
      ctx.fillStyle = '#38bdf8';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#06b6d4';
      const flameH = Math.random() * 12 + 10;
      ctx.beginPath();
      ctx.moveTo(-10, player.h / 2 - 4);
      ctx.lineTo(-6, player.h / 2 + flameH);
      ctx.lineTo(-2, player.h / 2 - 4);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(2, player.h / 2 - 4);
      ctx.lineTo(6, player.h / 2 + flameH);
      ctx.lineTo(10, player.h / 2 - 4);
      ctx.fill();

      // Main Ship Hull
      const gradShip = ctx.createLinearGradient(0, -player.h / 2, 0, player.h / 2);
      gradShip.addColorStop(0, '#ffffff');
      gradShip.addColorStop(0.5, '#38bdf8');
      gradShip.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = gradShip;

      ctx.beginPath();
      ctx.moveTo(0, -player.h / 2); // Nose tip
      ctx.lineTo(player.w / 2, player.h / 2); // Right wing tip
      ctx.lineTo(player.w / 4, player.h / 3);
      ctx.lineTo(0, player.h / 2 - 8);
      ctx.lineTo(-player.w / 4, player.h / 3);
      ctx.lineTo(-player.w / 2, player.h / 2); // Left wing tip
      ctx.closePath();
      ctx.fill();

      // Cockpit Glow
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.ellipse(0, -player.h / 6, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Energy Shield Bubble (if active)
      if (hasShield) {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Floating Text Alerts
    for (const ft of floatingTexts) {
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
    }

    // Visual Paused State Overlay
    if (isPaused) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '900 32px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#38bdf8';
      ctx.fillText('⏸️ GAME PAUSED', width / 2, height / 2 - 8);

      ctx.font = '600 15px Outfit, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.shadowBlur = 0;
      ctx.fillText('Press P or click Resume to continue mission', width / 2, height / 2 + 28);
    }

    ctx.restore();
  }

  // --- Animation Frame Loop ---
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // --- Event Bindings ---
  startBtn?.addEventListener('click', startGame);
  restartBtn?.addEventListener('click', startGame);
  pauseBtn?.addEventListener('click', togglePause);
  muteBtn?.addEventListener('click', toggleMute);

  fullscreenBtn?.addEventListener('click', () => {
    const container = document.querySelector('.canvas-container');
    if (!document.fullscreenElement) {
      container?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  requestAnimationFrame(loop);
})();
