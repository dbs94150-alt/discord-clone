/**
 * ========================================
 * CHEST - Système de coffres et loot
 * ========================================
 * - Coffres dispersés sur la map
 * - Interaction avec touche E
 * - Drop d'armes, munitions, ressources
 * - Ramassage automatique à proximité
 */

/**
 * Types de loot possibles
 */
const LOOT_TYPES = {
    WEAPON: 'weapon',
    AMMO: 'ammo',
    HEALTH: 'health',
    SHIELD: 'shield',
    RESOURCES: 'resources'
};

/**
 * Classe représentant un coffre
 */
class Chest {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 40;
        this.isOpen = false;
        this.interactionRadius = 80;

        // Animation
        this.glowPhase = Math.random() * Math.PI * 2;
        this.bouncePhase = Math.random() * Math.PI * 2;

        // Contenu (généré à l'ouverture)
        this.contents = [];
    }

    /**
     * Génère le contenu du coffre
     */
    generateContents() {
        const contents = [];

        // Toujours une arme
        contents.push({
            type: LOOT_TYPES.WEAPON,
            item: generateRandomWeapon()
        });

        // Munitions (70% de chance)
        if (Math.random() < 0.7) {
            const ammoTypes = ['light', 'medium', 'shells', 'heavy'];
            const ammoType = ammoTypes[Math.floor(Math.random() * ammoTypes.length)];
            const amounts = { light: 30, medium: 20, shells: 6, heavy: 5 };
            contents.push({
                type: LOOT_TYPES.AMMO,
                ammoType,
                amount: amounts[ammoType]
            });
        }

        // Ressources (80% de chance)
        if (Math.random() < 0.8) {
            const resourceTypes = ['wood', 'brick', 'metal'];
            const type = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
            contents.push({
                type: LOOT_TYPES.RESOURCES,
                resourceType: type,
                amount: randomInt(20, 50)
            });
        }

        // Soins (40% de chance)
        if (Math.random() < 0.4) {
            contents.push({
                type: Math.random() < 0.5 ? LOOT_TYPES.HEALTH : LOOT_TYPES.SHIELD,
                amount: 25
            });
        }

        return contents;
    }

    /**
     * Ouvre le coffre et retourne le loot
     */
    open() {
        if (this.isOpen) return [];

        this.isOpen = true;
        this.contents = this.generateContents();
        AudioManager.chestOpen();

        // Particules d'ouverture
        particles.emit(
            this.x + this.width / 2,
            this.y,
            20,
            '#FFD700',
            { speedMin: 3, speedMax: 8, gravity: 0.2 }
        );

        return this.contents;
    }

    /**
     * Vérifie si le joueur peut interagir
     */
    canInteract(playerX, playerY) {
        if (this.isOpen) return false;

        const dist = distance(
            playerX, playerY,
            this.x + this.width / 2, this.y + this.height / 2
        );
        return dist <= this.interactionRadius;
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
     * Dessine le coffre
     */
    render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        const screen = worldToScreen(this.x, this.y, cameraX, cameraY, canvasWidth, canvasHeight);

        ctx.save();

        if (!this.isOpen) {
            // Animation de lueur
            this.glowPhase += 0.05;
            const glowIntensity = 0.5 + Math.sin(this.glowPhase) * 0.3;

            // Lueur autour du coffre
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 20 * glowIntensity;

            // Animation de rebond
            this.bouncePhase += 0.03;
            const bounce = Math.sin(this.bouncePhase) * 3;

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
            ctx.shadowBlur = 0;

            // Corps du coffre
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screen.x, screen.y + bounce, this.width, this.height);

            // Couvercle
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(screen.x - 2, screen.y - 5 + bounce, this.width + 4, 10);

            // Détails dorés
            ctx.fillStyle = '#FFD700';
            // Serrure
            ctx.beginPath();
            ctx.arc(screen.x + this.width / 2, screen.y + this.height / 2 + bounce, 8, 0, Math.PI * 2);
            ctx.fill();
            // Bordures
            ctx.fillRect(screen.x, screen.y + 5 + bounce, this.width, 3);
            ctx.fillRect(screen.x, screen.y + this.height - 8 + bounce, this.width, 3);

            // Symbole "?"
            ctx.fillStyle = '#8B4513';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('?', screen.x + this.width / 2, screen.y + this.height / 2 + 5 + bounce);

        } else {
            // Coffre ouvert (vide)
            ctx.fillStyle = '#5D3A1A';
            ctx.fillRect(screen.x, screen.y + 5, this.width, this.height - 5);

            // Intérieur vide
            ctx.fillStyle = '#3D2A15';
            ctx.fillRect(screen.x + 5, screen.y + 10, this.width - 10, this.height - 15);

            // Couvercle ouvert
            ctx.fillStyle = '#8B4513';
            ctx.save();
            ctx.translate(screen.x, screen.y);
            ctx.rotate(-0.8);
            ctx.fillRect(0, -8, this.width + 4, 10);
            ctx.restore();
        }

        ctx.restore();
    }
}

