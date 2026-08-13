import * as Phaser from "phaser";
import { BattleUnitContainer } from "@/game/objects/BattleUnitContainer";
import { EventBus, GAME_EVENTS } from "@/game/EventBus";

export interface EnemyMonster {
  container: BattleUnitContainer;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  attackRange: number;
  attackCooldownMs: number;
  lastAttackTime: number;
  isDead: boolean;
}

export class RealtimeCombatManager {
  private scene: Phaser.Scene;
  private playerContainer: BattleUnitContainer | null = null;
  private playerHp: number = 200;
  private playerMaxHp: number = 200;
  private playerAtk: number = 35;
  private enemies: EnemyMonster[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public registerPlayer(container: BattleUnitContainer) {
    this.playerContainer = container;
  }

  public registerEnemy(container: BattleUnitContainer, hp: number = 100, atk: number = 15) {
    this.enemies.push({
      container,
      hp,
      maxHp: hp,
      atk,
      speed: 90, // 山賊追擊速度
      attackRange: 60, // 攻擊距離 60px
      attackCooldownMs: 1500, // 每 1.5 秒普通攻擊一次
      lastAttackTime: 0,
      isDead: false,
    });
  }

  /**
   * 玩家手動實時普通攻擊 (Helbreath 左鍵點擊/空白鍵揮刀)
   */
  public playerAttackNearEnemies() {
    if (!this.playerContainer) return;

    const px = this.playerContainer.x;
    const py = this.playerContainer.y;
    const attackRadius = 100; // 攻擊判定半徑

    let hitCount = 0;
    this.enemies.forEach((enemy) => {
      if (enemy.isDead) return;

      const dist = Phaser.Math.Distance.Between(px, py, enemy.container.x, enemy.container.y);
      if (dist <= attackRadius) {
        hitCount++;
        // 造成 35-50 點隨機傷害
        const dmg = Math.floor(this.playerAtk + Math.random() * 15);
        const isCrit = Math.random() < 0.25;
        const finalDmg = isCrit ? Math.floor(dmg * 1.8) : dmg;

        enemy.hp -= finalDmg;
        enemy.container.playHitEffect(finalDmg, isCrit);

        if (enemy.hp <= 0) {
          enemy.isDead = true;
          enemy.container.destroyContainer();
        }
      }
    });

    // 揮刀光效
    if (hitCount > 0) {
      const swingArc = this.scene.add.graphics();
      swingArc.lineStyle(4, 0xfef08a, 0.9);
      swingArc.strokeCircle(px, py, 75);
      this.scene.tweens.add({
        targets: swingArc,
        alpha: 0,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 200,
        onComplete: () => swingArc.destroy(),
      });
    }
  }

  /**
   * 每一幀 60 FPS 實時怪物 AI 追擊與近身砍殺邏輯 (Helbreath Monster AI)
   */
  public update(time: number, delta: number) {
    if (!this.playerContainer) return;

    const px = this.playerContainer.x;
    const py = this.playerContainer.y;

    this.enemies.forEach((enemy) => {
      if (enemy.isDead) return;

      const enemyX = enemy.container.x;
      const enemyY = enemy.container.y;
      const distToPlayer = Phaser.Math.Distance.Between(enemyX, enemyY, px, py);

      // 1. 警戒範圍：若主角進入 500px 內，山賊主動追擊 (Aggro)
      if (distToPlayer <= 500 && distToPlayer > enemy.attackRange) {
        const angle = Phaser.Math.Angle.Between(enemyX, enemyY, px, py);
        const step = (enemy.speed * delta) / 1000;

        enemy.container.x += Math.cos(angle) * step;
        enemy.container.y += Math.sin(angle) * step;
        enemy.container.depth = Math.floor(enemy.container.y);
      }

      // 2. 進入攻擊距離：發動實時砍殺
      if (distToPlayer <= enemy.attackRange && time - enemy.lastAttackTime > enemy.attackCooldownMs) {
        enemy.lastAttackTime = time;

        const dmg = enemy.atk + Math.floor(Math.random() * 5);
        this.playerHp -= dmg;
        if (this.playerContainer) {
          this.playerContainer.playHitEffect(dmg, false);
        }
      }
    });
  }

  public destroy() {
    this.enemies = [];
    this.playerContainer = null;
  }
}
