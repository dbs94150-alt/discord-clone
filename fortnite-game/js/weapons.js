/**
 * ========================================
 * WEAPONS - Système d'armes et projectiles
 * ========================================
 * Types d'armes:
 * - Fusil d'assaut (AR)
 * - Pompe (Shotgun)
 * - Pistolet (Pistol)
 * - SMG
 * - Sniper
 */

// Définitions des armes
const WEAPON_TYPES = {
    PISTOL: {
        name: 'Pistolet',
        icon: '🔫',
        damage: 23,
        fireRate: 300, // ms entre chaque tir
        magazineSize: 16,
        reloadTime: 1500,
        bulletSpeed: 20,
        bulletRange: 600,
        spread: 0.08,
        automatic: false,
        ammoType: 'light',
        rarities: ['common', 'uncommon', 'rare']
    },
    AR: {
        name: 'Fusil d\'Assaut',
        icon: '🔫',
        damage: 30,
        fireRate: 150,
        magazineSize: 30,
        reloadTime: 2200,
        bulletSpeed: 25,
        bulletRange: 800,
        spread: 0.1,
        automatic: true,
        ammoType: 'medium',
        rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary']
    },
    SHOTGUN: {
        name: 'Pompe',
        icon: '💥',
        damage: 90,
        fireRate: 800,
        magazineSize: 5,
        reloadTime: 500, // par balle
        bulletSpeed: 18,
        bulletRange: 200,
        spread: 0.25,
        pellets: 10,
        automatic: false,
        ammoType: 'shells',
        rarities: ['uncommon', 'rare', 'epic', 'legendary']
    },
    SMG: {
        name: 'SMG',
        icon: '🔫',
        damage: 17,
        fireRate: 80,
        magazineSize: 35,
        reloadTime: 2000,
        bulletSpeed: 22,
        bulletRange: 500,
        spread: 0.15,
        automatic: true,
        ammoType: 'light',
        rarities: ['common', 'uncommon', 'rare', 'epic']
    },
    SNIPER: {
        name: 'Sniper',
        icon: '🎯',
        damage: 105,
        fireRate: 1500,
        magazineSize: 1,
        reloadTime: 2500,
        bulletSpeed: 40,
        bulletRange: 1500,
        spread: 0.01,
        automatic: false,
        ammoType: 'heavy',
        rarities: ['rare', 'epic', 'legendary']
    }
};

// Multiplicateurs de rareté
const RARITY_MULTIPLIERS = {
    common: 1.0,
    uncommon: 1.05,
    rare: 1.1,
    epic: 1.15,
    legendary: 1.2
};

const RARITY_COLORS = {
    common: '#888888',
    uncommon: '#2ECC71',
    rare: '#3498DB',
    epic: '#9B59B6',
    legendary: '#F39C12'
};

/**
 * Classe représentant une arme
 */
class Weapon {
    constructor(type, rarity = 'common') {
        const definition = WEAPON_TYPES[type];
        if (!definition) {
            throw new Error(`Type d'arme inconnu: ${type}`);
        }

        this.type = type;
        this.name = definition.name;
        this.icon = definition.icon;
        this.rarity = rarity;

        // Stats avec multiplicateur de rareté
        const mult = RARITY_MULTIPLIERS[rarity];
        this.damage = Math.floor(definition.damage * mult);
        this.fireRate = definition.fireRate;
        this.magazineSize = definition.magazineSize;
        this.reloadTime = definition.reloadTime;
        this.bulletSpeed = definition.bulletSpeed;
        this.bulletRange = definition.bulletRange;
        this.spread = definition.spread;
        this.pellets = definition.pellets || 1;
        this.automatic = definition.automatic;
        this.ammoType = definition.ammoType;

        // État
        this.currentAmmo = this.magazineSize;
        this.isReloading = false;
        this.reloadProgress = 0;
        this.lastFireTime = 0;
    }

    /**
     * Vérifie si l'arme peut tirer
     */
    canFire() {
        const now = Date.now();
        return !this.isReloading &&
               this.currentAmmo > 0 &&
               (now - this.lastFireTime) >= this.fireRate;
    }

    /**
     * Tire avec l'arme
     * Retourne un tableau de projectiles
     */
    fire(x, y, targetX, targetY) {
        if (!this.canFire()) return [];

        this.lastFireTime = Date.now();
        this.currentAmmo--;

        const bullets = [];
        const baseAngle = angleBetween(x, y, targetX, targetY);

        // Créer les projectiles (plusieurs pour le shotgun)
        for (let i = 0; i < this.pellets; i++) {
            const spreadAngle = baseAngle + (Math.random() - 0.5) * this.spread * 2;
            bullets.push(new Bullet(
                x, y,
                spreadAngle,
                this.bulletSpeed,
                this.damage / this.pellets, // Dégâts répartis pour le shotgun
                this.bulletRange,
                this.type === 'SHOTGUN' ? '#FF6B35' : '#FFD700'
            ));
        }

        AudioManager.shoot();
        return bullets;
    }

