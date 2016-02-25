class Keyboard {
  static LeftArrow = 37
  static UpArrow = 38
  static RightArrow = 39
  static DownArrow = 40
  static Space = 32
  static Control = 17

  
  private pressedKeys: number[] = []

  constructor(private element: HTMLElement) {
    element.addEventListener("keydown", (e) => this.onKeyDown(e))
    element.addEventListener("keyup", (e) => this.onKeyUp(e))
  }
  
  // ignore case
  isKeyPressed(key: number | string): boolean {
    var keyCode: number
    if (typeof key === "string") {
      keyCode = (<string>key).charCodeAt(0)
    } else {
      keyCode = <number>key
    }
    return this.pressedKeys.indexOf(this.normalizedCharCode(keyCode)) !== -1
  }
  
  
  private normalizedCharCode(keyCode: number) {
    return String.fromCharCode(keyCode).toLowerCase().charCodeAt(0)
  }

  private onKeyDown(event: KeyboardEvent) {
    event.preventDefault()
    var key = this.normalizedCharCode(event.keyCode)
    if (!this.isKeyPressed(key)) {
        this.pressedKeys.push(key)
    }
  }
  private onKeyUp(event: KeyboardEvent) {
    event.preventDefault()
    var key = this.normalizedCharCode(event.keyCode)
    if (this.isKeyPressed(key)) {
        this.pressedKeys.splice(this.pressedKeys.indexOf(key), 1)
    }
  }
}