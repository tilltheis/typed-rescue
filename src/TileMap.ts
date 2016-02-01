class Point {
    constructor(public x: number, public y: number) {}
}

class TileMap {
    constructor(
        public mapWidth: number,
        public mapHeight: number,
        public tileSize: number,
        public tileSetWidth: number,
        public tileSetHeight: number,
        public tileSetImage: string,
        public layers: { [name: string]: number[]; }
    ) {}
    
  tileIndexForMapPoint(x: number, y: number): number {
    return x + y * this.mapWidth
  }

  mapPointForTileIndex(index: number): Point {
    return new Point(index % this.mapWidth, ~~(index / this.mapWidth))
  }

  tileSetPointForTileIndex(index: number): Point {
    return new Point(index % this.tileSetWidth, ~~(index / this.tileSetHeight))
  }

  tileSetPixelForTileIndex(index: number): Point {
      var unscaledPoint = this.tileSetPointForTileIndex(index)
      return new Point(unscaledPoint.x * this.tileSize, unscaledPoint.y * this.tileSize)
  }
}