    /**
     * Commence le rechargement
     */
    startReload(reserveAmmo) {
        if (this.isReloading || this.currentAmmo === this.magazineSize) return false;
        if (reserveAmmo <= 0) return false;

        this.isReloading = true;
        this.reloadProgress = 0;
        AudioManager.reload();
        return true;
    }

    /**
     * Met à jour le rechargement
     * Retourne le nombre de munitions consommées des réserves
     */
    updateReload(deltaTime, reserveAmmo) {
        if (!this.isReloading) return 0;

        this.reloadProgress += deltaTime;

        if (this.reloadProgress >= this.reloadTime) {
            this.isReloading = false;
            const ammoNeeded = this.magazineSize - this.currentAmmo;
            const ammoToAdd = Math.min(ammoNeeded, reserveAmmo);
            this.currentAmmo += ammoToAdd;
            return ammoToAdd;
        }

        return 0;
    }

    /**
     * Annule le rechargement
     */
    cancelReload() {
        this.isReloading = false;
        this.reloadProgress = 0;
    }

    /**
     * Retourne la couleur de rareté
     */
    getRarityColor() {
        return RARITY_COLORS[this.rarity];
    }
}

/**
 * Classe représentant un projectile
 */
class Bullet {
    constructor(x, y, angle, speed, damage, range, color = '#FFD700') {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.speed = speed;
        this.damage = damage;
        this.range = range;
        this.color = color;
        this.radius = 4;
        this.active = true;
        this.trail = [];
    }

    /**
     * Met à jour le projectile
     */
    update() {
        if (!this.active) return;

        // Sauvegarder la position pour la traînée
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) {
            this.trail.shift();
        }

        // Déplacement
        this.x += this.vx;
        this.y += this.vy;

        // Légère gravité pour un effet réaliste
        this.vy += 0.05;

        // Vérifier la portée
        const traveled = distance(this.startX, this.startY, this.x, this.y);
        if (traveled >= this.range) {
            this.active = false;
        }

        // Vérifier les limites du monde
        if (this.x < 0 || this.x > GAME_CONFIG.WORLD_WIDTH ||
            this.y < 0 || this.y > GAME_CONFIG.WORLD_HEIGHT) {
            this.active = false;
        }
    }

    /**
     * Vérifie la collision avec un rectangle
     */
    checkCollision(rect) {
        return this.active &&
               this.x >= rect.x &&
               this.x <= rect.x + rect.width &&
               this.y >= rect.y &&
               this.y <= rect.y + rect.height;
    }

    /**
     * Désactive le projectile lors d'un impact
     */
    hit() {
        this.active = false;
        particles.emit(this.x, this.y, 5, this.color, {
            speedMin: 2,
            speedMax: 5,
            sizeMin: 2,
            sizeMax: 4
        });
    }

    /**
     * Dessine le projectile
     */
    render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        if (!this.active) return;

        const screen = worldToScreen(this.x, this.y, cameraX, cameraY, canvasWidth, canvasHeight);

        // Traînée
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let i = 0; i < this.trail.length; i++) {
            const trailScreen = worldToScreen(this.trail[i].x, this.trail[i].y, cameraX, cameraY, canvasWidth, canvasHeight);
            if (i === 0) {
                ctx.moveTo(trailScreen.x, trailScreen.y);
            } else {
                ctx.lineTo(trailScreen.x, trailScreen.y);
            }
        }
        ctx.lineTo(screen.x, screen.y);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Projectile principal
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Effet de lueur
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, this.radius - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

/**
 * Gestionnaire des munitions de réserve
 */
class AmmoManager {
    constructor() {
        this.reserves = {
            light: 60,   // Pistolet, SMG
            medium: 90,  // AR
            shells: 20,  // Shotgun
            heavy: 10    // Sniper
        };
    }

    /**
     * Ajoute des munitions aux réserves
     */
    add(type, amount) {
        const maxAmmo = {
            light: 300,
            medium: 300,
            shells: 60,
            heavy: 40
        };
        this.reserves[type] = Math.min(maxAmmo[type], this.reserves[type] + amount);
    }

    /**
     * Retourne le nombre de munitions d'un type
     */
    get(type) {
        return this.reserves[type] || 0;
    }

    /**
     * Consomme des munitions
     */
    consume(type, amount) {
        const available = Math.min(this.reserves[type], amount);
        this.reserves[type] -= available;
        return available;
    }
}

/**
 * Génère une arme aléatoire avec rareté
 */
function generateRandomWeapon() {
    const types = Object.keys(WEAPON_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const definition = WEAPON_TYPES[type];

    // Sélectionner une rareté aléatoire parmi celles disponibles
    const rarities = definition.rarities;
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];

    return new Weapon(type, rarity);
}

/**
 * Génère une arme avec un type spécifique
 */
function createWeapon(type, rarity = 'common') {
    return new Weapon(type, rarity);
}

console.log('✅ Weapons chargé');