/**
 * Classe représentant un item droppé au sol
 */
class DroppedItem {
    constructor(x, y, lootData) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.lootData = lootData;
        this.pickupRadius = 50;

        // Physique simple
        this.vy = -5;
        this.vx = (Math.random() - 0.5) * 6;
        this.grounded = false;

        // Animation
        this.bobPhase = Math.random() * Math.PI * 2;
        this.lifetime = 60000; // 60 secondes avant disparition
        this.spawnTime = Date.now();
    }

    /**
     * Met à jour l'item
     */
    update() {
        if (!this.grounded) {
            this.vy += 0.3;
            this.y += this.vy;
            this.x += this.vx;

            // Sol du monde
            const groundY = GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.GROUND_LEVEL - this.height;
            if (this.y >= groundY) {
                this.y = groundY;
                this.grounded = true;
            }
        }

        // Animation de flottement
        this.bobPhase += 0.05;

        // Vérifier durée de vie
        return Date.now() - this.spawnTime < this.lifetime;
    }

    /**
     * Vérifie si le joueur peut ramasser
     */
    canPickup(playerX, playerY) {
        const dist = distance(
            playerX + GAME_CONFIG.PLAYER_WIDTH / 2,
            playerY + GAME_CONFIG.PLAYER_HEIGHT / 2,
            this.x + this.width / 2,
            this.y + this.height / 2
        );
        return dist <= this.pickupRadius;
    }

    /**
     * Applique le loot au joueur
     */
    applyTo(player, ammoManager) {
        switch (this.lootData.type) {
            case LOOT_TYPES.WEAPON:
                player.equipWeapon(this.lootData.item);
                break;

            case LOOT_TYPES.AMMO:
                ammoManager.add(this.lootData.ammoType, this.lootData.amount);
                showGameMessage(`+${this.lootData.amount} munitions`);
                break;

            case LOOT_TYPES.HEALTH:
                player.heal(this.lootData.amount);
                showGameMessage(`+${this.lootData.amount} PV`);
                break;

            case LOOT_TYPES.SHIELD:
                player.addShield(this.lootData.amount);
                showGameMessage(`+${this.lootData.amount} Bouclier`);
                break;

            case LOOT_TYPES.RESOURCES:
                player.addResources(this.lootData.resourceType, this.lootData.amount);
                const icons = { wood: '🪵', brick: '🧱', metal: '⚙️' };
                showGameMessage(`+${this.lootData.amount} ${icons[this.lootData.resourceType]}`);
                break;
        }

        AudioManager.pickup();
    }

    /**
     * Retourne l'icône de l'item
     */
    getIcon() {
        switch (this.lootData.type) {
            case LOOT_TYPES.WEAPON:
                return this.lootData.item.icon;
            case LOOT_TYPES.AMMO:
                return '🔸';
            case LOOT_TYPES.HEALTH:
                return '❤️';
            case LOOT_TYPES.SHIELD:
                return '🛡️';
            case LOOT_TYPES.RESOURCES:
                const icons = { wood: '🪵', brick: '🧱', metal: '⚙️' };
                return icons[this.lootData.resourceType];
            default:
                return '❓';
        }
    }

    /**
     * Retourne la couleur de l'item
     */
    getColor() {
        switch (this.lootData.type) {
            case LOOT_TYPES.WEAPON:
                return this.lootData.item.getRarityColor();
            case LOOT_TYPES.AMMO:
                return '#F39C12';
            case LOOT_TYPES.HEALTH:
                return '#E74C3C';
            case LOOT_TYPES.SHIELD:
                return '#3498DB';
            case LOOT_TYPES.RESOURCES:
                const colors = { wood: '#8B4513', brick: '#C0392B', metal: '#7F8C8D' };
                return colors[this.lootData.resourceType];
            default:
                return '#888';
        }
    }

    /**
     * Dessine l'item
     */
    render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        const bob = this.grounded ? Math.sin(this.bobPhase) * 3 : 0;
        const screen = worldToScreen(this.x, this.y + bob, cameraX, cameraY, canvasWidth, canvasHeight);

        ctx.save();

        // Ombre
        ctx.fillStyle = COLORS.SHADOW;
        ctx.beginPath();
        ctx.ellipse(
            screen.x + this.width / 2,
            screen.y + this.height + 5 - bob,
            this.width / 2,
            5,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Fond coloré
        const color = this.getColor();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        // Rectangle arrondi
        const radius = 5;
        ctx.beginPath();
        ctx.moveTo(screen.x + radius, screen.y);
        ctx.lineTo(screen.x + this.width - radius, screen.y);
        ctx.quadraticCurveTo(screen.x + this.width, screen.y, screen.x + this.width, screen.y + radius);
        ctx.lineTo(screen.x + this.width, screen.y + this.height - radius);
        ctx.quadraticCurveTo(screen.x + this.width, screen.y + this.height, screen.x + this.width - radius, screen.y + this.height);
        ctx.lineTo(screen.x + radius, screen.y + this.height);
        ctx.quadraticCurveTo(screen.x, screen.y + this.height, screen.x, screen.y + this.height - radius);
        ctx.lineTo(screen.x, screen.y + radius);
        ctx.quadraticCurveTo(screen.x, screen.y, screen.x + radius, screen.y);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // Bordure
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icône
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(this.getIcon(), screen.x + this.width / 2, screen.y + this.height / 2);

        ctx.restore();
    }
}

