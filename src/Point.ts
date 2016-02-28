/// <reference path="../typings/pixi.js/pixi.js.d.ts" />
/// <reference path="../typings/physicstype2d/physicstype2d.d.ts" />

class Point {
  constructor(public x: number, public y: number) {}
  
  static fromPixi(pixi: PIXI.Point): Point {
    return new Point(pixi.x, pixi.y)
  }
  
  toPixi(): PIXI.Point {
    return new PIXI.Point(this.x, this.y)
  }
  
  static fromPhysics(physics: PhysicsType2d.Vector2): Point {
    return new Point(physics.x, physics.y)
  }
  
  toPhysics(): PhysicsType2d.Vector2 {
    return new PhysicsType2d.Vector2(this.x, this.y)
  }
}