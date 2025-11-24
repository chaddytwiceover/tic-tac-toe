// /script.js - v4.0 Brutalist/Functionalist Logic
/**
 * Tic Tac Toe Game - Brutalist Design Philosophy
 * Features: Three difficulty levels, explicit state communication,
 * strategic rule-based AI, and optimized minimax algorithm.
 * Principles: Verbosity over opacity, explicit over implicit.
 */

class TicTacToeGame {
  constructor() {
    // --- Game State Variables ---
    this.PLAYER_X = 'x'; // Represents a 'glitching data packet'
    this.PLAYER_O = 'o'; // Represents a 'neural data vortex'
    this.GAME_STATES = {
      PLAYING: 'PLAYING',
      X_WINS: 'X_WINS',
      O_WINS: 'O_WINS',
      DRAW: 'DRAW'
    };
    this.WINNING_COMBINATIONS = [
      [0,1,2], [3,4,5], [6,7,8], // Rows
      [0,3,6], [1,4,7], [2,5,8], // Columns  
      [0,4,8], [2,4,6]           // Diagonals
    ];
    this.STORAGE_KEY = 'ttt_scores_v3';
    this.AI_DELAY = 650;

    // Strategic positions for medium AI
    this.CENTER = 4;
    this.CORNERS = [0, 2, 6, 8];
    this.EDGES = [1, 3, 5, 7];

    // DOM elements
    this.elements = this.initializeElements();
    
    // Game state
    this.state = this.initializeState();
    
    // Initialize game
    this.init();
  }

  initializeElements() {
    const elements = {
      cells: Array.from(document.querySelectorAll('[data-cell]')),
      board: document.getElementById('game-board'),
      statusDisplay: document.getElementById('status-display'),
      restartButton: document.getElementById('restart-button'),
      resetScoresBtn: document.getElementById('reset-scores'),
      winningLine: document.getElementById('winning-line'),
      difficultyRadios: Array.from(document.querySelectorAll('input[name="difficulty"]')),
      humanRadios: Array.from(document.querySelectorAll('input[name="human"]')),
      scoreX: document.getElementById('score-x'),
      scoreO: document.getElementById('score-o'),
      scoreDraw: document.getElementById('score-draw')
    };

    // Validate all elements exist
    Object.entries(elements).forEach(([key, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        throw new Error(`Required element not found: ${key}`);
      }
    });

    return elements;
  }

  initializeState() {
    return {
      gameState: this.GAME_STATES.PLAYING,
      humanPlayer: this.PLAYER_X,
      aiPlayer: this.PLAYER_O,
      currentPlayer: this.PLAYER_X,
      difficulty: 'easy',
      scores: { x: 0, o: 0, d: 0 },
      board: new Array(9).fill(null), // Represents the 3x3 grid, null is EMPTY
      keyboardIndex: 0,
      moveCount: 0
    };
  }

  // --- Game Initialization ---
  init() {
    try {
      this.loadScores();
      this.renderScores();
      this.attachEventListeners();
      this.startNewRound(); // Corresponds to InitializeGame from pseudocode
    } catch (error) {
      console.error('Game initialization failed:', error);
      this.setStatus('Game initialization failed. Please refresh.');
    }
  }

