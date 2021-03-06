window.addEventListener('load', main);
"use strict";

let MSGame = (function(){

  // private constants
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";

  function array2d( nrows, ncols, val) {
    const res = [];
    for( let row = 0 ; row < nrows ; row ++) {
      res[row] = [];
      for( let col = 0 ; col < ncols ; col ++)
        res[row][col] = val(row,col);
    }
    return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
    [min,max] = [Math.ceil(min), Math.floor(max)]
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  class _MSGame {
    constructor() {
      this.init(10,10,10); // easy
    }

    validCoord(row, col) {
      return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
    }

    init(nrows, ncols, nmines) {
      this.nrows = nrows;
      this.ncols = ncols;
      this.nmines = nmines;
      this.nmarked = 0;
      this.nuncovered = 0;
      this.exploded = false;

      // create an array
      this.arr = array2d(
        nrows, ncols,
        () => ({mine: false, state: STATE_HIDDEN, count: 0}));
    }

    count(row,col) {
      const c = (r,c) =>
            (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
      let res = 0;
      for( let dr = -1 ; dr <= 1 ; dr ++ )
        for( let dc = -1 ; dc <= 1 ; dc ++ )
          res += c(row+dr,col+dc);
      return res;
    }

    sprinkleMines(row, col) {
        // prepare a list of allowed coordinates for mine placement
      let allowed = [];
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
            allowed.push([r,c]);
        }
      }
      this.nmines = Math.min(this.nmines, allowed.length);
      for( let i = 0 ; i < this.nmines ; i ++ ) {
        let j = rndInt(i, allowed.length-1);
        [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        let [r,c] = allowed[i];
        this.arr[r][c].mine = true;
      }
      // erase any marks (in case user placed them) and update counts
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(this.arr[r][c].state == STATE_MARKED)
            this.arr[r][c].state = STATE_HIDDEN;
          this.arr[r][c].count = this.count(r,c);
        }
      }
      let mines = []; let counts = [];
      for(let row = 0 ; row < this.nrows ; row ++ ) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].mine ? "B" : ".";
        }
        s += "  |  ";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].count.toString();
        }
        mines[row] = s;
      }
      console.log("Mines and counts after sprinkling:");
      console.log(mines.join("\n"), "\n");
    }

    // uncovers a cell at a given coordinate
    // this is the 'left-click' functionality
    uncover(row, col) {
      console.log("uncover", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if this is the very first move, populate the mines, but make
      // sure the current cell does not get a mine
      if( this.nuncovered === 0){
        this.sprinkleMines(row, col);
        intervalObj = setInterval(startTimer, 1000);
      }
      // if cell is not hidden, ignore this move
      if( this.arr[row][col].state !== STATE_HIDDEN) return false;
      // floodfill all 0-count cells
      const ff = (r,c) => {
        if( ! this.validCoord(r,c)) return;
        if( this.arr[r][c].state !== STATE_HIDDEN) return;
        this.arr[r][c].state = STATE_SHOWN;
        this.nuncovered ++;
        if( this.arr[r][c].count !== 0) return;
        ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
        ff(r  ,c-1);         ;ff(r  ,c+1);
        ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
      };
      ff(row,col);
      // have we hit a mine?
      if( this.arr[row][col].mine) {
        this.exploded = true;
      }
      return true;
    }
    // puts a flag on a cell
    // this is the 'right-click' or 'long-tap' functionality
    mark(row, col) {
      console.log("mark", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if cell already uncovered, refuse this
      console.log("marking previous state=", this.arr[row][col].state);
      if( this.arr[row][col].state === STATE_SHOWN) return false;
      // accept the move and flip the marked status
      this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
      this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
        STATE_HIDDEN : STATE_MARKED;
      return true;
    }
    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells
    getRendering() {
      const res = [];
      for( let row = 0 ; row < this.nrows ; row ++) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          let a = this.arr[row][col];
          if( this.exploded && a.mine) s += "M";
          else if( a.state === STATE_HIDDEN) s += "H";
          else if( a.state === STATE_MARKED) s += "F";
          else if( a.mine) s += "M";
          else s += a.count.toString();
        }
        res[row] = s;
      }
      return res;
    }

    getStatus() {
      let done = this.exploded ||
          this.nuncovered === this.nrows * this.ncols - this.nmines;
      return {
        done: done,
        exploded: this.exploded,
        nrows: this.nrows,
        ncols: this.ncols,
        nmarked: this.nmarked,
        nuncovered: this.nuncovered,
        nmines: this.nmines
      }
    }

    getIndex(col, row) {
      return ((row * this.ncols) + col);
    }

    getCoordinate(number) {
      return [number % this.ncols, Math.floor(number / this.ncols)];
    }
  }
  return _MSGame;

})();

/**
 * creates enough cards for largest board (9x9)
 * registers callbacks for cards
 * 
 * @param {state} game
 */
function prepare_dom(game) {
  const grid = document.querySelector(".grid");
  const nCards = 16 * 16 ; // max grid size
  for( let i = 0 ; i < nCards ; i ++) {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-cardInd", i);
    card.addEventListener("click", () => {
      card_click_cb( game, card, i);
    });
    card.addEventListener("contextmenu", (e) => {
      card_click_rb( game, card, i);
      e.preventDefault();
    }, false);
    grid.appendChild(card);
  }
}

/**
 * updates DOM to reflect current state
 * - hides unnecessary cards by setting their display: none
 * - adds "flipped" class to cards that were flipped
 * 
 * @param {object} game
 */
