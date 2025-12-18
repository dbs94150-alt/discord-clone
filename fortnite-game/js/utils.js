/**
 * ========================================
 * UTILITAIRES - Fonctions helpers globales
 * ========================================
 */

// Constantes globales du jeu
const GAME_CONFIG = {
    // Dimensions
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 2000,
    GROUND_LEVEL: 500,

    // Physique
    GRAVITY: 0.6,
    FRICTION: 0.85,
    AIR_FRICTION: 0.95,

    // Joueur
    PLAYER_WIDTH: 40,
    PLAYER_HEIGHT: 60,
    PLAYER_SPEED: 5,
    PLAYER_JUMP_FORCE: 14,
    PLAYER_MAX_HEALTH: 100,
    PLAYER_MAX_SHIELD: 100,

    // Construction
    BUILD_COST: 10,
    WALL_HP: 150,
    FLOOR_HP: 140,
    RAMP_HP: 140,
    GRID_SIZE: 80,

    // Combat
    HEADSHOT_MULTIPLIER: 2.0,

    // Spawn
    ENEMY_SPAWN_RATE: 5000,
    MAX_ENEMIES: 8,
    CHEST_COUNT: 15
};

// Couleurs pour le rendu
const COLORS = {
    SKY_TOP: '#87CEEB',
    SKY_BOTTOM: '#E0F7FA',
    GROUND: '#7CB342',
    GROUND_DARK: '#558B2F',
    PLAYER: '#3498DB',
    ENEMY: '#E74C3C',
    BULLET: '#FFD700',
    WALL: '#8D6E63',
    FLOOR: '#A1887F',
    RAMP: '#6D4C41',
    CHEST: '#F39C12',
    TREE: '#2E7D32',
    TREE_TRUNK: '#5D4037',
    SHADOW: 'rgba(0,0,0,0.3)'
};

/**
 * Génère un nombre aléatoire entre min et max
 */
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Génère un entier aléatoire entre min et max (inclus)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calcule la distance entre deux points
 */
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Calcule l'angle entre deux points
 */
function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Vérifie si deux rectangles se chevauchent (AABB collision)
 */
function rectCollision(r1, r2) {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
}

/**
 * Vérifie si un point est dans un rectangle
 */
function pointInRect(px, py, rect) {
    return px >= rect.x &&
           px <= rect.x + rect.width &&
           py >= rect.y &&
           py <= rect.y + rect.height;
}

/**
 * Clamp une valeur entre min et max
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Interpolation linéaire
 */
function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Convertit des coordonnées monde vers écran
 */
function worldToScreen(worldX, worldY, cameraX, cameraY, canvasWidth, canvasHeight) {
    return {
        x: worldX - cameraX + canvasWidth / 2,
        y: worldY - cameraY + canvasHeight / 2
    };
}

/**
 * Convertit des coordonnées écran vers monde
 */
function screenToWorld(screenX, screenY, cameraX, cameraY, canvasWidth, canvasHeight) {
    return {
        x: screenX + cameraX - canvasWidth / 2,
        y: screenY + cameraY - canvasHeight / 2
    };
}

/**
 * Affiche un message temporaire dans le HUD
 */
function showGameMessage(text, duration = 2000) {
    const container = document.getElementById('game-messages');
    const message = document.createElement('div');
    message.className = 'game-message';
    message.textContent = text;
    container.appendChild(message);

    setTimeout(() => {
        message.remove();
    }, duration);
}

/**
 * Met à jour un élément DOM avec une nouvelle valeur
 */
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Met à jour une barre de progression
 */
function updateBar(barId, current, max) {
    const bar = document.getElementById(barId);
    if (bar) {
        const percentage = (current / max) * 100;
        bar.style.width = percentage + '%';
    }
}

/**
 * Joue un effet sonore simple (Web Audio API)
 */
const AudioManager = {
    context: null,

    init() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
    },

    playSound(frequency, duration, type = 'square', volume = 0.3) {
        if (!this.context) this.init();

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(volume, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + duration);
    },

    // Sons prédéfinis
    shoot() { this.playSound(200, 0.1, 'square', 0.2); },
    jump() { this.playSound(400, 0.15, 'sine', 0.2); },
    hit() { this.playSound(100, 0.2, 'sawtooth', 0.3); },
    pickup() { this.playSound(600, 0.1, 'sine', 0.2); },
    build() { this.playSound(300, 0.15, 'triangle', 0.2); },
    reload() { this.playSound(500, 0.3, 'triangle', 0.15); },
    chestOpen() { this.playSound(800, 0.2, 'sine', 0.25); }
};

/**
 * Système de particules simple
 */
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, count, color, options = {}) {
        const defaults = {
            speedMin: 1,
            speedMax: 5,
            sizeMin: 2,
            sizeMax: 6,
            lifeMin: 20,
            lifeMax: 40,
            gravity: 0.1
        };
        const opts = { ...defaults, ...options };

        for (let i = 0; i < count; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(opts.speedMin, opts.speedMax);
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: randomRange(opts.sizeMin, opts.sizeMax),
                color,
                life: randomRange(opts.lifeMin, opts.lifeMax),
                maxLife: opts.lifeMax,
                gravity: opts.gravity
            });
        }
    }

    update() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life--;
            return p.life > 0;
        });
    }

    render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        this.particles.forEach(p => {
            const screen = worldToScreen(p.x, p.y, cameraX, cameraY, canvasWidth, canvasHeight);
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
}

// Instance globale du système de particules
const particles = new ParticleSystem();

console.log('✅ Utils chargés');