  loadScores() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsedScores = JSON.parse(saved);
        this.state.scores = { ...this.state.scores, ...parsedScores };
      }
    } catch (error) {
      console.warn('Failed to load scores:', error);
    }
  }

  attachEventListeners() {
    this.elements.difficultyRadios.forEach(radio => {
      radio.addEventListener('change', () => this.handleDifficultyChange());
    });

    this.elements.humanRadios.forEach(radio => {
      radio.addEventListener('change', () => this.handleHumanPlayerChange());
    });

    this.elements.restartButton.addEventListener('click', () => this.startNewRound());
    this.elements.resetScoresBtn.addEventListener('click', () => this.resetScores());

    this.elements.board.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
  }

  handleDifficultyChange() {
    const selectedDifficulty = this.elements.difficultyRadios.find(r => r.checked)?.value;
    if (selectedDifficulty && selectedDifficulty !== this.state.difficulty) {
      this.state.difficulty = selectedDifficulty;
      const difficultyNames = {
        'easy': 'Casual',
        'medium': 'Strategic', 
        'hard': 'Expert (Unbeatable)'
      };
      const difficultyName = difficultyNames[selectedDifficulty].toUpperCase();
      const appliedNote = this.state.gameState === this.GAME_STATES.PLAYING ? ' - APPLIED TO NEXT MOVE' : '';
      this.setStatus(`AI DIFFICULTY SET TO: ${difficultyName}${appliedNote}`);
    }
  }

  handleHumanPlayerChange() {
    const selectedPlayer = this.elements.humanRadios.find(r => r.checked)?.value;
    const hasMovesBeenMade = this.state.board.some(cell => cell !== null);
    
    if (hasMovesBeenMade) {
      this.elements.humanRadios.forEach(radio => {
        radio.checked = radio.value === this.state.humanPlayer;
      });
      this.setStatus('CANNOT CHANGE PLAYER - GAME IN PROGRESS - START NEW ROUND');
      return;
    }

    if (selectedPlayer && selectedPlayer !== this.state.humanPlayer) {
      this.state.humanPlayer = selectedPlayer;
      this.state.aiPlayer = selectedPlayer === this.PLAYER_X ? this.PLAYER_O : this.PLAYER_X;
      this.startNewRound(); // Restart the round to apply the change cleanly
    }
  }

  startNewRound() {
    // Reset game state
    this.state.gameState = this.GAME_STATES.PLAYING;
    this.state.currentPlayer = this.PLAYER_X;
    this.state.board.fill(null); // All neural nodes are initially unactivated
    this.state.keyboardIndex = 0;
    this.state.moveCount = 0;

    // Reset UI
    this.resetBoard();
    this.resetWinningLine();
    this.elements.statusDisplay.classList.remove('win', 'draw');

    // Focus first cell
    this.elements.cells[0].focus();

    // Update display
    this.setStatus(`GAME START - PLAYER ${this.state.currentPlayer.toUpperCase()} TURN`);

    // If AI starts (human is O), schedule AI move
    if (this.state.currentPlayer === this.state.aiPlayer) {
      this.scheduleAIMove();
    }
  }

  resetBoard() {
    this.elements.cells.forEach((cell, index) => {
      cell.classList.remove(this.PLAYER_X, this.PLAYER_O, 'clicked');
      cell.textContent = '';
      cell.disabled = false;
      cell.setAttribute('aria-label', `Cell ${index + 1}: Empty`);
      
      const newCell = cell.cloneNode(true);
      cell.parentNode.replaceChild(newCell, cell);
      newCell.addEventListener('click', (e) => this.handlePlayerInput(e));
    });
    
    this.elements.cells = Array.from(document.querySelectorAll('[data-cell]'));
  }

  resetWinningLine() {
    this.elements.winningLine.className = 'winning-line';
  }

  // --- Player Input and Move Processing ---
  handlePlayerInput(event) {
    if (this.state.gameState !== this.GAME_STATES.PLAYING) {
        this.setStatus("GAME OVER - START NEW ROUND TO CONTINUE");
        return;
    }
    
    const cell = event.currentTarget;
    const cellIndex = parseInt(cell.dataset.index);
    
    if (cellIndex < 0 || cellIndex > 8) return;
    
    if (this.state.currentPlayer !== this.state.humanPlayer) {
      this.setStatus('WAIT - AI IS PROCESSING');
      return;
    }
    
    if (this.state.board[cellIndex] !== null) {
      this.setStatus('INVALID MOVE - CELL OCCUPIED - SELECT ANOTHER');
      return;
    }

    // Valid move, update the board
    this.makeMove(cellIndex, this.state.humanPlayer);
    
    // Check for win or draw
    if (this.checkForWin(this.state.humanPlayer)) {
      this.endGame(false, this.state.humanPlayer);
    } else if (this.checkForDraw()) {
      this.endGame(true);
    } else {
      // Switch player and schedule AI move
      this.switchTurns();
      this.scheduleAIMove();
    }
  }

  makeMove(index, player) {
    if (index < 0 || index > 8 || this.state.board[index] !== null) {
      return false;
    }

    this.state.board[index] = player;
    this.state.moveCount++;
    
    // RenderMove - Animate the placement of X or O
    const cell = this.elements.cells[index];
    this.renderMove(cell, player);

    return true;
  }

  renderMove(cell, player) {
    // This function focuses on animating a single move.
    cell.classList.add('clicked', player);
    cell.textContent = player.toUpperCase();
    const cellNum = parseInt(cell.dataset.index) + 1;
    cell.setAttribute('aria-label', `Cell ${cellNum}: ${player.toUpperCase()}`);
    cell.disabled = true;
  }

  scheduleAIMove() {
    if (this.state.gameState !== this.GAME_STATES.PLAYING || this.state.currentPlayer !== this.state.aiPlayer) {
      return;
    }
    
    this.setStatus('AI PROCESSING - CALCULATING MOVE...');
    setTimeout(() => this.makeAIMove(), this.AI_DELAY);
  }

  makeAIMove() {
    if (this.state.gameState !== this.GAME_STATES.PLAYING || this.state.currentPlayer !== this.state.aiPlayer) {
      return;
    }

    const bestMove = this.getBestAIMove();
    if (bestMove === null) return;

    this.makeMove(bestMove, this.state.aiPlayer);
    
    if (this.checkForWin(this.state.aiPlayer)) {
      this.endGame(false, this.state.aiPlayer);
    } else if (this.checkForDraw()) {
      this.endGame(true);
    } else {
      this.switchTurns();
      this.focusNextEmptyCell(bestMove);
    }
  }

  // --- Win Condition Check ---
  checkForWin(player, board = this.state.board) {
    return this.WINNING_COMBINATIONS.some(combo =>
      combo.every(index => board[index] === player)
    );
  }

  // --- Draw Condition Check ---
  checkForDraw() {
    // If any cell is empty, it's not a draw yet
    return this.state.board.every(cell => cell !== null) && !this.checkForWin(this.PLAYER_X) && !this.checkForWin(this.PLAYER_O);
  }

  getWinningCombination() {
    return this.WINNING_COMBINATIONS.find(combo => 
      combo.every(index => 
        this.state.board[index] !== null && 
        this.state.board[index] === this.state.board[combo[0]]
      )
    );
  }

  endGame(isDraw, winner = null) {
    if (isDraw) {
      this.state.gameState = this.GAME_STATES.DRAW;
      this.state.scores.d++;
      this.setStatus("DRAW - ALL CELLS FILLED - NO WINNER");
      this.elements.statusDisplay.classList.add('draw');
    } else {
      this.state.gameState = winner === this.PLAYER_X ? this.GAME_STATES.X_WINS : this.GAME_STATES.O_WINS;
      
      if (winner === this.PLAYER_X) {
        this.state.scores.x++;
        this.setStatus("PLAYER X WINS - THREE IN A ROW");
      } else {
        this.state.scores.o++;
        this.setStatus("PLAYER O WINS - THREE IN A ROW");
      }
      
      const winningCombo = this.getWinningCombination();
      if(winningCombo) this.showWinningLine(winningCombo, winner);
      
      this.elements.statusDisplay.classList.add('win');
    }
    
    this.renderScores();
    this.saveScores();
  }

  switchTurns() {
    this.state.currentPlayer = this.state.currentPlayer === this.PLAYER_X ? this.PLAYER_O : this.PLAYER_X;
    this.setStatus(`PLAYER ${this.state.currentPlayer.toUpperCase()} TURN - SELECT CELL`);
  }
  
  getBestAIMove() {
    const emptyIndices = this.getEmptyIndices();
    if (emptyIndices.length === 0) return null;

    switch (this.state.difficulty) {
      case 'easy':
        return this.getRandomMove(emptyIndices);
      case 'medium':
        return this.getStrategicMove(emptyIndices);
      case 'hard':
        return this.getOptimalMove();
      default:
        return this.getRandomMove(emptyIndices);
    }
  }

  getRandomMove(emptyIndices) {
    if (Math.random() < 0.3) {
      const preferredMoves = emptyIndices.filter(index => 
        index === this.CENTER || this.CORNERS.includes(index)
      );
      if (preferredMoves.length > 0) {
        return preferredMoves[Math.floor(Math.random() * preferredMoves.length)];
      }
    }
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  getStrategicMove(emptyIndices) {
    const winMove = this.findWinningMove(this.state.aiPlayer);
    if (winMove !== null) return winMove;
    
    const blockMove = this.findWinningMove(this.state.humanPlayer);
    if (blockMove !== null) return blockMove;
    
    const forkMove = this.findForkMove(this.state.aiPlayer);
    if (forkMove !== null) return forkMove;
    
    const blockForkMove = this.findBlockForkMove();
    if (blockForkMove !== null) return blockForkMove;
    
    if (emptyIndices.includes(this.CENTER)) {
      return this.CENTER;
    }
    
    const oppositeCorner = this.findOppositeCorner();
    if (oppositeCorner !== null && emptyIndices.includes(oppositeCorner)) {
      return oppositeCorner;
    }
    
    const availableCorners = this.CORNERS.filter(corner => emptyIndices.includes(corner));
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }
    
    const availableEdges = this.EDGES.filter(edge => emptyIndices.includes(edge));
    if (availableEdges.length > 0) {
      return availableEdges[Math.floor(Math.random() * availableEdges.length)];
    }
    
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  getOptimalMove() {
    const result = this.minimax(this.state.board, this.state.aiPlayer, true, 0, -Infinity, Infinity);
    return result.index;
  }

  findWinningMove(player) {
    for (const combo of this.WINNING_COMBINATIONS) {
      const positions = combo.map(index => this.state.board[index]);
      const playerCount = positions.filter(pos => pos === player).length;
      const emptyCount = positions.filter(pos => pos === null).length;
      
      if (playerCount === 2 && emptyCount === 1) {
        return combo[positions.indexOf(null)];
      }
    }
    return null;
  }

  findForkMove(player) {
    const emptyIndices = this.getEmptyIndices();
    
    for (const index of emptyIndices) {
      this.state.board[index] = player;
      let winningMoves = 0;
      for (const combo of this.WINNING_COMBINATIONS) {
        const positions = combo.map(i => this.state.board[i]);
        const playerCount = positions.filter(pos => pos === player).length;
        const emptyCount = positions.filter(pos => pos === null).length;
        
        if (playerCount === 2 && emptyCount === 1) {
          winningMoves++;
        }
      }
      this.state.board[index] = null;
      if (winningMoves >= 2) {
        return index;
      }
    }
    return null;
  }

  findBlockForkMove() {
    const humanFork = this.findForkMove(this.state.humanPlayer);
    if (humanFork !== null) return humanFork;
    
    const emptyIndices = this.getEmptyIndices();
    for (const index of emptyIndices) {
      this.state.board[index] = this.state.aiPlayer;
      const forcedDefense = this.findWinningMove(this.state.aiPlayer);
      if (forcedDefense !== null) {
        this.state.board[forcedDefense] = this.state.humanPlayer;
        const remainingForks = this.findForkMove(this.state.humanPlayer);
        this.state.board[forcedDefense] = null;
        
        if (remainingForks === null) {
          this.state.board[index] = null;
          return index;
        }
      }
      this.state.board[index] = null;
    }
    return null;
  }

  findOppositeCorner() {
    const opposites = [[0, 8], [2, 6], [6, 2], [8, 0]];
    for (const [corner, opposite] of opposites) {
      if (this.state.board[corner] === this.state.humanPlayer && 
          this.state.board[opposite] === null) {
        return opposite;
      }
    }
    return null;
  }

  minimax(board, player, isMaximizing, depth = 0, alpha = -Infinity, beta = Infinity) {
    const score = this.evaluateBoard(board);
    
    if (score === 10) return { score: score - depth, index: null };
    if (score === -10) return { score: score + depth, index: null };
    if (this.getEmptyIndices(board).length === 0) return { score: 0, index: null };
    if (depth > 8) return { score: 0, index: null };
    
    const emptyIndices = this.getEmptyIndices(board);
    let bestMove = { score: isMaximizing ? -Infinity : Infinity, index: emptyIndices[0] };
    
    for (const index of emptyIndices) {
      board[index] = player;
      const result = this.minimax(
        board, 
        isMaximizing ? this.state.humanPlayer : this.state.aiPlayer, 
        !isMaximizing, 
        depth + 1,
        alpha,
        beta
      );
      board[index] = null;
      
      if (isMaximizing) {
        if (result.score > bestMove.score) {
          bestMove = { score: result.score, index };
        }
        alpha = Math.max(alpha, result.score);
      } else {
        if (result.score < bestMove.score) {
          bestMove = { score: result.score, index };
        }
        beta = Math.min(beta, result.score);
      }
      
      if (beta <= alpha) {
        break;
      }
    }
    return bestMove;
  }

  evaluateBoard(board) {
    if (this.checkForWin(this.state.aiPlayer, board)) return 10;
    if (this.checkForWin(this.state.humanPlayer, board)) return -10;
    return 0;
  }

  getEmptyIndices(board = this.state.board) {
    return board.map((cell, index) => cell === null ? index : null)
              .filter(index => index !== null);
  }

  showWinningLine(winningCombo, winner) {
    const comboIndex = this.WINNING_COMBINATIONS.indexOf(winningCombo);
    if (comboIndex === -1) return;
    
    this.resetWinningLine();
    
    setTimeout(() => {
      this.elements.winningLine.classList.add(`win-${comboIndex}`);
      this.elements.winningLine.classList.add(`${winner}-win`);
      this.elements.winningLine.classList.add('show');
    }, 150);
  }

  setStatus(message) {
    this.elements.statusDisplay.textContent = message;
  }

  renderScores() {
    this.elements.scoreX.textContent = this.state.scores.x.toString();
    this.elements.scoreO.textContent = this.state.scores.o.toString();
    this.elements.scoreDraw.textContent = this.state.scores.d.toString();
  }

  saveScores() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state.scores));
    } catch (error) {
      console.warn('Failed to save scores:', error);
    }
  }

  resetScores() {
    this.state.scores = { x: 0, o: 0, d: 0 };
    this.saveScores();
    this.renderScores();
    this.setStatus('SCORES RESET - ALL COUNTERS SET TO ZERO');
  }

  handleKeyboardNavigation(event) {
    const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
                          'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' '];
    
    if (!navigationKeys.includes(event.key)) return;
    
    const currentRow = Math.floor(this.state.keyboardIndex / 3);
    const currentCol = this.state.keyboardIndex % 3;
    let newRow = currentRow;
    let newCol = currentCol;
    
    switch (event.key) {
      case 'ArrowUp': newRow = (currentRow + 2) % 3; break;
      case 'ArrowDown': newRow = (currentRow + 1) % 3; break;
      case 'ArrowLeft': newCol = (currentCol + 2) % 3; break;
      case 'ArrowRight': newCol = (currentCol + 1) % 3; break;
      case 'Home': newRow = 0; newCol = 0; break;
      case 'End': newRow = 2; newCol = 2; break;
      case 'PageUp': newRow = 0; break;
      case 'PageDown': newRow = 2; break;
      case 'Enter':
      case ' ':
        if (this.state.gameState === this.GAME_STATES.PLAYING && this.state.currentPlayer === this.state.humanPlayer) {
          this.elements.cells[this.state.keyboardIndex].click();
          event.preventDefault();
        }
        return;
    }
    
    const newIndex = newRow * 3 + newCol;
    if (newIndex !== this.state.keyboardIndex) {
      this.state.keyboardIndex = newIndex;
      this.elements.cells[this.state.keyboardIndex].focus();
      event.preventDefault();
    }
  }

  focusNextEmptyCell(fromIndex) {
    const emptyIndices = this.getEmptyIndices();
    if (emptyIndices.length === 0) return;
    
    let targetIndex = emptyIndices.find(index => index > fromIndex);
    if (targetIndex === undefined) {
      targetIndex = emptyIndices[0];
    }
    
    this.state.keyboardIndex = targetIndex;
    this.elements.cells[targetIndex].focus();
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    new TicTacToeGame();
  } catch (error) {
    console.error('Failed to initialize Tic Tac Toe game:', error);
    const statusEl = document.getElementById('status-display');
    if (statusEl) {
      statusEl.textContent = 'Game failed to load. Please refresh the page.';
      statusEl.style.color = '#ff6b6b';
    }
  }
});
