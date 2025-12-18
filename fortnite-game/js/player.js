/**
 * ========================================
 * PLAYER - Système de joueur et physique
 * ========================================
 * Physique inspirée de Fortnite:
 * - Gravité réaliste
 * - Vélocité X/Y avec accélération
 * - Friction au sol et dans l'air
 * - Saut avec impulsion
 * - Détection de sol avancée
 */

class Player {
    constructor(x, y) {
        // Position
        this.x = x;
        this.y = y;
        this.width = GAME_CONFIG.PLAYER_WIDTH;
        this.height = GAME_CONFIG.PLAYER_HEIGHT;

        // Vélocité et physique
        this.vx = 0;
        this.vy = 0;
        this.speed = GAME_CONFIG.PLAYER_SPEED;
        this.jumpForce = GAME_CONFIG.PLAYER_JUMP_FORCE;

        // État
        this.isGrounded = false;
        this.isJumping = false;
        this.facingRight = true;

        // Stats de combat
        this.health = GAME_CONFIG.PLAYER_MAX_HEALTH;
        this.maxHealth = GAME_CONFIG.PLAYER_MAX_HEALTH;
        this.shield = 0;
        this.maxShield = GAME_CONFIG.PLAYER_MAX_SHIELD;

        // Inventaire
        this.inventory = [null, null, null, null, null];
        this.selectedSlot = 0;
        this.resources = {
            wood: 50,
            brick: 0,
            metal: 0
        };

        // Mode construction
        this.buildMode = false;
        this.buildType = 'wall'; // wall, floor, ramp

        // Animation
        this.animationFrame = 0;
        this.animationTimer = 0;

        // Effets visuels
        this.damageFlash = 0;
        this.lastDamageTime = 0;

        // Stats de jeu
        this.kills = 0;
    }

    /**
     * Applique les contrôles du joueur
     */
    handleInput(keys) {
        // Déplacement horizontal (ZQSD / WASD)
        let moveX = 0;

        if (keys['KeyA'] || keys['KeyQ']) {
            moveX = -1;
            this.facingRight = false;
        }
        if (keys['KeyD']) {
            moveX = 1;
            this.facingRight = true;
        }

        // Application de la vélocité horizontale avec accélération progressive
        const targetVx = moveX * this.speed;
        const acceleration = this.isGrounded ? 0.3 : 0.15; // Plus lent dans l'air
        this.vx = lerp(this.vx, targetVx, acceleration);

        // Saut (ESPACE)
        if ((keys['Space'] || keys['KeyW'] || keys['KeyZ']) && this.isGrounded && !this.isJumping) {
            this.jump();
        }

        // Libération de la touche saut
        if (!keys['Space'] && !keys['KeyW'] && !keys['KeyZ']) {
            this.isJumping = false;
        }
    }

    /**
     * Effectue un saut
     */
    jump() {
        if (!this.isGrounded) return;

        this.vy = -this.jumpForce;
        this.isGrounded = false;
        this.isJumping = true;
        AudioManager.jump();

        // Particules de saut
        particles.emit(
            this.x + this.width / 2,
            this.y + this.height,
            8,
            '#8B4513',
            { speedMin: 2, speedMax: 4, gravity: 0.2 }
        );
    }

    /**
     * Met à jour la physique du joueur
     */
    update(buildings) {
        // Appliquer la gravité
        this.vy += GAME_CONFIG.GRAVITY;

        // Limiter la vitesse de chute
        this.vy = Math.min(this.vy, 20);

        // Appliquer la friction
        if (this.isGrounded) {
            this.vx *= GAME_CONFIG.FRICTION;
        } else {
            this.vx *= GAME_CONFIG.AIR_FRICTION;
        }

        // Déplacer horizontalement avec détection de collision
        this.x += this.vx;
        this.handleHorizontalCollisions(buildings);

        // Déplacer verticalement avec détection de collision
        this.y += this.vy;
        this.handleVerticalCollisions(buildings);

        // Limites du monde
        this.x = clamp(this.x, 0, GAME_CONFIG.WORLD_WIDTH - this.width);
        this.y = clamp(this.y, 0, GAME_CONFIG.WORLD_HEIGHT - this.height);

        // Mise à jour de l'animation
        this.updateAnimation();

        // Mise à jour des effets
        if (this.damageFlash > 0) {
            this.damageFlash--;
        }
    }

    /**
     * Gère les collisions horizontales
     */
    handleHorizontalCollisions(buildings) {
        const playerRect = this.getRect();

        // Collision avec les constructions
        for (const building of buildings) {
            if (building.type === 'ramp') continue; // Les rampes sont gérées différemment

            const buildRect = building.getRect();
            if (rectCollision(playerRect, buildRect)) {
                if (this.vx > 0) {
                    // Collision à droite
                    this.x = buildRect.x - this.width;
                } else if (this.vx < 0) {
                    // Collision à gauche
                    this.x = buildRect.x + buildRect.width;
                }
                this.vx = 0;
            }
        }
    }

