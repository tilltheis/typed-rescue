/// <reference path="../typings/pixi.js/pixi.js.d.ts" />
/// <reference path="../typings/physicstype2d/physicstype2d.d.ts" />
var Point = (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    Point.fromPixi = function (pixi) {
        return new Point(pixi.x, pixi.y);
    };
    Point.prototype.toPixi = function () {
        return new PIXI.Point(this.x, this.y);
    };
    Point.fromPhysics = function (physics) {
        return new Point(physics.x, physics.y);
    };
    Point.prototype.toPhysics = function () {
        return new PhysicsType2d.Vector2(this.x, this.y);
    };
    return Point;
})();
/// <reference path="Point.ts" />
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
/// <reference path="../typings/immutable/immutable.d.ts" />
/// <reference path="TileMap.ts" />
/// <reference path="Point.ts" />
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
    ObjectType[ObjectType["Soldier"] = 3] = "Soldier";
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
        return Point.fromPhysics(this.body.GetPosition());
    };
    PhysicsObject.prototype.velocity = function () {
        return Point.fromPhysics(this.body.GetLinearVelocity());
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
        return Point.fromPhysics(this.body.GetWorldVector(point.toPhysics()));
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
        this.bombs = Immutable.Set();
        this.rockets = Immutable.Set();
        this.soldiers = Immutable.Set();
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
        var p = function (po) { return po.body === body; };
        return Immutable.Set([this.player]).find(p) || this.rockets.find(p) || this.bombs.find(p);
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
    World.prototype.createSoldierPhysics = function () {
        var bodyDef = new PhysicsType2d.Dynamics.BodyDefinition();
        bodyDef.type = PhysicsType2d.Dynamics.BodyType.DYNAMIC;
        bodyDef.position = new PhysicsType2d.Vector2(50, 15);
        bodyDef.fixedRotation = true;
        var body = this.world.CreateBody(bodyDef);
        var shape0 = new PhysicsType2d.Collision.Shapes.CircleShape();
        shape0.m_p = new PhysicsType2d.Vector2(0.5, 0.5);
        shape0.m_radius = 0.5;
        var fixtureDef0 = new PhysicsType2d.Dynamics.FixtureDefinition();
        fixtureDef0.shape = shape0;
        fixtureDef0.density = 1.0;
        fixtureDef0.friction = 0.3;
        fixtureDef0.filter.categoryBits = CollisionCategory.Default;
        fixtureDef0.filter.maskBits = CollisionCategory.Default | CollisionCategory.FriendlyWeapon;
        body.CreateFixtureFromDefinition(fixtureDef0);
        var shape1 = new PhysicsType2d.Collision.Shapes.CircleShape();
        shape1.m_p = new PhysicsType2d.Vector2(0.5, 1.5);
        shape1.m_radius = 0.5;
        var fixtureDef1 = new PhysicsType2d.Dynamics.FixtureDefinition();
        fixtureDef1.shape = shape1;
        fixtureDef1.density = 1.0;
        fixtureDef1.friction = 0.3;
        fixtureDef1.filter.categoryBits = CollisionCategory.Default;
        fixtureDef1.filter.maskBits = CollisionCategory.Default | CollisionCategory.FriendlyWeapon;
        body.CreateFixtureFromDefinition(fixtureDef1);
        body.SetUserData(ObjectType.Soldier);
        var physicsObject = new PhysicsObject(body, this);
        this.soldiers = this.soldiers.add(physicsObject);
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
        this.bombs = this.bombs.add(physicsObject);
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
        this.rockets = this.rockets.add(physicsObject);
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
/// <reference path="Point.ts" />
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
        var rocket = new Rocket(this.physics.world.createRocketPhysics(Point.fromPhysics(position)));
        rocket.physics.setRotation(this.physics.rotation());
        var direction = rocket.physics.worldVector(new Point(1, 0));
        rocket.physics.applyImpulse(new Point(direction.x * 10, direction.y * 10));
        this.rockets.push(rocket);
    };
    Player.prototype.dropBomb = function () {
        var position = new PhysicsType2d.Vector2(this.physics.position().x + 2, this.physics.position().y + 2.5);
        var bomb = new Bomb(this.physics.world.createBombPhysics(Point.fromPhysics(position)));
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
var Soldier = (function () {
    function Soldier(physics) {
        this.physics = physics;
    }
    return Soldier;
})();
/// <reference path="World.ts" />
/// <reference path="GameObjects.ts" />
var GameState = (function () {
    function GameState(world) {
        var _this = this;
        this.world = world;
        this.player = new Player(world.createPlayerPhysics());
        this.soldier = new Soldier(world.createSoldierPhysics());
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
/// <reference path="../typings/immutable/immutable.d.ts" />
/// <reference path="GameState.ts" />
/// <reference path="Point.ts" />
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
        this.hitboxes = [];
        this.bombShapes = Immutable.Map();
        this.rocketShapes = Immutable.Map();
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
    GameView.prototype.drawHitBoxes = function () {
        var _this = this;
        this.hitboxes.forEach(function (x) { return _this.stage.removeChild(x); });
        if (this.hitboxesEnabled) {
            var player = this.strokedPhysicsShape(this.state.player.physics, 0x00ff00);
            var soldier = this.strokedPhysicsShape(this.state.soldier.physics, 0x0000ff);
            var bombs = this.state.world.bombs.map(function (x) { return _this.strokedPhysicsShape(x, 0xff0000); });
            var rockets = this.state.world.rockets.map(function (x) { return _this.strokedPhysicsShape(x, 0xff0000); });
            this.hitboxes = [player, soldier].concat(bombs.toJS()).concat(rockets.toJS());
            this.hitboxes.forEach(function (x) { return _this.stage.addChild(x); });
        }
    };
    GameView.prototype.strokedCircleShape = function (origin, radius, color) {
        var graphics = new PIXI.Graphics();
        graphics
            .lineStyle(1, color)
            .drawCircle(this.scaleScalar(origin.x), this.scaleScalar(origin.y), this.scaleScalar(radius));
        return graphics;
    };
    GameView.prototype.strokedPolygonShape = function (polygon, color) {
        var _this = this;
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(1, color);
        graphics.moveTo(this.scaleScalar(polygon[0].x), this.scaleScalar(polygon[1].y));
        polygon.slice(1).forEach(function (v) {
            graphics.lineTo(_this.scaleScalar(v.x), _this.scaleScalar(v.y));
        });
        graphics.lineTo(this.scaleScalar(polygon[0].x), this.scaleScalar(polygon[1].y));
        return graphics;
    };
    GameView.prototype.bombShape = function (bomb) {
        var shape = new PIXI.Sprite(this.bombTexture);
        // make it behave like a rectangle
        var bounds = shape.getBounds();
        shape.pivot.x += bounds.width / 2;
        shape.pivot.y += bounds.height / 2;
        return shape;
    };
    GameView.prototype.rocketShape = function (rocket) {
        return new PIXI.Sprite(this.rocketTexture);
    };
    GameView.prototype.strokedPhysicsShape = function (physics, color) {
        var shape = new PIXI.Container();
        shape.position = this.scalePoint(Point.fromPhysics(physics.body.GetPosition())).toPixi();
        shape.rotation = physics.rotation();
        var it = physics.body.GetFixtures();
        while (it.MoveNext()) {
            shape.addChild(this.strokedFixtureShape(it.Current(), color));
        }
        return shape;
    };
    GameView.prototype.strokedFixtureShape = function (fixture, color) {
        switch (fixture.GetType()) {
            case PhysicsType2d.Collision.Shapes.ShapeType.CIRCLE:
                var circle = fixture.GetShape();
                return this.strokedCircleShape(new Point(circle.m_p.x, circle.m_p.y), circle.m_radius, color);
                break;
            case PhysicsType2d.Collision.Shapes.ShapeType.POLYGON:
                var shape = fixture.GetShape();
                var polygon = [];
                shape.m_vertices.forEach(function (v) {
                    polygon.push(new Point(v.x, v.y));
                });
                return this.strokedPolygonShape(polygon, color);
            default:
                console.error("GameView", "fixtureShape", "unsupported fixture shape", fixture.GetType());
                return new PIXI.Container();
                break;
        }
    };
    GameView.prototype.scaleScalar = function (x) {
        return x * this.state.world.tileMap.tileSize;
    };
    GameView.prototype.scalePoint = function (point) {
        return new Point(this.scaleScalar(point.x), this.scaleScalar(point.y));
    };
    GameView.prototype.drawPlayer = function () {
        this.player.position = this.scalePoint(this.state.player.physics.position()).toPixi();
        this.player.rotation = this.state.player.physics.rotation();
    };
    GameView.prototype.drawViewport = function () {
        // never scroll beyond the edges of the map + cast to int to avoid graphics glitches
        this.viewport.x = Math.min(Math.max(0, this.player.x - this.canvas.width / 3), this.scaleScalar(this.state.world.tileMap.mapWidth) - this.viewport.width);
        this.stage.x = -this.viewport.x;
        this.stats.x = this.viewport.x + 10;
    };
    GameView.prototype.drawStats = function () {
        this.stats.text =
            "p: " + this.vectorString(this.state.player.physics.position()) + "\n" +
                "v: " + this.vectorString(this.state.player.physics.velocity()) + "\n" +
                "fps: " + ~~PIXI.ticker.shared.FPS + "\n";
    };
    GameView.prototype.drawMap = function () {
        var _this = this;
        var playerPosition = this.state.player.physics.position();
        // only draw what's visible - this gives us a huge performance boost
        for (var layerName in this.layers) {
            this.layers[layerName].children.forEach(function (tile) {
                var bounds = tile.getBounds();
                // we don't care about y because we only scroll horizontally
                tile.visible =
                    _this.viewport.contains(_this.scaleScalar(playerPosition.x), 0) ||
                        _this.viewport.contains(_this.scaleScalar(playerPosition.x) + bounds.width, 0);
            });
        }
    };
    GameView.prototype.mapPartition = function (xs, p) {
        var _a = [Immutable.Map(), Immutable.Map()], a = _a[0], b = _a[1];
        xs.forEach(function (v, k) { if (p(v, k))
            a = a.set(k, v);
        else
            b = b.set(k, v); });
        return [a, b];
    };
    GameView.prototype.drawExplodables = function (explodables, shapeCache, shapeForExplodable) {
        var _this = this;
        var _a = this.mapPartition(shapeCache, function (shape, explodable) {
            return explodables.has(explodable);
        }), aliveShapes = _a[0], deadShapes = _a[1];
        var _b = this.mapPartition(aliveShapes, function (shape, explodable) {
            return explodable.hasExploded && !(shapeCache.get(explodable) instanceof PIXI.extras.MovieClip);
        }), explodedAliveShapes = _b[0], unexplodedAliveShapes = _b[1];
        var newUnexplodedShapes = explodables.reduce(function (cache, shape, explodable) {
            if (shapeCache.has(explodable))
                return cache;
            else
                return cache.set(explodable, shapeForExplodable(explodable)); // let's hope it didn't explode yet  
        }, Immutable.Map());
        var newExplodedShapes = explodedAliveShapes.map(function (shape, explodable) {
            var movie = new PIXI.extras.MovieClip(_this.explosionFrames);
            shapeCache.set(explodable, movie);
            movie.animationSpeed = _this.explosionFrames.length / PIXI.ticker.shared.FPS; // 1s whole movie
            movie.loop = false;
            return movie;
        });
        var allAliveShapes = newUnexplodedShapes.merge(newExplodedShapes).merge(unexplodedAliveShapes);
        allAliveShapes.forEach(function (shape, explodable) {
            shape.position = _this.scalePoint(explodable.physics.position()).toPixi();
            if (!explodable.hasExploded) {
                shape.rotation = explodable.physics.rotation();
            }
        });
        deadShapes.merge(explodedAliveShapes).forEach(function (shape, explodable) { return _this.stage.removeChild(shape); });
        newUnexplodedShapes.merge(newExplodedShapes).forEach(function (shape, explodable) { return _this.stage.addChild(shape); });
        newExplodedShapes.forEach(function (movie) { return movie.play(); });
        return allAliveShapes;
    };
    GameView.prototype.drawBombs = function () {
        var _this = this;
        this.bombShapes = this.drawExplodables(Immutable.Set(this.state.player.bombs), this.bombShapes, function (b) { return _this.bombShape(b); });
    };
    GameView.prototype.drawRockets = function () {
        var _this = this;
        this.rocketShapes = this.drawExplodables(Immutable.Set(this.state.player.rockets), this.rocketShapes, function (r) { return _this.rocketShape(r); });
    };
    GameView.prototype.update = function () {
        this.drawPlayer();
        this.drawViewport();
        this.drawStats();
        this.drawMap();
        this.drawBombs();
        this.drawRockets();
        this.drawHitBoxes();
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