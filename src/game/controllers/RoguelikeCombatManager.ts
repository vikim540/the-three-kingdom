import * as Phaser from "phaser";
import { BattleUnitContainer } from "@/game/objects/BattleUnitContainer";
import { HeroConfig } from "@/types/hero";
import { EventBus } from "@/game/EventBus";

export interface RoguelikeEnemy {
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

export interface PlayerTeamMember {
  id: string;
  heroConfig: HeroConfig;
  container: BattleUnitContainer;
  offsetX: number; // 隊員相對於領頭主角的固定間隔位移 (陣型)
  offsetY: number;
  atk: number;
  attackRange: number;
  attackCooldownMs: number;
  lastAttackTime: number;
  bulletSpeed: number;
}

export class RoguelikeCombatManager {
  private scene: Phaser.Scene;
  private leaderContainer: BattleUnitContainer | null = null;
  private teamMembers: PlayerTeamMember[] = [];
  private enemies: RoguelikeEnemy[] = [];
  
  // 玩家隊伍等級與經驗值 (Vampire Survivors / Roguelike 升級)
  public playerExp: number = 0;
  public playerLevel: number = 1;
  public expToNextLevel: number = 100;
  public killCount: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 註冊領頭主角
   */
  public registerLeader(container: BattleUnitContainer, heroConfig: HeroConfig) {
    this.leaderContainer = container;
    this.teamMembers = [
      {
        id: container.unitInstanceId,
        heroConfig,
        container,
        offsetX: 0,
        offsetY: 0,
        atk: heroConfig.baseStats.atk,
        attackRange: 280, // 自動彈幕射程 280px
        attackCooldownMs: 800, // 0.8 秒自動射擊一次
        lastAttackTime: 0,
        bulletSpeed: 500,
      },
    ];
  }

  /**
   * 抽卡選取新武將，加入主角團陣型 (保持間隔位移，同步移動)
   */
  public addTeamMember(heroConfig: HeroConfig): BattleUnitContainer | null {
    if (!this.leaderContainer) return null;

    const count = this.teamMembers.length;
    // 間隔位置算式：圍繞領頭主角呈雁形 / 兩側陣型排列 (間隔 65px)
    const offsetX = (count % 2 === 1 ? 1 : -1) * Math.ceil(count / 2) * 65;
    const offsetY = Math.ceil(count / 2) * 35;

    const spawnX = this.leaderContainer.x + offsetX;
    const spawnY = this.leaderContainer.y + offsetY;

    // 建立隊員物理容器
    const dummyUnit = {
      instanceId: `team_hero_${Date.now()}_${count}`,
      heroConfig,
      faction: "PLAYER" as const,
      x: 0,
      y: 0,
      currentHp: heroConfig.baseStats.hp,
      maxHp: heroConfig.baseStats.maxHp,
      atk: heroConfig.baseStats.atk,
      def: heroConfig.baseStats.def,
      speed: heroConfig.baseStats.speed,
      moveRange: 3,
      attackRange: 2,
      statusEffects: [],
      hasActedThisTurn: false,
      isDead: false,
    };

    const memberContainer = new BattleUnitContainer(
      this.scene,
      dummyUnit,
      this.scene.scale.width,
      this.scene.scale.height
    );
    memberContainer.x = spawnX;
    memberContainer.y = spawnY;

    this.teamMembers.push({
      id: dummyUnit.instanceId,
      heroConfig,
      container: memberContainer,
      offsetX,
      offsetY,
      atk: heroConfig.baseStats.atk,
      attackRange: 300,
      attackCooldownMs: 700,
      lastAttackTime: 0,
      bulletSpeed: 550,
    });

    return memberContainer;
  }

  /**
   * 刷出 10+ 人山賊大軍圍攻主角團 (10 人山賊陣型波次)
   */
  public spawnBanditHorde(count: number = 10) {
    if (!this.leaderContainer) return;

    const px = this.leaderContainer.x;
    const py = this.leaderContainer.y;

    for (let i = 0; i < count; i++) {
      // 在主角團周圍 360 度半徑 550px 處生成圍攻山賊
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const spawnX = px + Math.cos(angle) * 550;
      const spawnY = py + Math.sin(angle) * 550;

      const isChief = i === 0; // 第 1 個是強大山賊寨主
      const dummyEnemy = {
        instanceId: `enemy_horde_${Date.now()}_${i}`,
        heroConfig: {
          id: isChief ? "enemy_bandit_chief" : "enemy_bandit_thug",
          name: isChief ? "獨眼寨主" : "黑風嘍囉",
          title: "劫匪",
          quality: "凡" as const,
          faction: "群雄" as const,
          role: "前鋒" as const,
          avatar: "🧌",
          imagePath: isChief ? "/assets/heroes/bandit_chief.webp" : "/assets/heroes/bandit_thug.webp",
          description: "劫匪",
          tacticalQuote: "圍起來打！",
          baseStats: { hp: isChief ? 160 : 70, maxHp: isChief ? 160 : 70, atk: isChief ? 18 : 10, def: 5, speed: 8, moveRange: 2, attackRange: 1 },
          skills: [],
        },
        faction: "ENEMY" as const,
        x: 0,
        y: 0,
        currentHp: isChief ? 160 : 70,
        maxHp: isChief ? 160 : 70,
        atk: isChief ? 18 : 10,
        def: 5,
        speed: 8,
        moveRange: 2,
        attackRange: 1,
        statusEffects: [],
        hasActedThisTurn: false,
        isDead: false,
      };

      const enemyContainer = new BattleUnitContainer(
        this.scene,
        dummyEnemy,
        this.scene.scale.width,
        this.scene.scale.height
      );
      enemyContainer.x = spawnX;
      enemyContainer.y = spawnY;

      this.enemies.push({
        container: enemyContainer,
        hp: dummyEnemy.currentHp,
        maxHp: dummyEnemy.maxHp,
        atk: dummyEnemy.atk,
        speed: isChief ? 110 : 85, // 追擊速度
        attackRange: 55,
        attackCooldownMs: 1400,
        lastAttackTime: 0,
        isDead: false,
      });
    }
  }

