class Game {
  /** @param {{size:number, snakes:Object, ladders:Object, players:string[], rolls:number[], rule:string, sixAgain:boolean}} config */
  constructor(config) {
    
  }

  /** @return {boolean} whether the config follows the rules in the statement */
  isValid() {
    
  }

  /** Play one roll. @return {{player:string, roll:number, from:number, to:number, event:string}|string} the move, "INVALID" or "OVER" */
  turn() {
    
  }

  /** @return {number} the player's square, 0 before entering, -1 for an unknown player or an invalid game */
  position(player) {
    
  }

  /** @return {string} the winner's name, or "" */
  winner() {
    
  }

  /** @return {string} who rolls next, or "" if the game is over or invalid */
  next() {
    
  }
}
