/// <reference path="World.ts" />
/// <reference path="GameObjects.ts" />



class GameState {
  public player: Player
  public soldier: Soldier
  
  constructor(public world: World) {
    this.player = new Player(world.createPlayerPhysics())
    this.soldier = new Soldier(world.createSoldierPhysics())
    
    var lookup: (p: PhysicsObject) => { collide(o: any): void } = (physics) => {
      var result = null
      if (!result && this.player.physics === physics) result = this.player
      for (var i = 0; !result && i < this.player.rockets.length; i++) { if (this.player.rockets[i].physics === physics) result = this.player.rockets[i] }
      for (var i = 0; !result && i < this.player.bombs.length; i++) { if (this.player.bombs[i].physics === physics) result = this.player.bombs[i] }
      return result
     }
     
    world.setCollisionHandler((a, b) => {
      var richA = lookup(a)
      var richB = lookup(b)
      if (richA) richA.collide(richB)
      if (richB) richB.collide(richA)
    })
  }
  
  update() {
    this.world.update()
    this.player.update()
  }
}
