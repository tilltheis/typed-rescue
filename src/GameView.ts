/// <reference path="../typings/pixi.js/pixi.js.d.ts" />
/// <reference path="../typings/immutable/immutable.d.ts" />
/// <reference path="GameState.ts" />

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
  private viewport: PIXI.Rectangle
  private layers: { [name: string]: PIXI.Container }
  private stats: PIXI.Text
  
  private contactBoxes: PIXI.DisplayObject
  private playerBox: PIXI.DisplayObject
  
  public hitboxesEnabled = false
  
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
  
  private contactBoxesShape() {
    var contactBoxes = new PIXI.Container()
    var red = 0xff0000
    // this.state.world.contactListener.contacts.forEach((vs) => {
    //   contactBoxes.addChild(this.strokedPolygonShape(vs, red))
    // })
    return contactBoxes
  }
  
  private playerShape() {
    var container = new PIXI.Container()
    var origin = this.state.player.physics.position()
    var green = 0x00ff00
    
    var fixtures = this.state.player.physics.body.GetFixtures()
    while (fixtures.MoveNext()) {
      var shape = fixtures.Current().GetShape()
      
      if (shape instanceof PhysicsType2d.Collision.Shapes.PolygonShape) {
        var b2Polygon = <PhysicsType2d.Collision.Shapes.PolygonShape> shape
        var polygon = b2Polygon.m_vertices.map((vertex) => {
            return new Point(origin.x + vertex.x, origin.y + vertex.y)
        })
        container.addChild(this.strokedPolygonShape(polygon, green))
      } else if (shape instanceof PhysicsType2d.Collision.Shapes.CircleShape) {
        var b2Circle = <PhysicsType2d.Collision.Shapes.CircleShape> shape
        var localOrigin = new Point(origin.x + b2Circle.m_p.x,  origin.y + b2Circle.m_p.y)
        container.addChild(this.strokedCircleShape(localOrigin, b2Circle.GetRadius(), green))
      }
    }
    
    if (this.state.player.physics.body.GetMassData) {
      var centerOfMass = this.state.player.physics.body.GetMassData().center
      var localOrigin = new Point(origin.x + centerOfMass.x,  origin.y + centerOfMass.y)
      container.addChild(this.strokedCircleShape(localOrigin, 3 / this.state.world.tileMap.tileSize, green))
    }
    
    return container
  }
  
  private strokedCircleShape(origin: Point, radius: number, color: number) {
    var graphics = new PIXI.Graphics()
    graphics
      .lineStyle(1, color)
      .drawCircle(
        origin.x * this.state.world.tileMap.tileSize,
        origin.y * this.state.world.tileMap.tileSize,
        radius * this.state.world.tileMap.tileSize
      )
    return graphics
  }
  
  private strokedPolygonShape(polygon: Point[], color: number) {
    var graphics = new PIXI.Graphics()
    graphics.lineStyle(1, color)
    graphics.moveTo(
      polygon[0].x * this.state.world.tileMap.tileSize,
      polygon[1].y * this.state.world.tileMap.tileSize
    )
    polygon.slice(1).forEach((v) => {
      graphics.lineTo(
        v.x * this.state.world.tileMap.tileSize,
        v.y * this.state.world.tileMap.tileSize
      )
    })
    graphics.lineTo(
      polygon[0].x * this.state.world.tileMap.tileSize,
      polygon[1].y * this.state.world.tileMap.tileSize
    )
    return graphics
  }
  
  private bombShape(bomb: Bomb): PIXI.DisplayObject {
    return new PIXI.Sprite(this.bombTexture)
  }
  
  private rocketShape(rocket: Rocket): PIXI.DisplayObject {
    return new PIXI.Sprite(this.rocketTexture)
  }
    
  update() {
    this.player.x = this.state.player.physics.position().x * this.state.world.tileMap.tileSize
    this.player.y = this.state.player.physics.position().y * this.state.world.tileMap.tileSize
    this.player.rotation = this.state.player.physics.rotation()

    // never scroll beyond the edges of the map + cast to int to avoid graphics glitches
    this.viewport.x = Math.min(Math.max(0, this.player.x - this.canvas.width / 3), this.state.world.tileMap.mapWidth * this.state.world.tileMap.tileSize - this.viewport.width)
    this.stage.x = -this.viewport.x
    this.stats.x = this.viewport.x + 10
    
    this.stats.text =
      "p: " + this.vectorString(this.state.player.physics.position()) + "\n" +
      "v: " + this.vectorString(this.state.player.physics.velocity()) + "\n" +
      "fps: " + ~~PIXI.ticker.shared.FPS + "\n"
    
    var playerPosition = this.state.player.physics.position()
    
    // only draw what's visible - this gives us a huge performance boost
    for (var layerName in this.layers) {
        this.layers[layerName].children.forEach(tile => {
            var bounds = tile.getBounds()
            // we don't care about y because we only scroll horizontally
            tile.visible =
              this.viewport.contains(playerPosition.x * this.state.world.tileMap.tileSize, 0) ||
                this.viewport.contains(playerPosition.x * this.state.world.tileMap.tileSize + bounds.width, 0)
        })
    }
    
    // hitboxes
    this.stage.removeChild(this.contactBoxes)
    this.stage.removeChild(this.playerBox)
    if (this.hitboxesEnabled) {
      this.contactBoxes = this.contactBoxesShape()
      this.playerBox = this.playerShape()
      // console.log(this.playerBox.pivot)
      // this.playerBox.pivot = new PIXI.Point(this.playerBox.position.x + 32, this.playerBox.position.y + 16)
      // this.playerBox.position = new PIXI.Point(this.state.player.position().x, this.state.player.position().y)
      this.playerBox.rotation = this.state.player.physics.rotation()
      this.stage.addChild(this.contactBoxes)
      this.stage.addChild(this.playerBox)
    }
        
    
    var mapPartition = <K, V>(xs: Immutable.Map<K, V>, p: (v: V, k: K) => boolean): Array<Immutable.Map<K, V>> => {
      var [a, b] = [Immutable.Map<K, V>(), Immutable.Map<K, V>()] 

      xs.forEach((v, k) => { if (p(v, k)) a = a.set(k, v); else b = b.set(k, v); })
      return [a, b]
    }
    
    var drawExplodables = <A extends Explodable>(explodables: Immutable.Set<A>, shapeCache: Immutable.Map<A, PIXI.DisplayObject>, shapeForExplodable: (e: A) => PIXI.DisplayObject) => {
      var [aliveShapes, deadShapes] = mapPartition(shapeCache, (shape, explodable) => {
        return explodables.has(explodable)
      })
      var [explodedAliveShapes, unexplodedAliveShapes] = mapPartition(aliveShapes, (shape, explodable) => {
        return explodable.hasExploded && !(shapeCache.get(explodable) instanceof PIXI.extras.MovieClip)
      })
      var newUnexplodedShapes = explodables.reduce<Immutable.Map<A, PIXI.DisplayObject>>((cache, shape, explodable) => {
        if (shapeCache.has(explodable)) return cache; else return cache.set(explodable, shapeForExplodable(explodable)) // Let's hope it didn't explode yet  
      }, Immutable.Map<A, PIXI.DisplayObject>())
      var newExplodedShapes = explodedAliveShapes.map((shape, explodable) => {
        var movie = new PIXI.extras.MovieClip(this.explosionFrames);
        shapeCache.set(explodable, movie)
        movie.animationSpeed = this.explosionFrames.length / PIXI.ticker.shared.FPS // 1s whole movie
        movie.loop = false
        return movie
      })
      
      deadShapes.merge(explodedAliveShapes).forEach((shape, explodable) => this.stage.removeChild(shape))
      newUnexplodedShapes.merge(newExplodedShapes).forEach((shape, explodable) => this.stage.addChild(shape))
      newExplodedShapes.forEach(movie => movie.play())
      
      var allAliveShapes = newUnexplodedShapes.merge(newExplodedShapes).merge(unexplodedAliveShapes)
      allAliveShapes.forEach((shape, explodable) => {
        var position = explodable.physics.position()
        shape.x = position.x * this.state.world.tileMap.tileSize
        shape.y = position.y * this.state.world.tileMap.tileSize
        
        if (!explodable.hasExploded) {
          shape.rotation = explodable.physics.rotation()
        }
      })
      
      return allAliveShapes
    }
    
    this.bombShapes = drawExplodables(Immutable.Set(this.state.player.bombs), this.bombShapes, b => this.bombShape(b))
    this.rocketShapes = drawExplodables(Immutable.Set(this.state.player.rockets), this.rocketShapes, r => this.rocketShape(r))
  }
}