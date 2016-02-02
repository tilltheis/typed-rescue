/// <reference path="../typings/physicstype2d/physicstype2d.d.ts" />
/// <reference path="../typings/core-js/core-js.d.ts" />
/// <reference path="TileMap.ts" />

class MyContactListener extends PhysicsType2d.Dynamics.ContactListener {
    public contacts: Point[][] = []
  private fixtures: PhysicsType2d.Dynamics.Fixture[] = []
  
  // returns true if explosion has been handled and nothing needs to be done anymore
  private handleExplodables(fixture: PhysicsType2d.Dynamics.Fixture): boolean {
    var userData = fixture.GetBody().GetUserData()
    if (userData instanceof Bomb || userData instanceof Rocket) {
      userData.explode()
      return true
    } else {
      return false
    }
  }
  
  public Destructor(): void {}
  public BeginContact(contact: PhysicsType2d.Dynamics.Contacts.Contact): void {
    if (this.handleExplodables(contact.GetFixtureB())) {
      // we are done but maybe the collision partner also needs to explode
      this.handleExplodables(contact.GetFixtureA())
    }
    else
    if (contact.GetFixtureA().GetShape() instanceof PhysicsType2d.Collision.Shapes.PolygonShape) {
    
      this.fixtures.push(contact.GetFixtureA())
      
      var origin = contact.GetFixtureA().GetBody().GetPosition()
      var shape = <PhysicsType2d.Collision.Shapes.PolygonShape> contact.GetFixtureA().GetShape()
      var vs: Point[] = []
      shape.m_vertices.forEach((v) => {
          vs.push({
              x: origin.x + v.x,
              y: origin.y + v.y
          })
      })
      this.contacts.push(vs)
      // console.log(this.contacts)
    }
  }
  public EndContact(contact: PhysicsType2d.Dynamics.Contacts.Contact): void {
    if (contact.GetFixtureA().GetShape() instanceof PhysicsType2d.Collision.Shapes.PolygonShape) {
      var index = this.fixtures.indexOf(contact.GetFixtureA())
      this.fixtures.splice(index, 1)
      this.contacts.splice(index, 1)
    }
  }
  public PreSolve(contact: PhysicsType2d.Dynamics.Contacts.Contact, oldManifold: PhysicsType2d.Collision.Manifold): void {}
  public PostSolve(contact: PhysicsType2d.Dynamics.Contacts.Contact, impulse: PhysicsType2d.Dynamics.ContactImpulse): void {}
}


class GameState {
    public player: Player
    private world: PhysicsType2d.Dynamics.World
    
    public playerBody: PhysicsType2d.Dynamics.Body
    
    public contactListener = new MyContactListener()
    
    public bombs: Set<Bomb> = new Set<Bomb>()
    public rockets: Set<Rocket> = new Set<Rocket>()
    
