/**
 * ========================================
 * BUILDING - Système de construction
 * ========================================
 * Types de constructions:
 * - Mur (Wall)
 * - Sol (Floor)
 * - Rampe (Ramp)
 */

const BUILDING_TYPES = {
    wall: {
        name: 'Mur',
        width: GAME_CONFIG.GRID_SIZE,
        height: GAME_CONFIG.GRID_SIZE,
        hp: GAME_CONFIG.WALL_HP
    },
    floor: {
        name: 'Sol',
        width: GAME_CONFIG.GRID_SIZE,
        height: GAME_CONFIG.GRID_SIZE / 4,
        hp: GAME_CONFIG.FLOOR_HP
    },
    ramp: {
        name: 'Rampe',
        width: GAME_CONFIG.GRID_SIZE,
        height: GAME_CONFIG.GRID_SIZE,
        hp: GAME_CONFIG.RAMP_HP
    }
};

/**
 * Classe représentant une construction
 */
class Building {
    constructor(type, x, y, material = 'wood', direction = 1) {
        const definition = BUILDING_TYPES[type];

        this.type = type;
        this.x = x;
        this.y = y;
        this.width = definition.width;
        this.height = definition.height;
        this.maxHp = definition.hp;
        this.hp = this.maxHp;
        this.material = material;
        this.direction = direction; // Pour les rampes: 1 = droite, -1 = gauche

        // État de construction
        this.buildProgress = 0;
        this.isBuilding = true;
        this.buildTime = 500; // ms pour construire complètement

        // Couleur basée sur le matériau
        this.colors = this.getMaterialColors();
    }

    /**
     * Retourne les couleurs basées sur le matériau
     */
    getMaterialColors() {
        switch (this.material) {
            case 'wood':
                return {
                    fill: '#8B4513',
                    stroke: '#5D3A1A',
                    highlight: '#A0522D'
                };
            case 'brick':
                return {
                    fill: '#C0392B',
                    stroke: '#922B21',
                    highlight: '#E74C3C'
                };
            case 'metal':
                return {
                    fill: '#7F8C8D',
                    stroke: '#5D6D7E',
                    highlight: '#95A5A6'
                };
            default:
                return {
                    fill: '#8B4513',
                    stroke: '#5D3A1A',
                    highlight: '#A0522D'
                };
        }
    }

    /**
     * Met à jour la construction
     */
    update(deltaTime) {
        if (this.isBuilding) {
            this.buildProgress += deltaTime;
            if (this.buildProgress >= this.buildTime) {
                this.isBuilding = false;
                this.buildProgress = this.buildTime;
            }
        }
    }

    /**
     * Inflige des dégâts à la construction
     */
    takeDamage(amount) {
        this.hp -= amount;

        // Particules de dégât
        particles.emit(
            this.x + this.width / 2,
            this.y + this.height / 2,
            8,
            this.colors.fill,
            { speedMin: 2, speedMax: 5 }
        );

        return this.hp <= 0;
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
     * Dessine la construction
     */
    render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        const screen = worldToScreen(this.x, this.y, cameraX, cameraY, canvasWidth, canvasHeight);
        const progress = this.isBuilding ? this.buildProgress / this.buildTime : 1;

        ctx.save();

        // Transparence pendant la construction
        ctx.globalAlpha = 0.5 + progress * 0.5;

        switch (this.type) {
            case 'wall':
                this.renderWall(ctx, screen, progress);
                break;
            case 'floor':
                this.renderFloor(ctx, screen, progress);
                break;
            case 'ramp':
                this.renderRamp(ctx, screen, progress);
                break;
        }

        // Barre de vie si endommagé
        if (this.hp < this.maxHp && !this.isBuilding) {
            this.renderHealthBar(ctx, screen);
        }

        ctx.restore();
    }

    /**
     * Dessine un mur
     */
    renderWall(ctx, screen, progress) {
        const h = this.height * progress;

        // Fond
        ctx.fillStyle = this.colors.fill;
        ctx.fillRect(screen.x, screen.y + this.height - h, this.width, h);

        // Bordure
        ctx.strokeStyle = this.colors.stroke;
        ctx.lineWidth = 3;
        ctx.strokeRect(screen.x, screen.y + this.height - h, this.width, h);

        // Détails (planches/briques)
        if (progress > 0.5) {
            ctx.strokeStyle = this.colors.highlight;
            ctx.lineWidth = 1;

            // Lignes horizontales
            for (let i = 1; i < 4; i++) {
                const lineY = screen.y + this.height - h + (h / 4) * i;
                ctx.beginPath();
                ctx.moveTo(screen.x + 5, lineY);
                ctx.lineTo(screen.x + this.width - 5, lineY);
                ctx.stroke();
            }

            // Lignes verticales
            ctx.beginPath();
            ctx.moveTo(screen.x + this.width / 2, screen.y + this.height - h + 5);
            ctx.lineTo(screen.x + this.width / 2, screen.y + this.height - 5);
            ctx.stroke();
        }
    }

