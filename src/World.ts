/// <reference path="../typings/physicstype2d/physicstype2d.d.ts" />
/// <reference path="../typings/immutable/immutable.d.ts" />
/// <reference path="TileMap.ts" />
/// <reference path="Point.ts" />

enum ObjectType {
  Player,
  Rocket,
  Bomb,
  Soldier
}

enum CollisionCategory {
  Default = 1 << 0,
  FriendlyWeapon = 1 << 1,
  EnemyWeapon = 1 << 2
}

class PhysicsObject {
  public dead: boolean = false
  public active: boolean = true
  
  constructor(
    public body: PhysicsType2d.Dynamics.Body,
    public world: World
  ) {}
  
  position(): Point {
    return Point.fromPhysics(this.body.GetPosition())
  }
  
  velocity(): Point {
    return Point.fromPhysics(this.body.GetLinearVelocity())
  }
  
  setVelocity(velocity: Point): void {
    this.body.SetLinearVelocity(new PhysicsType2d.Vector2(velocity.x, velocity.y))
  }
  
  rotation(): number {
    return this.body.GetAngle()
  }
  
  setRotation(rotation: number): void {
    this.body.SetTransform(this.body.GetPosition(), rotation)
  }
  
  setRotationDegrees(rotation: number): void {
    this.setRotation(rotation * (Math.PI / 180))
  }
  
  applyForce(force: Point): void {
    this.body.ApplyForceToCenter(new PhysicsType2d.Vector2(force.x, force.y))
  }
  
  applyImpulse(impulse: Point): void {
    this.body.ApplyLinearImpulse(new PhysicsType2d.Vector2(impulse.x, impulse.y), this.body.GetWorldCenter())
  }
  
  worldVector(point: Point): Point {
    return Point.fromPhysics(this.body.GetWorldVector(point.toPhysics()))
  }
}

class DelegatingContactListener extends PhysicsType2d.Dynamics.ContactListener {
  constructor(
    private bodyToPhysicsObject: (body: PhysicsType2d.Dynamics.Body) => PhysicsObject,
    private handler: (a: PhysicsObject, b: PhysicsObject) => void
  ) {
    super()
  }
  
  Destructor(): void {}
  BeginContact(contact: PhysicsType2d.Dynamics.Contacts.Contact): void {
    var a = this.bodyToPhysicsObject(contact.GetFixtureA().GetBody())
    var b = this.bodyToPhysicsObject(contact.GetFixtureB().GetBody())
    if (a || b) {
      this.handler(a, b)
    }
  }
  EndContact(contact: PhysicsType2d.Dynamics.Contacts.Contact): void {}
  PreSolve(contact: PhysicsType2d.Dynamics.Contacts.Contact, oldManifold: PhysicsType2d.Collision.Manifold): void {}
  PostSolve(contact: PhysicsType2d.Dynamics.Contacts.Contact, impulse: PhysicsType2d.Dynamics.ContactImpulse): void {}
}
    
class World {
  private world: PhysicsType2d.Dynamics.World
  
  public player: PhysicsObject
  public bombs: Immutable.Set<PhysicsObject> = Immutable.Set<PhysicsObject>()
  public rockets: Immutable.Set<PhysicsObject> = Immutable.Set<PhysicsObject>()
  public soldiers: Immutable.Set<PhysicsObject> = Immutable.Set<PhysicsObject>()
  
  
  private bodyToPhysicsObject(body: PhysicsType2d.Dynamics.Body): PhysicsObject {
    var p = (po: PhysicsObject): boolean => { return po.body === body }
    return Immutable.Set([this.player]).find(p) || this.rockets.find(p) || this.bombs.find(p)
  }
  
  setCollisionHandler(handler: (a: PhysicsObject, b: PhysicsObject) => void): void {
    var lookup = (body) => { return this.bodyToPhysicsObject(body) }
    this.world.SetContactListener(new DelegatingContactListener(lookup, handler))
  }
  
