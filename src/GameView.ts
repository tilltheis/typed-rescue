/// <reference path="../typings/pixi.js/pixi.js.d.ts" />
/// <reference path="../typings/immutable/immutable.d.ts" />
/// <reference path="GameState.ts" />
/// <reference path="Point.ts" />

class Assets {
    constructor(
        public tileImage: HTMLImageElement,
        public helicopterImage: HTMLImageElement,
        public bombImage: HTMLImageElement,
        public rocketImage: HTMLImageElement
    ) {}
}

class GameView {
  public stage: PIXI.Container
  private player: PIXI.Sprite
  private soldier: PIXI.DisplayObject
  private viewport: PIXI.Rectangle
  private layers: { [name: string]: PIXI.Container }
  private stats: PIXI.Text
  
  public hitboxesEnabled = false
  private hitboxes: Array<PIXI.DisplayObject> = []
  
  private bombTexture: PIXI.Texture
  private bombShapes: Immutable.Map<Bomb, PIXI.DisplayObject> = Immutable.Map<Bomb, PIXI.DisplayObject>()
  
  private rocketTexture: PIXI.Texture
  private rocketShapes: Immutable.Map<Rocket, PIXI.DisplayObject> = Immutable.Map<Rocket, PIXI.DisplayObject>()
  
  private explosionFrames: PIXI.Texture[] = []
  
  constructor(
    private state: GameState,
    private canvas: HTMLCanvasElement,
    private assets: Assets
  ) {
    this.stage = new PIXI.Container()
    
    this.layers = this.layersFromTileMap(state.world.tileMap, assets.tileImage)
    for (var layerName in this.layers) {
        this.stage.addChild(this.layers[layerName])
    }

    this.player = PIXI.Sprite.fromImage(assets.helicopterImage.src)
    this.stage.addChild(this.player)
    
    this.stats = new PIXI.Text("", {
      font: "10px Arial"
    })
    this.stats.x = 10
    this.stats.y = 10
    this.stage.addChild(this.stats)
    
    this.viewport = new PIXI.Rectangle(0, 0, canvas.width, canvas.height)
    
    this.bombTexture = PIXI.Texture.fromImage(assets.bombImage.src)
    this.rocketTexture = PIXI.Texture.fromImage(assets.rocketImage.src)
    
    for (var i = 0; i <= 7; i++) {
      this.explosionFrames.push(PIXI.Texture.fromFrame("explosion" + this.zeroPad(i, 3) + ".png"))
    }
  }
  
