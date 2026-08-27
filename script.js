  <script>
        // Sistema de Áudio Sintetizado (Web Audio API)
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        const soundEffects = {
            jump: () => {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.15);
            },
            shoot: () => {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
            },
            grenadeThrow: () => {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, audioCtx.currentTime);
                osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.25);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.25);
            },
            explosion: () => {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                // Ruído branco para explosão realista
                const bufferSize = audioCtx.sampleRate * 0.4;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = audioCtx.createBufferSource();
                noise.buffer = buffer;
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, audioCtx.currentTime);
                filter.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.4);
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(audioCtx.destination);
                noise.start();
            },
            collect: () => {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, audioCtx.currentTime);
                osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.2);
            }
        };

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        let gameState = 'START';
        let score = 0;
        let lives = 3;
        let phase = 1;
        let gameSpeed = 4;

        const player = {
            x: 100,
            y: 270,
            width: 45,
            height: 70,
            vx: 0,
            vy: 0,
            speed: 5,
            gravity: 0.8,
            jumpForce: -13,
            isJumping: false,
            facing: 'right'
        };

        let obstacles = [];
        let collectibles = [];
        let bullets = [];
        let grenades = [];
        let frameCount = 0;

        const phaseNames = {
            1: "1 - O Sertão Seco",
            2: "2 - A Noite de São João",
            3: "3 - O Forró da Cidade"
        };

        const keys = { left: false, right: false };

        window.addEventListener('keydown', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
            if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') {
                e.preventDefault();
                jump();
            }
            if (e.code === 'KeyX' || e.code === 'KeyJ') shootBullet();
            if (e.code === 'KeyC' || e.code === 'KeyK') throwGrenade();
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
        });

        const bindControl = (id, actionDown, actionUp) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('mousedown', actionDown);
            el.addEventListener('mouseup', actionUp);
            el.addEventListener('mouseleave', actionUp);
            el.addEventListener('touchstart', (e) => { e.preventDefault(); actionDown(); });
            el.addEventListener('touchend', (e) => { e.preventDefault(); actionUp(); });
        };

        bindControl('btn-left', () => keys.left = true, () => keys.left = false);
        bindControl('btn-right', () => keys.right = true, () => keys.right = false);
        document.getElementById('btn-up').addEventListener('click', jump);
        document.getElementById('btn-shoot').addEventListener('click', shootBullet);
        document.getElementById('btn-grenade').addEventListener('click', throwGrenade);

        function jump() {
            if (gameState === 'PLAYING' && !player.isJumping) {
                player.vy = player.jumpForce;
                player.isJumping = true;
                soundEffects.jump();
            }
        }

        function shootBullet() {
            if (gameState !== 'PLAYING') return;
            bullets.push({
                x: player.facing === 'right' ? player.x + player.width : player.x - 15,
                y: player.y + 25,
                vx: player.facing === 'right' ? 10 : -10,
                width: 12,
                height: 4
            });
            soundEffects.shoot();
        }

        function throwGrenade() {
            if (gameState !== 'PLAYING') return;
            grenades.push({
                x: player.x + 20,
                y: player.y + 10,
                vx: player.facing === 'right' ? 6 : -6,
                vy: -8,
                gravity: 0.5,
                radius: 8
            });
            soundEffects.grenadeThrow();
        }

        function startGame() {
            document.getElementById('start-screen').classList.add('hidden');
            resetValues();
            gameState = 'PLAYING';
            loop();
        }

        function restartGame() {
            document.getElementById('gameover-screen').classList.add('hidden');
            document.getElementById('win-screen').classList.add('hidden');
            resetValues();
            gameState = 'PLAYING';
        }

        function resetValues() {
            score = 0;
            lives = 3;
            phase = 1;
            gameSpeed = 4;
            player.x = 100;
            player.y = 270;
            player.vy = 0;
            obstacles = [];
            collectibles = [];
            bullets = [];
            grenades = [];
            frameCount = 0;
            updateHUD();
        }

        function updateHUD() {
            document.getElementById('hud-score').innerText = `Bandeirinhas: ${score}`;
            document.getElementById('hud-phase').innerText = `Fase: ${phaseNames[phase]}`;
            document.getElementById('hud-lives').innerText = `Vidas: ${lives}`;
        }

        function spawnObjects() {
            if (frameCount % Math.max(50, 120 - (phase * 20)) === 0) {
                const type = Math.random() > 0.4 ? 'fogueira' : 'cacto';
                obstacles.push({
                    x: canvas.width,
                    y: type === 'fogueira' ? 310 : 290,
                    width: type === 'fogueira' ? 35 : 30,
                    height: type === 'fogueira' ? 30 : 50,
                    type: type
                });
            }

            if (frameCount % 80 === 0) {
                collectibles.push({
                    x: canvas.width,
                    y: 200 + (Math.random() * 60 - 30),
                    width: 25,
                    height: 25
                });
            }
        }

        function update() {
            if (gameState !== 'PLAYING') return;
            frameCount++;

            if (keys.left) {
                player.x -= player.speed;
                player.facing = 'left';
            }
            if (keys.right) {
                player.x += player.speed;
                player.facing = 'right';
            }
            if (player.x < 20) player.x = 20;
            if (player.x > canvas.width - 60) player.x = canvas.width - 60;

            player.vy += player.gravity;
            player.y += player.vy;
            if (player.y > 270) {
                player.y = 270;
                player.vy = 0;
                player.isJumping = false;
            }

            if (score >= 20 && phase === 1) { phase = 2; gameSpeed = 6; }
            else if (score >= 40 && phase === 2) { phase = 3; gameSpeed = 8; }
            else if (score >= 60 && phase === 3) {
                gameState = 'WIN';
                document.getElementById('win-screen').classList.remove('hidden');
            }

            spawnObjects();

            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].x += bullets[i].vx;
                if (bullets[i].x > canvas.width || bullets[i].x < 0) bullets.splice(i, 1);
            }

            for (let i = grenades.length - 1; i >= 0; i--) {
                grenades[i].vy += grenades[i].gravity;
                grenades[i].x += grenades[i].vx;
                grenades[i].y += grenades[i].vy;
                if (grenades[i].y > 330) {
                    soundEffects.explosion();
                    obstacles = obstacles.filter(obs => Math.abs(obs.x - grenades[i].x) > 80);
                    grenades.splice(i, 1);
                }
            }

            for (let i = obstacles.length - 1; i >= 0; i--) {
                obstacles[i].x -= gameSpeed;

                if (
                    player.x < obstacles[i].x + obstacles[i].width &&
                    player.x + player.width > obstacles[i].x &&
                    player.y < obstacles[i].y + obstacles[i].height &&
                    player.y + player.height > obstacles[i].y
                ) {
                    lives--;
                    obstacles.splice(i, 1);
                    soundEffects.explosion(); // Som de dano/impacto
                    updateHUD();
                    if (lives <= 0) {
                        gameState = 'GAMEOVER';
                        document.getElementById('gameover-screen').classList.remove('hidden');
                    }
                    continue;
                }

                if (obstacles[i] && obstacles[i].x + obstacles[i].width < 0) {
                    obstacles.splice(i, 1);
                }
            }

            for (let i = collectibles.length - 1; i >= 0; i--) {
                collectibles[i].x -= gameSpeed;
                if (
                    player.x < collectibles[i].x + collectibles[i].width &&
                    player.x + player.width > collectibles[i].x &&
                    player.y < collectibles[i].y + collectibles[i].height &&
                    player.y + player.height > collectibles[i].y
                ) {
                    score += 2;
                    collectibles.splice(i, 1);
                    soundEffects.collect();
                    updateHUD();
                    continue;
                }
                if (collectibles[i] && collectibles[i].x + collectibles[i].width < 0) {
                    collectibles.splice(i, 1);
                }
            }
        }

        function drawBackground() {
            ctx.fillStyle = phase === 1 ? '#7c2d12' : (phase === 2 ? '#0f172a' : '#311026');
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 30);
            for (let x = 40; x < canvas.width + 40; x += 60) {
                ctx.lineTo(x, 45);
                ctx.lineTo(x + 30, 30);
            }
            ctx.stroke();

            ctx.fillStyle = phase === 1 ? '#b45309' : (phase === 2 ? '#451a03' : '#701a75');
            ctx.fillRect(0, 340, canvas.width, 60);
        }

        function drawPlayer() {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(player.x + 10, player.y + 25, 25, 30);

            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(player.x + 15, player.y + 55, 15, 15);

            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(player.x + 12, player.y + 10, 20, 18);

            ctx.fillStyle = '#292524';
            ctx.beginPath();
            ctx.moveTo(player.x + 2, player.y + 12);
            ctx.lineTo(player.x + 42, player.y + 12);
            ctx.lineTo(player.x + 22, player.y - 4);
            ctx.fill();

            ctx.fillStyle = '#1c1917';
            ctx.fillRect(player.x + 14, player.y + 22, 16, 5);
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground();

            obstacles.forEach(obs => {
                if (obs.type === 'fogueira') {
                    ctx.fillStyle = '#ea580c';
                    ctx.fillRect(obs.x + 5, obs.y + 12, 25, 18);
                    ctx.fillStyle = '#facc15';
                    ctx.beginPath();
                    ctx.moveTo(obs.x + 5, obs.y + 12);
                    ctx.lineTo(obs.x + 17, obs.y - 8);
                    ctx.lineTo(obs.x + 30, obs.y + 12);
                    ctx.fill();
                } else {
                    ctx.fillStyle = '#15803d';
                    ctx.fillRect(obs.x + 8, obs.y, 14, 50);
                    ctx.fillRect(obs.x + 2, obs.y + 18, 8, 8);
                    ctx.fillRect(obs.x + 20, obs.y + 12, 8, 8);
                }
            });

            collectibles.forEach(col => {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(col.x, col.y);
                ctx.lineTo(col.x + col.width, col.y);
                ctx.lineTo(col.x + (col.width / 2), col.y + col.height);
                ctx.fill();
            });

            bullets.forEach(b => {
                ctx.fillStyle = '#facc15';
                ctx.fillRect(b.x, b.y, b.width, b.height);
            });

            grenades.forEach(g => {
                ctx.fillStyle = '#111827';
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            drawPlayer();
        }

        function loop() {
            update();
            draw();
            if (gameState === 'PLAYING') {
                requestAnimationFrame(loop);
            }
        }
    </script>
