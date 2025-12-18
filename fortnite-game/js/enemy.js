/**
 * ========================================
 * ENEMY - Système d'IA ennemie
 * ========================================
 * - Déplacement intelligent
 * - Tirs sur le joueur
 * - Points de vie
 * - Comportements variés
 */

/**
 * États possibles de l'ennemi
 */
const ENEMY_STATES = {
    IDLE: 'idle',
    PATROL: 'patrol',
    CHASE: 'chase',
    ATTACK: 'attack',
    RETREAT: 'retreat'
};

/**
 * Classe représentant un ennemi
 */
class Enemy {
    constructor(x, y, difficulty = 1) {
        // Position et dimensions
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 55;

        // Physique
        this.vx = 0;
        this.vy = 0;
        this.speed = 2.5 + difficulty * 0.5;
        this.jumpForce = 12;
        this.isGrounded = false;
        this.facingRight = true;

        // Stats
        this.health = 80 + difficulty * 20;
        this.maxHealth = this.health;
        this.damage = 10 + difficulty * 5;
        this.difficulty = difficulty;

        // Combat
        this.fireRate = 1000 - difficulty * 150;
        this.lastFireTime = 0;
        this.attackRange = 400 + difficulty * 50;
        this.detectionRange = 500 + difficulty * 100;

        // IA
        this.state = ENEMY_STATES.IDLE;
        this.targetX = x;
        this.targetY = y;
        this.stateTimer = 0;
        this.patrolDirection = 1;

        // Animation
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.damageFlash = 0;

        // Couleur basée sur la difficulté
        this.color = this.getDifficultyColor();
    }

    /**
     * Retourne la couleur selon la difficulté
     */
    getDifficultyColor() {
        if (this.difficulty >= 3) return '#8E44AD'; // Violet - Boss
        if (this.difficulty >= 2) return '#E74C3C'; // Rouge - Difficile
        return '#E67E22'; // Orange - Normal
    }

    /**
     * Met à jour l'ennemi
     */
    update(player, buildings) {
        // Mise à jour de l'IA
        this.updateAI(player);

        // Physique
        this.applyPhysics(buildings);

        // Animation
        this.updateAnimation();

        // Effets
        if (this.damageFlash > 0) this.damageFlash--;
    }

    /**
     * Met à jour l'IA de l'ennemi
     */
    updateAI(player) {
        const playerCenter = player.getCenter();
        const myCenter = this.getCenter();
        const distToPlayer = distance(myCenter.x, myCenter.y, playerCenter.x, playerCenter.y);

        // Détecter le joueur
        if (distToPlayer <= this.detectionRange) {
            if (distToPlayer <= this.attackRange) {
                this.state = ENEMY_STATES.ATTACK;
            } else {
                this.state = ENEMY_STATES.CHASE;
            }

            // Regarder vers le joueur
            this.facingRight = playerCenter.x > myCenter.x;
        } else {
            this.state = ENEMY_STATES.PATROL;
        }

        // Comportement selon l'état
        switch (this.state) {
            case ENEMY_STATES.IDLE:
                this.vx = 0;
                break;

            case ENEMY_STATES.PATROL:
                this.patrol();
                break;

            case ENEMY_STATES.CHASE:
                this.chasePlayer(player);
                break;

            case ENEMY_STATES.ATTACK:
                this.attackPlayer(player);
                break;

            case ENEMY_STATES.RETREAT:
                this.retreat(player);
                break;
        }
    }

    /**
     * Comportement de patrouille
     */
    patrol() {
        this.stateTimer++;

        // Changer de direction périodiquement
        if (this.stateTimer > 120) {
            this.patrolDirection *= -1;
            this.stateTimer = 0;
        }

        this.vx = this.patrolDirection * (this.speed * 0.5);
        this.facingRight = this.patrolDirection > 0;

        // Éviter les bords du monde
        if (this.x < 100) {
            this.patrolDirection = 1;
        } else if (this.x > GAME_CONFIG.WORLD_WIDTH - 100) {
            this.patrolDirection = -1;
        }
    }

