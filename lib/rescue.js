var Point = (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    return Point;
})();
var TileMap = (function () {
    function TileMap(mapWidth, mapHeight, tileSize, tileSetWidth, tileSetHeight, tileSetImage, layers) {
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.tileSize = tileSize;
        this.tileSetWidth = tileSetWidth;
        this.tileSetHeight = tileSetHeight;
        this.tileSetImage = tileSetImage;
        this.layers = layers;
    }
    TileMap.prototype.tileIndexForMapPoint = function (x, y) {
        return x + y * this.mapWidth;
    };
    TileMap.prototype.mapPointForTileIndex = function (index) {
        return new Point(index % this.mapWidth, ~~(index / this.mapWidth));
    };
    TileMap.prototype.tileSetPointForTileIndex = function (index) {
        return new Point(index % this.tileSetWidth, ~~(index / this.tileSetHeight));
    };
    TileMap.prototype.tileSetPixelForTileIndex = function (index) {
        var unscaledPoint = this.tileSetPointForTileIndex(index);
        return new Point(unscaledPoint.x * this.tileSize, unscaledPoint.y * this.tileSize);
    };
    return TileMap;
})();
/// <reference path="../typings/physicstype2d/physicstype2d.d.ts" />
/// <reference path="../typings/core-js/core-js.d.ts" />
/// <reference path="TileMap.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ObjectType;
(function (ObjectType) {
    ObjectType[ObjectType["Player"] = 0] = "Player";
    ObjectType[ObjectType["Rocket"] = 1] = "Rocket";
    ObjectType[ObjectType["Bomb"] = 2] = "Bomb";
})(ObjectType || (ObjectType = {}));
var CollisionCategory;
(function (CollisionCategory) {
    CollisionCategory[CollisionCategory["Default"] = 1] = "Default";
    CollisionCategory[CollisionCategory["FriendlyWeapon"] = 2] = "FriendlyWeapon";
    CollisionCategory[CollisionCategory["EnemyWeapon"] = 4] = "EnemyWeapon";
})(CollisionCategory || (CollisionCategory = {}));
var PhysicsObject = (function () {
    function PhysicsObject(body, world) {
        this.body = body;
        this.world = world;
        this.dead = false;
        this.active = true;
    }
    PhysicsObject.prototype.position = function () {
        return this.body.GetPosition();
    };
    PhysicsObject.prototype.velocity = function () {
        return this.body.GetLinearVelocity();
    };
    PhysicsObject.prototype.setVelocity = function (velocity) {
        this.body.SetLinearVelocity(new PhysicsType2d.Vector2(velocity.x, velocity.y));
    };
    PhysicsObject.prototype.rotation = function () {
        return this.body.GetAngle();
    };
    PhysicsObject.prototype.setRotation = function (rotation) {
        this.body.SetTransform(this.body.GetPosition(), rotation);
    };
    PhysicsObject.prototype.setRotationDegrees = function (rotation) {
        this.setRotation(rotation * (Math.PI / 180));
    };
    PhysicsObject.prototype.applyForce = function (force) {
        this.body.ApplyForceToCenter(new PhysicsType2d.Vector2(force.x, force.y));
    };
    PhysicsObject.prototype.applyImpulse = function (impulse) {
        this.body.ApplyLinearImpulse(new PhysicsType2d.Vector2(impulse.x, impulse.y), this.body.GetWorldCenter());
    };
    PhysicsObject.prototype.worldVector = function (point) {
        return this.body.GetWorldVector(new PhysicsType2d.Vector2(point.x, point.y));
    };
    return PhysicsObject;
})();
var DelegatingContactListener = (function (_super) {
    __extends(DelegatingContactListener, _super);
    function DelegatingContactListener(bodyToPhysicsObject, handler) {
        _super.call(this);
        this.bodyToPhysicsObject = bodyToPhysicsObject;
        this.handler = handler;
    }
    DelegatingContactListener.prototype.Destructor = function () { };
    DelegatingContactListener.prototype.BeginContact = function (contact) {
        var a = this.bodyToPhysicsObject(contact.GetFixtureA().GetBody());
        var b = this.bodyToPhysicsObject(contact.GetFixtureB().GetBody());
        if (a || b) {
            this.handler(a, b);
        }
    };
    DelegatingContactListener.prototype.EndContact = function (contact) { };
    DelegatingContactListener.prototype.PreSolve = function (contact, oldManifold) { };
    DelegatingContactListener.prototype.PostSolve = function (contact, impulse) { };
    return DelegatingContactListener;
})(PhysicsType2d.Dynamics.ContactListener);
var World = (function () {
    function World(tileMap) {
        this.tileMap = tileMap;
        this.bombs = [];
        this.rockets = [];
        var gravity = new PhysicsType2d.Vector2(0, 9.81);
        this.world = new PhysicsType2d.Dynamics.World(gravity);
        var groundBodyDef = new PhysicsType2d.Dynamics.BodyDefinition();
        groundBodyDef.type = PhysicsType2d.Dynamics.BodyType.STATIC;
        var groundBody = this.world.CreateBody(groundBodyDef);
        var layerData = tileMap.layers["foreground"];
        for (var y = 0; y < tileMap.mapHeight; y++) {
            for (var x = 0; x < tileMap.mapWidth; x++) {
                var tileIndex = layerData[tileMap.tileIndexForMapPoint(x, y)] - 1;
                if (tileIndex === -1) {
                    continue;
                }
                var tileShape = new PhysicsType2d.Collision.Shapes.PolygonShape();
                tileShape.SetAsBox(0.5, 0.5, new PhysicsType2d.Vector2(x + 0.5, y + 0.5), 0);
                groundBody.CreateFixture(tileShape, 0);
            }
        }
    }
    World.prototype.bodyToPhysicsObject = function (body) {
        var result = null;
        if (!result && this.player.body === body)
            result = this.player;
        for (var i = 0; !result && i < this.rockets.length; i++) {
            if (this.rockets[i].body === body)
                result = this.rockets[i];
        }
        for (var i = 0; !result && i < this.bombs.length; i++) {
            if (this.bombs[i].body === body)
                result = this.bombs[i];
        }
        return result;
    };
    World.prototype.setCollisionHandler = function (handler) {
        var _this = this;
        var lookup = function (body) { return _this.bodyToPhysicsObject(body); };
        this.world.SetContactListener(new DelegatingContactListener(lookup, handler));
    };
    World.prototype.createPlayerPhysics = function () {
        if (this.player !== undefined) {
            throw "World#createPlayerPhysics: player already exists";
        }
        var playerBodyDef = new PhysicsType2d.Dynamics.BodyDefinition();
        playerBodyDef.type = PhysicsType2d.Dynamics.BodyType.DYNAMIC;
        playerBodyDef.position = new PhysicsType2d.Vector2(0, 0);
        playerBodyDef.fixedRotation = true;
        var playerBody = this.world.CreateBody(playerBodyDef);
        var playerShape = new PhysicsType2d.Collision.Shapes.CircleShape();
        playerShape.m_p = new PhysicsType2d.Vector2(1, 1);
        playerShape.m_radius = 1;
        var playerFixtureDef = new PhysicsType2d.Dynamics.FixtureDefinition();
        playerFixtureDef.shape = playerShape;
        playerFixtureDef.density = 1.0;
        playerFixtureDef.friction = 0.3;
        playerFixtureDef.filter.categoryBits = CollisionCategory.Default;
        playerFixtureDef.filter.maskBits = CollisionCategory.Default | CollisionCategory.EnemyWeapon;
        playerBody.CreateFixtureFromDefinition(playerFixtureDef);
        var playerShape1 = new PhysicsType2d.Collision.Shapes.CircleShape();
        playerShape1.m_p = new PhysicsType2d.Vector2(3, 1);
        playerShape1.m_radius = 1;
        var playerFixtureDef1 = new PhysicsType2d.Dynamics.FixtureDefinition();
        playerFixtureDef1.shape = playerShape1;
        playerFixtureDef1.density = 1.0;
        playerFixtureDef1.friction = 0.3;
        playerFixtureDef1.filter.categoryBits = CollisionCategory.Default;
        playerFixtureDef1.filter.maskBits = CollisionCategory.Default | CollisionCategory.EnemyWeapon;
        playerBody.CreateFixtureFromDefinition(playerFixtureDef1);
        playerBody.SetUserData(ObjectType.Player);
        var physicsObject = new PhysicsObject(playerBody, this);
        this.player = physicsObject;
        return physicsObject;
    };
    World.prototype.createBombPhysics = function (position) {
        var bombBodyDef = new PhysicsType2d.Dynamics.BodyDefinition();
        bombBodyDef.type = PhysicsType2d.Dynamics.BodyType.DYNAMIC;
        bombBodyDef.position = new PhysicsType2d.Vector2(position.x, position.y);
        // bombBodyDef.linearVelocity = new PhysicsType2d.Vector2(this.player.body.GetLinearVelocity().x, 0)
        // bombBodyDef.bullet = true
        var bombBody = this.world.CreateBody(bombBodyDef);
        var bombShape = new PhysicsType2d.Collision.Shapes.CircleShape();
        // bombShape.m_p = new PhysicsType2d.Vector2(1, 1)
        bombShape.m_radius = 0.5;
        var bombFixtureDef = new PhysicsType2d.Dynamics.FixtureDefinition();
        bombFixtureDef.shape = bombShape;
        bombFixtureDef.density = 0.2;
        bombFixtureDef.friction = 0.3;
        bombFixtureDef.filter.categoryBits = CollisionCategory.FriendlyWeapon;
        bombFixtureDef.filter.maskBits = CollisionCategory.Default | CollisionCategory.EnemyWeapon;
        bombBody.CreateFixtureFromDefinition(bombFixtureDef);
        bombBody.SetUserData(ObjectType.Bomb);
        var physicsObject = new PhysicsObject(bombBody, this);
        this.bombs.push(physicsObject);
        // bombBody.ApplyForceToCenter(new PhysicsType2d.Vector2(0, 200))
        // bombBody.SetUserData(bomb)
        return physicsObject;
    };
    World.prototype.createRocketPhysics = function (position) {
        var rocketBodyDef = new PhysicsType2d.Dynamics.BodyDefinition();
        rocketBodyDef.type = PhysicsType2d.Dynamics.BodyType.DYNAMIC;
        rocketBodyDef.position = new PhysicsType2d.Vector2(position.x, position.y);
        var rocketBody = this.world.CreateBody(rocketBodyDef);
        var rocketShape = new PhysicsType2d.Collision.Shapes.PolygonShape;
        rocketShape.SetAsBox(0.5, 0.25, new PhysicsType2d.Vector2(0.5, 0.125), 0);
        var rocketFixtureDef = new PhysicsType2d.Dynamics.FixtureDefinition();
        rocketFixtureDef.shape = rocketShape;
        rocketFixtureDef.density = 1;
        rocketFixtureDef.friction = 0.3;
        rocketFixtureDef.filter.categoryBits = CollisionCategory.FriendlyWeapon;
        rocketFixtureDef.filter.maskBits = CollisionCategory.Default | CollisionCategory.EnemyWeapon;
        rocketBody.CreateFixtureFromDefinition(rocketFixtureDef);
        rocketBody.SetUserData(ObjectType.Rocket);
        var physicsObject = new PhysicsObject(rocketBody, this);
        this.rockets.push(physicsObject);
        return physicsObject;
    };
    World.prototype.update = function () {
        var _this = this;
        var timeStep = 1 / 60; // Simulate 60 steps per second
        var velocityIterations = 4; // 8 // Number of iterations the velocity solver will use
        var positionIterations = 2; // 3 // Number of iterations the position solver will use
        this.world.Step(timeStep, velocityIterations, positionIterations);
        var cleanupExplodable = function (explodable) {
            if (explodable.active !== explodable.body.IsActive()) {
                explodable.body.SetActive(explodable.active);
            }
            if (explodable.dead) {
                _this.world.DestroyBody(explodable.body);
            }
        };
        this.rockets.forEach(cleanupExplodable);
        this.bombs.forEach(cleanupExplodable);
    };
    return World;
})();
/// <reference path="GameState.ts" />
/// <reference path="World.ts" />
var Player = (function () {
    function Player(physics) {
        this.physics = physics;
        this.movementForce = 1500;
        this.maxSpeed = 15;
        this.bombs = [];
        this.rockets = [];
    }
    Player.prototype.update = function () {
        var _this = this;
        var velocity = this.physics.velocity();
        var cappedVelocityX = Math.min(this.maxSpeed, velocity.x);
        var cappedVelocityY = Math.min(this.maxSpeed, velocity.y);
        var rotation = cappedVelocityX / 2;
        this.physics.setRotationDegrees(rotation);
        var vy = cappedVelocityY > 0 ? cappedVelocityY : cappedVelocityY / 1.25;
        this.physics.setVelocity(new Point(cappedVelocityX / 1.25, vy));
        this.rockets.forEach(function (rocket, index) {
            if (rocket.physics.dead) {
                _this.rockets.splice(index, 1);
            }
        });
    };
    Player.prototype.move = function (x, y) {
        this.physics.applyForce(new Point(x, y));
    };
    Player.prototype.moveUp = function () {
        this.move(0, -this.movementForce);
    };
    Player.prototype.moveDown = function () {
        this.move(0, +this.movementForce);
    };
    Player.prototype.moveLeft = function () {
        this.move(-this.movementForce, 0);
    };
    Player.prototype.moveRight = function () {
        this.move(+this.movementForce, 0);
    };
    Player.prototype.fireRocket = function () {
        var position = new PhysicsType2d.Vector2(this.physics.position().x + 2, this.physics.position().y + 2.5);
        var rocket = new Rocket(this.physics.world.createRocketPhysics(position));
        rocket.physics.setRotation(this.physics.rotation());
        var direction = rocket.physics.worldVector(new Point(1, 0));
        rocket.physics.applyImpulse(new Point(direction.x * 10, direction.y * 10));
        this.rockets.push(rocket);
    };
    Player.prototype.dropBomb = function () {
        var position = new PhysicsType2d.Vector2(this.physics.position().x + 2, this.physics.position().y + 2.5);
        var bomb = new Bomb(this.physics.world.createBombPhysics(position));
        var xImpulse = this.physics.velocity().x / this.physics.body.GetMass();
        bomb.physics.applyImpulse(new Point(xImpulse, 2));
        this.bombs.push(bomb);
    };
    Player.prototype.collide = function (other) {
        // todo
    };
    return Player;
})();
var Bomb = (function () {
    function Bomb(physics) {
        this.physics = physics;
        this.hasExploded = false;
    }
    Bomb.prototype.collide = function (other) {
        this.explode();
    };
    Bomb.prototype.explode = function () {
        var _this = this;
        this.hasExploded = true;
        this.physics.active = false;
        setTimeout(function () {
            _this.physics.dead = true;
        }, 1000);
    };
    return Bomb;
})();
var Rocket = (function () {
    function Rocket(physics) {
        this.physics = physics;
        this.hasExploded = false;
    }
    Rocket.prototype.collide = function (other) {
        this.explode();
    };
    Rocket.prototype.explode = function () {
        var _this = this;
        this.hasExploded = true;
        this.physics.active = false;
        setTimeout(function () {
            _this.physics.dead = true;
        }, 1000);
    };
    return Rocket;
})();
/// <reference path="World.ts" />
/// <reference path="GameObjects.ts" />
var GameState = (function () {
    function GameState(world) {
        var _this = this;
        this.world = world;
        this.player = new Player(world.createPlayerPhysics());
        var lookup = function (physics) {
            var result = null;
            if (!result && _this.player.physics === physics)
                result = _this.player;
            for (var i = 0; !result && i < _this.player.rockets.length; i++) {
                if (_this.player.rockets[i].physics === physics)
                    result = _this.player.rockets[i];
            }
            for (var i = 0; !result && i < _this.player.bombs.length; i++) {
                if (_this.player.bombs[i].physics === physics)
                    result = _this.player.bombs[i];
            }
            return result;
        };
        world.setCollisionHandler(function (a, b) {
            var richA = lookup(a);
            var richB = lookup(b);
            if (richA)
                richA.collide(richB);
            if (richB)
                richB.collide(richA);
        });
    }
    GameState.prototype.update = function () {
        this.world.update();
        this.player.update();
    };
    return GameState;
})();
/// <reference path="../typings/pixi.js/pixi.js.d.ts" />
/// <reference path="../typings/core-js/core-js.d.ts" />
/// <reference path="GameState.ts" />
var Assets = (function () {
    function Assets(tileImage, helicopterImage, bombImage, rocketImage) {
        this.tileImage = tileImage;
        this.helicopterImage = helicopterImage;
        this.bombImage = bombImage;
        this.rocketImage = rocketImage;
    }
    return Assets;
})();
var GameView = (function () {
    function GameView(state, canvas, assets) {
        this.state = state;
        this.canvas = canvas;
        this.assets = assets;
        this.hitboxesEnabled = false;
        this.bombShapes = new Map();
        this.rocketShapes = new Map();
        this.explosionFrames = [];
        this.stage = new PIXI.Container();
        this.layers = this.layersFromTileMap(state.world.tileMap, assets.tileImage);
        for (var layerName in this.layers) {
            this.stage.addChild(this.layers[layerName]);
        }
        this.player = PIXI.Sprite.fromImage(assets.helicopterImage.src);
        this.stage.addChild(this.player);
        this.stats = new PIXI.Text("", {
            font: "10px Arial"
        });
        this.stats.x = 10;
        this.stats.y = 10;
        this.stage.addChild(this.stats);
        this.viewport = new PIXI.Rectangle(0, 0, canvas.width, canvas.height);
        this.bombTexture = PIXI.Texture.fromImage(assets.bombImage.src);
        this.rocketTexture = PIXI.Texture.fromImage(assets.rocketImage.src);
        for (var i = 0; i <= 7; i++) {
            this.explosionFrames.push(PIXI.Texture.fromFrame("explosion" + this.zeroPad(i, 3) + ".png"));
        }
    }
    // from http://stackoverflow.com/a/2998822/122594
    GameView.prototype.zeroPad = function (num, size) {
        var s = num + "";
        while (s.length < size)
            s = "0" + s;
        return s;
    };
    GameView.prototype.layersFromTileMap = function (tileMap, tileImage) {
        var baseTexture = new PIXI.BaseTexture(tileImage);
        var layers = {};
        for (var layerName in tileMap.layers) {
            var layerData = tileMap.layers[layerName];
            var container = new PIXI.Container();
            for (var y = 0; y < tileMap.mapHeight; y++) {
                for (var x = 0; x < tileMap.mapWidth; x++) {
                    var tileIndex = layerData[tileMap.tileIndexForMapPoint(x, y)] - 1;
                    if (tileIndex === -1) {
                        continue;
                    }
                    var origin = tileMap.tileSetPixelForTileIndex(tileIndex);
                    var frame = new PIXI.Rectangle(origin.x, origin.y, tileMap.tileSize, tileMap.tileSize);
                    var texture = new PIXI.Texture(baseTexture, frame);
                    var sprite = new PIXI.Sprite(texture);
                    sprite.x = x * tileMap.tileSize;
                    sprite.y = y * tileMap.tileSize;
                    sprite.width = tileMap.tileSize;
                    sprite.height = tileMap.tileSize;
                    container.addChild(sprite);
                }
            }
            layers[layerName] = container;
        }
        return layers;
    };
    GameView.prototype.vectorString = function (v) {
        return "(" + v.x.toFixed(2) + ", " + v.y.toFixed(2) + ")";
    };
    GameView.prototype.contactBoxesShape = function () {
        var contactBoxes = new PIXI.Container();
        var red = 0xff0000;
        // this.state.world.contactListener.contacts.forEach((vs) => {
        //   contactBoxes.addChild(this.strokedPolygonShape(vs, red))
        // })
        return contactBoxes;
    };
    GameView.prototype.playerShape = function () {
        var container = new PIXI.Container();
        var origin = this.state.player.physics.position();
        var green = 0x00ff00;
        var fixtures = this.state.player.physics.body.GetFixtures();
        while (fixtures.MoveNext()) {
            var shape = fixtures.Current().GetShape();
            if (shape instanceof PhysicsType2d.Collision.Shapes.PolygonShape) {
                var b2Polygon = shape;
                var polygon = b2Polygon.m_vertices.map(function (vertex) {
                    return new Point(origin.x + vertex.x, origin.y + vertex.y);
                });
                container.addChild(this.strokedPolygonShape(polygon, green));
            }
            else if (shape instanceof PhysicsType2d.Collision.Shapes.CircleShape) {
                var b2Circle = shape;
                var localOrigin = new Point(origin.x + b2Circle.m_p.x, origin.y + b2Circle.m_p.y);
                container.addChild(this.strokedCircleShape(localOrigin, b2Circle.GetRadius(), green));
            }
        }
        if (this.state.player.physics.body.GetMassData) {
            var centerOfMass = this.state.player.physics.body.GetMassData().center;
            var localOrigin = new Point(origin.x + centerOfMass.x, origin.y + centerOfMass.y);
            container.addChild(this.strokedCircleShape(localOrigin, 3 / this.state.world.tileMap.tileSize, green));
        }
        return container;
    };
    GameView.prototype.strokedCircleShape = function (origin, radius, color) {
        var graphics = new PIXI.Graphics();
        graphics
            .lineStyle(1, color)
            .drawCircle(origin.x * this.state.world.tileMap.tileSize, origin.y * this.state.world.tileMap.tileSize, radius * this.state.world.tileMap.tileSize);
        return graphics;
    };
    GameView.prototype.strokedPolygonShape = function (polygon, color) {
        var _this = this;
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(1, color);
        graphics.moveTo(polygon[0].x * this.state.world.tileMap.tileSize, polygon[1].y * this.state.world.tileMap.tileSize);
        polygon.slice(1).forEach(function (v) {
            graphics.lineTo(v.x * _this.state.world.tileMap.tileSize, v.y * _this.state.world.tileMap.tileSize);
        });
        graphics.lineTo(polygon[0].x * this.state.world.tileMap.tileSize, polygon[1].y * this.state.world.tileMap.tileSize);
        return graphics;
    };
    GameView.prototype.bombShape = function (bomb) {
        return new PIXI.Sprite(this.bombTexture);
    };
    GameView.prototype.rocketShape = function (rocket) {
        return new PIXI.Sprite(this.rocketTexture);
    };
    GameView.prototype.update = function () {
        var _this = this;
        this.player.x = this.state.player.physics.position().x * this.state.world.tileMap.tileSize;
        this.player.y = this.state.player.physics.position().y * this.state.world.tileMap.tileSize;
        this.player.rotation = this.state.player.physics.rotation();
        // never scroll beyond the edges of the map + cast to int to avoid graphics glitches
        this.viewport.x = Math.min(Math.max(0, this.player.x - this.canvas.width / 3), this.state.world.tileMap.mapWidth * this.state.world.tileMap.tileSize - this.viewport.width);
        this.stage.x = -this.viewport.x;
        this.stats.x = this.viewport.x + 10;
        this.stats.text =
            "p: " + this.vectorString(this.state.player.physics.position()) + "\n" +
                "v: " + this.vectorString(this.state.player.physics.velocity()) + "\n" +
                "fps: " + ~~PIXI.ticker.shared.FPS + "\n";
        var playerPosition = this.state.player.physics.position();
        // only draw what's visible - this gives us a huge performance boost
        for (var layerName in this.layers) {
            this.layers[layerName].children.forEach(function (tile) {
                var bounds = tile.getBounds();
                // we don't care about y because we only scroll horizontally
                tile.visible =
                    _this.viewport.contains(playerPosition.x * _this.state.world.tileMap.tileSize, 0) ||
                        _this.viewport.contains(playerPosition.x * _this.state.world.tileMap.tileSize + bounds.width, 0);
            });
        }
        // hitboxes
        this.stage.removeChild(this.contactBoxes);
        this.stage.removeChild(this.playerBox);
        if (this.hitboxesEnabled) {
            this.contactBoxes = this.contactBoxesShape();
            this.playerBox = this.playerShape();
            // console.log(this.playerBox.pivot)
            // this.playerBox.pivot = new PIXI.Point(this.playerBox.position.x + 32, this.playerBox.position.y + 16)
            // this.playerBox.position = new PIXI.Point(this.state.player.position().x, this.state.player.position().y)
            this.playerBox.rotation = this.state.player.physics.rotation();
            this.stage.addChild(this.contactBoxes);
            this.stage.addChild(this.playerBox);
        }
        var drawExplodables = function (explodables, shapeCache, shapeForExplodable) {
            shapeCache.forEach(function (shape, explodable) {
                if (explodables.indexOf(explodable) === -1) {
                    shapeCache.delete(explodable);
                    _this.stage.removeChild(shape);
                }
            });
            explodables.forEach(function (explodable) {
                if (!shapeCache.has(explodable)) {
                    var shape = shapeForExplodable(explodable);
                    shapeCache.set(explodable, shape);
                    _this.stage.addChild(shape);
                }
                else if (explodable.hasExploded && !(shapeCache.get(explodable) instanceof PIXI.extras.MovieClip)) {
                    var shape = shapeCache.get(explodable);
                    _this.stage.removeChild(shape);
                    var movie = new PIXI.extras.MovieClip(_this.explosionFrames);
                    shapeCache.set(explodable, movie);
                    movie.animationSpeed = _this.explosionFrames.length / PIXI.ticker.shared.FPS; // 1s whole movie
                    movie.loop = false;
                    movie.play();
                    _this.stage.addChild(movie);
                }
                var shape = shapeCache.get(explodable);
                var position = explodable.physics.position();
                shape.x = position.x * _this.state.world.tileMap.tileSize;
                shape.y = position.y * _this.state.world.tileMap.tileSize;
                if (!explodable.hasExploded) {
                    shape.rotation = explodable.physics.rotation();
                }
            });
        };
        drawExplodables(this.state.player.bombs, this.bombShapes, function (b) { return _this.bombShape(b); });
        drawExplodables(this.state.player.rockets, this.rocketShapes, function (r) { return _this.rocketShape(r); });
    };
    return GameView;
})();
var Keyboard = (function () {
    function Keyboard(element) {
        var _this = this;
        this.element = element;
        this.pressedKeys = [];
        element.addEventListener("keydown", function (e) { return _this.onKeyDown(e); });
        element.addEventListener("keyup", function (e) { return _this.onKeyUp(e); });
    }
    // ignore case
    Keyboard.prototype.isKeyPressed = function (key) {
        var keyCode;
        if (typeof key === "string") {
            keyCode = key.charCodeAt(0);
        }
        else {
            keyCode = key;
        }
        return this.pressedKeys.indexOf(this.normalizedCharCode(keyCode)) !== -1;
    };
    Keyboard.prototype.normalizedCharCode = function (keyCode) {
        return String.fromCharCode(keyCode).toLowerCase().charCodeAt(0);
    };
    Keyboard.prototype.onKeyDown = function (event) {
        event.preventDefault();
        var key = this.normalizedCharCode(event.keyCode);
        if (!this.isKeyPressed(key)) {
            this.pressedKeys.push(key);
        }
    };
    Keyboard.prototype.onKeyUp = function (event) {
        event.preventDefault();
        var key = this.normalizedCharCode(event.keyCode);
        if (this.isKeyPressed(key)) {
            this.pressedKeys.splice(this.pressedKeys.indexOf(key), 1);
        }
    };
    Keyboard.LeftArrow = 37;
    Keyboard.UpArrow = 38;
    Keyboard.RightArrow = 39;
    Keyboard.DownArrow = 40;
    Keyboard.Space = 32;
    Keyboard.Control = 17;
    return Keyboard;
})();
/// <reference path="GameState.ts" />
/// <reference path="GameView.ts" />
/// <reference path="Keyboard.ts" />
var GameController = (function () {
    function GameController(state, view, keyboard) {
        this.state = state;
        this.view = view;
        this.keyboard = keyboard;
        this.lastRocketTimestamp = 0;
        this.lastBombTimestamp = 0;
    }
    GameController.prototype.update = function () {
        if (this.keyboard.isKeyPressed(Keyboard.LeftArrow)) {
            this.state.player.moveLeft();
        }
        if (this.keyboard.isKeyPressed(Keyboard.RightArrow)) {
            this.state.player.moveRight();
        }
        if (this.keyboard.isKeyPressed(Keyboard.UpArrow)) {
            this.state.player.moveUp();
        }
        if (this.keyboard.isKeyPressed(Keyboard.DownArrow)) {
            this.state.player.moveDown();
        }
        var currentTimestamp = Date.now();
        if (this.keyboard.isKeyPressed("d") && this.lastBombTimestamp < (currentTimestamp - 100)) {
            this.lastBombTimestamp = currentTimestamp;
            this.state.player.dropBomb();
        }
        if (this.keyboard.isKeyPressed("f") && this.lastRocketTimestamp < (currentTimestamp - 100)) {
            this.lastRocketTimestamp = currentTimestamp;
            this.state.player.fireRocket();
        }
    };
    return GameController;
})();
/// <reference path="TileMap.ts" />
var TileMapFactory = (function () {
    function TileMapFactory() {
    }
    TileMapFactory.fromTiledEditorJson = function (json) {
        try {
            var tileWidth = json.tilewidth;
            var tileHeight = json.tileheight;
            if (tileWidth != tileHeight) {
                throw "tileWidth(" + tileWidth + ") !=  tileHeight(" + tileHeight + ")";
            }
            var tileSize = tileWidth;
            var layers = {};
            json.layers.forEach(function (layer) {
                layers[layer.name] = layer.data;
            });
            return new TileMap(json.width, json.height, tileSize, json.tilesets[0].imagewidth / tileWidth, json.tilesets[0].imageheight / tileHeight, json.tilesets[0].image, layers);
        }
        catch (e) {
            console.error("TileMapParser::fromTiledEditorJson", "could not parse json", e);
            return null;
        }
    };
    return TileMapFactory;
})();
/// <reference path="../typings/pixi.js/pixi.js.d.ts" />
/// <reference path="GameState.ts" />
/// <reference path="GameView.ts" />
/// <reference path="GameController.ts" />
/// <reference path="TileMapFactory.ts" />
/// <reference path="Keyboard.ts" />
/// <reference path="World.ts" />
var loader = new PIXI.loaders.Loader("assets/");
loader
    .add("map", "map.json")
    .add("tileMapImage", "nestle.png")
    .add("helicopterImage", "helicol.png")
    .add("bombImage", "bomb.png")
    .add("rocketImage", "rocket.png")
    .add("explosionAnimation", "explosion.json");