  constructor(
      public tileMap: TileMap
  ) {
      var gravity = new PhysicsType2d.Vector2(0, 9.81)
      this.world = new PhysicsType2d.Dynamics.World(gravity)
      
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
  }
  
  createPlayerPhysics(): PhysicsObject {
    if (this.player !== undefined) {
      throw "World#createPlayerPhysics: player already exists"
    }

    var playerBodyDef = new PhysicsType2d.Dynamics.BodyDefinition();
    playerBodyDef.type = PhysicsType2d.Dynamics.BodyType.DYNAMIC;
    playerBodyDef.position = new PhysicsType2d.Vector2(0, 0);
    playerBodyDef.fixedRotation = true
                
    var playerBody = this.world.CreateBody(playerBodyDef);

    var playerShape = new PhysicsType2d.Collision.Shapes.CircleShape();
    playerShape.m_p = new PhysicsType2d.Vector2(1, 1)
    playerShape.m_radius = 1

    var playerFixtureDef = new PhysicsType2d.Dynamics.FixtureDefinition();
    playerFixtureDef.shape = playerShape;
    playerFixtureDef.density = 1.0;
    playerFixtureDef.friction = 0.3;
    playerFixtureDef.filter.categoryBits = CollisionCategory.Default
    playerFixtureDef.filter.maskBits = CollisionCategory.Default | CollisionCategory.EnemyWeapon
    playerBody.CreateFixtureFromDefinition(playerFixtureDef);

    var playerShape1 = new PhysicsType2d.Collision.Shapes.CircleShape();
    playerShape1.m_p = new PhysicsType2d.Vector2(3, 1)
    playerShape1.m_radius = 1
    var playerFixtureDef1 = new PhysicsType2d.Dynamics.FixtureDefinition();
    playerFixtureDef1.shape = playerShape1;
    playerFixtureDef1.density = 1.0;
    playerFixtureDef1.friction = 0.3;
    playerFixtureDef1.filter.categoryBits = CollisionCategory.Default
    playerFixtureDef1.filter.maskBits = CollisionCategory.Default | CollisionCategory.EnemyWeapon
    playerBody.CreateFixtureFromDefinition(playerFixtureDef1);
    
    playerBody.SetUserData(ObjectType.Player)
    var physicsObject = new PhysicsObject(playerBody, this)
    this.player = physicsObject
    
    return physicsObject
  }
  
