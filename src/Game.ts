/// <reference path="../typings/pixi.js/pixi.js.d.ts" />
/// <reference path="GameState.ts" />
/// <reference path="GameView.ts" />
/// <reference path="GameController.ts" />
/// <reference path="TileMapFactory.ts" />
/// <reference path="Keyboard.ts" />
/// <reference path="World.ts" />


var loader = new PIXI.loaders.Loader("assets/")
loader
  .add("map", "map.json")
  .add("tileMapImage", "nestle.png")
  .add("helicopterImage", "helicol.png")
  .add("bombImage", "bomb.png")
  .add("rocketImage", "rocket.png")
  .add("explosionAnimation", "explosion.json")

loader.load((_loader, resources) => {
    var canvas = <HTMLCanvasElement> document.getElementById("stage")

    var tileMap = TileMapFactory.fromTiledEditorJson(resources["map"].data)
    var keyboard = new Keyboard(document.body)

    var tileMapImage = <HTMLImageElement> resources["tileMapImage"].data
    var helicopterImage = <HTMLImageElement> resources["helicopterImage"].data
    var bombImage = <HTMLImageElement> resources["bombImage"].data
    var rocketImage = <HTMLImageElement> resources["rocketImage"].data
    var assets = new Assets(
        tileMapImage,
        helicopterImage,
        bombImage,
        rocketImage
    )
    
    // this will change the canvas size that the view relies on
    var renderer = PIXI.autoDetectRenderer(640, 480, {
      view: canvas,
      backgroundColor : 0xffffff
    })
    
    var world = new World(tileMap)
    var state = new GameState(world)
    var view = new GameView(state, canvas, assets)
    var controller = new GameController(state, view, keyboard)
    
    PIXI.ticker.shared.add((delta) => {
        controller.update()
    })
    PIXI.ticker.shared.add((delta) => {
        state.update()
    })
    renderer.roundPixels = true
    PIXI.ticker.shared.add((delta) => {
      view.update()
      renderer.render(view.stage)
    })
    
    var hitBoxesEnabledInput = <HTMLInputElement> document.getElementById("settings.hitboxesEnabled")
    var enableHitboxes = (shouldBeEnabled: boolean) => {
      view.hitboxesEnabled = shouldBeEnabled
      localStorage.setItem("settings.hitboxesEnabled", JSON.stringify(shouldBeEnabled))
      hitBoxesEnabledInput.checked = shouldBeEnabled
    }
    enableHitboxes(JSON.parse(localStorage.getItem("settings.hitboxesEnabled")))
    hitBoxesEnabledInput.addEventListener("change", (event) => {
      enableHitboxes((<HTMLInputElement>event.target).checked)
    })
    
    window['game'] = {
      view: view
    }
})