    constructor(
        public tileMap: TileMap
    ) {
        var gravity = new PhysicsType2d.Vector2(0, 9.81)
        this.world = new PhysicsType2d.Dynamics.World(gravity)
        this.world.SetContactListener(this.contactListener)
        
        var groundBodyDef = new PhysicsType2d.Dynamics.BodyDefinition()
        groundBodyDef.type = PhysicsType2d.Dynamics.BodyType.STATIC
        var groundBody = this.world.CreateBody(groundBodyDef)
        
        var layerData = tileMap.layers["foreground"]
        for (var y = 0; y < tileMap.mapHeight; y++) {
            for (var x = 0; x < tileMap.mapWidth; x++) {
                var tileIndex = layerData[tileMap.tileIndexForMapPoint(x, y)] - 1
                if (tileIndex === -1) {
                    continue
                }
                
                var tileShape = new PhysicsType2d.Collision.Shapes.PolygonShape()
                tileShape.SetAsBox(0.5, 0.5, new PhysicsType2d.Vector2(x + 0.5, y + 0.5), 0)
                groundBody.CreateFixture(tileShape, 0)
            }
        }

        var playerBodyDef = new PhysicsType2d.Dynamics.BodyDefinition();
        playerBodyDef.type = PhysicsType2d.Dynamics.BodyType.DYNAMIC;
        playerBodyDef.position = new PhysicsType2d.Vector2(0, 0);
        playerBodyDef.fixedRotation = true
                    
        var playerBody = this.world.CreateBody(playerBodyDef);
        // playerBody.SetGravityScale(50)
        // playerBody.SetLinearDamping(0)
        // var playerMassData = new PhysicsType2d.Collision.Shapes.MassData()
        // playerMassData.mass = 50
        // playerMassData.center = new PhysicsType2d.Vector2(2, 1)
        // playerMassData.I = 0
        // playerBody.SetMassData(playerMassData)
        
        // POLYGON
        // var playerShape = new PhysicsType2d.Collision.Shapes.PolygonShape();
        // playerShape.SetAsBox(2, 1, new PhysicsType2d.Vector2(2, 1), 0)
        // var playerFixtureDef = new PhysicsType2d.Dynamics.FixtureDefinition();
        // playerFixtureDef.shape = playerShape;
        // playerFixtureDef.density = 1.0;
        // playerFixtureDef.friction = 0.3;
        // playerBody.CreateFixtureFromDefinition(playerFixtureDef);
        
        
        // CIRCLE
        var playerShape = new PhysicsType2d.Collision.Shapes.CircleShape();
        playerShape.m_p = new PhysicsType2d.Vector2(1, 1)
        playerShape.m_radius = 1

        var playerFixtureDef = new PhysicsType2d.Dynamics.FixtureDefinition();
        playerFixtureDef.shape = playerShape;
        playerFixtureDef.density = 1.0;
        playerFixtureDef.friction = 0.3;
        playerBody.CreateFixtureFromDefinition(playerFixtureDef);

        var playerShape1 = new PhysicsType2d.Collision.Shapes.CircleShape();
        playerShape1.m_p = new PhysicsType2d.Vector2(3, 1)
        playerShape1.m_radius = 1
        var playerFixtureDef1 = new PhysicsType2d.Dynamics.FixtureDefinition();
        playerFixtureDef1.shape = playerShape1;
        playerFixtureDef1.density = 1.0;
        playerFixtureDef1.friction = 0.3;
        playerBody.CreateFixtureFromDefinition(playerFixtureDef1);


        this.playerBody = playerBody
        this.player = new Player(playerBody)
    }
    
    
    dropBomb() {
      var bombBodyDef = new PhysicsType2d.Dynamics.BodyDefinition();
      bombBodyDef.type = PhysicsType2d.Dynamics.BodyType.DYNAMIC;
      bombBodyDef.position = new PhysicsType2d.Vector2(this.playerBody.GetPosition().x + 2, this.playerBody.GetPosition().y + 2.5);
      bombBodyDef.linearVelocity = new PhysicsType2d.Vector2(this.playerBody.GetLinearVelocity().x, 0)
      // bombBodyDef.bullet = true
      
      var bombBody = this.world.CreateBody(bombBodyDef)
      
      var bombShape = new PhysicsType2d.Collision.Shapes.CircleShape();
      // bombShape.m_p = new PhysicsType2d.Vector2(1, 1)
      bombShape.m_radius = 0.5

      var bombFixtureDef = new PhysicsType2d.Dynamics.FixtureDefinition();
      bombFixtureDef.shape = bombShape;
      bombFixtureDef.density = 0.2;
      bombFixtureDef.friction = 0.3;
      bombBody.CreateFixtureFromDefinition(bombFixtureDef);
      
      var bomb = new Bomb(bombBody)
      this.bombs.add(bomb)
      
      bombBody.ApplyForceToCenter(new PhysicsType2d.Vector2(0, 200))
      
      bombBody.SetUserData(bomb)
    }
    
    
    fireRocket() {
      var rocketBodyDef = new PhysicsType2d.Dynamics.BodyDefinition();
      rocketBodyDef.type = PhysicsType2d.Dynamics.BodyType.DYNAMIC;
      rocketBodyDef.position = new PhysicsType2d.Vector2(this.playerBody.GetPosition().x + 2, this.playerBody.GetPosition().y + 2.5);
      // rocketBodyDef.linearVelocity = this.playerBody.GetLinearVelocity()
      // rocketBodyDef.bullet = true
      
      var rocketBody = this.world.CreateBody(rocketBodyDef)
      
      var rocketShape = new PhysicsType2d.Collision.Shapes.PolygonShape;
      rocketShape.SetAsBox(0.5, 0.25, new PhysicsType2d.Vector2(0.5, 0.125), 0)

      var rocketFixtureDef = new PhysicsType2d.Dynamics.FixtureDefinition();
      rocketFixtureDef.shape = rocketShape;
      rocketFixtureDef.density = 1;
      rocketFixtureDef.friction = 0.3;
      rocketBody.CreateFixtureFromDefinition(rocketFixtureDef);
      
      var rocket = new Rocket(rocketBody)
      this.rockets.add(rocket)
      
      rocketBody.ApplyForceToCenter(new PhysicsType2d.Vector2(800, 0))
      
      rocketBody.SetUserData(rocket)
    }
    
    
    update() {
      this.bombs.forEach((bomb) => {
        if (bomb.hasExploded) {
          bomb.body.SetActive(false)
        }
        if (bomb.dead) {
          this.bombs.delete(bomb)
          this.world.DestroyBody(bomb.body)
        }
      })
      this.rockets.forEach((rocket) => {
        if (rocket.hasExploded) {
          rocket.body.SetActive(false)
        }
        if (rocket.dead) {
          this.rockets.delete(rocket)
          this.world.DestroyBody(rocket.body)
        }
      })

      
      var timeStep = 1/60; // Simulate 60 steps per second
      var velocityIterations = 4; // 8 // Number of iterations the velocity solver will use
      var positionIterations = 2; // 3 // Number of iterations the position solver will use
      this.world.Step(timeStep, velocityIterations, positionIterations);
      
      this.player.update()
    }
}

