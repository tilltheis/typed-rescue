/// <reference path="GameState.ts" />
/// <reference path="GameView.ts" />
/// <reference path="Keyboard.ts" />

class GameController {
  private lastRocketTimestamp: number = 0
  private lastBombTimestamp: number = 0
  
  constructor(
    private state: GameState,
    private view: GameView,
    private keyboard: Keyboard
  ) {}
  
  update() {
    var speed = 10
    
    var xGoal = 0
    var yGoal = 0
    
    if (this.keyboard.isKeyPressed(Keyboard.LeftArrow)) {
      xGoal -= speed
    }
    if (this.keyboard.isKeyPressed(Keyboard.RightArrow)) {
      xGoal += speed
    }
    
    if (this.keyboard.isKeyPressed(Keyboard.UpArrow)) {
      yGoal -= speed * 2
    }
    if (this.keyboard.isKeyPressed(Keyboard.DownArrow)) {
      yGoal += speed
    }
    
    // this.state.player.velocity.x += xGoal
    // this.state.player.velocity.y += yGoal
    
    var xDiff = xGoal - this.state.playerBody.GetLinearVelocity().x
    var yDiff = yGoal - this.state.playerBody.GetLinearVelocity().y
    var xImpulse = this.state.playerBody.GetMass() * xDiff
    var yImpulse = this.state.playerBody.GetMass() * yDiff 
    this.state.playerBody.ApplyLinearImpulse(
      new PhysicsType2d.Vector2(xImpulse, yImpulse),
      this.state.playerBody.GetWorldCenter()
    )
    
    
    
    var currentTimestamp = Date.now()

    if (this.keyboard.isKeyPressed("d") && this.lastBombTimestamp < (currentTimestamp - 100)) {
      this.lastBombTimestamp = currentTimestamp
      this.state.dropBomb()
    }
    
    if (this.keyboard.isKeyPressed("f") && this.lastRocketTimestamp < (currentTimestamp - 100)) {
      this.lastRocketTimestamp = currentTimestamp
      this.state.fireRocket()
    }
  }
}