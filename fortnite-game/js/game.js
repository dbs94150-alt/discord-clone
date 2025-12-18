/**
 * ========================================
 * GAME - Moteur de jeu principal
 * ========================================
 * - Boucle de jeu avec requestAnimationFrame
 * - Gestion des entrées
 * - Rendu de la scène
 * - Coordination de tous les systèmes
 */

class Game {
    constructor() {
        // Canvas et contexte
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Minimap
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        // Dimensions
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // État du jeu
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.deltaTime = 0;

        // Entrées
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };

        // Caméra
        this.camera = { x: 0, y: 0 };

        // Éléments du jeu
        this.player = null;
        this.ammoManager = null;
        this.buildingManager = null;
        this.lootManager = null;
        this.enemyManager = null;

        // Projectiles
        this.playerBullets = [];
        this.enemyBullets = [];

        // Décor
        this.trees = [];
        this.clouds = [];

        // Initialiser les événements
        this.initEvents();

        console.log('🎮 Game initialisé');
    }

    /**
     * Redimensionne le canvas
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * Initialise les événements
     */
    initEvents() {
        // Clavier
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Souris
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Boutons UI
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
    }

    /**
     * Gestion touche pressée
     */
    onKeyDown(e) {
        this.keys[e.code] = true;

        // Actions spéciales
        if (this.isRunning && this.player) {
            switch (e.code) {
                case 'KeyR':
                    this.reload();
                    break;
                case 'KeyB':
                    this.player.toggleBuildMode();
                    this.updateBuildModeUI();
                    break;
                case 'KeyV':
                    if (this.player.buildMode) {
                        this.player.cycleBuildType();
                        this.updateBuildTypeUI();
                    }
                    break;
                case 'KeyE':
                    this.interact();
                    break;
                case 'Digit1':
                case 'Digit2':
                case 'Digit3':
                case 'Digit4':
                case 'Digit5':
                    const slot = parseInt(e.code.replace('Digit', '')) - 1;
                    this.player.selectSlot(slot);
                    this.player.buildMode = false;
                    this.updateBuildModeUI();
                    break;
            }
        }

        // Empêcher le comportement par défaut
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
    }

    /**
     * Gestion touche relâchée
     */
    onKeyUp(e) {
        this.keys[e.code] = false;
    }

    /**
     * Gestion mouvement souris
     */
    onMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    /**
     * Gestion clic souris
     */
    onMouseDown(e) {
        this.mouse.down = true;

        if (this.isRunning && this.player) {
            if (this.player.buildMode) {
                // Construire
                this.buildingManager.placeBuilding(this.player);
                this.updateResourcesUI();
            } else {
                // Tirer
                this.shoot();
            }
        }
    }

    /**
     * Gestion relâchement souris
     */
    onMouseUp(e) {
        this.mouse.down = false;
    }

    /**
     * Démarre le jeu
     */
    start() {
        // Cacher l'écran de démarrage
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');

        // Initialiser le jeu
        this.initGame();

        // Lancer la boucle
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Redémarre le jeu
     */
    restart() {
        document.getElementById('death-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');

        this.initGame();
        this.isRunning = true;
    }

    /**
     * Initialise les éléments du jeu
     */
    initGame() {
        // Créer le joueur au centre du monde
        const spawnX = GAME_CONFIG.WORLD_WIDTH / 2;
        const spawnY = GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.GROUND_LEVEL - 100;
        this.player = new Player(spawnX, spawnY);

        // Donner une arme de départ
        this.player.equipWeapon(createWeapon('AR', 'common'), 0);
        this.player.equipWeapon(createWeapon('PISTOL', 'common'), 1);

        // Gestionnaire de munitions
        this.ammoManager = new AmmoManager();

        // Gestionnaire de constructions
        this.buildingManager = new BuildingManager();

        // Gestionnaire de loot
        this.lootManager = new LootManager();
        this.lootManager.spawnChests(GAME_CONFIG.CHEST_COUNT);

        // Gestionnaire d'ennemis
        this.enemyManager = new EnemyManager();

        // Projectiles
        this.playerBullets = [];
        this.enemyBullets = [];

        // Générer le décor
        this.generateTerrain();

        // Mettre à jour l'UI
        this.updateHUD();

        console.log('🎮 Partie démarrée!');
    }

    /**
     * Génère le décor (arbres, nuages)
     */
    generateTerrain() {
        this.trees = [];
        this.clouds = [];

        const groundY = GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.GROUND_LEVEL;

        // Arbres
        for (let i = 0; i < 30; i++) {
            this.trees.push({
                x: randomRange(50, GAME_CONFIG.WORLD_WIDTH - 50),
                y: groundY,
                height: randomRange(80, 150),
                width: randomRange(60, 100)
            });
        }

        // Nuages
        for (let i = 0; i < 15; i++) {
            this.clouds.push({
                x: randomRange(0, GAME_CONFIG.WORLD_WIDTH),
                y: randomRange(50, 200),
                width: randomRange(100, 200),
                speed: randomRange(0.2, 0.5)
            });
        }
    }

    /**
     * Boucle de jeu principale
     */
    gameLoop(currentTime) {
        if (!this.isRunning) return;

        // Calculer le delta time
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Mise à jour
        this.update(this.deltaTime);

        // Rendu
        this.render();

        // Continuer la boucle
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Met à jour tous les éléments
     */
    update(deltaTime) {
        // Entrées joueur
        this.player.handleInput(this.keys);

        // Physique joueur
        this.player.update(this.buildingManager.buildings);

        // Tir automatique si arme automatique
        if (this.mouse.down && !this.player.buildMode) {
            const weapon = this.player.getCurrentWeapon();
            if (weapon && weapon.automatic) {
                this.shoot();
            }
        }

        // Mise à jour du rechargement
        this.updateReload(deltaTime);

        // Mise à jour de l'aperçu de construction
        const mouseWorld = screenToWorld(
            this.mouse.x, this.mouse.y,
            this.camera.x, this.camera.y,
            this.canvas.width, this.canvas.height
        );
        this.buildingManager.updatePreview(this.player, mouseWorld.x, mouseWorld.y);

        // Mise à jour des constructions
        this.buildingManager.update(deltaTime);

        // Mise à jour du loot
        this.lootManager.update(this.player, this.ammoManager);

        // Mise à jour des ennemis
        this.enemyManager.update(this.player, this.buildingManager.buildings, deltaTime);

        // Balles ennemies
        const newEnemyBullets = this.enemyManager.getEnemyBullets(this.player);
        this.enemyBullets.push(...newEnemyBullets);

        // Mise à jour des projectiles
        this.updateBullets();

        // Vérifier les collisions
        this.checkCollisions();

        // Mise à jour des particules
        particles.update();

        // Mise à jour de la caméra
        this.updateCamera();

        // Mise à jour des nuages
        this.clouds.forEach(cloud => {
            cloud.x += cloud.speed;
            if (cloud.x > GAME_CONFIG.WORLD_WIDTH + cloud.width) {
                cloud.x = -cloud.width;
            }
        });

        // Vérifier l'indicateur d'interaction
        this.updateInteractionUI();

        // Vérifier la mort
        if (this.player.health <= 0) {
            this.gameOver();
        }

        // Mise à jour du HUD
        this.updateHUD();
    }

    /**
     * Tire avec l'arme actuelle
     */
    shoot() {
        const weapon = this.player.getCurrentWeapon();
        if (!weapon) return;

        const playerCenter = this.player.getCenter();
        const mouseWorld = screenToWorld(
            this.mouse.x, this.mouse.y,
            this.camera.x, this.camera.y,
            this.canvas.width, this.canvas.height
        );

        const newBullets = weapon.fire(playerCenter.x, playerCenter.y, mouseWorld.x, mouseWorld.y);
        this.playerBullets.push(...newBullets);

        // Particules de tir
        if (newBullets.length > 0) {
            const angle = angleBetween(playerCenter.x, playerCenter.y, mouseWorld.x, mouseWorld.y);
            particles.emit(
                playerCenter.x + Math.cos(angle) * 30,
                playerCenter.y + Math.sin(angle) * 30,
                5,
                '#FFA500',
                { speedMin: 1, speedMax: 3, sizeMin: 1, sizeMax: 3, lifeMin: 5, lifeMax: 10 }
            );
        }
    }

    /**
     * Recharge l'arme
     */
    reload() {
        const weapon = this.player.getCurrentWeapon();
        if (!weapon) return;

        const reserveAmmo = this.ammoManager.get(weapon.ammoType);
        weapon.startReload(reserveAmmo);
    }

    /**
     * Met à jour le rechargement
     */
    updateReload(deltaTime) {
        const weapon = this.player.getCurrentWeapon();
        if (weapon && weapon.isReloading) {
            const ammoUsed = weapon.updateReload(deltaTime, this.ammoManager.get(weapon.ammoType));
            if (ammoUsed > 0) {
                this.ammoManager.consume(weapon.ammoType, ammoUsed);
            }
        }
    }

    /**
     * Interaction avec l'environnement
     */
    interact() {
        // Vérifier les coffres
        const chest = this.lootManager.checkChestInteraction(this.player);
        if (chest) {
            this.lootManager.openChest(chest);
        }
    }

    /**
     * Met à jour les projectiles
     */
    updateBullets() {
        // Balles du joueur
        this.playerBullets = this.playerBullets.filter(bullet => {
            bullet.update();
            return bullet.active;
        });

        // Balles ennemies
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.update();
            return bullet.active;
        });
    }

    /**
     * Vérifie les collisions
     */
    checkCollisions() {
        // Balles joueur vs ennemis
        const hits = this.enemyManager.checkBulletHits(this.playerBullets);
        hits.forEach(hit => {
            if (hit.killed) {
                this.player.kills++;
                // Drop loot de l'ennemi
                this.lootManager.dropItem(
                    hit.enemy.x + hit.enemy.width / 2,
                    hit.enemy.y,
                    { type: LOOT_TYPES.AMMO, ammoType: 'medium', amount: 15 }
                );
            }
        });

        // Balles joueur vs constructions
        this.playerBullets.forEach(bullet => {
            if (bullet.active && this.buildingManager.checkBulletCollision(bullet)) {
                bullet.hit();
            }
        });

        // Balles ennemies vs joueur
        const damage = this.enemyManager.checkPlayerHits(this.player, this.enemyBullets);
        if (damage > 0) {
            this.player.takeDamage(damage);
        }

        // Balles ennemies vs constructions
        this.enemyBullets.forEach(bullet => {
            if (bullet.active && this.buildingManager.checkBulletCollision(bullet)) {
                bullet.hit();
            }
        });
    }

    /**
     * Met à jour la caméra
     */
    updateCamera() {
        const targetX = this.player.x + this.player.width / 2;
        const targetY = this.player.y + this.player.height / 2;

        // Suivre le joueur avec lerp pour plus de fluidité
        this.camera.x = lerp(this.camera.x, targetX, 0.1);
        this.camera.y = lerp(this.camera.y, targetY, 0.1);

        // Limiter la caméra aux bords du monde
        const halfWidth = this.canvas.width / 2;
        const halfHeight = this.canvas.height / 2;

        this.camera.x = clamp(this.camera.x, halfWidth, GAME_CONFIG.WORLD_WIDTH - halfWidth);
        this.camera.y = clamp(this.camera.y, halfHeight, GAME_CONFIG.WORLD_HEIGHT - halfHeight);
    }

    /**
     * Fin de partie
     */
    gameOver() {
        this.isRunning = false;
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('death-screen').classList.remove('hidden');
        document.getElementById('final-kills').textContent = this.player.kills;
    }

    /**
     * Rendu du jeu
     */
    render() {
        const ctx = this.ctx;
        const { width, height } = this.canvas;

        // Effacer
        ctx.clearRect(0, 0, width, height);

        // Dessiner le fond (ciel)
        this.renderSky(ctx, width, height);

        // Dessiner les nuages
        this.renderClouds(ctx);

        // Dessiner le sol
        this.renderGround(ctx);

        // Dessiner les arbres (arrière-plan)
        this.renderTrees(ctx);

        // Dessiner les coffres
        this.lootManager.render(ctx, this.camera.x, this.camera.y, width, height);

        // Dessiner les constructions
        this.buildingManager.render(ctx, this.camera.x, this.camera.y, width, height);

        // Dessiner l'aperçu de construction
        this.buildingManager.renderPreview(ctx, this.camera.x, this.camera.y, width, height);

        // Dessiner les ennemis
        this.enemyManager.render(ctx, this.camera.x, this.camera.y, width, height);

        // Dessiner le joueur
        this.player.render(ctx, this.camera.x, this.camera.y, width, height);

        // Dessiner les projectiles du joueur
        this.playerBullets.forEach(bullet => {
            bullet.render(ctx, this.camera.x, this.camera.y, width, height);
        });

        // Dessiner les projectiles ennemis
        this.enemyBullets.forEach(bullet => {
            bullet.render(ctx, this.camera.x, this.camera.y, width, height);
        });

        // Dessiner les particules
        particles.render(ctx, this.camera.x, this.camera.y, width, height);

        // Dessiner le réticule
        this.renderCrosshair(ctx);

        // Dessiner la minimap
        this.renderMinimap();
    }

    /**
     * Dessine le ciel
     */
    renderSky(ctx, width, height) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.5, '#B0E2FF');
        gradient.addColorStop(1, '#E0F7FA');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Soleil
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 50;
        ctx.beginPath();
        ctx.arc(width - 150, 100, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    /**
     * Dessine les nuages
     */
    renderClouds(ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

        this.clouds.forEach(cloud => {
            const screen = worldToScreen(cloud.x, cloud.y, this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);

            // Dessiner un nuage avec plusieurs cercles
            for (let i = 0; i < 5; i++) {
                const offsetX = (i - 2) * (cloud.width / 5);
                const offsetY = Math.sin(i * 0.8) * 15;
                const radius = cloud.width / 6 + Math.random() * 10;

                ctx.beginPath();
                ctx.arc(screen.x + offsetX, screen.y + offsetY, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    /**
     * Dessine le sol
     */
    renderGround(ctx) {
        const groundY = GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.GROUND_LEVEL;
        const screen = worldToScreen(0, groundY, this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);

        // Sol principal
        ctx.fillStyle = COLORS.GROUND;
        ctx.fillRect(0, screen.y, this.canvas.width, this.canvas.height - screen.y);

        // Ligne d'herbe
        ctx.fillStyle = COLORS.GROUND_DARK;
        ctx.fillRect(0, screen.y, this.canvas.width, 5);

        // Détails du sol
        ctx.fillStyle = COLORS.GROUND_DARK;
        for (let x = 0; x < this.canvas.width; x += 50) {
            const worldX = x + this.camera.x - this.canvas.width / 2;
            const grassHeight = 8 + Math.sin(worldX * 0.1) * 3;
            ctx.fillRect(x, screen.y - grassHeight, 3, grassHeight);
        }
    }

    /**
     * Dessine les arbres
     */
    renderTrees(ctx) {
        this.trees.forEach(tree => {
            const screen = worldToScreen(tree.x, tree.y, this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);

            // Tronc
            ctx.fillStyle = COLORS.TREE_TRUNK;
            ctx.fillRect(
                screen.x + tree.width / 2 - 10,
                screen.y - tree.height * 0.4,
                20,
                tree.height * 0.4
            );

            // Feuillage (triangle)
            ctx.fillStyle = COLORS.TREE;
            ctx.beginPath();
            ctx.moveTo(screen.x + tree.width / 2, screen.y - tree.height);
            ctx.lineTo(screen.x + tree.width, screen.y - tree.height * 0.3);
            ctx.lineTo(screen.x, screen.y - tree.height * 0.3);
            ctx.closePath();
            ctx.fill();

            // Deuxième couche de feuillage
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.moveTo(screen.x + tree.width / 2, screen.y - tree.height * 0.85);
            ctx.lineTo(screen.x + tree.width * 0.85, screen.y - tree.height * 0.4);
            ctx.lineTo(screen.x + tree.width * 0.15, screen.y - tree.height * 0.4);
            ctx.closePath();
            ctx.fill();
        });
    }

    /**
     * Dessine le réticule
     */
    renderCrosshair(ctx) {
        const { x, y } = this.mouse;
        const size = 15;
        const gap = 5;

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;

        // Lignes du réticule
        ctx.beginPath();
        // Haut
        ctx.moveTo(x, y - gap);
        ctx.lineTo(x, y - size);
        // Bas
        ctx.moveTo(x, y + gap);
        ctx.lineTo(x, y + size);
        // Gauche
        ctx.moveTo(x - gap, y);
        ctx.lineTo(x - size, y);
        // Droite
        ctx.moveTo(x + gap, y);
        ctx.lineTo(x + size, y);
        ctx.stroke();

        // Point central
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Dessine la minimap
     */
    renderMinimap() {
        const ctx = this.minimapCtx;
        const { width, height } = this.minimapCanvas;

        // Fond
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);

        // Échelle
        const scaleX = width / GAME_CONFIG.WORLD_WIDTH;
        const scaleY = height / GAME_CONFIG.WORLD_HEIGHT;

        // Sol
        const groundY = (GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.GROUND_LEVEL) * scaleY;
        ctx.fillStyle = '#4A6741';
        ctx.fillRect(0, groundY, width, height - groundY);

        // Coffres (points jaunes)
        ctx.fillStyle = '#FFD700';
        this.lootManager.chests.forEach(chest => {
            if (!chest.isOpen) {
                ctx.beginPath();
                ctx.arc(chest.x * scaleX, chest.y * scaleY, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Constructions (rectangles marron)
        ctx.fillStyle = '#8B4513';
        this.buildingManager.buildings.forEach(building => {
            ctx.fillRect(
                building.x * scaleX,
                building.y * scaleY,
                building.width * scaleX,
                building.height * scaleY
            );
        });

        // Ennemis (points rouges)
        ctx.fillStyle = '#E74C3C';
        this.enemyManager.enemies.forEach(enemy => {
            ctx.beginPath();
            ctx.arc(
                (enemy.x + enemy.width / 2) * scaleX,
                (enemy.y + enemy.height / 2) * scaleY,
                4, 0, Math.PI * 2
            );
            ctx.fill();
        });

        // Joueur (point bleu)
        ctx.fillStyle = '#3498DB';
        ctx.beginPath();
        ctx.arc(
            (this.player.x + this.player.width / 2) * scaleX,
            (this.player.y + this.player.height / 2) * scaleY,
            5, 0, Math.PI * 2
        );
        ctx.fill();

        // Bordure du joueur
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Direction du regard
        const angle = this.player.facingRight ? 0 : Math.PI;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(
            (this.player.x + this.player.width / 2) * scaleX,
            (this.player.y + this.player.height / 2) * scaleY
        );
        ctx.lineTo(
            (this.player.x + this.player.width / 2) * scaleX + Math.cos(angle) * 10,
            (this.player.y + this.player.height / 2) * scaleY + Math.sin(angle) * 10
        );
        ctx.stroke();
    }

    /**
     * Met à jour le HUD
     */
    updateHUD() {
        // Vie
        updateElement('health-text', Math.ceil(this.player.health));
        updateBar('health-bar', this.player.health, this.player.maxHealth);

        // Bouclier
        updateElement('shield-text', Math.ceil(this.player.shield));
        updateBar('shield-bar', this.player.shield, this.player.maxShield);

        // Arme actuelle
        const weapon = this.player.getCurrentWeapon();
        if (weapon) {
            updateElement('current-ammo', weapon.currentAmmo);
            updateElement('reserve-ammo', this.ammoManager.get(weapon.ammoType));
            updateElement('weapon-name', weapon.name);

            // Effet de rechargement
            const ammoContainer = document.querySelector('.ammo-container');
            if (weapon.isReloading) {
                ammoContainer.classList.add('reloading');
            } else {
                ammoContainer.classList.remove('reloading');
            }
        }

        // Ressources
        updateElement('wood-count', this.player.resources.wood);
        updateElement('brick-count', this.player.resources.brick);
        updateElement('metal-count', this.player.resources.metal);

        // Kills
        updateElement('kill-count', this.player.kills);

        // Hotbar
        this.updateHotbar();
    }

    /**
     * Met à jour la hotbar
     */
    updateHotbar() {
        const hotbar = document.getElementById('hotbar');

        // Générer les slots si nécessaire
        if (hotbar.children.length === 0) {
            for (let i = 0; i < 5; i++) {
                const slot = document.createElement('div');
                slot.className = 'hotbar-slot empty';
                slot.innerHTML = `
                    <span class="slot-number">${i + 1}</span>
                    <span class="slot-icon"></span>
                    <div class="slot-rarity"></div>
                `;
                hotbar.appendChild(slot);
            }
        }

        // Mettre à jour les slots
        for (let i = 0; i < 5; i++) {
            const slot = hotbar.children[i];
            const weapon = this.player.inventory[i];

            slot.className = 'hotbar-slot';

            if (weapon) {
                slot.classList.remove('empty');
                slot.querySelector('.slot-icon').textContent = weapon.icon;
                slot.querySelector('.slot-rarity').className = `slot-rarity rarity-${weapon.rarity}`;
            } else {
                slot.classList.add('empty');
                slot.querySelector('.slot-icon').textContent = '';
                slot.querySelector('.slot-rarity').className = 'slot-rarity';
            }

            if (i === this.player.selectedSlot && !this.player.buildMode) {
                slot.classList.add('active');
            }
        }
    }

    /**
     * Met à jour l'UI du mode construction
     */
    updateBuildModeUI() {
        const indicator = document.getElementById('build-mode-indicator');
        if (this.player.buildMode) {
            indicator.classList.remove('hidden');
            this.updateBuildTypeUI();
        } else {
            indicator.classList.add('hidden');
        }
    }

    /**
     * Met à jour le type de construction affiché
     */
    updateBuildTypeUI() {
        const buildTypeNames = {
            wall: 'MUR',
            floor: 'SOL',
            ramp: 'RAMPE'
        };
        updateElement('build-type', buildTypeNames[this.player.buildType]);
    }

    /**
     * Met à jour l'indicateur d'interaction
     */
    updateInteractionUI() {
        const hint = document.getElementById('interaction-hint');
        const chest = this.lootManager.checkChestInteraction(this.player);

        if (chest) {
            hint.classList.remove('hidden');
            updateElement('interaction-text', 'Ouvrir le coffre');
        } else {
            hint.classList.add('hidden');
        }
    }

    /**
     * Met à jour l'UI des ressources
     */
    updateResourcesUI() {
        updateElement('wood-count', this.player.resources.wood);
        updateElement('brick-count', this.player.resources.brick);
        updateElement('metal-count', this.player.resources.metal);
    }
}

// Démarrer le jeu quand la page est chargée
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});

console.log('✅ Game chargé');