function render(game) {
  const grid = document.querySelector(".grid");
  grid.style.gridTemplateColumns = `repeat(${game.getStatus().ncols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${game.getStatus().nrows}, 1fr)`;
  
  const render = game.getRendering();
  for( let i = 0 ; i < grid.children.length ; i ++) {
    const card = grid.children[i];
    const ind = Number(card.getAttribute("data-cardInd"));
    if( ind >= game.getStatus().nrows * game.getStatus().ncols) {
      card.style.display = "none";
    }
    else {
      card.style.display = "flex";
      const [col, row] = game.getCoordinate(ind);
      const status = render[row].charAt(col);

      card.setAttribute("data-stat", status);
      let colors = ['blue','green','red','purple','brown','black','black','blue'];
      card.innerHTML = /[1-8|M]/.test(status) ? `<b style='color:`+colors[status-1]+`'>${status}</b>` : '';
      
      if (status === 'F') {
        card.innerHTML = `<b>🚩</b>`;
      }

      if (status === 'M') {
        card.innerHTML = `<b>✨</b>`
      }
    }
  }
  document.querySelectorAll(".moveCount").forEach(
    (e)=> {
      e.textContent = String(game.moves);
    });
}
let clickSound = new Audio("clunk.mp3");

/**
 * callback for clicking a card
 * - toggle surrounding elements
 * - check for winning condition
 * @param {Game} game 
 * @param {HTMLElement} card_div 
 * @param {number} ind 
 */
function card_click_cb(game, card_div, ind) {
  const [col, row] = game.getCoordinate(ind);
  card_div.classList.toggle("flipped");

  game.uncover(row, col);
  render(game);
  // check if we won and activate overlay if we did
  if( game.getStatus().exploded ) {
    clearInterval(intervalObj);
    document.querySelector("#loseoverlay").classList.toggle("active");
  }
  else if( game.getStatus().done ) {
    var minLabel = document.getElementById("min");
    var secLabel = document.getElementById("sec");
    minLabel.innerHTML = parseInt( minutesLabel.innerHTML );
    secLabel.innerHTML = parseInt( secondsLabel.innerHTML );
    clearInterval(intervalObj);
    document.querySelector("#overlay").classList.toggle("active");
  }
  // else if(game.getStatus().exploded) {
  //   document.querySelector("#overlay").classList.toggle("active");
  // }
  clickSound.play();
}

/**
 * callback for clicking a card
 * - toggle surrounding elements
 * - check for winning condition
 * @param {Game} game 
 * @param {HTMLElement} card_div 
 * @param {number} ind 
 */
function card_click_rb(game, card_div, ind) {
  const [col, row] = game.getCoordinate(ind);
  var flaglabel = document.getElementById("flagcount");
  const status = game.getRendering()[row].charAt(col);
  
  if (status === 'F') {
    flaglabel.innerHTML = parseInt( flaglabel.innerHTML ) + 1;
  }
  else if( status === 'H') {
    flaglabel.innerHTML = parseInt( flaglabel.innerHTML ) - 1;
  }

  game.mark(row, col);
  render(game);
  // check if we won and activate overlay if we did
  if( game.getStatus().done ) {
    clearInterval(intervalObj);
    document.querySelector("#overlay").classList.toggle("active");
  }
  clickSound.play();
}

/**
 * callback for the top button
 * - set the state to the requested size
 * - generate a solvable state
 * - render the state
 * 
 * @param {state} game
 * @param {number} cols 
 * @param {number} rows 
 */
function button_cb(game, cols, rows, mines) {
  game.init(rows, cols, mines)
  minecount = mines;
  document.getElementById("flagcount").innerHTML = mines;
  render(game);
  totalSeconds = 0;
  secondsLabel.innerHTML = "00";
  minutesLabel.innerHTML = "00";
  clearInterval(intervalObj);
}

var intervalObj;
var totalSeconds = 0;
var minutesLabel = document.getElementById("minutes");
var secondsLabel = document.getElementById("seconds");

function startTimer()
{ 
  ++totalSeconds;
  secondsLabel.innerHTML = checkzero(totalSeconds%60);
  minutesLabel.innerHTML = checkzero(parseInt(totalSeconds/60));
}

function checkzero(val)
{
  var valString = val + "";
  if(valString.length < 2)
  {
      return "0" + valString;
  }
  else
  {
      return valString;
  }
}


function main() {

  let game = new MSGame();

  game.init(10, 10, 10);
  
  let html = document.querySelector("html");
  console.log("Your render area:", html.clientWidth, "x", html.clientHeight)

  document.querySelectorAll(".menuButton").forEach((button) =>{
    [game.nrows, game.ncols, game.nmines] = button.getAttribute("data-size").split("x").map(s=>Number(s));
    game.nmines == 10 ? button.innerHTML = `Easy` : button.innerHTML = `Hard`;
    button.addEventListener("click", button_cb.bind(null, game, game.ncols, game.nrows, game.nmines));
  });


  // callback for overlay click - hide overlay and regenerate game
  document.querySelector("#overlay").addEventListener("click", () => {
    document.querySelector("#overlay").classList.remove("active");
    button_cb(game, game.ncols, game.nrows, game.nmines);
  });
  document.querySelector("#loseoverlay").addEventListener("click", () => {
    document.querySelector("#loseoverlay").classList.remove("active");
    button_cb(game, game.ncols, game.nrows, game.nmines);
  });

  prepare_dom( game );

  button_cb(game, 10, 10, 10);
}
