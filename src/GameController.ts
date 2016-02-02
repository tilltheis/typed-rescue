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
    if (this.keyboard.isKeyPressed(Keyboard.LeftArrow)) {
      this.state.player.moveLeft()
    }
    if (this.keyboard.isKeyPressed(Keyboard.RightArrow)) {
      this.state.player.moveRight()
    }
    if (this.keyboard.isKeyPressed(Keyboard.UpArrow)) {
      this.state.player.moveUp()
    }
    if (this.keyboard.isKeyPressed(Keyboard.DownArrow)) {
      this.state.player.moveDown()
    }
    
    
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