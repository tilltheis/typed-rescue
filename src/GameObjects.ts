/// <reference path="GameState.ts" />
/// <reference path="World.ts" />

class Player {
  private movementForce = 1500
  private maxSpeed = 15
  
  public bombs: Bomb[] = []
  public rockets: Rocket[] = []
  
  constructor(
    public physics: PhysicsObject
  ) {}
  
  update(): void {
    var velocity = this.physics.velocity()
    var cappedVelocityX = Math.min(this.maxSpeed, velocity.x)
    var cappedVelocityY = Math.min(this.maxSpeed, velocity.y)
    var rotation = cappedVelocityX / 2
    this.physics.setRotationDegrees(rotation)
    
    var vy = cappedVelocityY > 0 ? cappedVelocityY : cappedVelocityY / 1.25
    this.physics.setVelocity(new Point(cappedVelocityX / 1.25, vy))
    
    this.rockets.forEach((rocket, index) => {
      if (rocket.physics.dead) {
        this.rockets.splice(index, 1)
      }
    })
  }
  
  private move(x: number, y: number): void {
    this.physics.applyForce(new Point(x, y))
  }
  
  moveUp(): void {
    this.move(0, -this.movementForce)
  }
  moveDown(): void {
    this.move(0, +this.movementForce)
  }
  moveLeft(): void {
    this.move(-this.movementForce, 0)
  }
  moveRight(): void {
    this.move(+this.movementForce, 0)
  }
  
  fireRocket(): void {
    var position = new PhysicsType2d.Vector2(this.physics.position().x + 2, this.physics.position().y + 2.5)
    var rocket = new Rocket(this.physics.world.createRocketPhysics(position))
    rocket.physics.setRotation(this.physics.rotation())
    var direction = rocket.physics.worldVector(new Point(1, 0))
    rocket.physics.applyImpulse(new Point(direction.x * 10, direction.y * 10))
    this.rockets.push(rocket)
  }
  
  dropBomb(): void {
    var position = new PhysicsType2d.Vector2(this.physics.position().x + 2, this.physics.position().y + 2.5)
    var bomb = new Bomb(this.physics.world.createBombPhysics(position))
    var xImpulse = this.physics.velocity().x / this.physics.body.GetMass()
    bomb.physics.applyImpulse(new Point(xImpulse, 2))
    this.bombs.push(bomb)
  }
  
  collide(other: any): void {
    // todo
  }
}

class Bomb {
  public hasExploded: boolean = false
  
  constructor(
    public physics: PhysicsObject
  ) {}
  
  collide(other: any): void {
    this.explode()
  }
  
  explode(): void {
    this.hasExploded = true
    this.physics.active = false
    setTimeout(() => {
      this.physics.dead = true
    }, 1000)
  }
}

class Rocket {
  public hasExploded: boolean = false
  
  constructor(
    public physics: PhysicsObject
  ) {}
  
  collide(other: any): void {
    this.explode()
  }
  
  explode(): void {
    this.hasExploded = true
    this.physics.active = false
    setTimeout(() => {
      this.physics.dead = true
    }, 1000)
  }
}