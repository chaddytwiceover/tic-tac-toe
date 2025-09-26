// /script.js - v3.0 Production Refactor
/**
 * Tic Tac Toe Game - Production Ready Version
 * Features: Robust state management, consistent winning line animations,
 * improved error handling, and optimized performance.
 */

class TicTacToeGame {
  constructor() {
    // Game constants
    this.PLAYER_X = 'x';
    this.PLAYER_O = 'o';
    this.WINNING_COMBINATIONS = [
      [0,1,2], [3,4,5], [6,7,8], // Rows
      [0,3,6], [1,4,7], [2,5,8], // Columns  
      [0,4,8], [2,4,6]           // Diagonals
    ];
    this.STORAGE_KEY = 'ttt_scores_v3';
    this.AI_DELAY = 550;

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
      gameActive: true,
      humanPlayer: this.PLAYER_X,
      aiPlayer: this.PLAYER_O,
      currentPlayer: this.PLAYER_X,
      difficulty: 'easy',
      scores: { x: 0, o: 0, d: 0 },
      board: new Array(9).fill(null),
      keyboardIndex: 0,
      gameHistory: []
    };
  }

  init() {
    try {
      this.loadScores();
      this.renderScores();
      this.attachEventListeners();
      this.startNewRound();
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
    // Difficulty change
    this.elements.difficultyRadios.forEach(radio => {
      radio.addEventListener('change', () => this.handleDifficultyChange());
    });

    // Human player change
    this.elements.humanRadios.forEach(radio => {
      radio.addEventListener('change', () => this.handleHumanPlayerChange());
    });

    // Game controls
    this.elements.restartButton.addEventListener('click', () => this.startNewRound());
    this.elements.resetScoresBtn.addEventListener('click', () => this.resetScores());

    // Keyboard navigation
    this.elements.board.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
  }

  handleDifficultyChange() {
    const selectedDifficulty = this.elements.difficultyRadios.find(r => r.checked)?.value;
    if (selectedDifficulty && selectedDifficulty !== this.state.difficulty) {
      this.state.difficulty = selectedDifficulty;
      this.setStatus(`AI Difficulty: ${selectedDifficulty.toUpperCase()}${this.state.gameActive ? ' - Applied!' : ''}`);
    }
  }

  handleHumanPlayerChange() {
    const selectedPlayer = this.elements.humanRadios.find(r => r.checked)?.value;
    const hasMovesBeenMade = this.state.board.some(cell => cell !== null);
    
    if (hasMovesBeenMade) {
      // Prevent mid-game changes - reset to current setting
      this.elements.humanRadios.forEach(radio => {
        radio.checked = radio.value === this.state.humanPlayer;
      });
      this.setStatus('Cannot change player mid-game. Start NEW_ROUND first.');
      return;
    }

    if (selectedPlayer && selectedPlayer !== this.state.humanPlayer) {
      this.state.humanPlayer = selectedPlayer;
      this.state.aiPlayer = selectedPlayer === this.PLAYER_X ? this.PLAYER_O : this.PLAYER_X;
      this.setStatus(`You are now playing as ${selectedPlayer.toUpperCase()}`);
      
      // If human chose O and board is empty, AI (X) should start
      if (this.state.humanPlayer === this.PLAYER_O && this.isBoardEmpty()) {
        this.scheduleAIMove();
      }
    }
  }

  startNewRound() {
    // Reset game state
    this.state.gameActive = true;
    this.state.currentPlayer = this.PLAYER_X;
    this.state.board.fill(null);
    this.state.keyboardIndex = 0;

    // Reset UI
    this.resetBoard();
    this.resetWinningLine();
    this.elements.statusDisplay.classList.remove('win', 'draw');

    // Focus first cell
    this.elements.cells[0].focus();

    // Update display
    this.updateTurnStatus();

    // If AI starts (human is O), schedule AI move
    if (this.state.humanPlayer === this.PLAYER_O) {
      this.scheduleAIMove();
    }
  }

  resetBoard() {
    this.elements.cells.forEach((cell, index) => {
      cell.classList.remove(this.PLAYER_X, this.PLAYER_O, 'clicked');
      cell.textContent = '';
      cell.disabled = false;
      cell.setAttribute('aria-label', `Cell ${index + 1}: Empty`);
      
      // Remove old listeners and add fresh ones
      const newCell = cell.cloneNode(true);
      cell.parentNode.replaceChild(newCell, cell);
      newCell.addEventListener('click', (e) => this.handleCellClick(e));
    });
    
    // Update elements reference
    this.elements.cells = Array.from(document.querySelectorAll('[data-cell]'));
  }

  resetWinningLine() {
    this.elements.winningLine.className = 'winning-line';
  }

  handleCellClick(event) {
    if (!this.state.gameActive) return;
    
    const cell = event.currentTarget;
    const cellIndex = parseInt(cell.dataset.index);
    
    // Only allow human moves during human turn
    if (this.state.currentPlayer !== this.state.humanPlayer) {
      return;
    }
    
    // Check if cell is already occupied
    if (this.state.board[cellIndex] !== null) {
      return;
    }

    // Make the move
    this.makeMove(cellIndex, this.state.humanPlayer);
    
    // Check for game end
    if (this.checkGameEnd()) return;
    
    // Switch turns and schedule AI move
    this.switchTurns();
    this.scheduleAIMove();
  }

  makeMove(index, player) {
    // Update game state
    this.state.board[index] = player;
    
    // Update UI
    const cell = this.elements.cells[index];
    this.markCell(cell, player);
    
    // Add to game history
    this.state.gameHistory.push({ index, player, timestamp: Date.now() });
  }

  markCell(cell, player) {
    cell.classList.add('clicked', player);
    cell.textContent = player.toUpperCase();
    const cellNum = parseInt(cell.dataset.index) + 1;
    cell.setAttribute('aria-label', `Cell ${cellNum}: ${player.toUpperCase()}`);
  }

  scheduleAIMove() {
    if (!this.state.gameActive || this.state.currentPlayer === this.state.humanPlayer) {
      return;
    }
    
    this.setStatus('AI thinking...');
    setTimeout(() => this.makeAIMove(), this.AI_DELAY);
  }

  makeAIMove() {
    if (!this.state.gameActive || this.state.currentPlayer !== this.state.aiPlayer) {
      return;
    }

    const bestMove = this.getBestAIMove();
    if (bestMove === null) return;

    // Make AI move
    this.makeMove(bestMove, this.state.aiPlayer);
    
    // Check for game end
    if (this.checkGameEnd()) return;
    
    // Switch back to human turn
    this.switchTurns();
    this.updateTurnStatus();
    
    // Focus on next available cell for keyboard users
    this.focusNextEmptyCell(bestMove);
  }

  getBestAIMove() {
    const emptyIndices = this.getEmptyIndices();
    if (emptyIndices.length === 0) return null;

    if (this.state.difficulty === 'hard') {
      const result = this.minimax(this.state.board, this.state.aiPlayer, true);
      return result.index;
    } else {
      // Easy mode - random move
      return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }
  }

  minimax(board, player, isMaximizing, depth = 0) {
    const score = this.evaluateBoard(board);
    
    // Terminal states
    if (score === 10) return { score: score - depth };
    if (score === -10) return { score: score + depth };
    if (this.getEmptyIndices(board).length === 0) return { score: 0 };
    
    const moves = [];
    const emptyIndices = this.getEmptyIndices(board);
    
    for (const index of emptyIndices) {
      const move = { index };
      
      // Make move
      board[index] = player;
      
      // Recursive call
      if (isMaximizing) {
        move.score = this.minimax(board, this.state.humanPlayer, false, depth + 1).score;
      } else {
        move.score = this.minimax(board, this.state.aiPlayer, true, depth + 1).score;
      }
      
      // Undo move
      board[index] = null;
      moves.push(move);
    }

    // Find best move
    if (isMaximizing) {
      return moves.reduce((best, move) => move.score > best.score ? move : best);
    } else {
      return moves.reduce((best, move) => move.score < best.score ? move : best);
    }
  }

  evaluateBoard(board) {
    // Check if AI wins
    if (this.checkWinner(board, this.state.aiPlayer)) return 10;
    // Check if human wins
    if (this.checkWinner(board, this.state.humanPlayer)) return -10;
    // No winner
    return 0;
  }

  checkGameEnd() {
    const winningCombo = this.getWinningCombination();
    
    if (winningCombo) {
      this.endGame(false, this.state.currentPlayer, winningCombo);
      return true;
    }
    
    if (this.isDraw()) {
      this.endGame(true);
      return true;
    }
    
    return false;
  }

  getWinningCombination() {
    return this.WINNING_COMBINATIONS.find(combo => 
      combo.every(index => 
        this.state.board[index] !== null && 
        this.state.board[index] === this.state.board[combo[0]]
      )
    );
  }

  checkWinner(board, player) {
    return this.WINNING_COMBINATIONS.some(combo =>
      combo.every(index => board[index] === player)
    );
  }

  isDraw() {
    return this.state.board.every(cell => cell !== null);
  }

  isBoardEmpty() {
    return this.state.board.every(cell => cell === null);
  }

  getEmptyIndices(board = this.state.board) {
    return board.map((cell, index) => cell === null ? index : null)
              .filter(index => index !== null);
  }

  endGame(isDraw, winner = null, winningCombo = null) {
    this.state.gameActive = false;
    
    if (isDraw) {
      this.state.scores.d++;
      this.setStatus('SYSTEM_CALL: DRAW');
      this.elements.statusDisplay.classList.add('draw');
    } else {
      // Update scores
      if (winner === this.PLAYER_X) {
        this.state.scores.x++;
      } else {
        this.state.scores.o++;
      }
      
      // Show winning line with proper positioning
      this.showWinningLine(winningCombo, winner);
      
      this.setStatus(`Player ${winner.toUpperCase()} Wins!`);
      this.elements.statusDisplay.classList.add('win');
    }
    
    this.renderScores();
    this.saveScores();
  }

  showWinningLine(winningCombo, winner) {
    const comboIndex = this.WINNING_COMBINATIONS.indexOf(winningCombo);
    if (comboIndex === -1) return;
    
    // Reset previous classes
    this.resetWinningLine();
    
    // Add new classes with slight delay for better animation
    setTimeout(() => {
      this.elements.winningLine.classList.add(`win-${comboIndex}`);
      this.elements.winningLine.classList.add(`${winner}-win`);
      this.elements.winningLine.classList.add('show');
    }, 100);
  }

  switchTurns() {
    this.state.currentPlayer = this.state.currentPlayer === this.PLAYER_X ? this.PLAYER_O : this.PLAYER_X;
  }

  updateTurnStatus() {
    if (this.state.currentPlayer === this.state.humanPlayer) {
      this.setStatus(`Your move (${this.state.humanPlayer.toUpperCase()})`);
    } else {
      this.setStatus('AI thinking...');
    }
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
    this.setStatus('Scores reset');
  }

  handleKeyboardNavigation(event) {
    const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
                          'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' '];
    
    if (!navigationKeys.includes(event.key)) return;
    
    const currentRow = Math.floor(this.state.keyboardIndex / 3);
    const currentCol = this.state.keyboardIndex % 3;
    let newRow = currentRow;
    let newCol = currentCol;
    
    // Calculate new position
    switch (event.key) {
      case 'ArrowUp':
        newRow = (currentRow + 2) % 3;
        break;
      case 'ArrowDown':
        newRow = (currentRow + 1) % 3;
        break;
      case 'ArrowLeft':
        newCol = (currentCol + 2) % 3;
        break;
      case 'ArrowRight':
        newCol = (currentCol + 1) % 3;
        break;
      case 'Home':
        newRow = 0; newCol = 0;
        break;
      case 'End':
        newRow = 2; newCol = 2;
        break;
      case 'PageUp':
        newRow = 0;
        break;
      case 'PageDown':
        newRow = 2;
        break;
      case 'Enter':
      case ' ':
        if (this.state.gameActive && this.state.currentPlayer === this.state.humanPlayer) {
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
    
    // Find next empty cell starting from the given index
    let targetIndex = emptyIndices.find(index => index > fromIndex);
    if (targetIndex === undefined) {
      targetIndex = emptyIndices[0]; // Wrap around to first empty
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
    // Fallback error display
    const statusEl = document.getElementById('status-display');
    if (statusEl) {
      statusEl.textContent = 'Game failed to load. Please refresh the page.';
      statusEl.style.color = '#ff6b6b';
    }
  }
});