class PhysicsObject {
  public dead: boolean = false
  
  constructor(
    public body: PhysicsType2d.Dynamics.Body
  ) {}
  
  update(): void {}
  
  position(): Point {
    return this.body.GetPosition()
  }
  
  velocity(): Point {
    return this.body.GetLinearVelocity()
  }
  
  rotation(): number {
    return this.body.GetAngle()
  }
}

class Player extends PhysicsObject {
  private speed = 10
  
  constructor(
    body: PhysicsType2d.Dynamics.Body
  ) {
    super(body)
  }
  
  update(): void {
    var velocity = this.body.GetLinearVelocity()
    var cappedVelocityX = Math.min(30, velocity.x)
    var cappedVelocityY = Math.min(30, velocity.y)
    var rotation = cappedVelocityX / 2
    this.body.SetTransform(this.body.GetPosition(), rotation * (Math.PI / 180))
  }
  
  private move(x?: number, y?: number): void {
    var velocity = this.body.GetLinearVelocity()
    var mass = this.body.GetMass()
    if (x !== null) {
      this.body.ApplyLinearImpulse(
        new PhysicsType2d.Vector2(mass * (x - velocity.x), 0),
        this.body.GetWorldCenter()
      )
    }
    if (y !== null) {
      this.body.ApplyLinearImpulse(
        new PhysicsType2d.Vector2(0, mass * (y - velocity.y)),
        this.body.GetWorldCenter()
      )
    }
  }
  
  moveUp(): void {
    this.move(null, -30)
  }
  moveDown(): void {
    this.move(null, 30)
  }
  moveLeft(): void {
    this.move(-30, null)
  }
  moveRight(): void {
    this.move(30, null)
  }
}

class Bomb extends PhysicsObject {
  public hasExploded: boolean = false
  
  constructor(
    body: PhysicsType2d.Dynamics.Body
  ) {
    super(body)
  }
  
  explode(): void {
    this.hasExploded = true
    setTimeout(() => {
      this.dead = true
    }, 1000)
  }
}
class Rocket extends PhysicsObject {
  public hasExploded: boolean = false
  
  constructor(
    body: PhysicsType2d.Dynamics.Body
  ) {
    super(body)
  }
  
  explode(): void {
    this.hasExploded = true
    setTimeout(() => {
      this.dead = true
    }, 1000)
  }
}