/**
 * Gestionnaire de loot
 */
class LootManager {
    constructor() {
        this.chests = [];
        this.droppedItems = [];
    }

    /**
     * Génère les coffres sur la map
     */
    spawnChests(count) {
        this.chests = [];
        const groundY = GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.GROUND_LEVEL;

        for (let i = 0; i < count; i++) {
            const x = randomRange(100, GAME_CONFIG.WORLD_WIDTH - 150);
            const y = groundY - 40; // Sur le sol
            this.chests.push(new Chest(x, y));
        }
    }

    /**
     * Vérifie les interactions avec les coffres
     */
    checkChestInteraction(player) {
        const playerCenter = player.getCenter();

        for (const chest of this.chests) {
            if (chest.canInteract(playerCenter.x, playerCenter.y)) {
                return chest;
            }
        }
        return null;
    }

    /**
     * Ouvre un coffre et drop le loot
     */
    openChest(chest) {
        const contents = chest.open();

        // Créer les items droppés
        contents.forEach((loot, index) => {
            const item = new DroppedItem(
                chest.x + chest.width / 2 - 15 + (index - 1) * 20,
                chest.y - 20,
                loot
            );
            this.droppedItems.push(item);
        });

        return contents;
    }

    /**
     * Drop un item à une position
     */
    dropItem(x, y, lootData) {
        const item = new DroppedItem(x, y, lootData);
        this.droppedItems.push(item);
    }

    /**
     * Met à jour les items droppés et vérifie le ramassage
     */
    update(player, ammoManager) {
        // Mettre à jour les items
        this.droppedItems = this.droppedItems.filter(item => {
            if (!item.update()) return false;

            // Ramassage automatique à proximité
            if (item.canPickup(player.x, player.y)) {
                item.applyTo(player, ammoManager);
                return false;
            }

            return true;
        });
    }

    /**
     * Dessine tous les coffres et items
     */
    render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        // Dessiner les coffres
        this.chests.forEach(chest => {
            chest.render(ctx, cameraX, cameraY, canvasWidth, canvasHeight);
        });

        // Dessiner les items droppés
        this.droppedItems.forEach(item => {
            item.render(ctx, cameraX, cameraY, canvasWidth, canvasHeight);
        });
    }
}

console.log('✅ Chest chargé');