    /**
     * Dessine un sol
     */
    renderFloor(ctx, screen, progress) {
        const w = this.width * progress;

        // Fond
        ctx.fillStyle = this.colors.fill;
        ctx.fillRect(screen.x, screen.y, w, this.height);

        // Bordure
        ctx.strokeStyle = this.colors.stroke;
        ctx.lineWidth = 2;
        ctx.strokeRect(screen.x, screen.y, w, this.height);

        // Détails
        if (progress > 0.5) {
            ctx.strokeStyle = this.colors.highlight;
            ctx.lineWidth = 1;
            for (let i = 1; i < 4; i++) {
                const lineX = screen.x + (w / 4) * i;
                ctx.beginPath();
                ctx.moveTo(lineX, screen.y + 2);
                ctx.lineTo(lineX, screen.y + this.height - 2);
                ctx.stroke();
            }
        }
    }

    /**
     * Dessine une rampe
     */
    renderRamp(ctx, screen, progress) {
        ctx.fillStyle = this.colors.fill;
        ctx.strokeStyle = this.colors.stroke;
        ctx.lineWidth = 3;

        ctx.beginPath();
        if (this.direction === 1) {
            // Rampe montant vers la droite
            ctx.moveTo(screen.x, screen.y + this.height);
            ctx.lineTo(screen.x + this.width * progress, screen.y + this.height);
            ctx.lineTo(screen.x + this.width * progress, screen.y + this.height * (1 - progress));
            ctx.closePath();
        } else {
            // Rampe montant vers la gauche
            ctx.moveTo(screen.x + this.width, screen.y + this.height);
            ctx.lineTo(screen.x + this.width - this.width * progress, screen.y + this.height);
            ctx.lineTo(screen.x + this.width - this.width * progress, screen.y + this.height * (1 - progress));
            ctx.closePath();
        }

        ctx.fill();
        ctx.stroke();

        // Lignes de la rampe
        if (progress > 0.5) {
            ctx.strokeStyle = this.colors.highlight;
            ctx.lineWidth = 1;
            const steps = 4;
            for (let i = 1; i < steps; i++) {
                const ratio = i / steps;
                if (this.direction === 1) {
                    const x = screen.x + this.width * ratio * progress;
                    const y = screen.y + this.height * (1 - ratio * progress);
                    ctx.beginPath();
                    ctx.moveTo(x, screen.y + this.height);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                } else {
                    const x = screen.x + this.width - this.width * ratio * progress;
                    const y = screen.y + this.height * (1 - ratio * progress);
                    ctx.beginPath();
                    ctx.moveTo(x, screen.y + this.height);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
            }
        }
    }

    /**
     * Dessine la barre de vie
     */
    renderHealthBar(ctx, screen) {
        const barWidth = this.width - 10;
        const barHeight = 6;
        const barX = screen.x + 5;
        const barY = screen.y - 12;

        // Fond
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Vie
        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = hpPercent > 0.5 ? '#2ECC71' : hpPercent > 0.25 ? '#F39C12' : '#E74C3C';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // Bordure
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

/**
 * Gestionnaire de construction
 */
class BuildingManager {
    constructor() {
        this.buildings = [];
        this.previewBuilding = null;
    }

    /**
     * Met à jour l'aperçu de construction
     */
    updatePreview(player, mouseWorldX, mouseWorldY) {
        if (!player.buildMode) {
            this.previewBuilding = null;
            return;
        }

        // Calculer la position sur la grille
        const gridX = Math.floor(mouseWorldX / GAME_CONFIG.GRID_SIZE) * GAME_CONFIG.GRID_SIZE;
        let gridY = Math.floor(mouseWorldY / GAME_CONFIG.GRID_SIZE) * GAME_CONFIG.GRID_SIZE;

        // Ajustement pour les sols
        if (player.buildType === 'floor') {
            gridY = Math.floor(mouseWorldY / GAME_CONFIG.GRID_SIZE) * GAME_CONFIG.GRID_SIZE +
                    GAME_CONFIG.GRID_SIZE - BUILDING_TYPES.floor.height;
        }

        // Direction de la rampe basée sur la direction du joueur
        const direction = player.facingRight ? 1 : -1;

        // Vérifier si on peut placer
        const canPlace = this.canPlaceBuilding(player.buildType, gridX, gridY) &&
                        player.canBuild(player.buildType);

        this.previewBuilding = {
            type: player.buildType,
            x: gridX,
            y: gridY,
            width: BUILDING_TYPES[player.buildType].width,
            height: BUILDING_TYPES[player.buildType].height,
            direction,
            canPlace
        };
    }

    /**
     * Vérifie si on peut placer une construction
     */
    canPlaceBuilding(type, x, y) {
        const rect = {
            x,
            y,
            width: BUILDING_TYPES[type].width,
            height: BUILDING_TYPES[type].height
        };

        // Vérifier les collisions avec les autres constructions
        for (const building of this.buildings) {
            if (rectCollision(rect, building.getRect())) {
                return false;
            }
        }

        // Vérifier les limites du monde
        if (x < 0 || x + rect.width > GAME_CONFIG.WORLD_WIDTH ||
            y < 0 || y + rect.height > GAME_CONFIG.WORLD_HEIGHT) {
            return false;
        }

        return true;
    }

    /**
     * Place une construction
     */
    placeBuilding(player) {
        if (!this.previewBuilding || !this.previewBuilding.canPlace) return false;

        const material = player.consumeBuildResources();
        if (!material) return false;

        const building = new Building(
            this.previewBuilding.type,
            this.previewBuilding.x,
            this.previewBuilding.y,
            material,
            this.previewBuilding.direction
        );

        this.buildings.push(building);
        AudioManager.build();

        // Particules de construction
        particles.emit(
            building.x + building.width / 2,
            building.y + building.height / 2,
            15,
            building.colors.fill,
            { speedMin: 2, speedMax: 6, gravity: 0.1 }
        );

        return true;
    }

    /**
     * Met à jour toutes les constructions
     */
    update(deltaTime) {
        // Mettre à jour la construction
        this.buildings.forEach(b => b.update(deltaTime));

        // Supprimer les constructions détruites
        this.buildings = this.buildings.filter(b => b.hp > 0);
    }

    /**
     * Vérifie les collisions avec un projectile
     */
    checkBulletCollision(bullet) {
        for (const building of this.buildings) {
            if (bullet.checkCollision(building.getRect())) {
                const destroyed = building.takeDamage(bullet.damage);
                if (destroyed) {
                    showGameMessage(`${BUILDING_TYPES[building.type].name} détruit!`);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Dessine l'aperçu de construction
     */
    renderPreview(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        if (!this.previewBuilding) return;

        const screen = worldToScreen(
            this.previewBuilding.x,
            this.previewBuilding.y,
            cameraX, cameraY, canvasWidth, canvasHeight
        );

        ctx.save();
        ctx.globalAlpha = 0.5;

        // Couleur selon si on peut placer
        ctx.fillStyle = this.previewBuilding.canPlace ? '#2ECC71' : '#E74C3C';
        ctx.strokeStyle = this.previewBuilding.canPlace ? '#27AE60' : '#C0392B';
        ctx.lineWidth = 2;

        if (this.previewBuilding.type === 'ramp') {
            ctx.beginPath();
            if (this.previewBuilding.direction === 1) {
                ctx.moveTo(screen.x, screen.y + this.previewBuilding.height);
                ctx.lineTo(screen.x + this.previewBuilding.width, screen.y + this.previewBuilding.height);
                ctx.lineTo(screen.x + this.previewBuilding.width, screen.y);
                ctx.closePath();
            } else {
                ctx.moveTo(screen.x + this.previewBuilding.width, screen.y + this.previewBuilding.height);
                ctx.lineTo(screen.x, screen.y + this.previewBuilding.height);
                ctx.lineTo(screen.x, screen.y);
                ctx.closePath();
            }
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(
                screen.x,
                screen.y,
                this.previewBuilding.width,
                this.previewBuilding.height
            );
            ctx.strokeRect(
                screen.x,
                screen.y,
                this.previewBuilding.width,
                this.previewBuilding.height
            );
        }

        ctx.restore();
    }

    /**
     * Dessine toutes les constructions
     */
    render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        // Trier par Y pour le rendu
        const sorted = [...this.buildings].sort((a, b) => a.y - b.y);

        sorted.forEach(building => {
            building.render(ctx, cameraX, cameraY, canvasWidth, canvasHeight);
        });
    }
}

console.log('✅ Building chargé');