    /**
     * Poursuit le joueur
     */
    chasePlayer(player) {
        const playerCenter = player.getCenter();
        const myCenter = this.getCenter();

        // Direction vers le joueur
        const dirX = playerCenter.x - myCenter.x;

        // Se déplacer vers le joueur
        this.vx = Math.sign(dirX) * this.speed;

        // Sauter si le joueur est plus haut
        if (playerCenter.y < myCenter.y - 50 && this.isGrounded) {
            this.jump();
        }

        // Sauter par-dessus les obstacles
        if (Math.abs(this.vx) < 0.1 && this.isGrounded) {
            this.jump();
        }
    }

    /**
     * Attaque le joueur
     */
    attackPlayer(player) {
        const playerCenter = player.getCenter();
        const myCenter = this.getCenter();
        const distToPlayer = distance(myCenter.x, myCenter.y, playerCenter.x, playerCenter.y);

        // Se rapprocher légèrement ou s'éloigner
        if (distToPlayer > this.attackRange * 0.8) {
            this.vx = (playerCenter.x > myCenter.x ? 1 : -1) * this.speed * 0.5;
        } else if (distToPlayer < this.attackRange * 0.4) {
            // Trop proche, reculer un peu
            this.vx = (playerCenter.x > myCenter.x ? -1 : 1) * this.speed * 0.5;
        } else {
            this.vx = 0;
        }

        // Esquiver parfois (ennemis difficiles)
        if (this.difficulty >= 2 && Math.random() < 0.01 && this.isGrounded) {
            this.vx = (Math.random() < 0.5 ? -1 : 1) * this.speed * 2;
            this.jump();
        }
    }

    /**
     * Se retire (basse vie)
     */
    retreat(player) {
        const playerCenter = player.getCenter();
        const myCenter = this.getCenter();

        // Fuir dans la direction opposée
        this.vx = (playerCenter.x > myCenter.x ? -1 : 1) * this.speed;

        // Sauter pour s'échapper
        if (this.isGrounded && Math.random() < 0.05) {
            this.jump();
        }
    }

    /**
     * Effectue un saut
     */
    jump() {
        if (!this.isGrounded) return;
        this.vy = -this.jumpForce;
        this.isGrounded = false;
    }

    /**
     * Applique la physique
     */
    applyPhysics(buildings) {
        // Gravité
        this.vy += GAME_CONFIG.GRAVITY;
        this.vy = Math.min(this.vy, 15);

        // Friction
        if (this.isGrounded) {
            this.vx *= 0.8;
        }

        // Déplacement
        this.x += this.vx;
        this.y += this.vy;

        // Collision avec le sol
        this.isGrounded = false;
        const groundY = GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.GROUND_LEVEL;
        if (this.y + this.height >= groundY) {
            this.y = groundY - this.height;
            this.vy = 0;
            this.isGrounded = true;
        }

        // Collision avec les constructions
        for (const building of buildings) {
            if (building.type === 'ramp') continue;

            const rect = building.getRect();
            const myRect = this.getRect();

            if (rectCollision(myRect, rect)) {
                // Collision par le haut (atterrissage)
                if (this.vy > 0 && this.y + this.height - this.vy <= rect.y) {
                    this.y = rect.y - this.height;
                    this.vy = 0;
                    this.isGrounded = true;
                }
            }
        }

        // Limites du monde
        this.x = clamp(this.x, 0, GAME_CONFIG.WORLD_WIDTH - this.width);
    }

    /**
     * Vérifie si l'ennemi peut tirer
     */
    canShoot() {
        const now = Date.now();
        return now - this.lastFireTime >= this.fireRate;
    }

    /**
     * Tire sur le joueur
     */
    shoot(playerX, playerY) {
        if (!this.canShoot()) return null;

        this.lastFireTime = Date.now();
        const myCenter = this.getCenter();

        // Ajouter une imprécision
        const spread = 0.15 / this.difficulty;
        const angle = angleBetween(myCenter.x, myCenter.y, playerX, playerY);
        const finalAngle = angle + (Math.random() - 0.5) * spread * 2;

        AudioManager.shoot();

        return new Bullet(
            myCenter.x,
            myCenter.y,
            finalAngle,
            15,
            this.damage,
            this.attackRange,
            '#FF6B35'
        );
    }

