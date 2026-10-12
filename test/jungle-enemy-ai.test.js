import assert from 'node:assert/strict';
import { register } from 'node:module';
import test from 'node:test';

register('./helpers/browserless-loader.mjs', import.meta.url);

const { EnemyController, getEnemyVisualSize } = await import('../src/game/EnemyController.js');
const { getEnemyCellSize } = await import('../src/game/EnemyAnimations.js');
const { JUNGLE_WATER_SURFACE_Y } = await import('../src/data/levels/index.js');

const AMBER = 0xffcf4a;

function createArcadeSprite(x, y) {
  const sprite = {
    x, y, width: 64, height: 64, scaleX: 1, scaleY: 1, rotation: 0, active: true, data: {},
    setDepth() { return this; },
    setVisible() { return this; },
    setData(key, value) { this.data[key] = value; return this; },
    getData(key) { return this.data[key]; },
    setDisplaySize(width, height) { this.scaleX = width / this.width; this.scaleY = height / this.height; return this; },
    setCollideWorldBounds(value) { this.body.collideWorldBounds = value; return this; },
    setBounce(value) { this.body.bounce = value; return this; },
    setImmovable(value) { this.body.immovable = value; return this; },
    setPosition(nextX, nextY) { this.x = nextX; this.y = nextY; return this; },
    setX(nextX) { this.x = nextX; return this; },
    setVelocity(vx, vy = vx) { this.body.velocity.x = vx; this.body.velocity.y = vy; return this; },
    setVelocityX(vx) { this.body.velocity.x = vx; return this; },
    setAngularVelocity() { return this; },
    setAngle() { return this; },
  };
  sprite.body = {
    enable: true,
    allowGravity: true,
    immovable: false,
    bounce: 0,
    velocity: { x: 0, y: 0 },
    blocked: {},
    width: 64,
    height: 64,
    setSize(width, height) { this.width = width * sprite.scaleX; this.height = height * sprite.scaleY; },
    setCircle(radius) { this.width = radius * 2 * sprite.scaleX; this.height = this.width; },
    updateFromGameObject() {},
    reset(nextX, nextY) { sprite.x = nextX; sprite.y = nextY; },
    get center() { return { x: sprite.x, y: sprite.y }; },
    get bottom() { return sprite.y + this.height / 2; },
  };
  return sprite;
}

