/// <reference path="TileMap.ts" />

class TileMapFactory {
    static fromTiledEditorJson(json: any): TileMap {
        try {
            var tileWidth = <number> json.tilewidth
            var tileHeight = <number> json.tileheight
            if (tileWidth != tileHeight) {
                throw "tileWidth(" + tileWidth + ") !=  tileHeight(" + tileHeight + ")"
            }
            var tileSize = tileWidth
            var layers: { [name: string]: (number[]) } = {}
            json.layers.forEach((layer) => {
                layers[layer.name] = layer.data
            })
            return new TileMap(
                json.width,
                json.height,
                tileSize,
                json.tilesets[0].imagewidth / tileWidth,
                json.tilesets[0].imageheight / tileHeight,
                json.tilesets[0].image,
                layers
            )
        } catch (e) {
            console.error("TileMapParser::fromTiledEditorJson", "could not parse json", e)
            return null
        }
    }
}