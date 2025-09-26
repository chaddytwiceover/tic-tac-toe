// /script.js - v3.1 Enhanced Game Logic
/**
 * Tic Tac Toe Game - Enhanced with Strategic AI
 * Features: Three difficulty levels, improved game logic,
 * strategic rule-based AI, and optimized minimax algorithm.
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
    this.AI_DELAY = 650; // Slightly longer for better UX

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
      gameActive: true,
      humanPlayer: this.PLAYER_X,
      aiPlayer: this.PLAYER_O,
      currentPlayer: this.PLAYER_X,
      difficulty: 'easy',
      scores: { x: 0, o: 0, d: 0 },
      board: new Array(9).fill(null),
      keyboardIndex: 0,
      gameHistory: [],
      moveCount: 0
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
      const difficultyNames = {
        'easy': 'Casual',
        'medium': 'Strategic', 
        'hard': 'Expert'
      };
      this.setStatus(`AI Difficulty: ${difficultyNames[selectedDifficulty]}${this.state.gameActive ? ' - Applied!' : ''}`);
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
      this.setStatus('Cannot change player mid-game. Start New Round first.');
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
    this.state.moveCount = 0;
    this.state.gameHistory = [];

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
    
    // Validate cell index
    if (cellIndex < 0 || cellIndex > 8) return;
    
    // Only allow human moves during human turn
    if (this.state.currentPlayer !== this.state.humanPlayer) {
      this.setStatus('Wait for your turn!');
      return;
    }
    
    // Check if cell is already occupied
    if (this.state.board[cellIndex] !== null) {
      this.setStatus('Cell already occupied!');
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
    // Validate move
    if (index < 0 || index > 8 || this.state.board[index] !== null) {
      return false;
    }

    // Update game state
    this.state.board[index] = player;
    this.state.moveCount++;
    
    // Update UI
    const cell = this.elements.cells[index];
    this.markCell(cell, player);
    
    // Add to game history
    this.state.gameHistory.push({ 
      index, 
      player, 
      moveNumber: this.state.moveCount,
      timestamp: Date.now() 
    });

    return true;
  }

  markCell(cell, player) {
    cell.classList.add('clicked', player);
    cell.textContent = player.toUpperCase();
    const cellNum = parseInt(cell.dataset.index) + 1;
    cell.setAttribute('aria-label', `Cell ${cellNum}: ${player.toUpperCase()}`);
    cell.disabled = true; // Prevent further clicks
  }

  scheduleAIMove() {
    if (!this.state.gameActive || this.state.currentPlayer === this.state.humanPlayer) {
      return;
    }
    
    this.setStatus('AI analyzing neural pathways...');
    setTimeout(() => this.makeAIMove(), this.AI_DELAY);
  }

  makeAIMove() {
    if (!this.state.gameActive || this.state.currentPlayer !== this.state.aiPlayer) {
      return;
    }

    const bestMove = this.getBestAIMove();
    if (bestMove === null) return;

    // Make AI move
    const success = this.makeMove(bestMove, this.state.aiPlayer);
    if (!success) return;
    
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

  // Easy AI: Random moves with slight preference for center/corners
  getRandomMove(emptyIndices) {
    // 30% chance to prefer center or corners if available
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

  // Medium AI: Strategic rule-based decisions
  getStrategicMove(emptyIndices) {
    // 1. Try to win
    const winMove = this.findWinningMove(this.state.aiPlayer);
    if (winMove !== null) return winMove;
    
    // 2. Block opponent's win
    const blockMove = this.findWinningMove(this.state.humanPlayer);
    if (blockMove !== null) return blockMove;
    
    // 3. Fork opportunity (create two ways to win)
    const forkMove = this.findForkMove(this.state.aiPlayer);
    if (forkMove !== null) return forkMove;
    
    // 4. Block opponent's fork
    const blockForkMove = this.findBlockForkMove();
    if (blockForkMove !== null) return blockForkMove;
    
    // 5. Take center if available
    if (emptyIndices.includes(this.CENTER)) {
      return this.CENTER;
    }
    
    // 6. Take opposite corner if opponent is in corner
    const oppositeCorner = this.findOppositeCorner();
    if (oppositeCorner !== null && emptyIndices.includes(oppositeCorner)) {
      return oppositeCorner;
    }
    
    // 7. Take any available corner
    const availableCorners = this.CORNERS.filter(corner => emptyIndices.includes(corner));
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }
    
    // 8. Take any available edge
    const availableEdges = this.EDGES.filter(edge => emptyIndices.includes(edge));
    if (availableEdges.length > 0) {
      return availableEdges[Math.floor(Math.random() * availableEdges.length)];
    }
    
    // Fallback: random move
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  // Hard AI: Minimax with alpha-beta pruning
  getOptimalMove() {
    const result = this.minimax(this.state.board, this.state.aiPlayer, true, 0, -Infinity, Infinity);
    return result.index;
  }

  // Strategic helper methods
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
      // Temporarily place piece
      this.state.board[index] = player;
      
      // Count winning opportunities
      let winningMoves = 0;
      for (const combo of this.WINNING_COMBINATIONS) {
        const positions = combo.map(i => this.state.board[i]);
        const playerCount = positions.filter(pos => pos === player).length;
        const emptyCount = positions.filter(pos => pos === null).length;
        
        if (playerCount === 2 && emptyCount === 1) {
          winningMoves++;
        }
      }
      
      // Remove temporary piece
      this.state.board[index] = null;
      
      // Fork found if we have 2+ winning opportunities
      if (winningMoves >= 2) {
        return index;
      }
    }
    
    return null;
  }

  findBlockForkMove() {
    const humanFork = this.findForkMove(this.state.humanPlayer);
    if (humanFork !== null) return humanFork;
    
    // If opponent has multiple fork opportunities, force them to defend
    const emptyIndices = this.getEmptyIndices();
    for (const index of emptyIndices) {
      this.state.board[index] = this.state.aiPlayer;
      
      const forcedDefense = this.findWinningMove(this.state.aiPlayer);
      if (forcedDefense !== null) {
        // Check if this forces opponent to defend instead of creating forks
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

  // Enhanced minimax with alpha-beta pruning for better performance
  minimax(board, player, isMaximizing, depth = 0, alpha = -Infinity, beta = Infinity) {
    const score = this.evaluateBoard(board);
    
    // Terminal states with depth consideration for optimal play
    if (score === 10) return { score: score - depth, index: null };
    if (score === -10) return { score: score + depth, index: null };
    if (this.getEmptyIndices(board).length === 0) return { score: 0, index: null };
    
    // Depth limit for performance (shouldn't be needed for 3x3 but good practice)
    if (depth > 8) return { score: 0, index: null };
    
    const emptyIndices = this.getEmptyIndices(board);
    let bestMove = { score: isMaximizing ? -Infinity : Infinity, index: emptyIndices[0] };
    
    for (const index of emptyIndices) {
      // Make move
      board[index] = player;
      
      // Recursive call
      const result = this.minimax(
        board, 
        isMaximizing ? this.state.humanPlayer : this.state.aiPlayer, 
        !isMaximizing, 
        depth + 1,
        alpha,
        beta
      );
      
      // Undo move
      board[index] = null;
      
      // Update best move
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
      
      // Alpha-beta pruning
      if (beta <= alpha) {
        break;
      }
    }
    
    return bestMove;
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
    return this.state.board.every(cell => cell !== null) && !this.getWinningCombination();
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
      this.setStatus('Neural Grid Equilibrium - Draw!');
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
      
      const isPlayerWin = winner === this.state.humanPlayer;
      this.setStatus(isPlayerWin ? 
        `Victory! You Conquered the Grid!` : 
        `AI Dominates the Neural Network!`
      );
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
    }, 150);
  }

  switchTurns() {
    this.state.currentPlayer = this.state.currentPlayer === this.PLAYER_X ? this.PLAYER_O : this.PLAYER_X;
  }

  updateTurnStatus() {
    if (this.state.currentPlayer === this.state.humanPlayer) {
      this.setStatus(`Your Neural Turn (${this.state.humanPlayer.toUpperCase()})`);
    } else {
      this.setStatus('AI analyzing neural pathways...');
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
    this.setStatus('Neural Grid Statistics Purged');
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