function createVisual() {
  return {
    active: true, scaleX: 1, scaleY: 1, originY: 0.5, depth: 0, tint: null, x: 0, y: 0,
    displayHeight: 0, displayWidth: 0, anims: { stop() {}, pause() {}, resume() {} },
    setDepth(depth) { this.depth = depth; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setOrigin(_x, y) { this.originY = y; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setRotation() { return this; },
    setFlipX(flip) { this.flipX = flip; return this; },
    play(key) { this.playing = key; return this; },
    setFrame() { return this; },
    clearTint() { this.tint = null; return this; },
    setTint(tint) { this.tint = tint; return this; },
    setTintFill(tint) { this.tint = tint; return this; },
    destroy() { this.active = false; },
  };
}

function createScene() {
  const scene = {
    clock: 0,
    getGameplayTime() { return this.clock; },
    physics: { add: { sprite: (x, y) => createArcadeSprite(x, y) } },
    add: { sprite: () => createVisual() },
    time: { now: 0, delayedCall: () => ({ remove() {} }) },
    tweens: { add() {} },
  };
  return scene;
}

function spawn(definition, player = { x: 0, y: 460 }) {
  const scene = createScene();
  const attacks = [];
  const volleys = [];
  const electric = [];
  const enemy = new EnemyController(scene, definition, player, null, {
    onMeleeAttack: (_enemy, spec) => attacks.push(spec),
    onToxicVolley: (_enemy, spec) => volleys.push(spec),
    onElectricAttack: (_enemy, spec) => electric.push(spec),
  });
  const step = (ms = 16) => {
    scene.clock += ms;
    enemy.update();
  };
  const runFor = (ms) => {
    for (let elapsed = 0; elapsed < ms; elapsed += 16) step();
  };
  return { scene, enemy, player, attacks, volleys, electric, step, runFor };
}

test('rooted and aquatic bodies survive the Arcade Group defaults reset', () => {
  for (const type of ['arbol_pocho', 'sapo_pota']) {
    const { enemy } = spawn({ id: type, type, x: 500, y: 405, waterlineY: 494 });
    // What Phaser's Arcade Group does to every member it adds.
    Object.assign(enemy.sprite.body, { allowGravity: true, immovable: false, collideWorldBounds: false });
    enemy.configureBody();
    assert.equal(enemy.sprite.body.allowGravity, false, `${type} would sink under gravity`);
    assert.equal(enemy.sprite.body.immovable, true);
    assert.equal(enemy.sprite.body.collideWorldBounds, true);
  }
  const { enemy: walker } = spawn({ id: 'g', type: 'garbanzo_loco', x: 500, y: 420 });
  walker.sprite.body.allowGravity = false;
  walker.configureBody();
  assert.equal(walker.sprite.body.allowGravity, true, 'Garbanzo keeps walking on terrain');
});

test('Jungle visuals render by a uniform scale of their wide v2 cells', () => {
  assert.deepEqual(getEnemyVisualSize('garbanzo_loco'), { width: 176, height: 128 });
  for (const type of ['arbol_pocho', 'sapo_pota']) {
    const cell = getEnemyCellSize(type);
    const size = getEnemyVisualSize(type);
    assert.ok(Math.abs(size.width / cell.width - size.height / cell.height) < 1e-9, `${type} is stretched`);
  }
});

test('Sapo Pota sits in the river, behind the water, and shots pass over it while submerged', () => {
  const { enemy, step, player, volleys, runFor } = spawn(
    { id: 'sapo', type: 'sapo_pota', x: 700, y: 458, waterlineY: JUNGLE_WATER_SURFACE_Y, volleyCount: 2 },
    { x: 1000, y: 460, body: { center: { y: 460 } } },
  );
  assert.equal(enemy.sprite.y, JUNGLE_WATER_SURFACE_Y - 41, 'body centre derives from the waterline');
  assert.ok(enemy.visual.depth < 3, 'the river layer (depth 3) hides its lower body');
  step();
  assert.equal(enemy.visual.y, JUNGLE_WATER_SURFACE_Y + 16 + 7, 'pose baseline sits 16px under the surface');
  assert.equal(enemy.state, 'UNDERWATER');
  assert.equal(enemy.blocksPlayerProjectiles(), false);

  player.x = 800;
  runFor(4000);
  assert.ok(volleys.length >= 1, 'the Sapo emerges and vomits at a Babito in range');
  assert.equal(volleys[0].count, 2);
  assert.equal(volleys[0].mouthY, JUNGLE_WATER_SURFACE_Y + 16 - 52, 'the glob leaves the open mouth');
  assert.equal(volleys[0].direction, 1);
  assert.equal(enemy.blocksPlayerProjectiles(), true);
});

test('Árbol Pocho telegraphs every punch and strikes only as far as its painted branch', () => {
  const { enemy, step, player, attacks, runFor } = spawn(
    { id: 'arbol', type: 'arbol_pocho', x: 500, y: 405 },
    { x: 700, y: 460 },
  );
  player.x = 680;
  runFor(1200);
  assert.equal(enemy.state, 'ANGRY_IDLE');
  player.x = 585;
  step();
  assert.equal(enemy.isChargingPunch, true);
  assert.equal(enemy.state, 'ANGRY_IDLE', 'no strike on the first frame in reach');
  assert.equal(enemy.visual.tint, AMBER);
  runFor(240);
  assert.equal(attacks.length, 0, 'the anticipation lasts at least 250 ms');
  runFor(120);
  assert.equal(enemy.state, 'PUNCH_RIGHT');
  assert.equal(attacks.length, 1);
  assert.equal(attacks[0].direction, 1);
  assert.equal(attacks[0].reach, 34, 'ends just past the painted fist');
});

test('repeated hits during RECOVER never extend the vulnerable window', () => {
  const { enemy, scene, player, runFor } = spawn(
    { id: 'arbol', type: 'arbol_pocho', x: 500, y: 405 },
    { x: 580, y: 460 },
  );
  while (enemy.state !== 'RECOVER') runFor(16);
  const recoverStartedAt = enemy.stateStartedAt;
  player.x = 900;
  assert.equal(enemy.takeDamage(1, 900), true);
  assert.equal(enemy.state, 'HURT');
  runFor(400);
  assert.equal(enemy.state, 'RECOVER');
  assert.equal(enemy.stateStartedAt, recoverStartedAt, 'RECOVER resumes its own clock');
  runFor(980 - (scene.clock - recoverStartedAt) + 32);
  assert.notEqual(enemy.state, 'RECOVER');
});

test('Garbanzo locks his thrust when he winds up, so his back is a safe landing', () => {
  const { enemy, step, player, attacks, runFor } = spawn(
    { id: 'g', type: 'garbanzo_loco', x: 500, y: 442, walkBounds: { left: 0, right: 1200 } },
    { x: 580, y: 460 },
  );
  enemy.setState('CHASE');
  step();
  assert.equal(enemy.state, 'ATTACK_WINDUP');
  assert.equal(enemy.direction, 1);
  player.x = 420;
  runFor(560);
  assert.equal(enemy.state, 'SPEAR_ATTACK');
  assert.equal(attacks[0].direction, 1, 'the spear keeps the telegraphed direction');
  assert.equal(attacks[0].reach, 60, 'ends at the painted spear tip');
});

test('Garbanzo never thrusts under a ledge or chases a Babito off his stretch', () => {
  const ledge = spawn(
    { id: 'g', type: 'garbanzo_loco', x: 500, y: 442, walkBounds: { left: 0, right: 1200 } },
    { x: 540, y: 300 },
  );
  ledge.enemy.setState('CHASE');
  ledge.runFor(300);
  assert.equal(ledge.enemy.state, 'CHASE', 'a Babito 160px above is out of the horizontal spear');

  const pillar = spawn(
    { id: 'g', type: 'garbanzo_loco', x: 500, y: 442, walkBounds: { left: 400, right: 600 } },
    { x: 760, y: 460 },
  );
  pillar.runFor(300);
  assert.equal(pillar.enemy.state, 'PATROL', 'a Babito past the pillar is unreachable');
  pillar.player.x = 650;
  pillar.step();
  assert.equal(pillar.enemy.state, 'CHASE');
});

test('Drone Bot remains airborne and telegraphs one vertical electric attack', () => {
  const { enemy, electric, runFor } = spawn(
    { id: 'drone', type: 'drone_bot', x: 500, y: 250 },
    { x: 620, y: 460 },
  );
  assert.equal(enemy.sprite.body.allowGravity, false);
  runFor(2400);
  assert.ok(['ELECTRIC_ATTACK', 'RECOVER'].includes(enemy.state));
  assert.equal(electric.length, 1);
  assert.equal(electric[0].x, enemy.sprite.x);
  assert.ok(electric[0].fromY < electric[0].toY);
  assert.equal(electric[0].toY, 480);
});

test('Robot Elice is terrestrial, dangerous and invulnerable only during its spin', () => {
  const { enemy, runFor } = spawn(
    { id: 'elice', type: 'robot_elice', x: 500, y: 400, walkBounds: { left: 300, right: 900 } },
    { x: 620, y: 460 },
  );
  assert.equal(enemy.sprite.body.allowGravity, true);
  for (let guard = 0; guard < 300 && enemy.state !== 'SPIN_ATTACK'; guard += 1) runFor(16);
  assert.equal(enemy.state, 'SPIN_ATTACK');
  assert.equal(enemy.canHurtPlayer(), true);
  assert.equal(enemy.canTakeDamage(), false);
  for (let guard = 0; guard < 200 && enemy.state !== 'VULNERABLE'; guard += 1) runFor(16);
  assert.equal(enemy.state, 'VULNERABLE');
  assert.equal(enemy.canHurtPlayer(), false);
  assert.equal(enemy.canTakeDamage(), true);
});

test('IVE Robot remains grounded and the advanced encounter performs a double scythe', () => {
  const { enemy, attacks, runFor } = spawn(
    {
      id: 'ive',
      type: 'ive_robot',
      x: 500,
      y: 360,
      doubleScythe: true,
      walkBounds: { left: 280, right: 920 },
    },
    { x: 610, y: 460 },
  );
  assert.equal(enemy.sprite.body.allowGravity, true);
  for (let guard = 0; guard < 400 && enemy.state !== 'SCYTHE_ATTACK'; guard += 1) runFor(16);
  assert.equal(enemy.state, 'SCYTHE_ATTACK');
  runFor(430);
  assert.equal(attacks.length, 2);
  assert.deepEqual(attacks.map(({ kind }) => kind), ['scythe', 'scythe']);
  assert.equal(attacks[0].direction, -attacks[1].direction);
  assert.equal(enemy.canHurtPlayer(), false, 'IVE deals damage through authored weapon windows');
});