    /**
     * Gère les collisions verticales et la détection de sol
     */
    handleVerticalCollisions(buildings) {
        this.isGrounded = false;
        const playerRect = this.getRect();

        // Collision avec le sol du monde
        const groundY = GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.GROUND_LEVEL;
        if (this.y + this.height >= groundY) {
            this.y = groundY - this.height;
            this.vy = 0;
            this.isGrounded = true;
        }

        // Collision avec les constructions
        for (const building of buildings) {
            const buildRect = building.getRect();

            if (building.type === 'ramp') {
                // Logique spéciale pour les rampes
                if (this.handleRampCollision(building)) {
                    continue;
                }
            }

            if (rectCollision(playerRect, buildRect)) {
                if (this.vy > 0) {
                    // Collision par le bas (atterrissage)
                    this.y = buildRect.y - this.height;
                    this.vy = 0;
                    this.isGrounded = true;
                } else if (this.vy < 0) {
                    // Collision par le haut (tête)
                    this.y = buildRect.y + buildRect.height;
                    this.vy = 0;
                }
            }
        }
    }

    /**
     * Gère la collision avec une rampe
     */
    handleRampCollision(ramp) {
        const rampRect = ramp.getRect();
        const playerCenterX = this.x + this.width / 2;
        const playerBottom = this.y + this.height;

        // Vérifier si le joueur est dans la zone horizontale de la rampe
        if (playerCenterX < rampRect.x || playerCenterX > rampRect.x + rampRect.width) {
            return false;
        }

        // Calculer la hauteur de la rampe à la position du joueur
        const progress = (playerCenterX - rampRect.x) / rampRect.width;
        const rampDirection = ramp.direction || 1; // 1 = monte vers la droite, -1 = monte vers la gauche
        const adjustedProgress = rampDirection === 1 ? progress : 1 - progress;
        const rampY = rampRect.y + rampRect.height - (adjustedProgress * rampRect.height);

        // Si le joueur est au-dessus ou sur la rampe
        if (playerBottom >= rampY - 5 && playerBottom <= rampY + 20 && this.vy >= 0) {
            this.y = rampY - this.height;
            this.vy = 0;
            this.isGrounded = true;
            return true;
        }

        return false;
    }

    /**
     * Met à jour l'animation du joueur
     */
    updateAnimation() {
        this.animationTimer++;

        if (Math.abs(this.vx) > 0.5) {
            // Animation de marche
            if (this.animationTimer % 8 === 0) {
                this.animationFrame = (this.animationFrame + 1) % 4;
            }
        } else {
            // Animation idle
            this.animationFrame = 0;
        }
    }

    /**
     * Inflige des dégâts au joueur
     */
    takeDamage(amount) {
        // D'abord le bouclier absorbe les dégâts
        if (this.shield > 0) {
            const shieldDamage = Math.min(this.shield, amount);
            this.shield -= shieldDamage;
            amount -= shieldDamage;
        }

        // Ensuite la vie
        this.health -= amount;
        this.health = Math.max(0, this.health);

        // Effets visuels
        this.damageFlash = 10;
        this.lastDamageTime = Date.now();
        AudioManager.hit();

        // Particules de dégât
        particles.emit(
            this.x + this.width / 2,
            this.y + this.height / 2,
            15,
            '#E74C3C',
            { speedMin: 3, speedMax: 8, gravity: 0.15 }
        );

        return this.health <= 0;
    }

    /**
     * Soigne le joueur
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    /**
     * Ajoute du bouclier
     */
    addShield(amount) {
        this.shield = Math.min(this.maxShield, this.shield + amount);
    }

    /**
     * Ajoute des ressources
     */
    addResources(type, amount) {
        this.resources[type] = Math.min(999, (this.resources[type] || 0) + amount);
    }

    /**
     * Vérifie si le joueur peut construire
     */
    canBuild(type) {
        const cost = GAME_CONFIG.BUILD_COST;
        return this.resources.wood >= cost ||
               this.resources.brick >= cost ||
               this.resources.metal >= cost;
    }

    /**
     * Consomme des ressources pour construire
     */
    consumeBuildResources() {
        const cost = GAME_CONFIG.BUILD_COST;
        // Priorité: bois > brique > métal
        if (this.resources.wood >= cost) {
            this.resources.wood -= cost;
            return 'wood';
        } else if (this.resources.brick >= cost) {
            this.resources.brick -= cost;
            return 'brick';
        } else if (this.resources.metal >= cost) {
            this.resources.metal -= cost;
            return 'metal';
        }
        return null;
    }