  // from http://stackoverflow.com/a/2998822/122594
  private zeroPad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
  }
  
  private layersFromTileMap(tileMap: TileMap, tileImage: HTMLImageElement): { [name: string]: PIXI.Container } {
    var baseTexture = new PIXI.BaseTexture(tileImage)
    
    var layers: { [name: string]: PIXI.Container } = {}
    for (var layerName in tileMap.layers) {
      var layerData = tileMap.layers[layerName]
      
      var container = new PIXI.Container()
      
      for (var y = 0; y < tileMap.mapHeight; y++) {
        for (var x = 0; x < tileMap.mapWidth; x++) {
          var tileIndex = layerData[tileMap.tileIndexForMapPoint(x, y)] - 1
          if (tileIndex === -1) {
              continue
          }
          var origin = tileMap.tileSetPixelForTileIndex(tileIndex)
          
          var frame = new PIXI.Rectangle(origin.x, origin.y, tileMap.tileSize, tileMap.tileSize)
          var texture = new PIXI.Texture(baseTexture, frame)
          var sprite = new PIXI.Sprite(texture)
          sprite.x = x * tileMap.tileSize
          sprite.y = y * tileMap.tileSize
          sprite.width = tileMap.tileSize
          sprite.height = tileMap.tileSize
          
          container.addChild(sprite)
        }
      }
      
      layers[layerName] = container
    }
    return layers
  }
    
  private vectorString(v: { x: number, y: number }) {
    return "(" + v.x.toFixed(2) + ", " +  v.y.toFixed(2) + ")"
  }
  
  private drawHitBoxes(): void {
    this.hitboxes.forEach(x => this.stage.removeChild(x))
    if (this.hitboxesEnabled) {
      var player = this.strokedPhysicsShape(this.state.player.physics, 0x00ff00)
      var soldier = this.strokedPhysicsShape(this.state.soldier.physics, 0x0000ff)
      var bombs = this.state.world.bombs.map(x => this.strokedPhysicsShape(x, 0xff0000))
      var rockets = this.state.world.rockets.map(x => this.strokedPhysicsShape(x, 0xff0000))
      this.hitboxes = [player, soldier].concat(bombs.toJS()).concat(rockets.toJS())
      this.hitboxes.forEach(x => this.stage.addChild(x))
    }
  }
  
  private strokedCircleShape(origin: Point, radius: number, color: number) {
    var graphics = new PIXI.Graphics()
    graphics
      .lineStyle(1, color)
      .drawCircle(this.scaleScalar(origin.x), this.scaleScalar(origin.y), this.scaleScalar(radius))
    return graphics
  }
  
  private strokedPolygonShape(polygon: Point[], color: number) {
    var graphics = new PIXI.Graphics()
    graphics.lineStyle(1, color)
    graphics.moveTo(this.scaleScalar(polygon[0].x), this.scaleScalar(polygon[1].y))
    polygon.slice(1).forEach((v) => {
      graphics.lineTo(this.scaleScalar(v.x), this.scaleScalar(v.y))
    })
    graphics.lineTo(this.scaleScalar(polygon[0].x), this.scaleScalar(polygon[1].y))
    return graphics
  }
  
  private bombShape(bomb: Bomb): PIXI.DisplayObject {
    var shape = new PIXI.Sprite(this.bombTexture)
    
    // make it behave like a rectangle
    var bounds = shape.getBounds()
    shape.pivot.x += bounds.width / 2
    shape.pivot.y += bounds.height / 2
    
    return shape
  }
  
  private rocketShape(rocket: Rocket): PIXI.DisplayObject {
    return new PIXI.Sprite(this.rocketTexture)
  }
  
  private strokedPhysicsShape(physics: PhysicsObject, color: number): PIXI.DisplayObject {
    var shape = new PIXI.Container()
    shape.position = this.scalePoint(Point.fromPhysics(physics.body.GetPosition())).toPixi()
    shape.rotation = physics.rotation()
    
    var it = physics.body.GetFixtures()
    while (it.MoveNext()) {
      shape.addChild(this.strokedFixtureShape(it.Current(), color))
    }
    
    return shape
  }
  
  private strokedFixtureShape(fixture: PhysicsType2d.Dynamics.Fixture, color: number): PIXI.DisplayObject {
    var fixtureShape = null;
    switch (fixture.GetType()) {
      case PhysicsType2d.Collision.Shapes.ShapeType.CIRCLE:
        var circle = <PhysicsType2d.Collision.Shapes.CircleShape>fixture.GetShape()
        fixtureShape = this.strokedCircleShape(new Point(circle.m_p.x, circle.m_p.y), circle.m_radius, color)
        
      case PhysicsType2d.Collision.Shapes.ShapeType.POLYGON:
        var shape = <PhysicsType2d.Collision.Shapes.PolygonShape>fixture.GetShape()
        var polygon: Point[] = []
        shape.m_vertices.forEach((v) => {
          polygon.push(new Point(v.x, v.y))
        })
        fixtureShape = this.strokedPolygonShape(polygon, color)
    
      default:
        console.error("GameView", "strokedFixtureShape", "unsupported fixture shape", fixture.GetType())
        fixtureShape = new PIXI.Container()
    }
    return fixtureShape
  }
  
  private scaleScalar(x: number): number {
    return x * this.state.world.tileMap.tileSize
  }
  
  private scalePoint(point: Point): Point {
    return new Point(this.scaleScalar(point.x), this.scaleScalar(point.y))
  }
  
  private drawPlayer(): void {
    this.player.position = this.scalePoint(this.state.player.physics.position()).toPixi()
    this.player.rotation = this.state.player.physics.rotation()
  }
  
  private drawViewport(): void {
    // never scroll beyond the edges of the map + cast to int to avoid graphics glitches
    this.viewport.x = Math.min(Math.max(0, this.player.x - this.canvas.width / 3), this.scaleScalar(this.state.world.tileMap.mapWidth) - this.viewport.width)
    this.stage.x = -this.viewport.x
    this.stats.x = this.viewport.x + 10
  }
  
  private drawStats(): void {
    this.stats.text =
      "p: " + this.vectorString(this.state.player.physics.position()) + "\n" +
      "v: " + this.vectorString(this.state.player.physics.velocity()) + "\n" +
      "fps: " + ~~PIXI.ticker.shared.FPS + "\n"
  }
  
  private drawMap(): void {
    var playerPosition = this.state.player.physics.position()
    // only draw what's visible - this gives us a huge performance boost
    for (var layerName in this.layers) {
      this.layers[layerName].children.forEach(tile => {
        var bounds = tile.getBounds()
        // we don't care about y because we only scroll horizontally
        tile.visible =
          this.viewport.contains(this.scaleScalar(playerPosition.x), 0) ||
            this.viewport.contains(this.scaleScalar(playerPosition.x) + bounds.width, 0)
      })
    }
  }
  
  private mapPartition<K, V>(xs: Immutable.Map<K, V>, p: (v: V, k: K) => boolean): Array<Immutable.Map<K, V>> {
    var [a, b] = [Immutable.Map<K, V>(), Immutable.Map<K, V>()] 

    xs.forEach((v, k) => { if (p(v, k)) a = a.set(k, v); else b = b.set(k, v); })
    return [a, b]
  }
  
  private drawExplodables<A extends Explodable>(
    explodables: Immutable.Set<A>,
    shapeCache: Immutable.Map<A, PIXI.DisplayObject>,
    shapeForExplodable: (e: A) => PIXI.DisplayObject
  ): Immutable.Map<A, PIXI.DisplayObject> {
    var [aliveShapes, deadShapes] = this.mapPartition(shapeCache, (shape, explodable) => {
      return explodables.has(explodable)
    })
    var [explodedAliveShapes, unexplodedAliveShapes] = this.mapPartition(aliveShapes, (shape, explodable) => {
      return explodable.hasExploded && !(shapeCache.get(explodable) instanceof PIXI.extras.MovieClip)
    })
    var newUnexplodedShapes = explodables.reduce<Immutable.Map<A, PIXI.DisplayObject>>((cache, shape, explodable) => {
      if (shapeCache.has(explodable)) return cache; else return cache.set(explodable, shapeForExplodable(explodable)) // let's hope it didn't explode yet  
    }, Immutable.Map<A, PIXI.DisplayObject>())
    var newExplodedShapes = explodedAliveShapes.map((shape, explodable) => {
      var movie = new PIXI.extras.MovieClip(this.explosionFrames);
      shapeCache.set(explodable, movie)
      movie.animationSpeed = this.explosionFrames.length / PIXI.ticker.shared.FPS // 1s whole movie
      movie.loop = false
      return movie
    })
    
    var allAliveShapes = newUnexplodedShapes.merge(newExplodedShapes).merge(unexplodedAliveShapes)
    allAliveShapes.forEach((shape, explodable) => {
      shape.position = this.scalePoint(explodable.physics.position()).toPixi()
      
      if (!explodable.hasExploded) {
        shape.rotation = explodable.physics.rotation()
      }
    })
    
    deadShapes.merge(explodedAliveShapes).forEach((shape, explodable) => this.stage.removeChild(shape))
    newUnexplodedShapes.merge(newExplodedShapes).forEach((shape, explodable) => this.stage.addChild(shape))
    newExplodedShapes.forEach(movie => movie.play())
    
    return allAliveShapes
  }
  
  private drawBombs(): void {
    this.bombShapes = this.drawExplodables(Immutable.Set(this.state.player.bombs), this.bombShapes, b => this.bombShape(b))
  }
  
  private drawRockets(): void {
    this.rocketShapes = this.drawExplodables(Immutable.Set(this.state.player.rockets), this.rocketShapes, r => this.rocketShape(r))
  }
    
  update() {
    this.drawPlayer()
    this.drawViewport()
    this.drawStats()
    this.drawMap()
    this.drawBombs()
    this.drawRockets()
    this.drawHitBoxes()
  }
}