  /**
   * 每一幀 60 FPS 肉鴿 / 倖存者核心引擎：
   * 1. 隊友間隔保持與主角同步移動
   * 2. 主角團所有成員【自動鎖定近期山賊，發射即時彈幕】
   * 3. 10 人山賊大軍 360 度實時圍攻
   */
  public update(time: number, delta: number) {
    if (!this.leaderContainer) return;

    const leaderX = this.leaderContainer.x;
    const leaderY = this.leaderContainer.y;

    // 1. 同步移動：所有隊員跟隨主角保持固定間隔 (陣型跟隨)
    this.teamMembers.forEach((member) => {
      if (member.container === this.leaderContainer) return;

      const targetX = leaderX + member.offsetX;
      const targetY = leaderY + member.offsetY;

      member.container.x = Phaser.Math.Linear(member.container.x, targetX, 0.2);
      member.container.y = Phaser.Math.Linear(member.container.y, targetY, 0.2);
      member.container.depth = Math.floor(member.container.y);
    });

    // 2. 自動攻擊引擎：主角團每一位名將每隔 cooldown 秒自動鎖定距離最近山賊發射飛劍/光波
    this.teamMembers.forEach((member) => {
      if (time - member.lastAttackTime < member.attackCooldownMs) return;

      // 尋找攻擊範圍內最近山賊
      let nearestEnemy: RoguelikeEnemy | null = null;
      let minDistance = member.attackRange;

      this.enemies.forEach((enemy) => {
        if (enemy.isDead) return;
        const dist = Phaser.Math.Distance.Between(
          member.container.x,
          member.container.y,
          enemy.container.x,
          enemy.container.y
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestEnemy = enemy;
        }
      });

      // 找到敵人 -> 自動發射彈幕攻擊
      if (nearestEnemy) {
        member.lastAttackTime = time;
        this.fireBullet(member, nearestEnemy);
      }
    });

    // 3. 山賊圍攻 AI：10 人大軍從四周圍堵主角團
    this.enemies.forEach((enemy) => {
      if (enemy.isDead) return;

      const enemyX = enemy.container.x;
      const enemyY = enemy.container.y;
      const distToLeader = Phaser.Math.Distance.Between(enemyX, enemyY, leaderX, leaderY);

      // 追擊主角
      if (distToLeader > enemy.attackRange) {
        const angle = Phaser.Math.Angle.Between(enemyX, enemyY, leaderX, leaderY);
        const step = (enemy.speed * delta) / 1000;

        enemy.container.x += Math.cos(angle) * step;
        enemy.container.y += Math.sin(angle) * step;
        enemy.container.depth = Math.floor(enemy.container.y);
      }

      // 近身砍殺主角
      if (distToLeader <= enemy.attackRange && time - enemy.lastAttackTime > enemy.attackCooldownMs) {
        enemy.lastAttackTime = time;
        if (this.leaderContainer) {
          this.leaderContainer.playHitEffect(enemy.atk, false);
        }
      }
    });
  }

  /**
   * 發射肉鴿彈幕 (飛劍 / 靈氣波 / 神箭)
   */
  private fireBullet(member: PlayerTeamMember, target: RoguelikeEnemy) {
    const startX = member.container.x;
    const startY = member.container.y - 20;

    const bullet = this.scene.add.graphics();
    bullet.fillStyle(0xf59e0b, 1);
    bullet.fillCircle(0, 0, 6);
    bullet.lineStyle(2, 0xfef08a, 1);
    bullet.strokeCircle(0, 0, 6);
    bullet.setPosition(startX, startY);
    bullet.setDepth(300);

    const angle = Phaser.Math.Angle.Between(startX, startY, target.container.x, target.container.y);
    const duration = (Phaser.Math.Distance.Between(startX, startY, target.container.x, target.container.y) / member.bulletSpeed) * 1000;

    this.scene.tweens.add({
      targets: bullet,
      x: target.container.x,
      y: target.container.y - 20,
      duration: Math.max(120, duration),
      ease: "Linear",
      onComplete: () => {
        bullet.destroy();
        if (!target.isDead) {
          const dmg = Math.floor(member.atk + Math.random() * 10);
          const isCrit = Math.random() < 0.2;
          const finalDmg = isCrit ? dmg * 2 : dmg;

          target.hp -= finalDmg;
          target.container.playHitEffect(finalDmg, isCrit);

          if (target.hp <= 0) {
            target.isDead = true;
            target.container.destroyContainer();

            // 肉鴿經驗值累加與升級檢測
            this.killCount++;
            this.playerExp += 35;
            if (this.playerExp >= this.expToNextLevel) {
              this.playerExp -= this.expToNextLevel;
              this.playerLevel++;
              this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
              // 觸發肉鴿選卡升級彈窗
              EventBus.emit("roguelike-level-up");
            }
          }
        }
      },
    });
  }

  public destroy() {
    this.teamMembers = [];
    this.enemies = [];
    this.leaderContainer = null;
  }
}