    /**
     * Équipe une arme dans un slot
     */
    equipWeapon(weapon, slot = null) {
        if (slot === null) {
            // Trouver le premier slot vide
            slot = this.inventory.findIndex(w => w === null);
            if (slot === -1) {
                // Inventaire plein, remplacer l'arme actuelle
                slot = this.selectedSlot;
            }
        }

        this.inventory[slot] = weapon;
        showGameMessage(`${weapon.name} équipé!`);
        AudioManager.pickup();
    }

    /**
     * Retourne l'arme actuellement équipée
     */
    getCurrentWeapon() {
        return this.inventory[this.selectedSlot];
    }

    /**
     * Change de slot d'arme
     */
    selectSlot(slot) {
        if (slot >= 0 && slot < 5) {
            this.selectedSlot = slot;
        }
    }

    /**
     * Active/désactive le mode construction
     */
    toggleBuildMode() {
        this.buildMode = !this.buildMode;
        if (this.buildMode) {
            showGameMessage('Mode construction activé');
        }
    }

    /**
     * Change le type de construction
     */
    cycleBuildType() {
        const types = ['wall', 'floor', 'ramp'];
        const currentIndex = types.indexOf(this.buildType);
        this.buildType = types[(currentIndex + 1) % types.length];
    }

    /**
     * Retourne le rectangle de collision du joueur
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
     * Retourne la position du centre du joueur
     */
    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }

    /**
     * Dessine le joueur
     */
    render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        const screen = worldToScreen(this.x, this.y, cameraX, cameraY, canvasWidth, canvasHeight);

        ctx.save();

        // Effet de dégât
        if (this.damageFlash > 0) {
            ctx.filter = 'brightness(1.5) saturate(2)';
        }

        // Ombre
        ctx.fillStyle = COLORS.SHADOW;
        ctx.beginPath();
        ctx.ellipse(
            screen.x + this.width / 2,
            screen.y + this.height + 5,
            this.width / 2,
            10,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Corps du joueur
        const bodyBob = this.isGrounded && Math.abs(this.vx) > 0.5 ?
            Math.sin(this.animationTimer * 0.3) * 3 : 0;

        // Jambes
        const legOffset = this.isGrounded && Math.abs(this.vx) > 0.5 ?
            Math.sin(this.animationTimer * 0.4) * 8 : 0;

        ctx.fillStyle = '#2C3E50';
        // Jambe gauche
        ctx.fillRect(
            screen.x + 8 - legOffset,
            screen.y + this.height - 25,
            10, 25
        );
        // Jambe droite
        ctx.fillRect(
            screen.x + this.width - 18 + legOffset,
            screen.y + this.height - 25,
            10, 25
        );

        // Corps principal
        ctx.fillStyle = COLORS.PLAYER;
        ctx.fillRect(
            screen.x + 5,
            screen.y + 15 + bodyBob,
            this.width - 10,
            this.height - 40
        );

        // Tête
        ctx.fillStyle = '#F5D0A9';
        ctx.beginPath();
        ctx.arc(
            screen.x + this.width / 2,
            screen.y + 12 + bodyBob,
            12, 0, Math.PI * 2
        );
        ctx.fill();

        // Yeux
        ctx.fillStyle = 'white';
        const eyeX = this.facingRight ? 3 : -3;
        ctx.beginPath();
        ctx.arc(screen.x + this.width / 2 + eyeX - 4, screen.y + 10 + bodyBob, 3, 0, Math.PI * 2);
        ctx.arc(screen.x + this.width / 2 + eyeX + 4, screen.y + 10 + bodyBob, 3, 0, Math.PI * 2);
        ctx.fill();

        // Pupilles
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(screen.x + this.width / 2 + eyeX - 4 + (this.facingRight ? 1 : -1), screen.y + 10 + bodyBob, 1.5, 0, Math.PI * 2);
        ctx.arc(screen.x + this.width / 2 + eyeX + 4 + (this.facingRight ? 1 : -1), screen.y + 10 + bodyBob, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Arme (si équipée)
        const weapon = this.getCurrentWeapon();
        if (weapon && !this.buildMode) {
            const armX = this.facingRight ?
                screen.x + this.width - 5 :
                screen.x - 15;
            const armY = screen.y + 30 + bodyBob;

            ctx.fillStyle = '#444';
            ctx.save();
            ctx.translate(armX + 10, armY);
            if (!this.facingRight) ctx.scale(-1, 1);
            ctx.fillRect(0, -3, 25, 6);
            ctx.restore();
        }

        // Indicateur de mode construction
        if (this.buildMode) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🔨', screen.x + this.width / 2, screen.y - 10);
        }

        ctx.restore();
    }
}

console.log('✅ Player chargé');