loader.load(function (_loader, resources) {
    var canvas = document.getElementById("stage");
    var tileMap = TileMapFactory.fromTiledEditorJson(resources["map"].data);
    var keyboard = new Keyboard(document.body);
    var tileMapImage = resources["tileMapImage"].data;
    var helicopterImage = resources["helicopterImage"].data;
    var bombImage = resources["bombImage"].data;
    var rocketImage = resources["rocketImage"].data;
    var assets = new Assets(tileMapImage, helicopterImage, bombImage, rocketImage);
    // this will change the canvas size that the view relies on
    var renderer = PIXI.autoDetectRenderer(640, 480, {
        view: canvas,
        backgroundColor: 0xffffff
    });
    var world = new World(tileMap);
    var state = new GameState(world);
    var view = new GameView(state, canvas, assets);
    var controller = new GameController(state, view, keyboard);
    PIXI.ticker.shared.add(function (delta) {
        controller.update();
    });
    PIXI.ticker.shared.add(function (delta) {
        state.update();
    });
    renderer.roundPixels = true;
    PIXI.ticker.shared.add(function (delta) {
        view.update();
        renderer.render(view.stage);
    });
    var hitBoxesEnabledInput = document.getElementById("settings.hitboxesEnabled");
    var enableHitboxes = function (shouldBeEnabled) {
        view.hitboxesEnabled = shouldBeEnabled;
        localStorage.setItem("settings.hitboxesEnabled", JSON.stringify(shouldBeEnabled));
        hitBoxesEnabledInput.checked = shouldBeEnabled;
    };
    enableHitboxes(JSON.parse(localStorage.getItem("settings.hitboxesEnabled")));
    hitBoxesEnabledInput.addEventListener("change", function (event) {
        enableHitboxes(event.target.checked);
    });
    window['game'] = {
        view: view
    };
});
//# sourceMappingURL=rescue.js.map