  createSoldierPhysics() {

    var bodyDef = new PhysicsType2d.Dynamics.BodyDefinition();
    bodyDef.type = PhysicsType2d.Dynamics.BodyType.DYNAMIC;
    bodyDef.position = new PhysicsType2d.Vector2(50, 15);
    bodyDef.fixedRotation = true
                
    var body = this.world.CreateBody(bodyDef);

    var shape0 = new PhysicsType2d.Collision.Shapes.CircleShape();
    shape0.m_p = new PhysicsType2d.Vector2(0.5, 0.5)
    shape0.m_radius = 0.5

    var fixtureDef0 = new PhysicsType2d.Dynamics.FixtureDefinition();
    fixtureDef0.shape = shape0;
    fixtureDef0.density = 1.0;
    fixtureDef0.friction = 0.3;
    fixtureDef0.filter.categoryBits = CollisionCategory.Default
    fixtureDef0.filter.maskBits = CollisionCategory.Default | CollisionCategory.FriendlyWeapon
    body.CreateFixtureFromDefinition(fixtureDef0);

    var shape1 = new PhysicsType2d.Collision.Shapes.CircleShape();
    shape1.m_p = new PhysicsType2d.Vector2(0.5, 1.5)
    shape1.m_radius = 0.5
    var fixtureDef1 = new PhysicsType2d.Dynamics.FixtureDefinition();
    fixtureDef1.shape = shape1;
    fixtureDef1.density = 1.0;
    fixtureDef1.friction = 0.3;
    fixtureDef1.filter.categoryBits = CollisionCategory.Default
    fixtureDef1.filter.maskBits = CollisionCategory.Default | CollisionCategory.FriendlyWeapon
    body.CreateFixtureFromDefinition(fixtureDef1);
    
    body.SetUserData(ObjectType.Soldier)
    var physicsObject = new PhysicsObject(body, this)
    this.soldiers = this.soldiers.add(physicsObject)
    
    return physicsObject
  }
  
  
  createBombPhysics(position: Point) {
    var bombBodyDef = new PhysicsType2d.Dynamics.BodyDefinition();
    bombBodyDef.type = PhysicsType2d.Dynamics.BodyType.DYNAMIC;
    bombBodyDef.position = new PhysicsType2d.Vector2(position.x, position.y)
    // bombBodyDef.linearVelocity = new PhysicsType2d.Vector2(this.player.body.GetLinearVelocity().x, 0)
    // bombBodyDef.bullet = true
    
    var bombBody = this.world.CreateBody(bombBodyDef)
    
    var bombShape = new PhysicsType2d.Collision.Shapes.CircleShape();
    // bombShape.m_p = new PhysicsType2d.Vector2(1, 1)
    bombShape.m_radius = 0.5

    var bombFixtureDef = new PhysicsType2d.Dynamics.FixtureDefinition();
    bombFixtureDef.shape = bombShape;
    bombFixtureDef.density = 0.2;
    bombFixtureDef.friction = 0.3;
    bombFixtureDef.filter.categoryBits = CollisionCategory.FriendlyWeapon
    bombFixtureDef.filter.maskBits = CollisionCategory.Default | CollisionCategory.EnemyWeapon
    bombBody.CreateFixtureFromDefinition(bombFixtureDef);
    
    bombBody.SetUserData(ObjectType.Bomb)
    
    var physicsObject = new PhysicsObject(bombBody, this)
    this.bombs = this.bombs.add(physicsObject)
    
    // bombBody.ApplyForceToCenter(new PhysicsType2d.Vector2(0, 200))
    
    // bombBody.SetUserData(bomb)
    
    return physicsObject
  }
  
  createRocketPhysics(position: Point) {
    var rocketBodyDef = new PhysicsType2d.Dynamics.BodyDefinition()
    rocketBodyDef.type = PhysicsType2d.Dynamics.BodyType.DYNAMIC
    rocketBodyDef.position = new PhysicsType2d.Vector2(position.x, position.y)
    
    var rocketBody = this.world.CreateBody(rocketBodyDef)
    
    var rocketShape = new PhysicsType2d.Collision.Shapes.PolygonShape
    rocketShape.SetAsBox(0.5, 0.25, new PhysicsType2d.Vector2(0.5, 0.125), 0)

    var rocketFixtureDef = new PhysicsType2d.Dynamics.FixtureDefinition()
    rocketFixtureDef.shape = rocketShape
    rocketFixtureDef.density = 1
    rocketFixtureDef.friction = 0.3
    rocketFixtureDef.filter.categoryBits = CollisionCategory.FriendlyWeapon
    rocketFixtureDef.filter.maskBits = CollisionCategory.Default | CollisionCategory.EnemyWeapon
    rocketBody.CreateFixtureFromDefinition(rocketFixtureDef)
    
    rocketBody.SetUserData(ObjectType.Rocket)
    
    var physicsObject = new PhysicsObject(rocketBody, this)
    
    this.rockets = this.rockets.add(physicsObject)
    
    return physicsObject
  }
  
  update(): void {
    
    var timeStep = 1/60; // Simulate 60 steps per second
    var velocityIterations = 4; // 8 // Number of iterations the velocity solver will use
    var positionIterations = 2; // 3 // Number of iterations the position solver will use
    this.world.Step(timeStep, velocityIterations, positionIterations);
    
    var cleanupExplodable = (explodable) => {
      if (explodable.active !== explodable.body.IsActive()) {
        explodable.body.SetActive(explodable.active)
      }
      if (explodable.dead) {
        this.world.DestroyBody(explodable.body)
      }
    } 
    this.rockets.forEach(cleanupExplodable)
    this.bombs.forEach(cleanupExplodable)
  }
}