    /**
     * Inflige des dégâts à l'ennemi
     */
    takeDamage(amount) {
        this.health -= amount;
        this.damageFlash = 10;

        // Particules de dégât
        particles.emit(
            this.x + this.width / 2,
            this.y + this.height / 2,
            10,
            '#E74C3C',
            { speedMin: 2, speedMax: 6 }
        );

        // Passer en mode fuite si basse vie
        if (this.health < this.maxHealth * 0.25) {
            this.state = ENEMY_STATES.RETREAT;
        }

        return this.health <= 0;
    }

    /**
     * Met à jour l'animation
     */
    updateAnimation() {
        this.animationTimer++;
        if (Math.abs(this.vx) > 0.5) {
            if (this.animationTimer % 10 === 0) {
                this.animationFrame = (this.animationFrame + 1) % 4;
            }
        } else {
            this.animationFrame = 0;
        }
    }

    /**
     * Retourne le rectangle de collision
     */
    getRect() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Retourne le centre
     */
    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }

    /**
     * Dessine l'ennemi
     */
    render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        const screen = worldToScreen(this.x, this.y, cameraX, cameraY, canvasWidth, canvasHeight);

        ctx.save();

        // Effet de dégât
        if (this.damageFlash > 0) {
            ctx.filter = 'brightness(2)';
        }

        // Ombre
        ctx.fillStyle = COLORS.SHADOW;
        ctx.beginPath();
        ctx.ellipse(
            screen.x + this.width / 2,
            screen.y + this.height + 5,
            this.width / 2,
            8,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Animation de mouvement
        const bodyBob = this.isGrounded && Math.abs(this.vx) > 0.5 ?
            Math.sin(this.animationTimer * 0.3) * 2 : 0;
        const legOffset = this.isGrounded && Math.abs(this.vx) > 0.5 ?
            Math.sin(this.animationTimer * 0.4) * 6 : 0;

        // Jambes
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(screen.x + 8 - legOffset, screen.y + this.height - 22, 8, 22);
        ctx.fillRect(screen.x + this.width - 16 + legOffset, screen.y + this.height - 22, 8, 22);

        // Corps
        ctx.fillStyle = this.color;
        ctx.fillRect(screen.x + 5, screen.y + 15 + bodyBob, this.width - 10, this.height - 38);

        // Tête (plus anguleuse/menaçante)
        ctx.fillStyle = '#BDC3C7';
        ctx.beginPath();
        ctx.moveTo(screen.x + this.width / 2, screen.y + bodyBob);
        ctx.lineTo(screen.x + this.width / 2 + 15, screen.y + 12 + bodyBob);
        ctx.lineTo(screen.x + this.width / 2 + 12, screen.y + 24 + bodyBob);
        ctx.lineTo(screen.x + this.width / 2 - 12, screen.y + 24 + bodyBob);
        ctx.lineTo(screen.x + this.width / 2 - 15, screen.y + 12 + bodyBob);
        ctx.closePath();
        ctx.fill();

        // Yeux rouges menaçants
        ctx.fillStyle = '#E74C3C';
        const eyeX = this.facingRight ? 2 : -2;
        ctx.beginPath();
        ctx.arc(screen.x + this.width / 2 + eyeX - 5, screen.y + 12 + bodyBob, 3, 0, Math.PI * 2);
        ctx.arc(screen.x + this.width / 2 + eyeX + 5, screen.y + 12 + bodyBob, 3, 0, Math.PI * 2);
        ctx.fill();

        // Lueur des yeux
        ctx.shadowColor = '#E74C3C';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Arme
        const armX = this.facingRight ? screen.x + this.width - 5 : screen.x - 15;
        const armY = screen.y + 28 + bodyBob;
        ctx.fillStyle = '#444';
        ctx.save();
        ctx.translate(armX + 10, armY);
        if (!this.facingRight) ctx.scale(-1, 1);
        ctx.fillRect(0, -3, 22, 5);
        ctx.restore();

        // Barre de vie
        this.renderHealthBar(ctx, screen);

        // Indicateur de difficulté
        if (this.difficulty >= 2) {
            ctx.fillStyle = this.difficulty >= 3 ? '#FFD700' : '#E74C3C';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            const stars = '⭐'.repeat(this.difficulty);
            ctx.fillText(stars, screen.x + this.width / 2, screen.y - 25);
        }

        ctx.restore();
    }

    /**
     * Dessine la barre de vie
     */
    renderHealthBar(ctx, screen) {
        const barWidth = this.width + 10;
        const barHeight = 6;
        const barX = screen.x - 5;
        const barY = screen.y - 15;

        // Fond
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Vie
        const hpPercent = this.health / this.maxHealth;
        ctx.fillStyle = hpPercent > 0.5 ? '#E74C3C' : hpPercent > 0.25 ? '#F39C12' : '#C0392B';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // Bordure
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

/**
 * Gestionnaire d'ennemis
 */
class EnemyManager {
    constructor() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.wave = 0;
        this.enemiesKilled = 0;
    }

    /**
     * Spawn un nouvel ennemi
     */
    spawnEnemy() {
        if (this.enemies.length >= GAME_CONFIG.MAX_ENEMIES) return;

        const groundY = GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.GROUND_LEVEL;

        // Spawn aux bords de la map
        const side = Math.random() < 0.5 ? 0 : 1;
        const x = side === 0 ? 100 : GAME_CONFIG.WORLD_WIDTH - 150;
        const y = groundY - 60;

        // Difficulté basée sur la vague
        const difficulty = Math.min(3, Math.floor(this.wave / 3) + 1);

        this.enemies.push(new Enemy(x, y, difficulty));
    }

    /**
     * Met à jour tous les ennemis
     */
    update(player, buildings, deltaTime) {
        // Timer de spawn
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= GAME_CONFIG.ENEMY_SPAWN_RATE) {
            this.spawnTimer = 0;
            this.spawnEnemy();
            this.wave++;
        }

        // Mettre à jour les ennemis
        this.enemies.forEach(enemy => {
            enemy.update(player, buildings);
        });
    }

    /**
     * Fait tirer les ennemis
     */
    getEnemyBullets(player) {
        const bullets = [];
        const playerCenter = player.getCenter();

        this.enemies.forEach(enemy => {
            if (enemy.state === ENEMY_STATES.ATTACK && enemy.canShoot()) {
                const bullet = enemy.shoot(playerCenter.x, playerCenter.y);
                if (bullet) bullets.push(bullet);
            }
        });

        return bullets;
    }

    /**
     * Vérifie les collisions avec les balles du joueur
     */
    checkBulletHits(bullets) {
        const hits = [];

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (!bullet.active) continue;

            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];

                if (bullet.checkCollision(enemy.getRect())) {
                    bullet.hit();

                    if (enemy.takeDamage(bullet.damage)) {
                        // Ennemi tué
                        this.enemies.splice(j, 1);
                        this.enemiesKilled++;
                        hits.push({ enemy, killed: true });

                        // Particules de mort
                        particles.emit(
                            enemy.x + enemy.width / 2,
                            enemy.y + enemy.height / 2,
                            25,
                            enemy.color,
                            { speedMin: 3, speedMax: 10, gravity: 0.2 }
                        );

                        showGameMessage('Ennemi éliminé!');
                    } else {
                        hits.push({ enemy, killed: false });
                    }
                    break;
                }
            }
        }

        return hits;
    }

    /**
     * Vérifie les collisions des balles ennemies avec le joueur
     */
    checkPlayerHits(player, enemyBullets) {
        const playerRect = player.getRect();

        for (const bullet of enemyBullets) {
            if (!bullet.active) continue;

            if (bullet.checkCollision(playerRect)) {
                bullet.hit();
                return bullet.damage;
            }
        }

        return 0;
    }

    /**
     * Dessine tous les ennemis
     */
    render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        this.enemies.forEach(enemy => {
            enemy.render(ctx, cameraX, cameraY, canvasWidth, canvasHeight);
        });
    }
}

console.log('✅ Enemy chargé');
