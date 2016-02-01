/// <reference path="../typings/pixi.js/pixi.js.d.ts" />
/// <reference path="../typings/core-js/core-js.d.ts" />
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
  private bombs: Map<Bomb, PIXI.DisplayObject> = new Map<Bomb, PIXI.DisplayObject>()
  
  private rocketTexture: PIXI.Texture
  private rockets: Map<Rocket, PIXI.DisplayObject> = new Map<Rocket, PIXI.DisplayObject>()
  
  private explosionFrames: PIXI.Texture[] = []
  
  constructor(
    private state: GameState,
    private canvas: HTMLCanvasElement,
    private assets: Assets
  ) {
    this.stage = new PIXI.Container()
    
    this.layers = this.layersFromTileMap(state.tileMap, assets.tileImage)
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
    this.state.contactListener.contacts.forEach((vs) => {
      contactBoxes.addChild(this.strokedPolygonShape(vs, red))
    })
    return contactBoxes
  }
  
  private playerShape() {
    var container = new PIXI.Container()
    var origin = this.state.playerBody.GetPosition()
    var green = 0x00ff00
    
    var fixtures = this.state.playerBody.GetFixtures()
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
    
    if (this.state.playerBody.GetMassData) {
      var centerOfMass = this.state.playerBody.GetMassData().center
      var localOrigin = new Point(origin.x + centerOfMass.x,  origin.y + centerOfMass.y)
      container.addChild(this.strokedCircleShape(localOrigin, 3 / this.state.tileMap.tileSize, green))
    }
    
    return container
  }
  
  private strokedCircleShape(origin: Point, radius: number, color: number) {
    var graphics = new PIXI.Graphics()
    graphics
      .lineStyle(1, color)
      .drawCircle(
        origin.x * this.state.tileMap.tileSize,
        origin.y * this.state.tileMap.tileSize,
        radius * this.state.tileMap.tileSize
      )
    return graphics
  }
  
  private strokedPolygonShape(polygon: Point[], color: number) {
    var graphics = new PIXI.Graphics()
    graphics.lineStyle(1, color)
    graphics.moveTo(
      polygon[0].x * this.state.tileMap.tileSize,
      polygon[1].y * this.state.tileMap.tileSize
    )
    polygon.slice(1).forEach((v) => {
      graphics.lineTo(
        v.x * this.state.tileMap.tileSize,
        v.y * this.state.tileMap.tileSize
      )
    })
    graphics.lineTo(
      polygon[0].x * this.state.tileMap.tileSize,
      polygon[1].y * this.state.tileMap.tileSize
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
    this.player.x = this.state.player.position.x * this.state.tileMap.tileSize
    this.player.y = this.state.player.position.y * this.state.tileMap.tileSize

    // never scroll beyond the edges of the map + cast to int to avoid graphics glitches
    this.viewport.x = Math.min(Math.max(0, this.player.x - this.canvas.width / 3), this.state.tileMap.mapWidth * this.state.tileMap.tileSize - this.viewport.width)
    this.stage.x = -this.viewport.x
    this.stats.x = this.viewport.x + 10
    
    this.stats.text =
      "p: " + this.vectorString(this.state.player.position) + "\n" +
      "v: " + this.vectorString(this.state.player.velocity) + "\n" +
      "fps: " + ~~PIXI.ticker.shared.FPS + "\n" +
      "|cs|: " + this.state.contactListener.contacts.length 
    
    // // only draw what's visible - this gives us a huge performance boost
    // for (var layerName in this.layers) {
    //     this.layers[layerName].children.forEach(tile => {
    //         tile.visible = this.viewport.intersects(tile.getTransformedBounds())
    //     })
    // }
    
    // hitboxes
    this.stage.removeChild(this.contactBoxes)
    this.stage.removeChild(this.playerBox)
    if (this.hitboxesEnabled) {
      this.contactBoxes = this.contactBoxesShape()
      this.playerBox = this.playerShape()
      this.stage.addChild(this.contactBoxes)
      this.stage.addChild(this.playerBox)
    }
    
    
    // bombs
    this.bombs.forEach((shape, bomb) => {
      if (!this.state.bombs.has(bomb)) {
        this.bombs.delete(bomb)
        this.stage.removeChild(shape)
      }
    })
    this.state.bombs.forEach((bomb) => {
      if (!this.bombs.has(bomb)) {
        var shape = this.bombShape(bomb)
        this.bombs.set(bomb, shape)
        this.stage.addChild(shape)
      } else if (bomb.hasExploded && !(this.bombs.get(bomb) instanceof PIXI.extras.MovieClip)) {
        var shape = this.bombs.get(bomb)
        this.stage.removeChild(shape)
        var movie = new PIXI.extras.MovieClip(this.explosionFrames);
        this.bombs.set(bomb, movie)
        movie.animationSpeed = this.explosionFrames.length / PIXI.ticker.shared.FPS // 1s whole movie
        movie.loop = false
        movie.play();
        this.stage.addChild(movie);
      }
      
      var shape = this.bombs.get(bomb)
      var position = bomb.position()
      shape.x = position.x * this.state.tileMap.tileSize
      shape.y = position.y * this.state.tileMap.tileSize
      
      if (!bomb.hasExploded) {
        shape.rotation = bomb.rotation()
      }
    })
    
    
    // rockets
    this.rockets.forEach((shape, rocket) => {
      if (!this.state.rockets.has(rocket)) {
        this.rockets.delete(rocket)
        this.stage.removeChild(shape)
      }
    })
    this.state.rockets.forEach((rocket) => {
      if (!this.rockets.has(rocket)) {
        var shape = this.rocketShape(rocket)
        this.rockets.set(rocket, shape)
        this.stage.addChild(shape)
      } else if (rocket.hasExploded && !(this.rockets.get(rocket) instanceof PIXI.extras.MovieClip)) {
        var shape = this.rockets.get(rocket)
        this.stage.removeChild(shape)
        var movie = new PIXI.extras.MovieClip(this.explosionFrames);
        this.rockets.set(rocket, movie)
        movie.animationSpeed = this.explosionFrames.length / PIXI.ticker.shared.FPS // 1s whole movie
        movie.loop = false
        movie.play();
        this.stage.addChild(movie);
      }
      
      var shape = this.rockets.get(rocket)
      var position = rocket.position()
      shape.x = position.x * this.state.tileMap.tileSize
      shape.y = position.y * this.state.tileMap.tileSize
      
      if (!rocket.hasExploded) {
        shape.rotation = rocket.rotation()
      }
    })
    
  }
}